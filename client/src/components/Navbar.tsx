import clsx from 'clsx';
import { useCryptoStore } from '../store';
import cryptoNovaLogo from '../assets/cryptonova-logo.svg';

const statusStyles = {
  live: 'bg-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.55)]',
  connecting: 'bg-amber-300 shadow-[0_0_30px_rgba(253,224,71,0.45)]',
  reconnecting: 'bg-amber-300 shadow-[0_0_30px_rgba(253,224,71,0.45)]',
  offline: 'bg-rose-400 shadow-[0_0_30px_rgba(251,113,133,0.4)]',
} as const;

export function Navbar() {
  const search = useCryptoStore((state) => state.search);
  const setSearch = useCryptoStore((state) => state.setSearch);
  const soundEnabled = useCryptoStore((state) => state.soundEnabled);
  const setSoundEnabled = useCryptoStore((state) => state.setSoundEnabled);
  const browserNotificationsEnabled = useCryptoStore((state) => state.browserNotificationsEnabled);
  const setBrowserNotificationsEnabled = useCryptoStore((state) => state.setBrowserNotificationsEnabled);
  const browserNotificationPermission = useCryptoStore((state) => state.browserNotificationPermission);
  const connectionStatus = useCryptoStore((state) => state.connectionStatus);
  const connectionMessage = useCryptoStore((state) => state.connectionMessage);
  const watchlistCount = useCryptoStore((state) => state.watchlist.length);
  const marketCount = useCryptoStore((state) => state.coins.length);

  return (
    <header className="glass-panel relative overflow-hidden px-4 py-4 sm:px-6">
      <div className="absolute inset-y-0 right-0 w-56 bg-gradient-to-l from-glow/10 via-neon/10 to-transparent blur-3xl" />
      <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black/20 shadow-[0_0_35px_rgba(124,247,200,0.12)]">
            <img
              src={cryptoNovaLogo}
              alt="CryptoNova logo"
              className="h-16 w-28 object-cover sm:h-20 sm:w-36"
            />
          </div>
          <div>
            <p className="panel-title">Real-Time Desk</p>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">CryptoNova</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-400">
              Live market radar with server-side alerts, browser notifications, portfolio sync, and offline-safe monitoring.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:min-w-[420px] xl:max-w-[480px] xl:flex-1">
          <label className="panel-title">Search Market</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by coin or ticker..."
              className="input-surface w-full pl-10"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="glass-panel flex min-w-[220px] items-center gap-3 rounded-2xl px-4 py-3">
            <span className={clsx('h-2.5 w-2.5 rounded-full', statusStyles[connectionStatus])} />
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Feed</p>
              <p className="text-sm font-medium text-slate-100">{connectionMessage}</p>
            </div>
          </div>

          <div className="stat-chip">{marketCount || 0} markets</div>
          <div className="stat-chip">{watchlistCount} watchlist</div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={clsx(
              'rounded-2xl border px-4 py-3 text-sm font-medium transition',
              soundEnabled
                ? 'border-glow/40 bg-glow/10 text-glow'
                : 'border-white/10 bg-white/5 text-slate-400'
            )}
          >
            Sound {soundEnabled ? 'On' : 'Off'}
          </button>

          <button
            type="button"
            onClick={() => setBrowserNotificationsEnabled(!browserNotificationsEnabled)}
            disabled={browserNotificationPermission === 'unsupported'}
            className={clsx(
              'rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
              browserNotificationsEnabled
                ? 'border-neon/40 bg-neon/10 text-neon'
                : 'border-white/10 bg-white/5 text-slate-400'
            )}
          >
            Browser Alerts{' '}
            {browserNotificationPermission === 'unsupported'
              ? 'Unavailable'
              : browserNotificationPermission === 'denied'
                ? 'Blocked'
              : browserNotificationsEnabled
                ? 'On'
                : 'Off'}
          </button>
        </div>
      </div>
    </header>
  );
}
