import { useEffect, useRef, useState } from 'react';
import { AlertPanel } from './components/AlertPanel';
import { Dashboard } from './components/Dashboard';
import { Navbar } from './components/Navbar';
import { PortfolioPanel } from './components/PortfolioPanel';
import { api, getWsUrl } from './api';
import { useCryptoStore } from './store';
import type { CoinMarket, WsMessage } from './types';

interface Toast {
  id: number;
  title: string;
  body: string;
  tone: 'glow' | 'warn' | 'rose';
}

const playAlertTone = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.32);
    gain.gain.setValueAtTime(0.18, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
  } catch (error) {
    console.error('Unable to play alert sound:', error);
  }
};

const toastToneClasses: Record<Toast['tone'], string> = {
  glow: 'border-glow/40',
  warn: 'border-amber-300/40',
  rose: 'border-rose-400/40',
};

export default function App() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [bootstrapError, setBootstrapError] = useState('');
  const [browserOffline, setBrowserOffline] = useState(!navigator.onLine);

  const applyBootstrap = useCryptoStore((state) => state.applyBootstrap);
  const applyPriceUpdates = useCryptoStore((state) => state.applyPriceUpdates);
  const setLoadingBootstrap = useCryptoStore((state) => state.setLoadingBootstrap);
  const setLoadingChart = useCryptoStore((state) => state.setLoadingChart);
  const setChartHistory = useCryptoStore((state) => state.setChartHistory);
  const setConnectionStatus = useCryptoStore((state) => state.setConnectionStatus);
  const selectedSymbol = useCryptoStore((state) => state.selectedSymbol);
  const prependHistoryEntry = useCryptoStore((state) => state.prependHistoryEntry);
  const markAlertTriggered = useCryptoStore((state) => state.markAlertTriggered);
  const soundEnabled = useCryptoStore((state) => state.soundEnabled);
  const browserNotificationsEnabled = useCryptoStore((state) => state.browserNotificationsEnabled);
  const setBrowserNotificationsEnabled = useCryptoStore((state) => state.setBrowserNotificationsEnabled);
  const browserNotificationPermission = useCryptoStore((state) => state.browserNotificationPermission);
  const setBrowserNotificationPermission = useCryptoStore((state) => state.setBrowserNotificationPermission);

  const soundEnabledRef = useRef(soundEnabled);
  const browserNotificationsEnabledRef = useRef(browserNotificationsEnabled);
  const browserNotificationPermissionRef = useRef(browserNotificationPermission);
  const updateQueueRef = useRef<Map<string, CoinMarket>>(new Map());
  const flushTimeoutRef = useRef<number | null>(null);

  const pushToast = (title: string, body: string, tone: Toast['tone']) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, title, body, tone }].slice(-4));

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4600);
  };

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    browserNotificationsEnabledRef.current = browserNotificationsEnabled;
  }, [browserNotificationsEnabled]);

  useEffect(() => {
    browserNotificationPermissionRef.current = browserNotificationPermission;
  }, [browserNotificationPermission]);

  useEffect(() => {
    if (!('Notification' in window)) {
      setBrowserNotificationPermission('unsupported');
      setBrowserNotificationsEnabled(false);
      return;
    }

    setBrowserNotificationPermission(Notification.permission);
  }, [setBrowserNotificationPermission, setBrowserNotificationsEnabled]);

  useEffect(() => {
    if (!browserNotificationsEnabled) {
      return;
    }

    if (!('Notification' in window)) {
      setBrowserNotificationPermission('unsupported');
      setBrowserNotificationsEnabled(false);
      pushToast('Browser Alerts', 'This browser does not support native notifications.', 'warn');
      return;
    }

    if (Notification.permission === 'granted') {
      setBrowserNotificationPermission('granted');
      return;
    }

    if (Notification.permission === 'denied') {
      setBrowserNotificationPermission('denied');
      setBrowserNotificationsEnabled(false);
      pushToast('Browser Alerts', 'Browser notifications are blocked. Enable them in site settings first.', 'warn');
      return;
    }

    void Notification.requestPermission().then((permission) => {
      setBrowserNotificationPermission(permission);
      if (permission !== 'granted') {
        setBrowserNotificationsEnabled(false);
        pushToast('Browser Alerts', 'Permission was not granted, so alerts will stay in-app only.', 'warn');
        return;
      }

      pushToast('Browser Alerts', 'Native browser notifications are now enabled.', 'glow');
    });
  }, [
    browserNotificationsEnabled,
    setBrowserNotificationPermission,
    setBrowserNotificationsEnabled,
  ]);

  useEffect(() => {
    const handleOnline = () => setBrowserOffline(false);
    const handleOffline = () => setBrowserOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadBootstrap = async () => {
      try {
        setLoadingBootstrap(true);
        const response = await api.getBootstrap();
        if (!cancelled) {
          applyBootstrap(response);
          setBootstrapError('');
        }
      } catch (error) {
        if (!cancelled) {
          setBootstrapError(
            error instanceof Error ? `${error.message} Showing cached data when available.` : 'Unable to load bootstrap data.'
          );
          setLoadingBootstrap(false);
        }
      }
    };

    void loadBootstrap();

    return () => {
      cancelled = true;
    };
  }, [applyBootstrap, setLoadingBootstrap]);

  useEffect(() => {
    if (!selectedSymbol) {
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      try {
        setLoadingChart(true);
        const history = await api.getHistory(selectedSymbol);
        if (!cancelled) {
          setChartHistory(history);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadingChart(false);
        }
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedSymbol, setChartHistory, setLoadingChart]);

  useEffect(() => {
    let closed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const flushQueuedUpdates = () => {
      flushTimeoutRef.current = null;
      const updates = [...updateQueueRef.current.values()];
      updateQueueRef.current.clear();
      if (updates.length > 0) {
        applyPriceUpdates(updates);
      }
    };

    const queueUpdates = (updates: CoinMarket[]) => {
      updates.forEach((update) => updateQueueRef.current.set(update.symbol, update));

      if (flushTimeoutRef.current) {
        window.clearTimeout(flushTimeoutRef.current);
      }

      flushTimeoutRef.current = window.setTimeout(flushQueuedUpdates, 120);
    };

    const connect = () => {
      setConnectionStatus('connecting', 'Opening realtime bridge...');
      socket = new WebSocket(getWsUrl());

      socket.onopen = () => {
        setConnectionStatus('live', 'Realtime bridge connected');
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as WsMessage;

        if (message.type === 'prices') {
          queueUpdates(message.payload);
          return;
        }

        if (message.type === 'bootstrap') {
          queueUpdates(message.payload.coins);
          return;
        }

        if (message.type === 'status') {
          setConnectionStatus(message.payload.status, message.payload.message);
          return;
        }

        prependHistoryEntry(message.payload);
        markAlertTriggered(message.payload.alertId);
        pushToast(message.payload.coinName, message.payload.message, 'glow');

        if (
          browserNotificationsEnabledRef.current &&
          browserNotificationPermissionRef.current === 'granted' &&
          'Notification' in window
        ) {
          const notification = new Notification(`CryptoNova: ${message.payload.coinName}`, {
            body: message.payload.message,
            tag: message.payload.id,
          });
          notification.onclick = () => window.focus();
        }

        if (soundEnabledRef.current) {
          playAlertTone();
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (closed) {
          return;
        }

        setConnectionStatus('reconnecting', 'Realtime bridge disconnected. Retrying...');
        reconnectTimer = window.setTimeout(connect, 2400);
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      if (flushTimeoutRef.current) {
        window.clearTimeout(flushTimeoutRef.current);
      }
      socket?.close();
    };
  }, [applyPriceUpdates, markAlertTriggered, prependHistoryEntry, setConnectionStatus]);

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-10 h-64 w-64 animate-float rounded-full bg-glow/10 blur-[120px]" />
        <div className="absolute bottom-10 right-10 h-72 w-72 animate-float rounded-full bg-neon/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Navbar />

        {browserOffline ? (
          <div className="glass-panel border-amber-300/20 bg-amber-300/10 px-5 py-4 text-sm text-amber-100">
            Your browser is offline. Cached market data and server-side alerts remain available, but live UI updates will resume once connectivity returns.
          </div>
        ) : null}

        {bootstrapError ? (
          <div className="glass-panel border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-100">
            {bootstrapError}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_400px]">
          <Dashboard />
          <div className="space-y-6">
            <PortfolioPanel />
            <AlertPanel />
          </div>
        </div>
      </div>

      <div className="fixed right-4 top-24 z-50 flex w-[min(340px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card ${toastToneClasses[toast.tone]}`}>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{toast.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-100">{toast.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
