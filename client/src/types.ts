export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';
export type FilterMode = 'all' | 'watchlist' | 'gainers' | 'losers';
export type SortKey = 'rank' | 'priceInr' | 'change24h' | 'volume24h';
export type AlertCondition =
  | 'above'
  | 'below'
  | 'change'
  | 'percent'
  | 'change_up'
  | 'change_down'
  | 'percent_up'
  | 'percent_down';
export type BrowserNotificationPermissionState = NotificationPermission | 'unsupported';
export type AlertScope = 'market_price' | 'holding_value';

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

export const DIRECTIONAL_ALERT_OPTIONS: Array<{ value: AlertCondition; label: string }> = [
  { value: 'above', label: ALERT_CONDITION_LABELS.above },
  { value: 'below', label: ALERT_CONDITION_LABELS.below },
  { value: 'change_up', label: ALERT_CONDITION_LABELS.change_up },
  { value: 'change_down', label: ALERT_CONDITION_LABELS.change_down },
  { value: 'percent_up', label: ALERT_CONDITION_LABELS.percent_up },
  { value: 'percent_down', label: ALERT_CONDITION_LABELS.percent_down },
];

export const isPercentCondition = (condition: AlertCondition) =>
  condition === 'percent' || condition === 'percent_up' || condition === 'percent_down';

export interface NotificationChannels {
  telegram: boolean;
  email: boolean;
}

export interface PortfolioAsset {
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

export interface BinancePortfolio {
  assets: PortfolioAsset[];
  totalValueUsd: number;
  totalValueInr: number;
  syncedAt: string;
  unsupportedAssets: string[];
}

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
  flashToken?: number;
}

export interface PriceHistoryPoint {
  time: string;
  priceUsd: number;
  priceInr: number;
}

export interface AlertRecord {
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

export interface AlertHistoryEntry {
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
  alerts: AlertRecord[];
  history: AlertHistoryEntry[];
  portfolio: BinancePortfolio | null;
  status: ServerStatus;
  serverTime: string;
}

export interface CreateAlertPayload {
  symbol: string;
  condition: AlertCondition;
  target: number;
  scope?: AlertScope;
  assetQuantity?: number;
  channels: NotificationChannels;
}

export interface SyncBinancePortfolioPayload {
  apiKey: string;
  apiSecret: string;
}

export type WsMessage =
  | {
      type: 'status';
      payload: ServerStatus;
      serverTime: string;
    }
  | {
      type: 'prices';
      payload: CoinMarket[];
      serverTime: string;
    }
  | {
      type: 'bootstrap';
      payload: {
        coins: CoinMarket[];
        activeAlerts: number;
      };
      serverTime: string;
    }
  | {
      type: 'alert_triggered';
      payload: AlertHistoryEntry;
      serverTime: string;
    };
