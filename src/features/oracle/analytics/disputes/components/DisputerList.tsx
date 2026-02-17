'use client';

import { Trophy, DollarSign, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SkeletonList } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { truncateAddress, formatTime } from '@/shared/utils';

import type { DisputerStats } from '../types/disputes';

interface DisputerListProps {
  disputers: DisputerStats[];
  isLoading: boolean;
  onSelect?: (disputer: DisputerStats) => void;
}

export function DisputerList({ disputers, isLoading, onSelect }: DisputerListProps) {
  const { t } = useI18n();

  if (isLoading) {
    return <SkeletonList count={5} />;
  }

  return (
    <div className="space-y-4">
      {disputers.map((disputer, index) => (
        <Card
          key={disputer.address}
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => onSelect?.(disputer)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {index < 3 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <Trophy className="h-4 w-4" />
                  </div>
                )}
                {index >= 3 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 font-medium">
                    {index + 1}
                  </div>
                )}
                <div>
                  <CardTitle className="text-sm font-mono">
                    {truncateAddress(disputer.address)}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {t('analytics:disputes.disputers.firstDisputeAt')}: {formatTime(disputer.firstDisputeAt)}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-sm font-bold ${disputer.winRate >= 60 ? 'text-green-600' : disputer.winRate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  {disputer.winRate.toFixed(1)}%
                </div>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-gray-500">{t('analytics:disputes.disputers.totalDisputes')}</p>
                <p className="font-medium text-gray-900">{disputer.totalDisputes}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('analytics:disputes.disputers.successfulDisputes')}</p>
                <p className="font-medium text-gray-900">{disputer.successfulDisputes}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('analytics:disputes.disputers.totalBonded')}</p>
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {disputer.totalBonded.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t('analytics:disputes.disputers.totalRewards')}</p>
                <p className="font-medium text-green-600 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {disputer.totalRewards.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
