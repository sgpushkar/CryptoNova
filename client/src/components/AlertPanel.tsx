import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { api } from '../api';
import { useCryptoStore } from '../store';
import {
  ALERT_CONDITION_LABELS,
  DIRECTIONAL_ALERT_OPTIONS,
  isPercentCondition,
  type AlertCondition,
  type AlertScope,
} from '../types';

const formatInr = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: value >= 100 ? 2 : 4,
  }).format(value);

const renderAlertTarget = (condition: AlertCondition, target: number) => {
  if (isPercentCondition(condition)) {
    return `${target}%`;
  }

  return formatInr(target);
};

export function AlertPanel() {
  const coins = useCryptoStore((state) => state.coins);
  const alerts = useCryptoStore((state) => state.alerts);
  const alertHistory = useCryptoStore((state) => state.alertHistory);
  const portfolio = useCryptoStore((state) => state.portfolio);
  const selectedSymbol = useCryptoStore((state) => state.selectedSymbol);
  const selectedHoldingAsset = useCryptoStore((state) => state.selectedHoldingAsset);
  const addAlert = useCryptoStore((state) => state.addAlert);
  const removeAlertFromStore = useCryptoStore((state) => state.removeAlert);
  const loadingBootstrap = useCryptoStore((state) => state.loadingBootstrap);

  const [symbol, setSymbol] = useState('');
  const [scope, setScope] = useState<AlertScope>('market_price');
  const [condition, setCondition] = useState<AlertCondition>('change_down');
  const [target, setTarget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!symbol && selectedSymbol) {
      setSymbol(selectedSymbol);
    }
  }, [selectedSymbol, symbol]);

  const coinOptions = useMemo(
    () =>
      coins.map((coin) => ({
        label: `${coin.name} (${coin.symbol})`,
        value: coin.symbol,
      })),
    [coins]
  );

  const portfolioAssetsBySymbol = useMemo(() => {
    const map = new Map<string, { asset: string; total: number; valueInr: number }>();
    for (const asset of portfolio?.assets || []) {
      if (asset.supported && asset.symbol) {
        map.set(asset.symbol, {
          asset: asset.asset,
          total: asset.total,
          valueInr: asset.valueInr,
        });
      }
    }
    return map;
  }, [portfolio]);

  const supportedHoldingCount = portfolioAssetsBySymbol.size;
  const selectedHolding = portfolioAssetsBySymbol.get(symbol);
  const holdingValueModeAvailable = supportedHoldingCount > 0;

  useEffect(() => {
    if (!selectedHoldingAsset) {
      return;
    }

    const matchingHolding = [...portfolioAssetsBySymbol.entries()].find(([, value]) => value.asset === selectedHoldingAsset);
    if (matchingHolding) {
      setSymbol(matchingHolding[0]);
      setScope('holding_value');
    }
  }, [portfolioAssetsBySymbol, selectedHoldingAsset]);

  useEffect(() => {
    if (scope === 'holding_value' && !holdingValueModeAvailable) {
      setScope('market_price');
    }
  }, [holdingValueModeAvailable, scope]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    const parsedTarget = Number(target);
    if (!symbol || Number.isNaN(parsedTarget) || parsedTarget <= 0) {
      setErrorMessage('Choose a coin and enter a valid threshold.');
      return;
    }

    if (scope === 'holding_value' && !selectedHolding) {
      setErrorMessage('Choose a coin marked In portfolio before creating a holding-value reminder.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.createAlert({
        symbol,
        condition,
        target: parsedTarget,
        scope,
        assetQuantity: scope === 'holding_value' ? selectedHolding?.total : undefined,
        channels: {
          telegram: false,
          email: false,
        },
      });

      addAlert(response.alert);
      setTarget('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create alert.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (alertId: string) => {
    try {
      await api.deleteAlert(alertId);
      removeAlertFromStore(alertId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete alert.');
    }
  };

  return (
    <aside className="space-y-6">
      <div className="glass-panel p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="panel-title">Alert Engine</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Asset-aware reminders</h2>
          </div>
          <div className="stat-chip">{alerts.length} live</div>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Alerts are now browser-first. Create a rule here and CryptoNova will track it on the backend, then surface it in the app
          and through browser notifications whenever your device has the site open with notification permission enabled.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="panel-title">Coin</label>
            <select value={symbol} onChange={(event) => setSymbol(event.target.value)} className="input-surface mt-2 w-full">
              <option value="">Select a coin</option>
              {coinOptions.map((coin) => (
                <option key={coin.value} value={coin.value}>
                  {coin.label}
                  {portfolioAssetsBySymbol.has(coin.value) ? ' • In portfolio' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setScope('market_price')}
              className={clsx(
                'rounded-2xl border px-4 py-3 text-left transition',
                scope === 'market_price' ? 'border-glow/40 bg-glow/10 text-glow' : 'border-white/10 bg-white/5 text-slate-400'
              )}
            >
              <p className="text-sm font-medium">Market price</p>
              <p className="mt-1 text-xs text-slate-400">Track the coin price itself.</p>
            </button>
            <button
              type="button"
              disabled={!holdingValueModeAvailable}
              onClick={() => setScope('holding_value')}
              className={clsx(
                'rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60',
                scope === 'holding_value'
                  ? 'border-neon/40 bg-neon/10 text-neon'
                  : 'border-white/10 bg-white/5 text-slate-400'
              )}
            >
              <p className="text-sm font-medium">My holding value</p>
              <p className="mt-1 text-xs text-slate-400">
                {selectedHolding
                  ? `${selectedHolding.total.toFixed(6)} units synced • current value ${formatInr(selectedHolding.valueInr)}`
                  : holdingValueModeAvailable
                    ? 'Synced successfully. Choose a coin marked In portfolio to use holding-value reminders.'
                    : 'Available after syncing a supported holding.'}
              </p>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="panel-title">Condition</label>
              <select
                value={condition}
                onChange={(event) => setCondition(event.target.value as AlertCondition)}
                className="input-surface mt-2 w-full"
              >
                {DIRECTIONAL_ALERT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="panel-title">{isPercentCondition(condition) ? 'Threshold (%)' : 'Threshold (INR)'}</label>
              <input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="input-surface mt-2 w-full"
                type="number"
                min="0"
                step={isPercentCondition(condition) ? '0.01' : '0.1'}
                placeholder={isPercentCondition(condition) ? '5' : scope === 'holding_value' ? '595 or 0.5' : '0.5'}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            Example:{' '}
            {scope === 'holding_value' && condition === 'below' && 'Notify me when my BNB holding value falls below Rs 595'}
            {scope === 'holding_value' && condition === 'change_down' && 'Notify me when my BNB holding value drops by Rs 0.5 from its synced value'}
            {scope === 'holding_value' && condition === 'percent_down' && 'Notify me when my SOL holding loses 3% of its value'}
            {scope === 'market_price' && condition === 'change_down' && 'Notify me when Bitcoin drops by Rs 0.5'}
            {scope === 'market_price' && condition === 'change_up' && 'Notify me when Ethereum increases by Rs 0.5'}
            {scope === 'market_price' && condition === 'percent_down' && 'Notify me when Solana falls by 3% from the current price'}
            {scope === 'market_price' && condition === 'percent_up' && 'Notify me when BNB gains 2% from the current price'}
            {scope === 'market_price' && condition === 'above' && 'Notify me when XRP trades above your INR target'}
            {scope === 'market_price' && condition === 'below' && 'Notify me when ADA trades below your INR target'}
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
            {submitting ? 'Creating reminder...' : 'Create reminder'}
          </button>
        </form>
      </div>

      <div className="glass-panel p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="panel-title">Live Alerts</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Active rules</h3>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {loadingBootstrap && alerts.length === 0
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-[22px] bg-white/[0.04]" />
              ))
            : null}

          {!loadingBootstrap && alerts.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-slate-400">
              No active alerts yet. Create one above and the server will keep watching for you.
            </div>
          ) : null}

          {alerts.map((alert) => (
            <div key={alert.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-white">{alert.coinName}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {alert.scope === 'holding_value' ? 'Holding value' : 'Market price'} • {ALERT_CONDITION_LABELS[alert.condition]}{' '}
                    {renderAlertTarget(alert.condition, alert.target)}
                  </p>
                  {alert.scope === 'holding_value' && typeof alert.assetValueAtCreationInr === 'number' ? (
                    <p className="mt-1 text-xs text-slate-500">Baseline value {formatInr(alert.assetValueAtCreationInr)}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(alert.id)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-400 transition hover:border-rose-400/40 hover:text-rose-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="panel-title">Triggered History</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Recent hits</h3>
          </div>
          <div className="stat-chip">{alertHistory.length}</div>
        </div>

        <div className="mt-4 space-y-3">
          {alertHistory.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-slate-400">
              Triggered alerts will appear here with delivery results.
            </div>
          ) : null}

          {alertHistory.slice(0, 8).map((entry) => (
            <div key={entry.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-white">{entry.coinName}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{entry.message}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {ALERT_CONDITION_LABELS[entry.condition]} {renderAlertTarget(entry.condition, entry.target)}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{new Date(entry.createdAt).toLocaleDateString()}</p>
                  <p className="mt-1">{new Date(entry.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
