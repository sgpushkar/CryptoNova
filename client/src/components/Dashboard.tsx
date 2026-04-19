import { useMemo } from 'react';
import clsx from 'clsx';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useCryptoStore } from '../store';
import type { CoinMarket, FilterMode, SortKey } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const formatInr = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: value >= 100 ? 2 : 4,
  }).format(value);

const compactNumber = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);

const filters: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'All Coins' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'gainers', label: 'Top Gainers' },
  { key: 'losers', label: 'Top Losers' },
];

const columns: { key: SortKey; label: string; align?: 'left' | 'right' }[] = [
  { key: 'rank', label: 'Rank' },
  { key: 'priceInr', label: 'Price', align: 'right' },
  { key: 'change24h', label: '24H %', align: 'right' },
  { key: 'volume24h', label: 'Volume', align: 'right' },
];

const sortCoins = (coins: CoinMarket[], sortKey: SortKey, sortDirection: 'asc' | 'desc') => {
  const direction = sortDirection === 'asc' ? 1 : -1;
  return [...coins].sort((left, right) => {
    const leftValue = left[sortKey];
    const rightValue = right[sortKey];

    if (leftValue < rightValue) {
      return -1 * direction;
    }

    if (leftValue > rightValue) {
      return 1 * direction;
    }

    return 0;
  });
};

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="glass-panel h-[360px] animate-pulse bg-white/[0.03]" />
    <div className="table-surface overflow-hidden">
      <div className="space-y-3 p-5">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  </div>
);

