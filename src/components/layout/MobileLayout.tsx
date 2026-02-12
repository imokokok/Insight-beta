'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { useViewport } from '@/hooks/useViewport';
import { getWalletBrowserInfo } from '@/lib/mobile/walletBrowser';
import { cn } from '@/shared/utils';

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
  preventWalletScroll?: boolean;
}

/**
 * 移动端布局包装组件
 * 处理视口变化、钱包浏览器检测、键盘弹出等场景
 */
export function MobileLayout({
  children,
  className,
  preventWalletScroll = true,
}: MobileLayoutProps) {
  const { isKeyboardOpen, isWalletPopupOpen } = useViewport({
    onKeyboardOpen: () => {
      document.documentElement.classList.add('keyboard-open');
    },
    onKeyboardClose: () => {
      document.documentElement.classList.remove('keyboard-open');
    },
    onWalletPopupOpen: () => {
      if (preventWalletScroll) {
        document.body.classList.add('wallet-popup-open');
      }
    },
    onWalletPopupClose: () => {
      document.body.classList.remove('wallet-popup-open');
    },
  });

  // 检测钱包浏览器并添加标记类
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const browserInfo = getWalletBrowserInfo();
    const body = document.body;

    // 添加钱包浏览器类型标记
    if (browserInfo.type !== 'unknown') {
      body.classList.add(`wallet-${browserInfo.type}`);
      body.classList.add('wallet-browser');
    }

    // 添加移动端标记
    if (browserInfo.isInApp) {
      body.classList.add('in-app-browser');
    }

    return () => {
      body.classList.remove(`wallet-${browserInfo.type}`);
      body.classList.remove('wallet-browser');
      body.classList.remove('in-app-browser');
    };
  }, []);

  return (
    <div
      className={cn(
        'min-h-screen-dynamic flex flex-col',
        isKeyboardOpen && 'keyboard-active',
        isWalletPopupOpen && 'wallet-popup-active',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * 移动端安全区域容器
 * 自动处理刘海屏等安全区域
 */
interface SafeAreaContainerProps {
  children: React.ReactNode;
  className?: string;
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

export function SafeAreaContainer({
  children,
  className,
  top = true,
  bottom = true,
  left = true,
  right = true,
}: SafeAreaContainerProps) {
  return (
    <div
      className={cn(
        top && 'pt-safe',
        bottom && 'pb-safe',
        left && 'pl-safe',
        right && 'pr-safe',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * 移动端底部固定区域
 * 自动适配安全区域和键盘
 */
interface MobileFixedBottomProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileFixedBottom({ children, className }: MobileFixedBottomProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'pb-safe pt-2',
        'bg-white/90 backdrop-blur-xl dark:bg-gray-900/90',
        'border-t border-gray-200 dark:border-gray-800',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * 移动端内容区域
 * 自动适配底部导航栏高度
 */
interface MobileContentProps {
  children: React.ReactNode;
  className?: string;
  hasBottomNav?: boolean;
}

export function MobileContent({
  children,
  className,
  hasBottomNav = true,
}: MobileContentProps) {
  return (
    <main
      className={cn(
        'flex-1 overflow-y-auto',
        hasBottomNav && 'pb-nav',
        className
      )}
    >
      {children}
    </main>
  );
}
