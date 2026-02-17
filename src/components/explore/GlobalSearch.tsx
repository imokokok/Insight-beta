'use client';

import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n';

export function GlobalSearch() {
  const { t } = useI18n();

  return (
    <div className="relative w-full max-w-xl">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={t('explore.search.placeholder')}
        className="pl-10 pr-4 h-11 bg-background"
      />
    </div>
  );
}
