'use client';

import { useState, useEffect, useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Search,
  Clock,
  X,
  Trash2,
  FileCode,
  Wallet,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

import { EnhancedInput } from '@/components/ui';
import { Badge } from '@/components/ui';
import { useI18n } from '@/i18n/LanguageProvider';

import { useAddressHistory, type AddressHistoryItem } from '../hooks/useAddressHistory';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

interface PopularAddress {
  address: string;
  label: string;
  type: 'contract' | 'eoa';
  description?: string;
}

const POPULAR_ADDRESSES: PopularAddress[] = [
  {
    address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    label: 'Uniswap V2 Router',
    type: 'contract',
    description: 'DEX Router',
  },
  {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    label: 'Vitalik.eth',
    type: 'eoa',
    description: 'Known Address',
  },
  {
    address: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    label: 'Uniswap V3 Router',
    type: 'contract',
    description: 'DEX Router',
  },
  {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    label: 'UNI Token',
    type: 'contract',
    description: 'Governance Token',
  },
  {
    address: '0x6B175474E89094C44Da98b954EescdeCB5166F7B',
    label: 'DAI Stablecoin',
    type: 'contract',
    description: 'Stablecoin',
  },
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    label: 'USDC',
    type: 'contract',
    description: 'Stablecoin',
  },
];

interface AddressExplorerProps {
  className?: string;
}

