'use client';

import { useState, useRef, useEffect } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { LogOut, Copy, Check, FileText, AlertTriangle, ChevronDown } from 'lucide-react';
import { arbitrum, hardhat, mainnet, optimism, polygon, polygonAmoy } from 'viem/chains';

import { useWallet } from '@/contexts/WalletContext';
import { useBalance, useSwitchChainWithFeedback } from '@/hooks';
import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/lib/utils';

import type { Route } from 'next';

export function UserMenu() {
  const { address, chainId, disconnect } = useWallet();
  const { formattedBalance, symbol } = useBalance();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const instanceIdFromUrl = searchParams?.get('instanceId')?.trim() || null;
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [storedInstanceId] = useState<string>(() => {
    try {
      if (typeof window === 'undefined') return 'default';
      const saved = window.localStorage.getItem('oracleFilters');
      if (!saved) return 'default';
      const parsed = JSON.parse(saved) as { instanceId?: unknown } | null;
      const value = parsed && typeof parsed === 'object' ? parsed.instanceId : null;
      if (typeof value === 'string' && value.trim()) return value.trim();
    } catch {
      return 'default';
    }
    return 'default';
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { switchToChain, switchingChainId } = useSwitchChainWithFeedback({
    onClose: () => setIsOpen(false),
  });

  if (!address) return null;

  const gradient = `linear-gradient(135deg, #${address.slice(2, 8)} 0%, #${address.slice(8, 14)} 100%)`;
  const supportedChains = [mainnet, polygon, polygonAmoy, arbitrum, optimism, hardhat];

  const currentChain =
    chainId === polygon.id
      ? polygon
      : chainId === polygonAmoy.id
        ? polygonAmoy
        : chainId === arbitrum.id
          ? arbitrum
          : chainId === optimism.id
            ? optimism
            : chainId === hardhat.id
              ? hardhat
              : chainId === mainnet.id
                ? mainnet
                : null;

  const instanceId = instanceIdFromUrl ?? storedInstanceId;

  const attachInstanceId = (href: string) => {
    const normalized = (instanceId ?? '').trim();
    if (!normalized) return href;
    const url = new URL(href, 'http://oracle-monitor.local');
    url.searchParams.set('instanceId', normalized);
    return `${url.pathname}${url.search}${url.hash}`;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-full border p-1 pr-3 transition-all',
          isOpen
            ? 'border-purple-200 bg-purple-50 ring-2 ring-purple-100'
            : 'border-gray-200 bg-white hover:border-purple-200 hover:shadow-sm',
        )}
      >
        <div
          className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
          style={{ background: gradient }}
        />
        <div className="flex flex-col items-start">
          <span className="text-xs font-semibold text-gray-700">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={cn('text-gray-400 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="animate-in fade-in zoom-in-95 absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5 duration-200">
          {/* Header */}
          <div className="mb-2 rounded-lg bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">{t('wallet.balance')}</span>
              <span className="font-mono text-xs font-bold text-gray-900">
                {formattedBalance} {symbol}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5">
              <span className="truncate font-mono text-xs text-gray-500">{address}</span>
              <button
                onClick={handleCopy}
                className="text-gray-400 transition-colors hover:text-purple-600"
                title={t('wallet.copyAddress')}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="mb-2 rounded-lg border border-gray-100 bg-white px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">{t('wallet.network')}</span>
              <span className="text-xs font-semibold text-gray-900">
                {currentChain ? currentChain.name : t('wallet.unknownNetwork')}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {supportedChains.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void switchToChain({ id: c.id, name: c.name })}
                  disabled={switchingChainId !== null}
                  className={cn(
                    'rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    chainId === c.id
                      ? 'border-purple-200 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700',
                  )}
                >
                  {switchingChainId === c.id ? t('wallet.switchingNetwork') : c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            <Link
              href={attachInstanceId('/my-assertions') as Route}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-purple-50 hover:text-purple-700"
              onClick={() => setIsOpen(false)}
            >
              <FileText size={16} />
              {t('nav.myAssertions')}
            </Link>
            <Link
              href={attachInstanceId('/my-disputes') as Route}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-purple-50 hover:text-purple-700"
              onClick={() => setIsOpen(false)}
            >
              <AlertTriangle size={16} />
              {t('nav.myDisputes')}
            </Link>
          </div>

          <div className="my-2 h-px bg-gray-100" />

          {/* Footer */}
          <button
            onClick={() => {
              disconnect();
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={16} />
            {t('wallet.disconnect')}
          </button>
        </div>
      )}
    </div>
  );
}
