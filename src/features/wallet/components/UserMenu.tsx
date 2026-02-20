'use client';

import { useState, useRef, useEffect } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { LogOut, Copy, Check, FileText, AlertTriangle, ChevronDown } from 'lucide-react';
import { arbitrum, hardhat, mainnet, optimism, polygon, polygonAmoy } from 'viem/chains';

import { useWallet } from '@/features/wallet/contexts/WalletContext';
import { useBalance, useSwitchChainWithFeedback } from '@/hooks';
import { useI18n } from '@/i18n/LanguageProvider';
import { cn, getOracleInstanceId } from '@/shared/utils';

import type { Route } from 'next';

export function UserMenu() {
  const { address, chainId, disconnect } = useWallet();
  const { formattedBalance, symbol } = useBalance();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const instanceIdFromUrl = searchParams?.get('instanceId')?.trim() || null;
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [storedInstanceId, setStoredInstanceId] = useState<string>('default');

  useEffect(() => {
    getOracleInstanceId().then((id) => setStoredInstanceId(id));
  }, []);
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
            ? 'border-primary/20 bg-primary/5 ring-2'
            : 'border-border bg-card hover:border-primary/20 hover:shadow-sm',
        )}
      >
        <div
          className="h-8 w-8 rounded-full border-2 border-card shadow-sm"
          style={{ background: gradient }}
        />
        <div className="flex flex-col items-start">
          <span className="text-xs font-semibold text-foreground">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={cn('text-muted-foreground transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="animate-in fade-in zoom-in-95 absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-xl border border-border bg-card p-2 shadow-xl duration-200">
          {/* Header */}
          <div className="mb-2 rounded-lg bg-muted/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {t('wallet.balance')}
              </span>
              <span className="font-mono text-xs font-bold text-foreground">
                {formattedBalance} {symbol}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/50 px-2 py-1.5">
              <span className="truncate font-mono text-xs text-muted-foreground">{address}</span>
              <button
                onClick={handleCopy}
                className="text-muted-foreground transition-colors hover:text-primary"
                title={t('wallet.copyAddress')}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="mb-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {t('wallet.network')}
              </span>
              <span className="text-xs font-semibold text-foreground">
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
                      ? 'border-primary/20 bg-primary/5 text-primary'
                      : 'border-border bg-muted/50 text-foreground hover:border-primary/20 hover:bg-primary/5',
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
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/5 hover:text-primary"
              onClick={() => setIsOpen(false)}
            >
              <FileText size={16} />
              {t('nav.myAssertions')}
            </Link>
            <Link
              href={attachInstanceId('/my-disputes') as Route}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/5 hover:text-primary"
              onClick={() => setIsOpen(false)}
            >
              <AlertTriangle size={16} />
              {t('nav.myDisputes')}
            </Link>
          </div>

          <div className="my-2 h-px bg-border" />

          {/* Footer */}
          <button
            onClick={() => {
              disconnect();
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            <LogOut size={16} />
            {t('wallet.disconnect')}
          </button>
        </div>
      )}
    </div>
  );
}
