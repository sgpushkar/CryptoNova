import type {
  AlertRecord,
  BinancePortfolio,
  BootstrapResponse,
  CreateAlertPayload,
  PriceHistoryPoint,
  SyncBinancePortfolioPayload,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || 'Request failed.');
  }

  return (await response.json()) as T;
};

export const api = {
  getBootstrap: () => request<BootstrapResponse>('/api/bootstrap'),
  getHistory: (symbol: string) =>
    request<PriceHistoryPoint[]>(`/api/markets/${symbol}/history?limit=120`),
  createAlert: (payload: CreateAlertPayload) =>
    request<{ alert: AlertRecord }>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteAlert: (alertId: string) =>
    request<{ ok: true }>(`/api/alerts/${alertId}`, {
      method: 'DELETE',
    }),
  syncBinancePortfolio: (payload: SyncBinancePortfolioPayload) =>
    request<BinancePortfolio>('/api/binance/portfolio', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  return `${API_BASE.replace(/^http/, 'ws')}/ws`;
};
