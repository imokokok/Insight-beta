'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Globe } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';
import { languages, type Lang } from '@/i18n/translations';
import { cn } from '@/shared/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t, isLoading } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const currentLabel = useMemo(() => {
    return languages.find((l) => l.code === lang)?.label ?? t('common.language');
  }, [lang, t]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const onSelect = (next: Lang) => {
    setLang(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-xl bg-white/50 px-3 text-sm font-medium text-[var(--foreground)] shadow-sm ring-1 ring-primary/10 backdrop-blur hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <Globe size={16} className="text-primary" />
        <span className="whitespace-nowrap">{isLoading ? '' : currentLabel}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-2xl border border-primary/10 bg-white/80 shadow-lg backdrop-blur">
          <div className="p-1">
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => onSelect(l.code)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors',
                  l.code === lang
                    ? 'bg-primary/10 text-[var(--foreground)]'
                    : 'text-muted-foreground hover:bg-white/60 hover:text-[var(--foreground)]',
                )}
              >
                <span>{l.label}</span>
                {l.code === lang && <span className="text-xs text-primary">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
