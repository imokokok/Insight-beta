/**
 * Service Worker Registration Component
 *
 * 用于注册 Service Worker 以启用 PWA 功能
 * - 离线缓存
 * - 后台同步
 * - 推送通知
 */

'use client';

import { useEffect, useState } from 'react';

import { logger } from '@/shared/logger';

interface ServiceWorkerRegisterProps {
  /** Service Worker 文件路径 */
  swPath?: string;
  /** 注册成功回调 */
  onRegistered?: (registration: ServiceWorkerRegistration) => void;
  /** 注册失败回调 */
  onError?: (error: Error) => void;
}

export function ServiceWorkerRegister({
  swPath = '/sw.js',
  onRegistered,
  onError,
}: ServiceWorkerRegisterProps) {
  const [, setIsRegistered] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      logger.debug('Service Worker not supported');
      return;
    }

    const registerSW = async () => {
      try {
        // 检查是否已注册
        const existingRegistration = await navigator.serviceWorker.getRegistration(swPath);
        if (existingRegistration) {
          logger.debug('Service Worker already registered');
          setIsRegistered(true);
          onRegistered?.(existingRegistration);
          return;
        }

        // 延迟注册以避免影响首屏加载
        if ('requestIdleCallback' in window) {
          (
            window as unknown as { requestIdleCallback: (callback: () => void) => number }
          ).requestIdleCallback(() => {
            performRegistration();
          });
        } else {
          setTimeout(performRegistration, 1000);
        }
      } catch (error) {
        logger.error('Service Worker registration check failed', { error });
        onError?.(error as Error);
      }
    };

    const performRegistration = async () => {
      try {
        const registration = await navigator.serviceWorker.register(swPath, {
          scope: '/',
          updateViaCache: 'imports',
        });

        logger.info('Service Worker registered successfully', {
          scope: registration.scope,
        });

        setIsRegistered(true);
        onRegistered?.(registration);

        // 监听更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                logger.info('New Service Worker available');
                // 可以在这里提示用户刷新页面
              }
            });
          }
        });
      } catch (error) {
        logger.error('Service Worker registration failed', { error });
        onError?.(error as Error);
      }
    };

    registerSW();

    // 监听 Service Worker 消息
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATE') {
        logger.info('Service Worker update available');
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [swPath, onRegistered, onError]);

  // 这个组件不渲染任何内容
  return null;
}

/**
 * 手动更新 Service Worker
 */
export async function updateServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    logger.info('Service Worker update checked');
    return true;
  } catch (error) {
    logger.error('Service Worker update failed', { error });
    return false;
  }
}

/**
 * 注销 Service Worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      logger.info('Service Worker unregistered', { result });
      return result;
    }
    return false;
  } catch (error) {
    logger.error('Service Worker unregistration failed', { error });
    return false;
  }
}

/**
 * 检查 Service Worker 状态
 */
export async function getServiceWorkerStatus(): Promise<{
  supported: boolean;
  registered: boolean;
  controller: boolean;
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return {
      supported: false,
      registered: false,
      controller: false,
    };
  }

  const registration = await navigator.serviceWorker.getRegistration();

  return {
    supported: true,
    registered: !!registration,
    controller: !!navigator.serviceWorker.controller,
  };
}

export default ServiceWorkerRegister;
