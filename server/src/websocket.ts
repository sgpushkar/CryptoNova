import type { Server } from 'node:http';
import WebSocket, { WebSocketServer } from 'ws';
import { alertEvents, evaluateSymbol, getActiveAlertCount } from './alertEngine';
import { priceStore, TOP_50_SYMBOLS } from './priceStore';
import {
  type BinanceTickerPayload,
  type CoinMarket,
  type ConnectionStatus,
  type ServerStatus,
  type ServerWsMessage,
} from './types';

let frontendServer: WebSocketServer | null = null;
let binanceSocket: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimer: NodeJS.Timeout | null = null;
let flushTimer: NodeJS.Timeout | null = null;

const pendingSymbols = new Set<string>();
let realtimeStatus: ServerStatus = {
  status: 'connecting',
  message: 'Connecting to Binance market streams...',
};

const setStatus = (status: ConnectionStatus, message: string) => {
  realtimeStatus = { status, message };
  broadcast({
    type: 'status',
    payload: realtimeStatus,
    serverTime: new Date().toISOString(),
  });
};

const stringify = (message: ServerWsMessage) => JSON.stringify(message);

const broadcast = (message: ServerWsMessage) => {
  if (!frontendServer) {
    return;
  }

  const payload = stringify(message);
  frontendServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

const flushMarketUpdates = () => {
  flushTimer = null;
  const updates: CoinMarket[] = [];

  for (const symbol of pendingSymbols) {
    const snapshot = priceStore.getSymbolSnapshot(symbol);
    if (snapshot) {
      updates.push(snapshot);
    }
  }

  pendingSymbols.clear();

  if (updates.length > 0) {
    broadcast({
      type: 'prices',
      payload: updates,
      serverTime: new Date().toISOString(),
    });
  }
};

const queueMarketUpdate = (symbol: string) => {
  pendingSymbols.add(symbol);

  if (!flushTimer) {
    flushTimer = setTimeout(flushMarketUpdates, 250);
  }
};

const buildBinanceUrl = () => {
  const streams = TOP_50_SYMBOLS.map((symbol) => `${symbol.toLowerCase()}@ticker`).join('/');
  return `wss://stream.binance.com:9443/stream?streams=${streams}`;
};

const scheduleReconnect = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  const delay = Math.min(15000, 1000 * 2 ** reconnectAttempts);
  reconnectAttempts += 1;
  setStatus('reconnecting', `Realtime stream lost. Reconnecting in ${Math.ceil(delay / 1000)}s...`);

  reconnectTimer = setTimeout(() => {
    connectBinance();
  }, delay);
};

const connectBinance = () => {
  if (binanceSocket) {
    binanceSocket.removeAllListeners();
    binanceSocket.terminate();
  }

  setStatus(
    reconnectAttempts > 0 ? 'reconnecting' : 'connecting',
    reconnectAttempts > 0 ? 'Reconnecting to Binance market streams...' : 'Connecting to Binance market streams...'
  );

  binanceSocket = new WebSocket(buildBinanceUrl());

  binanceSocket.on('open', () => {
    reconnectAttempts = 0;
    setStatus('live', 'Live market stream connected');
  });

  binanceSocket.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as { data?: BinanceTickerPayload };
      if (!message.data) {
        return;
      }

      const updated = priceStore.recordTicker(message.data);
      if (!updated) {
        return;
      }

      queueMarketUpdate(updated.symbol);
      void evaluateSymbol(updated.symbol);
    } catch (error) {
      console.error('Unable to process Binance ticker payload:', error);
    }
  });

  binanceSocket.on('close', () => {
    setStatus('offline', 'Binance market stream disconnected');
    scheduleReconnect();
  });

  binanceSocket.on('error', (error) => {
    console.error('Binance websocket error:', error);
    setStatus('offline', 'Binance market stream error');
    binanceSocket?.close();
  });
};

export const attachRealtimeServer = (httpServer: Server) => {
  frontendServer = new WebSocketServer({
    server: httpServer,
    path: '/ws',
  });

  frontendServer.on('connection', (socket) => {
    socket.send(
      stringify({
        type: 'status',
        payload: realtimeStatus,
        serverTime: new Date().toISOString(),
      })
    );

    socket.send(
      stringify({
        type: 'bootstrap',
        payload: {
          coins: priceStore.getTop(50),
          activeAlerts: getActiveAlertCount(),
        },
        serverTime: new Date().toISOString(),
      })
    );
  });
};

export const startBinanceBridge = () => {
  alertEvents.on('alert_triggered', (historyEntry) => {
    broadcast({
      type: 'alert_triggered',
      payload: historyEntry,
      serverTime: new Date().toISOString(),
    });
  });

  connectBinance();
};

export const getRealtimeStatus = () => realtimeStatus;
