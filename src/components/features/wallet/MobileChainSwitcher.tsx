'use client';

import { useState, useCallback } from 'react';

import { Check, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';

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
import { logger } from '@/shared/logger';
import { isMobile, supportsFeature } from '@/lib/mobile/walletBrowser';
import { cn } from '@/shared/utils';

interface Chain {
  id: number;
  name: string;
  icon: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  isTestnet?: boolean;
}

const SUPPORTED_CHAINS: Chain[] = [
  {
    id: 137,
    name: 'Polygon',
    icon: '/chains/polygon.svg',
    nativeCurrency: { symbol: 'MATIC', decimals: 18 },
  },
  {
    id: 1,
    name: 'Ethereum',
    icon: '/chains/ethereum.svg',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
  },
  {
    id: 42161,
    name: 'Arbitrum',
    icon: '/chains/arbitrum.svg',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
  },
  {
    id: 10,
    name: 'Optimism',
    icon: '/chains/optimism.svg',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
  },
  {
    id: 80002,
    name: 'Polygon Amoy',
    icon: '/chains/polygon.svg',
    nativeCurrency: { symbol: 'MATIC', decimals: 18 },
    isTestnet: true,
  },
];

export function MobileChainSwitcher() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { chainId, switchChain, addNetwork, isConnected } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [switchingChainId, setSwitchingChainId] = useState<number | null>(null);

  const isMobileDevice = isMobile();
  const supportsChainSwitch = supportsFeature('wallet_switchEthereumChain');

  const currentChain = SUPPORTED_CHAINS.find((c) => c.id === chainId);

  const handleSwitchChain = useCallback(
    async (targetChain: Chain) => {
      if (!isConnected) {
        toast({
          type: 'error',
          title: t('wallet.walletNotConnected'),
        });
        return;
      }

      if (chainId === targetChain.id) {
        setIsOpen(false);
        return;
      }

      // 某些钱包浏览器可能不支持链切换
      if (!supportsChainSwitch) {
        toast({
          type: 'warning',
          title: t('wallet.chainSwitchNotSupported'),
          message: t('wallet.pleaseSwitchManually', { chain: targetChain.name }),
        });
        return;
      }

      setSwitchingChainId(targetChain.id);

      try {
        await switchChain(targetChain.id);
        
        toast({
          type: 'success',
          title: t('wallet.networkSwitched'),
          message: targetChain.name,
        });
        
        setIsOpen(false);
      } catch (error: unknown) {
        logger.error('Failed to switch chain', { error, targetChain });
        
        // 处理特定错误
        const err = error as { code?: number; message?: string };
        
        if (err.code === 4902) {
          // 链未添加，尝试添加
          try {
            await addNetwork(targetChain.id);
            toast({
              type: 'success',
              title: t('wallet.networkAdded'),
              message: targetChain.name,
            });
            setIsOpen(false);
          } catch {
            toast({
              type: 'error',
              title: t('wallet.networkAddFailed'),
              message: t('wallet.pleaseAddManually'),
            });
          }
        } else if (err.code === 4001) {
          // 用户拒绝
          toast({
            type: 'info',
            title: t('wallet.switchCancelled'),
          });
        } else {
          toast({
            type: 'error',
            title: t('wallet.networkSwitchFailed'),
            message: err.message || t('errors.unknownError'),
          });
        }
      } finally {
        setSwitchingChainId(null);
      }
    },
    [chainId, isConnected, switchChain, addNetwork, toast, t, supportsChainSwitch]
  );

  // 如果在不支持链切换的钱包中，显示提示
  if (!supportsChainSwitch && isMobileDevice) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
        <AlertCircle className="h-4 w-4" />
        <span>{currentChain?.name || t('wallet.unknownNetwork')}</span>
      </div>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'flex items-center gap-2 rounded-full border-purple-200 bg-white/80 px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition-all hover:bg-purple-50 dark:border-purple-800 dark:bg-gray-800/80 dark:hover:bg-purple-900/30',
            !isConnected && 'opacity-50 cursor-not-allowed'
          )}
          disabled={!isConnected}
        >
          {currentChain ? (
            <>
              <img
                src={currentChain.icon}
                alt={currentChain.name}
                className="h-5 w-5 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="hidden sm:inline">{currentChain.name}</span>
              <span className="sm:hidden">{currentChain.nativeCurrency.symbol}</span>
            </>
          ) : (
            <span>{t('wallet.selectNetwork')}</span>
          )}
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center text-lg">
            {t('wallet.selectNetwork')}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3 py-4">
          {/* 当前网络提示 */}
          {currentChain && (
            <div className="rounded-xl bg-purple-50 p-4 dark:bg-purple-900/20">
              <p className="text-sm text-purple-800 dark:text-purple-200">
                {t('wallet.currentNetwork')}: <strong>{currentChain.name}</strong>
              </p>
            </div>
          )}

          {/* 链列表 */}
          <div className="space-y-2">
            {SUPPORTED_CHAINS.map((chain) => {
              const isCurrent = chain.id === chainId;
              const isSwitching = switchingChainId === chain.id;

              return (
                <button
                  key={chain.id}
                  onClick={() => handleSwitchChain(chain)}
                  disabled={isSwitching || isCurrent}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl border p-4 transition-all',
                    isCurrent
                      ? 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/30'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 dark:border-gray-700 dark:hover:border-purple-700 dark:hover:bg-purple-900/20'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <img
                        src={chain.icon}
                        alt={chain.name}
                        className="h-6 w-6 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{chain.name}</p>
                      <p className="text-xs text-gray-500">
                        {chain.nativeCurrency.symbol}
                        {chain.isTestnet && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                            {t('wallet.testnet')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {isSwitching ? (
                    <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  ) : isCurrent ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* 移动端提示 */}
          {isMobileDevice && (
            <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
              <p className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{t('wallet.mobileChainSwitchTip')}</span>
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * 简化的链切换按钮（用于空间受限的场景）
 */
export function MobileChainBadge() {
  const { t } = useI18n();
  const { chainId, isConnected } = useWallet();

  const currentChain = SUPPORTED_CHAINS.find((c) => c.id === chainId);

  if (!isConnected) {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-800">
        {t('wallet.notConnected')}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
      {currentChain?.icon && (
        <img
          src={currentChain.icon}
          alt=""
          className="h-3 w-3 rounded-full"
        />
      )}
      {currentChain?.nativeCurrency.symbol || t('wallet.unknown')}
    </span>
  );
}
