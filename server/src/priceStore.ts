import type { BinanceTickerPayload, CoinMarket, PriceHistoryPoint } from './types';
import { getBaseAsset } from './types';

type StoredCoin = CoinMarket & {
  history: PriceHistoryPoint[];
};

const USD_TO_INR = Number(process.env.USD_TO_INR || 83.35);
const HISTORY_LIMIT = 240;

export const TOP_50_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'TRXUSDT',
  'DOTUSDT',
  'LINKUSDT',
  'MATICUSDT',
  'LTCUSDT',
  'BCHUSDT',
  'NEARUSDT',
  'ATOMUSDT',
  'UNIUSDT',
  'APTUSDT',
  'ICPUSDT',
  'FILUSDT',
  'XLMUSDT',
  'ETCUSDT',
  'ARBUSDT',
  'OPUSDT',
  'HBARUSDT',
  'VETUSDT',
  'INJUSDT',
  'SUIUSDT',
  'MKRUSDT',
  'AAVEUSDT',
  'RUNEUSDT',
  'GRTUSDT',
  'ALGOUSDT',
  'THETAUSDT',
  'FTMUSDT',
  'SANDUSDT',
  'MANAUSDT',
  'AXSUSDT',
  'EGLDUSDT',
  'XTZUSDT',
  'SNXUSDT',
  'CRVUSDT',
  'DYDXUSDT',
  'STXUSDT',
  'SEIUSDT',
  'IMXUSDT',
  'RNDRUSDT',
  'TIAUSDT',
  'PEPEUSDT',
  'WIFUSDT',
] as const;

const COIN_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  BNB: 'BNB',
  SOL: 'Solana',
  XRP: 'XRP',
  ADA: 'Cardano',
  DOGE: 'Dogecoin',
  AVAX: 'Avalanche',
  TRX: 'TRON',
  DOT: 'Polkadot',
  LINK: 'Chainlink',
  MATIC: 'Polygon',
  LTC: 'Litecoin',
  BCH: 'Bitcoin Cash',
  NEAR: 'NEAR Protocol',
  ATOM: 'Cosmos',
  UNI: 'Uniswap',
  APT: 'Aptos',
  ICP: 'Internet Computer',
  FIL: 'Filecoin',
  XLM: 'Stellar',
  ETC: 'Ethereum Classic',
  ARB: 'Arbitrum',
  OP: 'Optimism',
  HBAR: 'Hedera',
  VET: 'VeChain',
  INJ: 'Injective',
  SUI: 'Sui',
  MKR: 'Maker',
  AAVE: 'Aave',
  RUNE: 'THORChain',
  GRT: 'The Graph',
  ALGO: 'Algorand',
  THETA: 'Theta Network',
  FTM: 'Fantom',
  SAND: 'The Sandbox',
  MANA: 'Decentraland',
  AXS: 'Axie Infinity',
  EGLD: 'MultiversX',
  XTZ: 'Tezos',
  SNX: 'Synthetix',
  CRV: 'Curve DAO',
  DYDX: 'dYdX',
  STX: 'Stacks',
  SEI: 'Sei',
  IMX: 'Immutable',
  RNDR: 'Render',
  TIA: 'Celestia',
  PEPE: 'Pepe',
  WIF: 'dogwifhat',
};

class PriceStore {
  private readonly prices = new Map<string, StoredCoin>();

  private toView(record: StoredCoin): CoinMarket {
    const { history: _history, ...coin } = record;
    return coin;
  }

  recordTicker(payload: BinanceTickerPayload): CoinMarket | null {
    if (!TOP_50_SYMBOLS.includes(payload.s as (typeof TOP_50_SYMBOLS)[number])) {
      return null;
    }

    const existing = this.prices.get(payload.s);
    const priceUsd = Number(payload.c);
    const priceInr = priceUsd * USD_TO_INR;
    const baseAsset = getBaseAsset(payload.s);
    const now = new Date().toISOString();

    const next: StoredCoin = {
      symbol: payload.s,
      baseAsset,
      name: COIN_NAMES[baseAsset] || baseAsset,
      rank: TOP_50_SYMBOLS.indexOf(payload.s as (typeof TOP_50_SYMBOLS)[number]) + 1,
      priceUsd,
      priceInr,
      change24h: Number(payload.P),
      volume24h: Number(payload.q),
      high24h: Number(payload.h) * USD_TO_INR,
      low24h: Number(payload.l) * USD_TO_INR,
      direction: existing
        ? priceUsd > existing.priceUsd
          ? 'up'
          : priceUsd < existing.priceUsd
            ? 'down'
            : existing.direction
        : 'flat',
      lastUpdated: now,
      history: existing?.history ?? [],
    };

    next.history = [...next.history, { time: now, priceUsd, priceInr }].slice(-HISTORY_LIMIT);
    this.prices.set(payload.s, next);
    return this.toView(next);
  }

  getTop(limit = 50): CoinMarket[] {
    return [...this.prices.values()]
      .sort((left, right) => left.rank - right.rank)
      .slice(0, limit)
      .map((entry) => this.toView(entry));
  }

  getSnapshot(symbol: string): StoredCoin | undefined {
    return this.prices.get(symbol);
  }

  getHistory(symbol: string, limit = 120): PriceHistoryPoint[] {
    const coin = this.prices.get(symbol);
    return coin ? coin.history.slice(-limit) : [];
  }

  getSymbolSnapshot(symbol: string): CoinMarket | undefined {
    const coin = this.prices.get(symbol);
    return coin ? this.toView(coin) : undefined;
  }
}

export const priceStore = new PriceStore();
