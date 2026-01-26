import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, RefreshCw, X, Smartphone, Monitor, Globe, Wifi, WifiOff } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePWAReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  installPWA: () => Promise<boolean>;
  updateServiceWorker: () => void;
  clearCache: () => Promise<void>;
  getCacheSize: () => Promise<number>;
  syncOfflineData: () => Promise<void>;
  pendingSyncCount: number;
  isSyncing: boolean;
  manifest: PWAManifest | null;
}

interface PWAManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'portrait' | 'landscape' | 'any';
  background_color: string;
  theme_color: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  categories: string[];
  screenshots?: Array<{
    src: string;
    sizes: string;
    type: string;
    form_factor: 'wide' | 'narrow';
  }>;
  shortcuts?: Array<{
    name: string;
    short_name: string;
    description: string;
    url: string;
    icons: Array<{ src: string; sizes: string }>;
  }>;
}

interface OfflineDataItem {
  id: string;
  type: 'assertion' | 'dispute' | 'comment';
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

export function usePWA(): UsePWAReturn {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [manifest, setManifest] = useState<PWAManifest | null>(null);
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPromptRef.current = event as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      installPromptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    loadManifest();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const loadManifest = async () => {
    try {
      const response = await fetch('/manifest.json');
      if (response.ok) {
        const manifestData = await response.json();
        setManifest(manifestData);
      }
    } catch (error) {
      console.error('Failed to load manifest:', error);
    }
  };

  const installPWA = useCallback(async (): Promise<boolean> => {
    if (!installPromptRef.current) {
      return false;
    }

    await installPromptRef.current.prompt();
    const { outcome } = await installPromptRef.current.userChoice;

    if (outcome === 'accepted') {
      setIsInstallable(false);
      return true;
    }

    return false;
  }, []);

  const updateServiceWorker = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
    }
  }, []);

  const clearCache = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
    }

    if (window.caches) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  }, []);

  const getCacheSize = useCallback(async (): Promise<number> => {
    return new Promise((resolve) => {
      if (!('serviceWorker' in navigator)) {
        resolve(0);
        return;
      }

      navigator.serviceWorker.controller?.postMessage({ type: 'GET_CACHE_SIZE' });

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'CACHE_SIZE') {
          resolve(event.data.size);
          navigator.serviceWorker.removeEventListener('message', handleMessage);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      setTimeout(() => {
        resolve(0);
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }, 1000);
    });
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (!isOnline) return;

    setIsSyncing(true);

    try {
      const queue = await caches.open('insight-sync-queue');
      const requests = await queue.keys();
      setPendingSyncCount(requests.length);

      for (const request of requests) {
        try {
          const response = await queue.match(request);
          if (!response) continue;
          const data: OfflineDataItem = await response.json();

          await fetch(data.type, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
          });

          await queue.delete(request);
          setPendingSyncCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
          console.error('Sync failed for item:', error);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  useEffect(() => {
    if (isOnline && pendingSyncCount > 0) {
      syncOfflineData();
    }
  }, [isOnline, pendingSyncCount, syncOfflineData]);

  return {
    isInstallable,
    isInstalled,
    isOnline,
    installPWA,
    updateServiceWorker,
    clearCache,
    getCacheSize,
    syncOfflineData,
    pendingSyncCount,
    isSyncing,
    manifest,
  };
}

interface PWAInstallBannerProps {
  onDismiss?: () => void;
}

export function PWAInstallBanner({ onDismiss }: PWAInstallBannerProps) {
  const { isInstallable, installPWA, isInstalled } = usePWA();
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (isInstallable && !isInstalled) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setIsVisible(true);
      }
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    setIsInstalling(true);
    await installPWA();
    setIsInstalling(false);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-install-dismissed', String(Date.now()));
    onDismiss?.();
  };

  if (!isVisible || !isInstallable) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Install Insight
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Install Insight as an app for a faster, more immersive experience.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isInstalling ? 'Installing...' : 'Install'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OfflineIndicatorProps {
  variant?: 'banner' | 'toast' | 'badge';
}

export function OfflineIndicator({ variant = 'banner' }: OfflineIndicatorProps) {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  if (variant === 'badge') {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
        <WifiOff className="h-3 w-3" />
        Offline
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg shadow-lg animate-in fade-in slide-in-from-top duration-300">
        <WifiOff className="h-4 w-4 text-amber-600" />
        <span className="text-sm text-amber-800">You&apos;re offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 border-t border-amber-200">
      <WifiOff className="h-5 w-5 text-amber-600" />
      <span className="text-sm font-medium text-amber-800">
        You&apos;re currently offline. Some features may be limited.
      </span>
    </div>
  );
}

interface SyncStatusProps {
  showDetails?: boolean;
}

export function SyncStatus({ showDetails = false }: SyncStatusProps) {
  const { pendingSyncCount, isSyncing, isOnline, syncOfflineData } = usePWA();

  if (isOnline && pendingSyncCount === 0 && !isSyncing) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">All synced</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 text-purple-600 animate-spin" />
          <span className="text-sm text-purple-600">Syncing...</span>
        </>
      ) : !isOnline ? (
        <>
          <WifiOff className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-600">
            {pendingSyncCount} pending
          </span>
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 text-amber-600 animate-spin" />
          <span className="text-sm text-amber-600">
            {pendingSyncCount} pending sync
          </span>
        </>
      )}

      {showDetails && pendingSyncCount > 0 && (
        <button
          onClick={syncOfflineData}
          disabled={!isOnline || isSyncing}
          className="text-xs text-purple-600 hover:text-purple-700 underline disabled:opacity-50"
        >
          Sync now
        </button>
      )}
    </div>
  );
}

interface PWASettingsProps {
  onClose: () => void;
}

export function PWASettings({ onClose }: PWASettingsProps) {
  const {
    isInstalled,
    isOnline,
    clearCache,
    getCacheSize,
    updateServiceWorker,
    manifest,
  } = usePWA();

  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    getCacheSize().then(setCacheSize);
  }, [getCacheSize]);

  const handleClearCache = async () => {
    setIsClearing(true);
    await clearCache();
    await getCacheSize().then(setCacheSize);
    setIsClearing(false);
  };

  const formatCacheSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">PWA Settings</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Installation</h3>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {isInstalled ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Monitor className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm text-gray-700">
                  {isInstalled ? 'Installed as app' : 'Not installed'}
                </span>
              </div>
            </div>

            {manifest && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <img
                  src={manifest.icons[0]?.src || '/icon-192.png'}
                  alt=""
                  className="w-10 h-10 rounded-lg"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{manifest.name}</p>
                  <p className="text-xs text-gray-500">{manifest.short_name}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Storage</h3>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">Cache size</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {cacheSize !== null ? formatCacheSize(cacheSize) : 'Loading...'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-green-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-amber-600" />
                )}
                <span className="text-sm text-gray-700">Network status</span>
              </div>
              <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-amber-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={updateServiceWorker}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Update Service Worker
            </button>

            <button
              onClick={handleClearCache}
              disabled={isClearing}
              className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isClearing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  Clear Cache
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
