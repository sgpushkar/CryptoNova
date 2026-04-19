export const ALERT_CONDITIONS = [
  'above',
  'below',
  'change',
  'percent',
  'change_up',
  'change_down',
  'percent_up',
  'percent_down',
] as const;

export type AlertCondition = (typeof ALERT_CONDITIONS)[number];
export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

export interface NotificationChannels {
  telegram: boolean;
  email: boolean;
}

export type AlertScope = 'market_price' | 'holding_value';

export interface PortfolioAssetView {
  asset: string;
  symbol: string;
  name: string;
  free: number;
  locked: number;
  total: number;
  priceUsd: number;
  priceInr: number;
  valueUsd: number;
  valueInr: number;
  allocationPercent: number;
  supported: boolean;
}

export interface BinancePortfolioResponse {
  assets: PortfolioAssetView[];
  totalValueUsd: number;
  totalValueInr: number;
  syncedAt: string;
  unsupportedAssets: string[];
}

export const ALERT_CONDITION_LABELS: Record<AlertCondition, string> = {
  above: 'Price above',
  below: 'Price below',
  change: 'Moves by amount',
  percent: 'Moves by percent',
  change_up: 'Increases by amount',
  change_down: 'Drops by amount',
  percent_up: 'Increases by percent',
  percent_down: 'Drops by percent',
};

export interface CoinMarket {
  symbol: string;
  baseAsset: string;
  name: string;
  rank: number;
  priceUsd: number;
  priceInr: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  direction: 'up' | 'down' | 'flat';
  lastUpdated: string;
}

export interface PriceHistoryPoint {
  time: string;
  priceUsd: number;
  priceInr: number;
}

export interface AlertView {
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
  active: boolean;
  triggered: boolean;
  createdAt: string;
  updatedAt: string;
  triggeredAt?: string;
  triggerPriceInr?: number;
  triggerPriceUsd?: number;
}

export interface AlertHistoryView {
  id: string;
  alertId: string;
  symbol: string;
  coinName: string;
  condition: AlertCondition;
  target: number;
  triggerPriceInr: number;
  triggerPriceUsd: number;
  percentChangeFromCreation: number;
  message: string;
  deliveredToTelegram: boolean;
  deliveredToEmail: boolean;
  createdAt: string;
}

export interface ServerStatus {
  status: ConnectionStatus;
  message: string;
}

export interface BootstrapResponse {
  markets: CoinMarket[];
  alerts: AlertView[];
  history: AlertHistoryView[];
  portfolio: BinancePortfolioResponse | null;
  status: ServerStatus;
  serverTime: string;
}

export interface CreateAlertBody {
  symbol: string;
  condition: AlertCondition;
  target: number;
  scope?: AlertScope;
  assetQuantity?: number;
  channels: NotificationChannels;
}

export interface BinanceTickerPayload {
  s: string;
  c: string;
  P: string;
  q: string;
  h: string;
  l: string;
}

export interface FrontendBootstrapMessage {
  type: 'bootstrap';
  payload: {
    coins: CoinMarket[];
    activeAlerts: number;
  };
  serverTime: string;
}

export interface FrontendPriceMessage {
  type: 'prices';
  payload: CoinMarket[];
  serverTime: string;
}

export interface FrontendStatusMessage {
  type: 'status';
  payload: ServerStatus;
  serverTime: string;
}

export interface FrontendAlertMessage {
  type: 'alert_triggered';
  payload: AlertHistoryView;
  serverTime: string;
}

export type ServerWsMessage =
  | FrontendBootstrapMessage
  | FrontendPriceMessage
  | FrontendStatusMessage
  | FrontendAlertMessage;

const asId = (value: unknown): string => String(value);
const asIso = (value?: Date | string | null): string | undefined =>
  value ? new Date(value).toISOString() : undefined;

export const isAlertCondition = (value: string): value is AlertCondition =>
  (ALERT_CONDITIONS as readonly string[]).includes(value);

export const isPercentCondition = (condition: AlertCondition) =>
  condition === 'percent' || condition === 'percent_up' || condition === 'percent_down';

export const formatAlertTarget = (condition: AlertCondition, target: number) =>
  isPercentCondition(condition) ? `${target}%` : `₹${target.toLocaleString('en-IN')}`;

export const getBaseAsset = (symbol: string): string => symbol.replace(/USDT$/, '');

export const serializeAlert = (record: {
  _id: unknown;
  symbol: string;
  coinName: string;
  condition: AlertCondition;
  target: number;
  scope?: AlertScope;
  assetQuantity?: number;
  assetValueAtCreationInr?: number;
  assetValueAtCreationUsd?: number;
  priceAtCreationInr: number;
  priceAtCreationUsd: number;
  channels: NotificationChannels;
  active: boolean;
  triggered: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  triggeredAt?: Date | string | null;
  triggerPriceInr?: number;
  triggerPriceUsd?: number;
}): AlertView => ({
  id: asId(record._id),
  symbol: record.symbol,
  coinName: record.coinName,
  condition: record.condition,
  target: record.target,
  scope: record.scope ?? 'market_price',
  assetQuantity: record.assetQuantity,
  assetValueAtCreationInr: record.assetValueAtCreationInr,
  assetValueAtCreationUsd: record.assetValueAtCreationUsd,
  priceAtCreationInr: record.priceAtCreationInr,
  priceAtCreationUsd: record.priceAtCreationUsd,
  channels: record.channels,
  active: record.active,
  triggered: record.triggered,
  createdAt: asIso(record.createdAt) ?? new Date().toISOString(),
  updatedAt: asIso(record.updatedAt) ?? new Date().toISOString(),
  triggeredAt: asIso(record.triggeredAt),
  triggerPriceInr: record.triggerPriceInr,
  triggerPriceUsd: record.triggerPriceUsd,
});

export const serializeAlertHistory = (record: {
  _id: unknown;
  alertId: string;
  symbol: string;
  coinName: string;
  condition: AlertCondition;
  target: number;
  triggerPriceInr: number;
  triggerPriceUsd: number;
  percentChangeFromCreation: number;
  message: string;
  deliveredToTelegram: boolean;
  deliveredToEmail: boolean;
  createdAt: Date | string;
}): AlertHistoryView => ({
  id: asId(record._id),
  alertId: record.alertId,
  symbol: record.symbol,
  coinName: record.coinName,
  condition: record.condition,
  target: record.target,
  triggerPriceInr: record.triggerPriceInr,
  triggerPriceUsd: record.triggerPriceUsd,
  percentChangeFromCreation: record.percentChangeFromCreation,
  message: record.message,
  deliveredToTelegram: record.deliveredToTelegram,
  deliveredToEmail: record.deliveredToEmail,
  createdAt: asIso(record.createdAt) ?? new Date().toISOString(),
});
