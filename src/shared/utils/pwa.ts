/**
 * PWA Utilities
 *
 * PWA 相关工具函数
 */

import { logger } from '@/shared/logger';

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
 * 注册 Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    logger.info('Service Worker registered', { scope: registration.scope });
    return registration;
  } catch (error) {
    logger.error('Service Worker registration failed', { error });
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
    logger.info('Service Worker unregistered');
    return true;
  } catch (error) {
    logger.error('Service Worker unregistration failed', { error });
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
    logger.error('Update check failed', { error });
    return false;
  }
}


