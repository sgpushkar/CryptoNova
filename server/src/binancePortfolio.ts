import crypto from 'node:crypto';
import { priceStore } from './priceStore';
import type { BinancePortfolioResponse, PortfolioAssetView } from './types';

interface BinanceAccountBalance {
  asset: string;
  free: string;
  locked: string;
}

interface BinanceAccountResponse {
  balances: BinanceAccountBalance[];
}

interface BinanceServerTimeResponse {
  serverTime: number;
}

const BINANCE_API_BASE = 'https://api.binance.com';

const signQuery = (query: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(query).digest('hex');

const getSymbolForAsset = (asset: string) => {
  if (asset === 'USDT') {
    return 'USDT';
  }

  const spotSymbol = `${asset}USDT`;
  return priceStore.getSymbolSnapshot(spotSymbol) ? spotSymbol : '';
};

const getAssetName = (asset: string, symbol: string) => {
  if (asset === 'USDT') {
    return 'Tether USD';
  }

  return priceStore.getSymbolSnapshot(symbol)?.name ?? asset;
};

const fetchBinanceServerTime = async () => {
  const response = await fetch(`${BINANCE_API_BASE}/api/v3/time`);

  if (!response.ok) {
    throw new Error('Unable to sync time with Binance.');
  }

  const payload = (await response.json()) as BinanceServerTimeResponse;
  return payload.serverTime;
};

const fetchSigned = async <T>(path: string, apiKey: string, apiSecret: string) => {
  const serverTime = await fetchBinanceServerTime();
  const timestamp = serverTime;
  const recvWindow = 10000;
  const query = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
  const signature = signQuery(query, apiSecret);
  const url = `${BINANCE_API_BASE}${path}?${query}&signature=${signature}`;

  const response = await fetch(url, {
    headers: {
      'X-MBX-APIKEY': apiKey,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { msg?: string } | null;
    throw new Error(payload?.msg || 'Unable to read Binance account data.');
  }

  return (await response.json()) as T;
};

export const fetchBinancePortfolio = async (
  apiKey: string,
  apiSecret: string
): Promise<BinancePortfolioResponse> => {
  const account = await fetchSigned<BinanceAccountResponse>('/api/v3/account', apiKey, apiSecret);

  const preliminaryAssets = account.balances
    .map((balance) => {
      const free = Number(balance.free);
      const locked = Number(balance.locked);
      const total = free + locked;

      return {
        asset: balance.asset,
        free,
        locked,
        total,
      };
    })
    .filter((balance) => balance.total > 0);

  const assets: PortfolioAssetView[] = preliminaryAssets.map((balance) => {
    const symbol = getSymbolForAsset(balance.asset);

    if (balance.asset === 'USDT') {
      return {
        asset: balance.asset,
        symbol,
        name: getAssetName(balance.asset, symbol),
        free: balance.free,
        locked: balance.locked,
        total: balance.total,
        priceUsd: 1,
        priceInr: 83.35,
        valueUsd: balance.total,
        valueInr: balance.total * 83.35,
        allocationPercent: 0,
        supported: true,
      };
    }

    const snapshot = symbol ? priceStore.getSymbolSnapshot(symbol) : undefined;
    const priceUsd = snapshot?.priceUsd ?? 0;
    const priceInr = snapshot?.priceInr ?? 0;

    return {
      asset: balance.asset,
      symbol,
      name: getAssetName(balance.asset, symbol),
      free: balance.free,
      locked: balance.locked,
      total: balance.total,
      priceUsd,
      priceInr,
      valueUsd: balance.total * priceUsd,
      valueInr: balance.total * priceInr,
      allocationPercent: 0,
      supported: Boolean(snapshot) || balance.asset === 'USDT',
    };
  });

  const totalValueUsd = assets.reduce((sum, asset) => sum + asset.valueUsd, 0);
  const totalValueInr = assets.reduce((sum, asset) => sum + asset.valueInr, 0);

  const normalizedAssets = assets
    .map((asset) => ({
      ...asset,
      allocationPercent: totalValueUsd > 0 ? (asset.valueUsd / totalValueUsd) * 100 : 0,
    }))
    .sort((left, right) => right.valueUsd - left.valueUsd);

  return {
    assets: normalizedAssets,
    totalValueUsd,
    totalValueInr,
    syncedAt: new Date().toISOString(),
    unsupportedAssets: normalizedAssets.filter((asset) => !asset.supported).map((asset) => asset.asset),
  };
};
