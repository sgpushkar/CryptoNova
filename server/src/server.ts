import 'dotenv/config';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { evaluateSymbol, getActiveAlertCount, registerAlert, removeAlert, startAlertEngine, syncAlertCache } from './alertEngine';
import { fetchBinancePortfolio } from './binancePortfolio';
import { AlertHistoryModel, AlertModel, connectToDatabase } from './models';
import { priceStore } from './priceStore';
import { attachRealtimeServer, getRealtimeStatus, startBinanceBridge } from './websocket';
import { isAlertCondition, serializeAlert, serializeAlertHistory, type CreateAlertBody } from './types';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  })
);
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    realtime: getRealtimeStatus(),
    activeAlerts: getActiveAlertCount(),
    serverTime: new Date().toISOString(),
  });
});

app.get('/api/bootstrap', async (_request, response, next) => {
  try {
    const [alerts, history] = await Promise.all([
      AlertModel.find().sort({ createdAt: -1 }).limit(40),
      AlertHistoryModel.find().sort({ createdAt: -1 }).limit(40),
    ]);

    response.json({
      markets: priceStore.getTop(50),
      alerts: alerts.map((record) => serializeAlert(record.toObject())),
      history: history.map((record) => serializeAlertHistory(record.toObject())),
      portfolio: null,
      status: getRealtimeStatus(),
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.post(
  '/api/binance/portfolio',
  async (
    request: Request<unknown, unknown, { apiKey?: string; apiSecret?: string }>,
    response,
    next
  ) => {
    try {
      const apiKey = request.body.apiKey?.trim();
      const apiSecret = request.body.apiSecret?.trim();

      if (!apiKey || !apiSecret) {
        response.status(400).json({ error: 'Binance API key and secret are required.' });
        return;
      }

      const portfolio = await fetchBinancePortfolio(apiKey, apiSecret);
      response.json(portfolio);
    } catch (error) {
      next(error);
    }
  }
);

app.get('/api/markets/:symbol/history', (request, response) => {
  const symbol = String(request.params.symbol || '').toUpperCase();
  const limit = Math.min(240, Math.max(20, Number(request.query.limit || 120)));
  response.json(priceStore.getHistory(symbol, limit));
});

app.post('/api/alerts', async (request: Request<unknown, unknown, Partial<CreateAlertBody>>, response, next) => {
  try {
    const { symbol, condition, target, channels, scope, assetQuantity } = request.body;

    if (!symbol || !condition || typeof target !== 'number') {
      response.status(400).json({ error: 'Symbol, condition, and target are required.' });
      return;
    }

    if (!isAlertCondition(condition)) {
      response.status(400).json({ error: 'Unsupported alert condition.' });
      return;
    }

    if (target <= 0) {
      response.status(400).json({ error: 'Target must be greater than zero.' });
      return;
    }

    const normalizedChannels = {
      telegram: false,
      email: false,
    };

    const snapshot = priceStore.getSnapshot(symbol.toUpperCase());

    if (!snapshot) {
      response.status(400).json({
        error: 'Live price data is not available for that coin yet. Wait a moment and try again.',
      });
      return;
    }

    const normalizedScope = scope === 'holding_value' ? 'holding_value' : 'market_price';

    if (normalizedScope === 'holding_value' && (typeof assetQuantity !== 'number' || assetQuantity <= 0)) {
      response.status(400).json({ error: 'A positive asset quantity is required for holding-value reminders.' });
      return;
    }

    const assetValueAtCreationInr = normalizedScope === 'holding_value' ? snapshot.priceInr * (assetQuantity as number) : undefined;
    const assetValueAtCreationUsd = normalizedScope === 'holding_value' ? snapshot.priceUsd * (assetQuantity as number) : undefined;

    const createdAlert = await AlertModel.create({
      symbol: snapshot.symbol,
      coinName: snapshot.name,
      condition,
      target,
      scope: normalizedScope,
      assetQuantity: normalizedScope === 'holding_value' ? assetQuantity : undefined,
      assetValueAtCreationInr,
      assetValueAtCreationUsd,
      priceAtCreationInr: snapshot.priceInr,
      priceAtCreationUsd: snapshot.priceUsd,
      channels: normalizedChannels,
      active: true,
      triggered: false,
    });

    registerAlert(serializeAlert(createdAlert.toObject()));
    await evaluateSymbol(snapshot.symbol);

    const freshAlert = await AlertModel.findById(createdAlert._id);
    response.status(201).json({
      alert: serializeAlert((freshAlert ?? createdAlert).toObject()),
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/alerts/:id', async (request, response, next) => {
  try {
    const alertId = String(request.params.id);
    const deleted = await AlertModel.findByIdAndDelete(alertId);

    if (!deleted) {
      response.status(404).json({ error: 'Alert not found.' });
      return;
    }

    removeAlert(alertId);
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  response.status(500).json({
    error: error instanceof Error ? error.message : 'Unexpected server error.',
  });
});

const clientDistPath = path.resolve(__dirname, '../../client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api')) {
      next();
      return;
    }

    response.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const port = Number(process.env.PORT || 8080);

const start = async () => {
  await connectToDatabase();
  await syncAlertCache();
  startAlertEngine();

  const httpServer = http.createServer(app);
  attachRealtimeServer(httpServer);
  startBinanceBridge();

  httpServer.listen(port, () => {
    console.log(`CryptoNova server listening on http://localhost:${port}`);
  });
};

void start().catch((error) => {
  console.error('Failed to start CryptoNova:', error);
  process.exit(1);
});
