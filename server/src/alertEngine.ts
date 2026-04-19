import { EventEmitter } from 'node:events';
import { AlertHistoryModel, AlertModel } from './models';
import { sendAlertNotifications } from './notifications';
import { priceStore } from './priceStore';
import {
  ALERT_CONDITION_LABELS,
  formatAlertTarget,
  serializeAlertHistory,
  type AlertCondition,
  type AlertHistoryView,
  type AlertScope,
  type AlertView,
  type NotificationChannels,
} from './types';

interface CachedAlert {
  id: string;
  symbol: string;
  coinName: string;
  condition: AlertCondition;
  target: number;
  scope: AlertScope;
  assetQuantity?: number;
  assetValueAtCreationInr?: number;
  assetValueAtCreationUsd?: number;
  priceAtCreationInr: number;
  priceAtCreationUsd: number;
  channels: NotificationChannels;
  createdAt: string;
}

const alertsBySymbol = new Map<string, CachedAlert[]>();
const inFlightAlerts = new Set<string>();
let sweepTimer: NodeJS.Timeout | null = null;

export const alertEvents = new EventEmitter();

const formatInr = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: value >= 100 ? 2 : 4,
  }).format(value);

const toCachedAlert = (record: AlertView): CachedAlert => ({
  id: record.id,
  symbol: record.symbol,
  coinName: record.coinName,
  condition: record.condition,
  target: record.target,
  scope: record.scope,
  assetQuantity: record.assetQuantity,
  assetValueAtCreationInr: record.assetValueAtCreationInr,
  assetValueAtCreationUsd: record.assetValueAtCreationUsd,
  priceAtCreationInr: record.priceAtCreationInr,
  priceAtCreationUsd: record.priceAtCreationUsd,
  channels: record.channels,
  createdAt: record.createdAt,
});

const replaceAlertCache = (alert: CachedAlert) => {
  const existing = alertsBySymbol.get(alert.symbol) ?? [];
  const withoutCurrent = existing.filter((entry) => entry.id !== alert.id);
  alertsBySymbol.set(alert.symbol, [...withoutCurrent, alert]);
};

const removeAlertCache = (alertId: string) => {
  for (const [symbol, alerts] of alertsBySymbol.entries()) {
    const next = alerts.filter((entry) => entry.id !== alertId);
    if (next.length === 0) {
      alertsBySymbol.delete(symbol);
    } else {
      alertsBySymbol.set(symbol, next);
    }
  }
};

const getCreationValueInr = (alert: CachedAlert) =>
  alert.scope === 'holding_value' ? alert.assetValueAtCreationInr ?? alert.priceAtCreationInr : alert.priceAtCreationInr;

const getCreationValueUsd = (alert: CachedAlert) =>
  alert.scope === 'holding_value' ? alert.assetValueAtCreationUsd ?? alert.priceAtCreationUsd : alert.priceAtCreationUsd;

const getCurrentMonitoredValueInr = (alert: CachedAlert, currentPriceInr: number) => {
  if (alert.scope === 'holding_value' && alert.assetQuantity) {
    return currentPriceInr * alert.assetQuantity;
  }

  return currentPriceInr;
};

const getCurrentMonitoredValueUsd = (alert: CachedAlert, currentPriceUsd: number) => {
  if (alert.scope === 'holding_value' && alert.assetQuantity) {
    return currentPriceUsd * alert.assetQuantity;
  }

  return currentPriceUsd;
};

const getPercentChangeFromCreation = (valueAtCreation: number, currentValue: number) => {
  if (valueAtCreation <= 0) {
    return 0;
  }

  return ((currentValue - valueAtCreation) / valueAtCreation) * 100;
};

const getInrChangeFromCreation = (valueAtCreation: number, currentValue: number) => currentValue - valueAtCreation;

const buildMessage = (
  alert: CachedAlert,
  currentMonitoredValueInr: number,
  percentChangeFromCreation: number,
  inrChangeFromCreation: number
) => {
  const label = ALERT_CONDITION_LABELS[alert.condition];
  const subject = alert.scope === 'holding_value' ? `Your ${alert.coinName} holding value` : alert.coinName;

  if (alert.condition === 'above' || alert.condition === 'below') {
    return `${subject} reached ${formatInr(currentMonitoredValueInr)} and triggered your ${label.toLowerCase()} ${formatInr(
      alert.target
    )} alert.`;
  }

  if (alert.condition === 'change_up') {
    return `${subject} increased by ${formatInr(
      Math.abs(inrChangeFromCreation)
    )} from your alert baseline and hit the ${label.toLowerCase()} ${formatAlertTarget(alert.condition, alert.target)} rule.`;
  }

  if (alert.condition === 'change_down') {
    return `${subject} dropped by ${formatInr(
      Math.abs(inrChangeFromCreation)
    )} from your alert baseline and hit the ${label.toLowerCase()} ${formatAlertTarget(alert.condition, alert.target)} rule.`;
  }

  if (alert.condition === 'percent_up') {
    return `${subject} increased by ${percentChangeFromCreation.toFixed(
      2
    )}% from your alert baseline and hit the ${label.toLowerCase()} ${formatAlertTarget(alert.condition, alert.target)} rule.`;
  }

  if (alert.condition === 'percent_down') {
    return `${subject} dropped by ${Math.abs(percentChangeFromCreation).toFixed(
      2
    )}% from your alert baseline and hit the ${label.toLowerCase()} ${formatAlertTarget(alert.condition, alert.target)} rule.`;
  }

  if (alert.condition === 'change') {
    return `${subject} moved ${formatInr(Math.abs(inrChangeFromCreation))} from the value where you created the alert.`;
  }

  return `${subject} moved ${Math.abs(percentChangeFromCreation).toFixed(2)}% from the value where you created the alert.`;
};