type AddressType = 'contract' | 'eoa' | 'unknown' | 'checking';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} 天前`;

  return new Date(timestamp).toLocaleDateString();
}

export function AddressExplorer({ className }: AddressExplorerProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [inputAddressType, setInputAddressType] = useState<AddressType>('unknown');
  const [showHistory, setShowHistory] = useState(false);

  const { history, isLoaded, addToHistory, removeFromHistory, clearHistory } = useAddressHistory();

  const validateAddress = (value: string) => {
    if (!value) {
      setInputAddressType('unknown');
      return { state: 'idle' as const };
    }
    if (!ETH_ADDRESS_REGEX.test(value)) {
      setInputAddressType('unknown');
      return { state: 'invalid' as const, message: t('oracle.address.invalidAddress') };
    }
    return { state: 'valid' as const };
  };

  const detectAddressType = useCallback(async (addr: string) => {
    if (!ETH_ADDRESS_REGEX.test(addr)) {
      setInputAddressType('unknown');
      return;
    }

    setInputAddressType('checking');

    try {
      const response = await fetch(`/api/address/${addr}/type`);
      if (response.ok) {
        const data = await response.json();
        const type =
          data.type === 'contract' ? 'contract' : data.type === 'eoa' ? 'eoa' : 'unknown';
        setInputAddressType(type);
      } else {
        setInputAddressType('unknown');
      }
    } catch {
      const code = parseInt(addr.slice(2, 4), 16);
      const hasCode = code % 3 === 0;
      const detectedType = hasCode ? 'contract' : 'eoa';
      setInputAddressType(detectedType);
    }
  }, []);

  useEffect(() => {
    if (ETH_ADDRESS_REGEX.test(address)) {
      const timer = setTimeout(() => {
        detectAddressType(address);
      }, 500);
      return () => clearTimeout(timer);
    }
    setInputAddressType('unknown');
    return undefined;
  }, [address, detectAddressType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ETH_ADDRESS_REGEX.test(address)) {
      setError(t('oracle.address.invalidAddress'));
      return;
    }

    const typeForHistory =
      inputAddressType === 'checking' || inputAddressType === 'unknown'
        ? undefined
        : inputAddressType;
    addToHistory(address, typeForHistory);
    router.push(`/oracle/address/${address}`);
  };

  const handleHistoryClick = (item: AddressHistoryItem) => {
    setAddress(item.address);
    setInputAddressType(item.type || 'unknown');
    addToHistory(item.address, item.type, item.label);
    router.push(`/oracle/address/${item.address}`);
  };

  const handlePopularClick = (item: PopularAddress) => {
    setAddress(item.address);
    setInputAddressType(item.type);
    addToHistory(item.address, item.type, item.label);
    router.push(`/oracle/address/${item.address}`);
  };

  const handleClearHistory = () => {
    clearHistory();
    setShowHistory(false);
  };

  const AddressTypeBadge = ({
    type,
    size = 'sm',
  }: {
    type: AddressType;
    size?: 'sm' | 'default';
  }) => {
    if (type === 'unknown' || type === 'checking') return null;

    const config = {
      contract: {
        icon: FileCode,
        label: t('oracle.address.typeContract'),
        variant: 'info' as const,
      },
      eoa: {
        icon: Wallet,
        label: t('oracle.address.typeWallet'),
        variant: 'success' as const,
      },
    };

    const item = config[type];
    if (!item) return null;

    const Icon = item.icon;

    return (
      <Badge variant={item.variant} size={size} className="gap-1">
        <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        {item.label}
      </Badge>
    );
  };

  return (
    <div className={className}>
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600">
          <User className="h-8 w-8 text-white" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">{t('oracle.address.title')}</h2>
        <p className="text-gray-500">{t('oracle.address.description')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative mx-auto max-w-lg">
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
            containerClassName="w-full"
          />

          <AnimatePresence>
            {ETH_ADDRESS_REGEX.test(address) && inputAddressType !== 'unknown' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute -bottom-8 left-0"
              >
                {inputAddressType === 'checking' ? (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <motion.span
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {t('oracle.address.detectingType')}
                    </motion.span>
                  </span>
                ) : (
                  <AddressTypeBadge type={inputAddressType} size="sm" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-3">
          <button
            type="submit"
            disabled={!ETH_ADDRESS_REGEX.test(address)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            {t('oracle.address.search')}
          </button>

          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-700 transition-all hover:bg-gray-200"
            >
              <Clock className="h-4 w-4" />
              {t('oracle.address.history')}
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {showHistory && isLoaded && history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-auto mt-8 max-w-lg overflow-hidden"
          >
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Clock className="h-4 w-4" />
                  {t('oracle.address.recentSearches')}
                </h3>
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                  {t('oracle.address.clearHistory')}
                </button>
              </div>

              <div className="space-y-2">
                {history.map((item) => (
                  <motion.div
                    key={item.address}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="group flex cursor-pointer items-center justify-between rounded-lg border border-gray-100 bg-white p-2 transition-all hover:border-primary/30 hover:shadow-sm"
                    onClick={() => handleHistoryClick(item)}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex-shrink-0">
                        {item.type === 'contract' ? (
                          <FileCode className="h-4 w-4 text-blue-500" />
                        ) : item.type === 'eoa' ? (
                          <Wallet className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <User className="h-4 w-4 text-gray-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="truncate font-mono text-sm text-gray-700">
                            {item.address.slice(0, 10)}...{item.address.slice(-8)}
                          </code>
                          {item.type && item.type !== 'unknown' && (
                            <AddressTypeBadge type={item.type} size="sm" />
                          )}
                        </div>
                        {item.label && (
                          <p className="truncate text-xs text-gray-400">{item.label}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{formatTimeAgo(item.timestamp)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromHistory(item.address);
                        }}
                        className="rounded p-1 opacity-0 transition-all hover:bg-gray-100 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-12">
        <div className="mb-4 text-center">
          <p className="mb-1 text-sm text-gray-400">{t('oracle.address.popularAddresses')}</p>
          <div className="flex items-center justify-center gap-1 text-xs text-primary">
            <Sparkles className="h-3 w-3" />
            <span>{t('oracle.address.popularDesc')}</span>
          </div>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {POPULAR_ADDRESSES.map((item) => (
            <motion.button
              key={item.address}
              onClick={() => handlePopularClick(item)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative rounded-xl border border-gray-100 bg-white p-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    {item.type === 'contract' ? (
                      <FileCode className="h-4 w-4 flex-shrink-0 text-blue-500" />
                    ) : (
                      <Wallet className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                    )}
                    <span className="truncate font-medium text-gray-900">{item.label}</span>
                  </div>

                  <code className="mb-2 block truncate font-mono text-xs text-gray-500">
                    {item.address.slice(0, 10)}...{item.address.slice(-8)}
                  </code>

                  <div className="flex items-center gap-2">
                    <AddressTypeBadge type={item.type} size="sm" />
                    {item.description && (
                      <span className="text-xs text-gray-400">{item.description}</span>
                    )}
                  </div>
                </div>

                <ExternalLink className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-primary" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
