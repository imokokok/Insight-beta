"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X, RefreshCw, WifiOff } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

const STORAGE_KEYS = {
  PROMPT_DISMISSED: "pwa-prompt-dismissed",
  INSTALL_DATE: "pwa-install-date",
  UPDATE_AVAILABLE: "pwa-update-available",
} as const;

const PROMPT_DISMISSAL_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PWAInstallPrompt() {
  const { t } = useI18n();
  const [state, setState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    deferredPrompt: null,
  });
  const [showPrompt, setShowPrompt] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);

  const checkInstallStatus = useCallback(() => {
    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    setState((prev) => ({ ...prev, isInstalled }));
  }, []);

  const checkOnlineStatus = useCallback(() => {
    setState((prev) => ({ ...prev, isOnline: navigator.onLine }));
  }, []);

  const checkUpdateAvailability = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker?.controller
              ) {
                setUpdateAvailable(true);
                localStorage.setItem(STORAGE_KEYS.UPDATE_AVAILABLE, "true");
              }
            });
          }
        });
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
    }
  }, []);

  useEffect(() => {
    checkInstallStatus();
    checkOnlineStatus();
    checkUpdateAvailability();

    const wasDismissed = localStorage.getItem(STORAGE_KEYS.PROMPT_DISMISSED);
    const dismissDate = wasDismissed ? parseInt(wasDismissed) : 0;
    const shouldShowPrompt =
      Date.now() - dismissDate > PROMPT_DISMISSAL_DURATION;

    const updateAvailable = localStorage.getItem(STORAGE_KEYS.UPDATE_AVAILABLE);
    if (updateAvailable === "true") {
      setUpdateAvailable(true);
    }

    const installHandler = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      setState((prev) => ({
        ...prev,
        deferredPrompt: prompt,
        isInstallable: true,
      }));

      if (shouldShowPrompt) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", installHandler);

    const onlineHandler = () => checkOnlineStatus();
    const offlineHandler = () => checkOnlineStatus();

    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", installHandler);
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, [checkInstallStatus, checkOnlineStatus, checkUpdateAvailability]);

  const handleInstall = useCallback(async () => {
    if (!state.deferredPrompt) return;

    try {
      setInstallProgress(10);

      await state.deferredPrompt.prompt();
      setInstallProgress(50);

      const { outcome } = await state.deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setInstallProgress(100);
        setShowPrompt(false);
        setState((prev) => ({
          ...prev,
          deferredPrompt: null,
          isInstalled: true,
        }));

        localStorage.setItem(STORAGE_KEYS.INSTALL_DATE, Date.now().toString());
        localStorage.removeItem(STORAGE_KEYS.PROMPT_DISMISSED);
        localStorage.removeItem(STORAGE_KEYS.UPDATE_AVAILABLE);
      } else {
        setShowPrompt(false);
        setState((prev) => ({ ...prev, deferredPrompt: null }));
      }
    } catch (error) {
      console.error("Installation failed:", error);
      setInstallProgress(0);
    }
  }, [state.deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(STORAGE_KEYS.PROMPT_DISMISSED, Date.now().toString());
  }, []);

  const handleUpdate = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        setUpdateAvailable(false);
        localStorage.removeItem(STORAGE_KEYS.UPDATE_AVAILABLE);
      }
    } catch (error) {
      console.error("Failed to update service worker:", error);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const shouldShowInstallPrompt =
    showPrompt && state.isInstallable && !state.isInstalled;
  const shouldShowUpdatePrompt = updateAvailable && state.isInstalled;

  if (!shouldShowInstallPrompt && !shouldShowUpdatePrompt) {
    return null;
  }

  return (
    <>
      {shouldShowInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-8 z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-purple-100 dark:border-gray-700 p-4 max-w-md mx-auto md:mx-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <Download className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {t("pwa.installTitle")}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t("pwa.installDescription")}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Dismiss"
              >
                <X size={20} />
              </button>
            </div>

            {installProgress > 0 && installProgress < 100 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("pwa.installing")}
                  </span>
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    {installProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${installProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleInstall}
                disabled={installProgress > 0 && installProgress < 100}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {installProgress > 0 && installProgress < 100 ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t("pwa.installing")}
                  </span>
                ) : (
                  t("pwa.install")
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t("common.notNow")}
              </button>
            </div>
          </div>
        </div>
      )}

      {shouldShowUpdatePrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-8 z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-green-100 dark:border-gray-700 p-4 max-w-md mx-auto md:mx-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {t("pwa.updateAvailable")}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t("pwa.updateDescription")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUpdateAvailable(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Dismiss"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleUpdate}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all"
              >
                {t("pwa.update")}
              </button>
              <button
                onClick={handleRefresh}
                className="px-4 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t("common.refresh")}
              </button>
            </div>
          </div>
        </div>
      )}

      {!state.isOnline && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top-4 fade-in duration-500">
          <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg px-4 py-3 flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-yellow-700 dark:text-yellow-300" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                {t("pwa.offline")}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {t("pwa.offlineDescription")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function usePWAInstallStatus(): PWAInstallState {
  const [state, setState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    deferredPrompt: null,
  });

  useEffect(() => {
    const checkStatus = () => {
      const isInstalled =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes("android-app://");

      setState((prev) => ({
        ...prev,
        isInstalled,
        isOnline: navigator.onLine,
      }));
    };

    checkStatus();

    const onlineHandler = () => checkStatus();
    const offlineHandler = () => checkStatus();

    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  return state;
}

export function clearPWAStorage(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

export function getPWAInstallDate(): Date | null {
  const installDate = localStorage.getItem(STORAGE_KEYS.INSTALL_DATE);
  return installDate ? new Date(parseInt(installDate)) : null;
}

export function isPWAUpdateAvailable(): boolean {
  return localStorage.getItem(STORAGE_KEYS.UPDATE_AVAILABLE) === "true";
}