export function Dashboard() {
  const coins = useCryptoStore((state) => state.coins);
  const selectedHistory = useCryptoStore((state) => state.selectedHistory);
  const selectedSymbol = useCryptoStore((state) => state.selectedSymbol);
  const search = useCryptoStore((state) => state.search);
  const sortKey = useCryptoStore((state) => state.sortKey);
  const sortDirection = useCryptoStore((state) => state.sortDirection);
  const filterMode = useCryptoStore((state) => state.filterMode);
  const watchlist = useCryptoStore((state) => state.watchlist);
  const setSelectedSymbol = useCryptoStore((state) => state.setSelectedSymbol);
  const setSort = useCryptoStore((state) => state.setSort);
  const setFilterMode = useCryptoStore((state) => state.setFilterMode);
  const toggleWatchlist = useCryptoStore((state) => state.toggleWatchlist);
  const loadingBootstrap = useCryptoStore((state) => state.loadingBootstrap);
  const loadingChart = useCryptoStore((state) => state.loadingChart);

  const watchlistSet = useMemo(() => new Set(watchlist), [watchlist]);

  const visibleCoins = useMemo(() => {
    const query = search.trim().toLowerCase();
    let next = [...coins];

    if (query) {
      next = next.filter(
        (coin) =>
          coin.name.toLowerCase().includes(query) ||
          coin.baseAsset.toLowerCase().includes(query) ||
          coin.symbol.toLowerCase().includes(query)
      );
    }

    if (filterMode === 'watchlist') {
      next = next.filter((coin) => watchlistSet.has(coin.symbol));
    }

    if (filterMode === 'gainers') {
      return [...next].sort((left, right) => right.change24h - left.change24h);
    }

    if (filterMode === 'losers') {
      return [...next].sort((left, right) => left.change24h - right.change24h);
    }

    return sortCoins(next, sortKey, sortDirection);
  }, [coins, filterMode, search, sortDirection, sortKey, watchlistSet]);

  const selectedCoin = useMemo(() => {
    return coins.find((coin) => coin.symbol === selectedSymbol) ?? visibleCoins[0] ?? coins[0];
  }, [coins, selectedSymbol, visibleCoins]);

  const chartData = useMemo(() => {
    const color = (selectedCoin?.change24h || 0) >= 0 ? '#7cf7c8' : '#ff6b9e';

    return {
      labels: selectedHistory.map((point) =>
        new Date(point.time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      ),
      datasets: [
        {
          label: `${selectedCoin?.baseAsset || 'Coin'} live price`,
          data: selectedHistory.map((point) => point.priceInr),
          borderColor: color,
          backgroundColor: `${color}20`,
          fill: true,
          borderWidth: 2.2,
          pointRadius: 0,
          tension: 0.35,
        },
      ],
    };
  }, [selectedCoin, selectedHistory]);

  const chartOptions = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(8, 10, 15, 0.92)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (context) => formatInr(Number(context.parsed.y ?? 0)),
          },
        },
      },
      scales: {
        x: {
          ticks: { display: false },
          grid: { display: false },
          border: { display: false },
        },
        y: {
          ticks: {
            color: '#8fa2c9',
            callback: (value) => formatInr(Number(value)),
          },
          grid: { color: 'rgba(255,255,255,0.06)' },
          border: { display: false },
        },
      },
    }),
    []
  );

  if (loadingBootstrap && coins.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <section className="space-y-6">
      <div className="glass-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="panel-title">Market Spotlight</p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              {selectedCoin ? `${selectedCoin.name} (${selectedCoin.baseAsset})` : 'Select a coin'}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setFilterMode(filter.key)}
                  className={clsx(
                    'rounded-full border px-4 py-2 text-sm transition',
                    filterMode === filter.key
                      ? 'border-glow/40 bg-glow/10 text-glow'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {selectedCoin ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="glass-panel rounded-2xl px-4 py-3">
                <p className="panel-title">Live Price</p>
                <p className="mt-2 font-mono text-xl text-white">{formatInr(selectedCoin.priceInr)}</p>
              </div>
              <div className="glass-panel rounded-2xl px-4 py-3">
                <p className="panel-title">24H Move</p>
                <p
                  className={clsx(
                    'mt-2 font-mono text-xl',
                    selectedCoin.change24h >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  )}
                >
                  {selectedCoin.change24h >= 0 ? '+' : ''}
                  {selectedCoin.change24h.toFixed(2)}%
                </p>
              </div>
              <div className="glass-panel rounded-2xl px-4 py-3">
                <p className="panel-title">24H Volume</p>
                <p className="mt-2 font-mono text-xl text-white">{compactNumber(selectedCoin.volume24h)}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            {selectedCoin && !loadingChart && selectedHistory.length > 0 ? (
              <div className="h-[300px] sm:h-[340px]">
                <Line data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="h-[300px] animate-pulse rounded-[20px] bg-white/[0.04] sm:h-[340px]" />
            )}
          </div>

          {selectedCoin ? (
            <div className="grid gap-3">
              <div className="glass-panel rounded-2xl px-4 py-4">
                <p className="panel-title">Daily High</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatInr(selectedCoin.high24h)}</p>
              </div>
              <div className="glass-panel rounded-2xl px-4 py-4">
                <p className="panel-title">Daily Low</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatInr(selectedCoin.low24h)}</p>
              </div>
              <div className="glass-panel rounded-2xl px-4 py-4">
                <p className="panel-title">Last Tick</p>
                <p className="mt-2 text-sm text-slate-300">
                  {new Date(selectedCoin.lastUpdated).toLocaleTimeString()}
                </p>
              </div>
              <div className="glass-panel rounded-2xl px-4 py-4">
                <p className="panel-title">USD Reference</p>
                <p className="mt-2 text-lg font-semibold text-white">${selectedCoin.priceUsd.toFixed(4)}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="table-surface">
        <div className="flex items-center justify-between border-b soft-divider px-5 py-4">
          <div>
            <p className="panel-title">Market Board</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Top 50 coins with live ranking, watchlists, and instant price flashes</h3>
          </div>
          <div className="stat-chip">{visibleCoins.length} visible</div>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full">
            <thead>
              <tr className="border-b soft-divider text-left text-xs uppercase tracking-[0.22em] text-slate-500">
                <th className="px-5 py-4">Coin</th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={clsx(
                      'cursor-pointer px-5 py-4 transition hover:text-white',
                      column.align === 'right' && 'text-right'
                    )}
                    onClick={() => setSort(column.key)}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-5 py-4 text-right">Watch</th>
              </tr>
            </thead>
            <tbody>
              {visibleCoins.map((coin) => (
                <tr
                  key={coin.symbol}
                  onClick={() => setSelectedSymbol(coin.symbol)}
                  className={clsx(
                    'border-b soft-divider transition hover:bg-white/[0.03]',
                    selectedCoin?.symbol === coin.symbol && 'bg-white/[0.04]'
                  )}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent text-sm font-semibold text-white">
                        {coin.baseAsset.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{coin.name}</p>
                        <p className="font-mono text-xs text-slate-400">{coin.symbol}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-300">#{coin.rank}</td>
                  <td className="px-5 py-4 text-right">
                    <div
                      key={`${coin.symbol}-${coin.flashToken}`}
                      className={clsx(
                        'inline-flex rounded-2xl px-3 py-2 font-mono text-sm text-white',
                        coin.direction === 'up' && 'animate-flashUp text-emerald-300',
                        coin.direction === 'down' && 'animate-flashDown text-rose-300'
                      )}
                    >
                      {formatInr(coin.priceInr)}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={clsx('font-mono', coin.change24h >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                      {coin.change24h >= 0 ? '+' : ''}
                      {coin.change24h.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-slate-300">{compactNumber(coin.volume24h)}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleWatchlist(coin.symbol);
                      }}
                      className={clsx(
                        'rounded-full border px-3 py-2 text-xs uppercase tracking-[0.2em] transition',
                        watchlistSet.has(coin.symbol)
                          ? 'border-amber-300/40 bg-amber-300/10 text-amber-200'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      )}
                    >
                      {watchlistSet.has(coin.symbol) ? 'Saved' : 'Track'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 lg:hidden">
          {visibleCoins.map((coin) => (
            <div
              key={coin.symbol}
              onClick={() => setSelectedSymbol(coin.symbol)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  setSelectedSymbol(coin.symbol);
                }
              }}
              role="button"
              tabIndex={0}
              className={clsx(
                'glass-panel rounded-[24px] p-4 text-left',
                selectedCoin?.symbol === coin.symbol && 'border-glow/40 bg-glow/5'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{coin.name}</p>
                  <p className="font-mono text-xs text-slate-400">{coin.symbol}</p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleWatchlist(coin.symbol);
                  }}
                  className={clsx(
                    'rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.2em]',
                    watchlistSet.has(coin.symbol)
                      ? 'border-amber-300/40 bg-amber-300/10 text-amber-200'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  )}
                >
                  {watchlistSet.has(coin.symbol) ? 'Saved' : 'Track'}
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p
                    key={`${coin.symbol}-${coin.flashToken}-mobile`}
                    className={clsx(
                      'font-mono text-lg',
                      coin.direction === 'up' && 'animate-flashUp text-emerald-300',
                      coin.direction === 'down' && 'animate-flashDown text-rose-300',
                      coin.direction === 'flat' && 'text-white'
                    )}
                  >
                    {formatInr(coin.priceInr)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">24H volume {compactNumber(coin.volume24h)}</p>
                </div>
                <div className={clsx('font-mono text-sm', coin.change24h >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                  {coin.change24h >= 0 ? '+' : ''}
                  {coin.change24h.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {visibleCoins.length === 0 ? (
          <div className="px-5 py-16 text-center text-slate-400">
            No markets match the current search and filter combination.
          </div>
        ) : null}
      </div>
    </section>
  );
}
