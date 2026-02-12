import { Wallet } from 'lucide-react';

import { PageHeader } from '@/components/common/PageHeader';
import { ConnectWallet } from '@/components/features/wallet/ConnectWallet';
import type { TranslationKey } from '@/i18n/translations';

type Translate = (key: TranslationKey) => string;

type NoWalletStateProps = {
  t: Translate;
};

export function NoWalletState({ t }: NoWalletStateProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-20 duration-700">
      <PageHeader title={t('nav.myDisputes')} description={t('oracle.myDisputes.description')}>
        <ConnectWallet />
      </PageHeader>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 rounded-full bg-primary/5 p-6 text-primary">
          <Wallet size={48} />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          {t('oracle.myDisputes.connectWalletTitle')}
        </h2>
        <p className="mx-auto mb-8 max-w-md text-gray-500">
          {t('oracle.myDisputes.connectWalletDesc')}
        </p>
        <ConnectWallet />
      </div>
    </div>
  );
}
