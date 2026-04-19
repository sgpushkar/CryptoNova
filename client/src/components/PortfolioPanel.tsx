import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { api } from '../api';
import { useCryptoStore } from '../store';

const formatInr = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: value >= 100 ? 2 : 4,
  }).format(value);

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);

export function PortfolioPanel() {
  const portfolio = useCryptoStore((state) => state.portfolio);
  const setPortfolio = useCryptoStore((state) => state.setPortfolio);
  const setSelectedSymbol = useCryptoStore((state) => state.setSelectedSymbol);
  const setSelectedHoldingAsset = useCryptoStore((state) => state.setSelectedHoldingAsset);

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const supportedAssets = useMemo(
    () => (portfolio?.assets || []).filter((asset) => asset.supported && asset.symbol),
    [portfolio]
  );

  const handleSync = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    if (!apiKey.trim() || !apiSecret.trim()) {
      setErrorMessage('Enter your Binance API key and secret to sync holdings.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.syncBinancePortfolio({
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
      });
      setPortfolio(response);
      const firstSupportedAsset = response.assets.find((asset) => asset.supported && asset.symbol);
      if (firstSupportedAsset) {
        setSelectedSymbol(firstSupportedAsset.symbol);
        setSelectedHoldingAsset(firstSupportedAsset.asset);
      }
      setApiSecret('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sync Binance portfolio.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="panel-title">Portfolio Sync</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Binance holdings</h2>
        </div>
        <div className="stat-chip">{supportedAssets.length} supported</div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        Sync a user&apos;s Binance balances, value them against the live feed already running in CryptoNova, and then create reminders only for assets they actually hold.
      </p>

      <form onSubmit={handleSync} className="mt-6 space-y-4">
        <div>
          <label className="panel-title">Binance API Key</label>
          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            className="input-surface mt-2 w-full"
            type="password"
            autoComplete="off"
            placeholder="Paste read-only API key"
          />
        </div>

        <div>
          <label className="panel-title">Binance API Secret</label>
          <input
            value={apiSecret}
            onChange={(event) => setApiSecret(event.target.value)}
            className="input-surface mt-2 w-full"
            type="password"
            autoComplete="off"
            placeholder="Paste API secret"
          />
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        <button
          disabled={submitting}
          className="w-full rounded-2xl bg-gradient-to-r from-glow to-neon px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Syncing Binance account...' : 'Sync Binance portfolio'}
        </button>
      </form>

      {portfolio ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="panel-title">Portfolio Value</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatInr(portfolio.totalValueInr)}</p>
              <p className="mt-1 text-sm text-slate-400">{formatUsd(portfolio.totalValueUsd)}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="panel-title">Last Sync</p>
              <p className="mt-2 text-sm text-white">{new Date(portfolio.syncedAt).toLocaleString()}</p>
              <p className="mt-1 text-sm text-slate-400">
                {portfolio.unsupportedAssets.length > 0
                  ? `${portfolio.unsupportedAssets.length} assets are outside the tracked live universe.`
                  : 'All synced assets can be used for reminders.'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {portfolio.assets.slice(0, 8).map((asset) => (
              <div key={asset.asset} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {asset.name} <span className="font-mono text-slate-400">({asset.asset})</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Balance {asset.total.toFixed(6)} • Value {formatInr(asset.valueInr)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="stat-chip">{asset.allocationPercent.toFixed(1)}% allocation</span>
                      <span className={clsx('stat-chip', asset.supported ? 'text-glow' : 'text-slate-500')}>
                        {asset.supported ? 'Alert-ready' : 'Market unavailable'}
                      </span>
                    </div>
                  </div>

                  {asset.supported ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSymbol(asset.symbol);
                        setSelectedHoldingAsset(asset.asset);
                      }}
                      className="rounded-full border border-glow/30 bg-glow/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-glow transition hover:brightness-110"
                    >
                      Use in alerts
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
