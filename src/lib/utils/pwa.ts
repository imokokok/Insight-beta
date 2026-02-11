/**
 * PWA Utilities
 *
 * PWA 相关工具函数
 */

/**
 * 检测是否在移动端
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

/**
 * 检测是否在 iOS 设备上
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream;
}

/**
 * 检测是否在 Safari 浏览器中
 */
export function isSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isChrome = /Chrome/.test(ua);
  const isSafari = /Safari/.test(ua) && !isChrome;
  return isSafari;
}

/**
 * 检测是否在 Android 设备上
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

/**
 * 检测是否作为 PWA (Standalone 模式) 运行
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * 检测是否支持 PWA 安装
 */
export function isPWAInstallable(): boolean {
  if (typeof window === 'undefined') return false;

  // 已经安装则不需要
  if (isStandalone()) return false;

  // 检查是否支持 Service Worker
  if (!('serviceWorker' in navigator)) return false;

  // iOS Safari 支持添加到主屏幕
  if (isIOS() && isSafari()) return true;

  // Android Chrome 支持 PWA 安装
  if (isAndroid() && /Chrome/.test(navigator.userAgent)) return true;

  // 桌面端 Chrome/Edge 支持
  if (/Chrome|Edg/.test(navigator.userAgent)) return true;

  return false;
}

/**
 * 获取 PWA 显示模式
 */
export function getDisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' {
  if (typeof window === 'undefined') return 'browser';

  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }

  return 'browser';
}

/**
 * 注册 Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * 卸载 Service Worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    console.log('Service Worker unregistered');
    return true;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * 检查更新
 */
export async function checkForUpdates(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    return true;
  } catch (error) {
    console.error('Update check failed:', error);
    return false;
  }
}

/**
 * 监听 PWA 安装事件
 */
export function onBeforeInstallPrompt(
  callback: (e: Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    callback(e as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> });
  };

  window.addEventListener('beforeinstallprompt', handler);
  return () => window.removeEventListener('beforeinstallprompt', handler);
}

/**
 * 监听 PWA 安装完成事件
 */
export function onAppInstalled(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('appinstalled', callback);
  return () => window.removeEventListener('appinstalled', callback);
}
