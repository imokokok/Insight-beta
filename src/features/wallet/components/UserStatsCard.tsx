import { Trophy, ShieldAlert, Coins, Activity } from 'lucide-react';

import { InlineDataDisplay } from '@/components/common';
import { useI18n } from '@/i18n/LanguageProvider';
import { langToLocale } from '@/i18n/translations';
import { formatUsdCompact } from '@/shared/utils';
import type { UserStats } from '@/types/unifiedOracleTypes';

interface UserStatsCardProps {
  stats: UserStats | null;
  loading: boolean;
}

export function UserStatsCard({ stats, loading }: UserStatsCardProps) {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];

  if (loading || !stats) {
    return (
      <div className="rounded-xl border border-border/30 bg-card/30 p-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted" />
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-5 w-16 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items = [
    {
      label: t('oracle.stats.totalAssertions'),
      value: stats.totalAssertions,
      icon: <Activity className="h-4 w-4 text-blue-500" />,
      status: 'neutral' as const,
    },
    {
      label: t('oracle.stats.totalDisputes'),
      value: stats.totalDisputes,
      icon: <ShieldAlert className="h-4 w-4 text-rose-500" />,
      status: (stats.totalDisputes > 0 ? 'warning' : 'healthy') as 'warning' | 'healthy',
    },
    {
      label: t('oracle.stats.totalBonded'),
      value: formatUsdCompact(stats.totalBondedUsd, locale),
      icon: <Coins className="h-4 w-4 text-amber-500" />,
      status: 'neutral' as const,
    },
    {
      label: t('oracle.stats.winRate'),
      value: `${stats.winRate}%`,
      icon: <Trophy className="h-4 w-4 text-emerald-500" />,
      status: (stats.winRate >= 70 ? 'healthy' : stats.winRate >= 50 ? 'warning' : 'critical') as
        | 'healthy'
        | 'warning'
        | 'critical',
    },
  ];

  return <InlineDataDisplay items={items} columns={4} gap="md" showDividers />;
}
