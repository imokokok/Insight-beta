'use client';

import { useCallback, useRef, useState } from 'react';

import useSWR from 'swr';
import { formatEther } from 'viem';

import { useToast } from '@/components/ui/toast';
import { useWallet as useWalletContext } from '@/contexts/WalletContext';
import { useI18n } from '@/i18n/LanguageProvider';
import { getChainSymbol } from '@/lib/blockchain/chainConfig';
import { normalizeWalletError } from '@/lib/errors';
import { logger } from '@/shared/logger';

// ============================================================================
// useBalance - 钱包余额 Hook
// ============================================================================

interface BalanceError extends Error {
  code: 'NO_WALLET' | 'RPC_ERROR' | 'UNKNOWN';
}

export function useBalance() {
  const { address, chainId } = useWalletContext();

  const {
    data: balance,
    error,
    isLoading,
  } = useSWR(
    address ? `balance-${address}-${chainId ?? 'unknown'}` : null,
    async () => {
      if (!address) return null;
      if (typeof window === 'undefined' || !window.ethereum) {
        const err: BalanceError = new Error(
          'Wallet not detected. Please install MetaMask or another Web3 wallet.',
        ) as BalanceError;
        err.code = 'NO_WALLET';
        throw err;
      }
      try {
        const result = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        });
        if (!result) {
          return '0';
        }
        const balanceWei = BigInt(result as string);
        return formatEther(balanceWei);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch balance';
        const err: BalanceError = new Error(message) as BalanceError;
        err.code = 'RPC_ERROR';
        throw err;
      }
    },
    {
      refreshInterval: 10000,
      shouldRetryOnError: false,
    },
  );

  const symbol = chainId ? getChainSymbol(chainId) : 'ETH';

  return {
    balance,
    formattedBalance: balance ? parseFloat(balance).toFixed(4) : '0.0000',
    symbol,
    error,
    isLoading,
    hasWallet: typeof window !== 'undefined' && !!window.ethereum,
  };
}

// ============================================================================
// useSwitchChainWithFeedback - 切换网络 Hook
// ============================================================================

type ChainTarget = {
  id: number;
  name: string;
};

export function useSwitchChainWithFeedback(options?: { onClose?: () => void }) {
  const { chainId, switchChain } = useWalletContext();
  const { toast } = useToast();
  const { t } = useI18n();
  const [switchingChainId, setSwitchingChainId] = useState<number | null>(null);
  const lockRef = useRef(false);

  const switchToChain = useCallback(
    async (target: ChainTarget) => {
      if (lockRef.current) return;
      if (chainId === target.id) {
        toast({
          type: 'info',
          title: t('wallet.networkAlreadySelected'),
          message: target.name,
        });
        options?.onClose?.();
        return;
      }

      try {
        lockRef.current = true;
        setSwitchingChainId(target.id);
        await switchChain(target.id);
        toast({
          type: 'success',
          title: t('wallet.networkSwitched'),
          message: target.name,
        });
        options?.onClose?.();
      } catch (err: unknown) {
        logger.error('Failed to switch chain:', { error: err });
        const normalized = normalizeWalletError(err);
        const msg =
          normalized.kind === 'USER_REJECTED'
            ? t('errors.userRejected')
            : normalized.kind === 'REQUEST_PENDING'
              ? t('errors.requestPending')
              : normalized.kind === 'CHAIN_NOT_ADDED'
                ? t('errors.chainNotAdded')
                : normalized.kind === 'WRONG_NETWORK'
                  ? t('errors.wrongNetwork')
                  : t('errors.unknownError');
        toast({
          type: 'error',
          title: t('wallet.networkSwitchFailed'),
          message: msg,
          actionLabel: t('common.retry'),
          actionOnClick: () => {
            void switchToChain(target);
          },
        });
      } finally {
        setSwitchingChainId(null);
        lockRef.current = false;
      }
    },
    [chainId, options, switchChain, t, toast],
  );

  return { switchToChain, switchingChainId };
}