const isTriggered = (alert: CachedAlert, currentMonitoredValueInr: number) => {
  const creationValueInr = getCreationValueInr(alert);
  const inrChangeFromCreation = getInrChangeFromCreation(creationValueInr, currentMonitoredValueInr);
  const percentChangeFromCreation = getPercentChangeFromCreation(creationValueInr, currentMonitoredValueInr);

  if (alert.condition === 'above') {
    return currentMonitoredValueInr >= alert.target;
  }

  if (alert.condition === 'below') {
    return currentMonitoredValueInr <= alert.target;
  }

  if (alert.condition === 'change_up') {
    return inrChangeFromCreation >= alert.target;
  }

  if (alert.condition === 'change_down') {
    return inrChangeFromCreation <= -alert.target;
  }

  if (alert.condition === 'percent_up') {
    return percentChangeFromCreation >= alert.target;
  }

  if (alert.condition === 'percent_down') {
    return percentChangeFromCreation <= -alert.target;
  }

  if (alert.condition === 'change') {
    return Math.abs(inrChangeFromCreation) >= alert.target;
  }

  return Math.abs(percentChangeFromCreation) >= alert.target;
};

const triggerAlert = async (alert: CachedAlert) => {
  const snapshot = priceStore.getSnapshot(alert.symbol);

  if (!snapshot) {
    return;
  }

  const currentMonitoredValueInr = getCurrentMonitoredValueInr(alert, snapshot.priceInr);

  if (!isTriggered(alert, currentMonitoredValueInr)) {
    return;
  }

  if (inFlightAlerts.has(alert.id)) {
    return;
  }

  inFlightAlerts.add(alert.id);

  try {
    const currentMonitoredValueUsd = getCurrentMonitoredValueUsd(alert, snapshot.priceUsd);
    const updatedAlert = await AlertModel.findOneAndUpdate(
      { _id: alert.id, active: true, triggered: false },
      {
        $set: {
          active: false,
          triggered: true,
          triggeredAt: new Date(),
          triggerPriceInr: snapshot.priceInr,
          triggerPriceUsd: snapshot.priceUsd,
        },
      },
      { new: true }
    );

    if (!updatedAlert) {
      removeAlertCache(alert.id);
      return;
    }

    removeAlertCache(alert.id);

    const creationValueInr = getCreationValueInr(alert);
    const percentChangeFromCreation = getPercentChangeFromCreation(creationValueInr, currentMonitoredValueInr);
    const inrChangeFromCreation = getInrChangeFromCreation(creationValueInr, currentMonitoredValueInr);
    const message = buildMessage(alert, currentMonitoredValueInr, percentChangeFromCreation, inrChangeFromCreation);

    const delivery = await sendAlertNotifications(
      {
        symbol: alert.symbol,
        coinName: alert.coinName,
        condition: alert.condition,
        target: alert.target,
        scope: alert.scope,
        channels: alert.channels,
      },
      {
        priceInr: snapshot.priceInr,
        priceUsd: snapshot.priceUsd,
        monitoredValueInr: alert.scope === 'holding_value' ? currentMonitoredValueInr : undefined,
        percentChangeFromCreation,
        message,
      }
    );

    const historyRecord = await AlertHistoryModel.create({
      alertId: alert.id,
      symbol: alert.symbol,
      coinName: alert.coinName,
      condition: alert.condition,
      target: alert.target,
      triggerPriceInr: alert.scope === 'holding_value' ? currentMonitoredValueInr : snapshot.priceInr,
      triggerPriceUsd: alert.scope === 'holding_value' ? currentMonitoredValueUsd : snapshot.priceUsd,
      percentChangeFromCreation,
      message,
      deliveredToTelegram: delivery.telegram,
      deliveredToEmail: delivery.email,
    });

    const historyView: AlertHistoryView = serializeAlertHistory(historyRecord.toObject());
    alertEvents.emit('alert_triggered', historyView);
  } finally {
    inFlightAlerts.delete(alert.id);
  }
};

export const syncAlertCache = async () => {
  const alertDocs = await AlertModel.find({ active: true, triggered: false }).sort({ createdAt: -1 });
  alertsBySymbol.clear();

  for (const doc of alertDocs) {
    replaceAlertCache({
      id: String(doc._id),
      symbol: doc.symbol,
      coinName: doc.coinName,
      condition: doc.condition,
      target: doc.target,
      scope: doc.scope ?? 'market_price',
      assetQuantity: doc.assetQuantity,
      assetValueAtCreationInr: doc.assetValueAtCreationInr,
      assetValueAtCreationUsd: doc.assetValueAtCreationUsd,
      priceAtCreationInr: doc.priceAtCreationInr,
      priceAtCreationUsd: doc.priceAtCreationUsd,
      channels: doc.channels,
      createdAt: doc.createdAt.toISOString(),
    });
  }
};

export const startAlertEngine = () => {
  if (sweepTimer) {
    return;
  }

  sweepTimer = setInterval(() => {
    for (const symbol of alertsBySymbol.keys()) {
      void evaluateSymbol(symbol);
    }
  }, 1000);
};

export const registerAlert = (alert: AlertView) => {
  replaceAlertCache(toCachedAlert(alert));
};

export const removeAlert = (alertId: string) => {
  removeAlertCache(alertId);
};

export const getActiveAlertCount = () => {
  let count = 0;
  for (const alerts of alertsBySymbol.values()) {
    count += alerts.length;
  }
  return count;
};

export const evaluateSymbol = async (symbol: string) => {
  const pendingAlerts = alertsBySymbol.get(symbol) ?? [];

  for (const alert of pendingAlerts) {
    await triggerAlert(alert);
  }
};
