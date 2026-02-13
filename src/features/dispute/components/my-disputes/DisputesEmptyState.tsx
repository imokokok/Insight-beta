import Link from 'next/link';

import { Wallet } from 'lucide-react';

import type { TranslationKey } from '@/i18n/translations';

type Translate = (key: TranslationKey) => string;

type DisputesEmptyStateProps = {
  instanceId: string;
  t: Translate;
};

export function DisputesEmptyState({ instanceId, t }: DisputesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 rounded-full bg-primary/5 p-6 text-primary">
        <Wallet size={48} />
      </div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">{t('oracle.myDisputes.noDisputes')}</h2>
      <p className="mx-auto max-w-md text-gray-500">{t('oracle.myDisputes.description')}</p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href={instanceId ? `/oracle?instanceId=${encodeURIComponent(instanceId)}` : '/oracle'}
          className="rounded-lg bg-gradient-to-r from-primary-600 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary-500/20 transition-all hover:from-primary-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-primary-500/30"
        >
          {t('nav.oracle')}
        </Link>
        <Link
          href={instanceId ? `/disputes?instanceId=${encodeURIComponent(instanceId)}` : '/disputes'}
          className="text-primary-dark rounded-xl border border-primary/20 bg-white px-6 py-3 font-medium transition-colors hover:bg-primary/5"
        >
          {t('nav.disputes')}
        </Link>
      </div>
    </div>
  );
}
