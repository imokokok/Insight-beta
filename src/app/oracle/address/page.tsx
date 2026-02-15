'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { User, Search } from 'lucide-react';

import { EnhancedInput } from '@/components/ui/EnhancedInput';
import { useI18n } from '@/i18n/LanguageProvider';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export default function AddressSearchPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const validateAddress = (value: string) => {
    if (!value) {
      return { state: 'idle' as const };
    }
    if (!ETH_ADDRESS_REGEX.test(value)) {
      return { state: 'invalid' as const, message: t('oracle.address.invalidAddress') };
    }
    return { state: 'valid' as const };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ETH_ADDRESS_REGEX.test(address)) {
      setError(t('oracle.address.invalidAddress'));
      return;
    }

    router.push(`/oracle/address/${address}`);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
          <User className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('oracle.address.title')}
        </h1>
        <p className="text-gray-500">
          {t('oracle.address.description')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <EnhancedInput
          label={t('oracle.address.inputLabel')}
          placeholder="0x..."
          value={address}
          onChange={(value) => {
            setAddress(value);
            setError('');
          }}
          validation={validateAddress}
          errorMessage={error}
          helperText={t('oracle.address.helperText')}
          containerClassName="max-w-lg mx-auto"
        />

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={!ETH_ADDRESS_REGEX.test(address)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4" />
            {t('oracle.address.search')}
          </button>
        </div>
      </form>

      <div className="mt-12 text-center">
        <p className="text-sm text-gray-400 mb-3">{t('oracle.address.examples')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          ].map((addr) => (
            <button
              key={addr}
              onClick={() => router.push(`/oracle/address/${addr}`)}
              className="px-3 py-1.5 text-xs font-mono bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-gray-600"
            >
              {addr.slice(0, 6)}...{addr.slice(-4)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
