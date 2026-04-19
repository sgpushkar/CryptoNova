import type { AlertCondition, AlertScope, NotificationChannels } from './types';

interface NotificationAlert {
  symbol: string;
  coinName: string;
  condition: AlertCondition;
  target: number;
  scope: AlertScope;
  channels: NotificationChannels;
}

interface NotificationContext {
  priceInr: number;
  priceUsd: number;
  monitoredValueInr?: number;
  percentChangeFromCreation: number;
  message: string;
}

export const sendAlertNotifications = async (
  _alert: NotificationAlert,
  _context: NotificationContext
) => {
  return {
    telegram: false,
    email: false,
  };
};
