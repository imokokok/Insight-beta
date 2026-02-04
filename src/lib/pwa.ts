/**
 * PWA Utilities
 * Helper functions for Progressive Web App features
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

class PWAManager {
  private state: PWAState = {
    isInstallable: false,
    isInstalled: false,
    isOffline: false,
    deferredPrompt: null,
  };

  private listeners: Set<(state: PWAState) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize(): void {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.state.deferredPrompt = e as BeforeInstallPromptEvent;
      this.state.isInstallable = true;
      this.notifyListeners();
    });

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      this.state.isInstalled = true;
      this.state.isInstallable = false;
      this.state.deferredPrompt = null;
      this.notifyListeners();
      logger.debug('PWA was installed');
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.state.isOffline = false;
      this.notifyListeners();
    });

    window.addEventListener('offline', () => {
      this.state.isOffline = true;
      this.notifyListeners();
    });

    // Check initial online status
    this.state.isOffline = !navigator.onLine;

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.state.isInstalled = true;
    }
  }

  /**
   * Subscribe to PWA state changes
   */
  subscribe(callback: (state: PWAState) => void): () => void {
    this.listeners.add(callback);
    callback(this.state);

    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this.state));
  }

  /**
   * Get current PWA state
   */
  getState(): PWAState {
    return { ...this.state };
  }

  /**
   * Trigger PWA install prompt
   */
  async install(): Promise<boolean> {
    if (!this.state.deferredPrompt) {
      return false;
    }

    try {
      await this.state.deferredPrompt.prompt();
      const choiceResult = await this.state.deferredPrompt.userChoice;

      this.state.deferredPrompt = null;
      this.state.isInstallable = false;
      this.notifyListeners();

      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('Failed to install PWA:', error);
      return false;
    }
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      logger.debug('Service workers are not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      logger.debug('Service worker registered:', registration);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              logger.debug('New service worker available');
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      logger.debug('Notifications are not supported');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Show notification
   */
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
    }
  }

  /**
   * Check if running as installed PWA
   */
  isRunningAsPWA(): boolean {
    if (typeof window === 'undefined') return false;

    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }

  /**
   * Check if offline
   */
  isOffline(): boolean {
    return this.state.isOffline;
  }

  /**
   * Check if PWA is installable
   */
  isInstallable(): boolean {
    return this.state.isInstallable;
  }

  /**
   * Check if PWA is installed
   */
  isInstalled(): boolean {
    return this.state.isInstalled;
  }
}

export const pwaManager = new PWAManager();
