'use client';

import { useState, useCallback } from 'react';

import { Wallet, Smartphone, ExternalLink, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { useWallet } from '@/contexts/WalletContext';
import { useI18n } from '@/i18n/LanguageProvider';
import {
  getWalletBrowserInfo,
  isMobile,
  isInWalletBrowser,
  getRecommendedWalletMethod,
  getMetaMaskDeepLink,
  getTrustWalletDeepLink,
  getTokenPocketDeepLink,
  type WalletBrowserType,
} from '@/lib/mobile/walletBrowser';
import { logger } from '@/lib/logger';

interface WalletOption {
  id: WalletBrowserType;
  name: string;
  icon: string;
  deepLink?: string;
  isInstalled?: boolean;
}

export function MobileWalletConnect() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { connect, isConnecting } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletBrowserType | null>(null);

  const browserInfo = getWalletBrowserInfo();
  const isMobileDevice = isMobile();
  const inWalletBrowser = isInWalletBrowser();
  const recommendedMethod = getRecommendedWalletMethod();

  const walletOptions: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '/wallets/metamask.svg',
      deepLink: getMetaMaskDeepLink(),
      isInstalled: browserInfo.type === 'metamask',
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      icon: '/wallets/trust.svg',
      deepLink: getTrustWalletDeepLink(),
      isInstalled: browserInfo.type === 'trust',
    },
    {
      id: 'tokenpocket',
      name: 'TokenPocket',
      icon: '/wallets/tokenpocket.svg',
      deepLink: getTokenPocketDeepLink(),
      isInstalled: browserInfo.type === 'tokenpocket',
    },
    {
      id: 'imtoken',
      name: 'imToken',
      icon: '/wallets/imtoken.svg',
      isInstalled: browserInfo.type === 'imtoken',
    },
    {
      id: 'rainbow',
      name: 'Rainbow',
      icon: '/wallets/rainbow.svg',
      isInstalled: browserInfo.type === 'rainbow',
    },
    {
      id: 'okx',
      name: 'OKX Wallet',
      icon: '/wallets/okx.svg',
      isInstalled: browserInfo.type === 'okx',
    },
  ];

  const handleConnect = useCallback(
    async (type: 'browser' | 'walletconnect') => {
      try {
        await connect(type);
        setIsOpen(false);
        toast({
          type: 'success',
          title: t('wallet.connected'),
        });
      } catch (error) {
        logger.error('Wallet connection failed', { error });
        toast({
          type: 'error',
          title: t('wallet.connectionFailed'),
        });
      }
    },
    [connect, toast, t]
  );

  const handleDeepLink = useCallback((wallet: WalletOption) => {
    if (wallet.deepLink) {
      window.location.href = wallet.deepLink;
    } else {
      toast({
        type: 'info',
        title: t('wallet.openInWallet'),
        message: t('wallet.pleaseOpenInWallet', { wallet: wallet.name }),
      });
    }
  }, [toast, t]);

  const handleWalletSelect = useCallback(
    async (wallet: WalletOption) => {
      setSelectedWallet(wallet.id);

      // 如果在钱包浏览器中，直接连接
      if (wallet.isInstalled) {
        await handleConnect('browser');
        return;
      }

      // 如果在移动端但不在钱包浏览器中，使用深度链接
      if (isMobileDevice && !inWalletBrowser) {
        handleDeepLink(wallet);
        return;
      }

      // 否则使用 WalletConnect
      await handleConnect('walletconnect');
    },
    [handleConnect, handleDeepLink, isMobileDevice, inWalletBrowser]
  );

  // 如果在钱包浏览器中，显示简化版连接按钮
  if (inWalletBrowser) {
    return (
      <Button
        onClick={() => handleConnect('browser')}
        disabled={isConnecting}
        className="w-full"
        size="lg"
      >
        {isConnecting ? (
          <span className="animate-pulse">{t('wallet.connecting')}</span>
        ) : (
          <>
            <Wallet className="mr-2 h-5 w-5" />
            {t('wallet.connectWallet')}
          </>
        )}
      </Button>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className="w-full" size="lg">
          <Smartphone className="mr-2 h-5 w-5" />
          {t('wallet.connectWallet')}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center text-lg">
            {t('wallet.selectWallet')}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* 推荐连接方式 */}
          {recommendedMethod === 'deeplink' && (
            <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t('wallet.recommendedInApp')}
              </p>
            </div>
          )}

          {/* 钱包列表 */}
          <div className="grid grid-cols-1 gap-3">
            {walletOptions.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleWalletSelect(wallet)}
                disabled={isConnecting && selectedWallet === wallet.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 p-4 transition-all hover:border-purple-300 hover:bg-purple-50 dark:border-gray-700 dark:hover:border-purple-700 dark:hover:bg-purple-900/20"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    {wallet.icon ? (
                      <img
                        src={wallet.icon}
                        alt={wallet.name}
                        className="h-6 w-6"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Wallet className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{wallet.name}</p>
                    {wallet.isInstalled && (
                      <p className="text-xs text-green-600">
                        {t('wallet.detected')}
                      </p>
                    )}
                  </div>
                </div>
                
                {isConnecting && selectedWallet === wallet.id ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                ) : wallet.isInstalled ? (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    {t('common.connect')}
                  </span>
                ) : isMobileDevice ? (
                  <ExternalLink className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>
            ))}
          </div>

          {/* WalletConnect 选项 */}
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <button
              onClick={() => handleConnect('walletconnect')}
              disabled={isConnecting}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 transition-all hover:border-purple-300 hover:bg-purple-50 dark:border-gray-700 dark:hover:border-purple-700 dark:hover:bg-purple-900/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">WalletConnect</p>
                  <p className="text-xs text-gray-500">
                    {t('wallet.connectOtherWallets')}
                  </p>
                </div>
              </div>
              {isConnecting && selectedWallet === null ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>

          {/* 帮助提示 */}
          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <p>{t('wallet.mobileHelp')}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * 移动端钱包连接按钮（简化版）
 */
export function MobileWalletButton() {
  const { t } = useI18n();
  const { connect, isConnecting } = useWallet();
  const browserInfo = getWalletBrowserInfo();

  const handleClick = async () => {
    try {
      if (browserInfo.isWalletBrowser) {
        await connect('browser');
      } else {
        await connect('walletconnect');
      }
    } catch (error) {
      logger.error('Wallet connection failed', { error });
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isConnecting}
      className="w-full"
      size="lg"
    >
      {isConnecting ? (
        <span className="animate-pulse">{t('wallet.connecting')}</span>
      ) : (
        <>
          <Wallet className="mr-2 h-5 w-5" />
          {browserInfo.isWalletBrowser
            ? t('wallet.connectWallet')
            : t('wallet.connectWithWalletConnect')}
        </>
      )}
    </Button>
  );
}
