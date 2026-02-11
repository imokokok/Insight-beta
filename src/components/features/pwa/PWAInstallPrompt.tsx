'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, X, Smartphone, Share2 } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';
import { isMobile, isIOS, isSafari } from '@/lib/utils/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // 检查是否已经安装
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 检查是否作为 PWA 运行
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 检查本地存储中是否已经关闭过提示
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (dismissedTime && Date.now() - dismissedTime < oneWeek) {
      setIsDismissed(true);
      return;
    }
  }, []);

  // 监听 beforeinstallprompt 事件
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 对于 iOS，显示自定义提示
    if (isIOS() && !isInstalled && !isDismissed) {
      // 延迟显示，避免页面加载时立即弹出
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isInstalled, isDismissed]);

  // 监听 appinstalled 事件
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsVisible(false);
    }

    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  if (!isVisible || isInstalled) return null;

  // iOS Safari 特殊提示
  if (isIOS() && isSafari()) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:bottom-8 md:left-auto md:right-8 md:w-96">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 p-4 shadow-2xl">
          {/* 关闭按钮 */}
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Share2 size={20} className="text-white" />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="font-semibold text-white">
                {t('pwa.iosInstallTitle')}
              </h3>
              <p className="mt-1 text-sm text-white/80">
                {t('pwa.iosInstallDescription')}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
                <span className="rounded bg-white/20 px-2 py-1">
                  {t('pwa.tapShare')}
                </span>
                <span>→</span>
                <span className="rounded bg-white/20 px-2 py-1">
                  {t('pwa.tapAddToHome')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 标准 PWA 安装提示
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:bottom-8 md:left-auto md:right-8 md:w-96">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 p-4 shadow-2xl">
        {/* 背景装饰 */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/10" />

        {/* 关闭按钮 */}
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 z-10 rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="relative flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
            {isMobile() ? (
              <Smartphone size={24} className="text-white" />
            ) : (
              <Download size={24} className="text-white" />
            )}
          </div>
          <div className="flex-1 pr-6">
            <h3 className="font-semibold text-white">
              {t('pwa.installTitle')}
            </h3>
            <p className="mt-1 text-sm text-white/80">
              {t('pwa.installDescription')}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstall}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-purple-600 shadow-sm transition-colors hover:bg-white/90"
              >
                {t('pwa.installButton')}
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t('pwa.laterButton')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// PWA 安装按钮（用于设置页面等）
export function PWAInstallButton() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 检查是否作为 PWA 运行
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS 始终显示手动安装提示
    if (isIOS() && isSafari()) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS() && isSafari()) {
      // iOS 显示提示
      alert(t('pwa.iosInstallAlert'));
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstallable(false);
    }

    setDeferredPrompt(null);
  };

  if (!isInstallable) return null;

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30"
    >
      <Download size={16} />
      {t('pwa.installApp')}
    </button>
  );
}
