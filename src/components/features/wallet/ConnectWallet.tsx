'use client';

import { Wallet } from 'lucide-react';

import { UserMenu } from '@/components/features/wallet/UserMenu';
import { useToast } from '@/components/ui/toast';
import { useWallet } from '@/contexts/WalletContext';
import { useI18n } from '@/i18n/LanguageProvider';
import { normalizeWalletError } from '@/lib/errors/walletErrors';
import { logger } from '@/lib/logger';

export function ConnectWallet() {
  const { address, connect, isConnecting } = useWallet();
  const { toast } = useToast();
  const { t } = useI18n();

  const handleConnect = async () => {
    try {
      await connect();
      toast({
        type: 'success',
        title: t('wallet.connected'),
        message: t('wallet.connectedMsg'),
      });
    } catch (error: unknown) {
      logger.error('Failed to connect wallet:', { error });
      const normalized = normalizeWalletError(error);
      if (normalized.kind === 'WALLET_NOT_FOUND') {
        toast({
          type: 'error',
          title: t('wallet.notFound'),
          message: t('wallet.install'),
        });
        return;
      }
      const msg =
        normalized.kind === 'USER_REJECTED'
          ? t('errors.userRejected')
          : normalized.kind === 'REQUEST_PENDING'
            ? t('errors.requestPending')
            : normalized.kind === 'CHAIN_NOT_ADDED'
              ? t('errors.chainNotAdded')
              : normalized.kind === 'WRONG_NETWORK'
                ? t('errors.wrongNetwork')
                : normalized.kind === 'INSUFFICIENT_FUNDS'
                  ? t('errors.insufficientFunds')
                  : t('errors.unknownError');
      toast({
        type: 'error',
        title: t('wallet.failed'),
        message: msg,
      });
    }
  };

  if (address) {
    return <UserMenu />;
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Wallet size={16} />
      {isConnecting ? t('wallet.connecting') : t('wallet.connect')}
    </button>
  );
}
