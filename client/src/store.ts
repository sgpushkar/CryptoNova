import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AlertHistoryEntry,
  AlertRecord,
  BrowserNotificationPermissionState,
  BootstrapResponse,
  BinancePortfolio,
  CoinMarket,
  ConnectionStatus,
  FilterMode,
  PriceHistoryPoint,
  SortKey,
} from './types';

interface CryptoState {
  coins: CoinMarket[];
  alerts: AlertRecord[];
  alertHistory: AlertHistoryEntry[];
  portfolio: BinancePortfolio | null;
  selectedHoldingAsset: string;
  selectedHistory: PriceHistoryPoint[];
  selectedSymbol: string;
  search: string;
  sortKey: SortKey;
  sortDirection: 'asc' | 'desc';
  filterMode: FilterMode;
  watchlist: string[];
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  browserNotificationPermission: BrowserNotificationPermissionState;
  loadingBootstrap: boolean;
  loadingChart: boolean;
  connectionStatus: ConnectionStatus;
  connectionMessage: string;
  applyBootstrap: (payload: BootstrapResponse) => void;
  applyPriceUpdates: (updates: CoinMarket[]) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSearch: (value: string) => void;
  setSort: (key: SortKey) => void;
  setFilterMode: (mode: FilterMode) => void;
  toggleWatchlist: (symbol: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setBrowserNotificationsEnabled: (enabled: boolean) => void;
  setBrowserNotificationPermission: (permission: BrowserNotificationPermissionState) => void;
  setLoadingBootstrap: (value: boolean) => void;
  setLoadingChart: (value: boolean) => void;
  setChartHistory: (points: PriceHistoryPoint[]) => void;
  setConnectionStatus: (status: ConnectionStatus, message: string) => void;
  setPortfolio: (portfolio: BinancePortfolio | null) => void;
  setSelectedHoldingAsset: (asset: string) => void;
  addAlert: (alert: AlertRecord) => void;
  removeAlert: (alertId: string) => void;
  markAlertTriggered: (alertId: string) => void;
  prependHistoryEntry: (entry: AlertHistoryEntry) => void;
}

const mergeCoins = (existingCoins: CoinMarket[], updates: CoinMarket[]) => {
  const map = new Map(existingCoins.map((coin) => [coin.symbol, coin]));

  for (const update of updates) {
    const current = map.get(update.symbol);
    map.set(update.symbol, {
      ...(current || update),
      ...update,
      flashToken: Date.now() + Math.random(),
    });
  }

  return [...map.values()].sort((left, right) => left.rank - right.rank);
};

export const useCryptoStore = create<CryptoState>()(
  persist(
    (set) => ({
      coins: [],
      alerts: [],
      alertHistory: [],
      portfolio: null,
      selectedHoldingAsset: '',
      selectedHistory: [],
      selectedSymbol: '',
      search: '',
      sortKey: 'rank',
      sortDirection: 'asc',
      filterMode: 'all',
      watchlist: [],
      soundEnabled: true,
      browserNotificationsEnabled: false,
      browserNotificationPermission:
        typeof window === 'undefined' || !('Notification' in window) ? 'unsupported' : Notification.permission,
      loadingBootstrap: true,
      loadingChart: true,
      connectionStatus: 'connecting',
      connectionMessage: 'Connecting to live market feed...',
      applyBootstrap: (payload) =>
        set((state) => ({
          coins: mergeCoins(state.coins, payload.markets),
          alerts: payload.alerts.filter((alert) => alert.active && !alert.triggered),
          alertHistory: payload.history,
          portfolio: payload.portfolio,
          selectedSymbol:
            state.selectedSymbol && payload.markets.some((coin) => coin.symbol === state.selectedSymbol)
              ? state.selectedSymbol
              : payload.markets[0]?.symbol || '',
          connectionStatus: payload.status.status,
          connectionMessage: payload.status.message,
          loadingBootstrap: false,
        })),
      applyPriceUpdates: (updates) =>
        set((state) => ({
          coins: mergeCoins(state.coins, updates),
        })),
      setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
      setSearch: (value) => set({ search: value }),
      setSort: (key) =>
        set((state) => ({
          sortKey: key,
          sortDirection:
            state.sortKey === key ? (state.sortDirection === 'asc' ? 'desc' : 'asc') : key === 'rank' ? 'asc' : 'desc',
        })),
      setFilterMode: (mode) => set({ filterMode: mode }),
      toggleWatchlist: (symbol) =>
        set((state) => ({
          watchlist: state.watchlist.includes(symbol)
            ? state.watchlist.filter((entry) => entry !== symbol)
            : [...state.watchlist, symbol],
        })),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setBrowserNotificationsEnabled: (enabled) => set({ browserNotificationsEnabled: enabled }),
      setBrowserNotificationPermission: (permission) => set({ browserNotificationPermission: permission }),
      setLoadingBootstrap: (value) => set({ loadingBootstrap: value }),
      setLoadingChart: (value) => set({ loadingChart: value }),
      setChartHistory: (points) => set({ selectedHistory: points, loadingChart: false }),
      setConnectionStatus: (status, message) => set({ connectionStatus: status, connectionMessage: message }),
      setPortfolio: (portfolio) => set({ portfolio }),
      setSelectedHoldingAsset: (asset) => set({ selectedHoldingAsset: asset }),
      addAlert: (alert) =>
        set((state) => ({
          alerts: [alert, ...state.alerts.filter((item) => item.id !== alert.id)],
        })),
      removeAlert: (alertId) =>
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.id !== alertId),
        })),
      markAlertTriggered: (alertId) =>
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.id !== alertId),
        })),
      prependHistoryEntry: (entry) =>
        set((state) => ({
          alertHistory: [entry, ...state.alertHistory.filter((item) => item.id !== entry.id)].slice(0, 40),
        })),
    }),
    {
      name: 'cryptonova-store',
      partialize: (state) => ({
        coins: state.coins,
        alerts: state.alerts,
        alertHistory: state.alertHistory,
        portfolio: state.portfolio,
        selectedHoldingAsset: state.selectedHoldingAsset,
        selectedHistory: state.selectedHistory,
        selectedSymbol: state.selectedSymbol,
        watchlist: state.watchlist,
        soundEnabled: state.soundEnabled,
        browserNotificationsEnabled: state.browserNotificationsEnabled,
        browserNotificationPermission: state.browserNotificationPermission,
      }),
    }
  )
);
