import { Trophy, ShieldAlert, Coins, Activity } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';
import { langToLocale } from '@/i18n/translations';
import type { UserStats } from '@/types/oracleTypes';
import { formatUsdCompact } from '@/shared/utils';

interface UserStatsCardProps {
  stats: UserStats | null;
  loading: boolean;
}

export function UserStatsCard({ stats, loading }: UserStatsCardProps) {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card flex animate-pulse items-center gap-4 rounded-2xl p-4">
            <div className="h-12 w-12 rounded-xl bg-gray-200/50" />
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-gray-200/50" />
              <div className="h-6 w-16 rounded bg-gray-200/50" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: t('oracle.stats.totalAssertions'),
      value: stats.totalAssertions,
      icon: Activity,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: t('oracle.stats.totalDisputes'),
      value: stats.totalDisputes,
      icon: ShieldAlert,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      label: t('oracle.stats.totalBonded'),
      value: formatUsdCompact(stats.totalBondedUsd, locale),
      icon: Coins,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: t('oracle.stats.winRate'),
      value: `${stats.winRate}%`,
      icon: Trophy,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={i}
          className="glass-card flex items-center gap-4 rounded-2xl p-4 transition-all hover:scale-105"
        >
          <div className={`rounded-xl p-3 ${item.bg} ${item.color}`}>
            <item.icon size={20} />
          </div>
          <div>
            <div className="mb-0.5 text-xs font-medium uppercase tracking-wider text-gray-500">
              {item.label}
            </div>
            <div className="text-xl font-bold text-gray-900">{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
