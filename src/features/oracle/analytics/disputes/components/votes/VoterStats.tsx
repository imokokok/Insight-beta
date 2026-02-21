'use client';

import { User, TrendingUp, Award, Scale, ExternalLink } from 'lucide-react';

import type { VoterStats as VoterStatsType } from '@/app/api/oracle/uma/votes/route';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonList } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn, truncateAddress } from '@/shared/utils';

interface VoterStatsProps {
  voterStats: VoterStatsType[];
  isLoading: boolean;
  chain?: string;
}

function AccuracyBadge({ accuracy }: { accuracy: number }) {
  const getAccuracyColor = (acc: number) => {
    if (acc >= 80) return 'bg-green-100 text-green-700';
    if (acc >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <Badge variant="outline" className={cn('font-mono', getAccuracyColor(accuracy))}>
      {accuracy.toFixed(1)}%
    </Badge>
  );
}

function VoterStatRow({ stat }: { stat: VoterStatsType }) {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <a
            href={`https://etherscan.io/address/${stat.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-mono text-sm font-medium text-primary hover:underline"
          >
            {truncateAddress(stat.address)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>
              {stat.totalVotes} {t('analytics:disputes.voterStats.votes')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Scale className="h-3 w-3" />
            <span>{stat.totalWeight.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <AccuracyBadge accuracy={stat.accuracy} />
        <span className="text-xs text-muted-foreground">
          {t('analytics:disputes.voterStats.avgWeight')}: {stat.avgWeight.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

export function VoterStats({ voterStats, isLoading }: VoterStatsProps) {
  const { t } = useI18n();

  if (isLoading) {
    return <SkeletonList count={5} />;
  }

  if (voterStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <User className="mb-4 h-10 w-10 text-gray-300" />
        <h3 className="text-sm font-medium text-gray-900">
          {t('analytics:disputes.voterStats.empty')}
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          {t('analytics:disputes.voterStats.emptyDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {voterStats.map((stat) => (
        <VoterStatRow key={stat.address} stat={stat} />
      ))}
    </div>
  );
}

interface VoterStatsCardProps {
  voterStats: VoterStatsType[];
  isLoading: boolean;
  chain?: string;
}

export function VoterStatsCard({ voterStats, isLoading, chain }: VoterStatsCardProps) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-4 w-4" />
          {t('analytics:disputes.voterStats.title')}
          {!isLoading && (
            <Badge variant="secondary" className="ml-auto">
              {voterStats.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto">
        <VoterStats voterStats={voterStats} isLoading={isLoading} chain={chain} />
      </CardContent>
    </Card>
  );
}

interface VoteSummaryCardProps {
  summary: {
    totalVotes: number;
    supportVotes: number;
    againstVotes: number;
    totalWeight: number;
    avgWeight: number;
    uniqueVoters: number;
  };
  isLoading: boolean;
}

export function VoteSummaryCard({ summary, isLoading }: VoteSummaryCardProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="h-20 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const supportPercentage =
    summary.totalVotes > 0 ? ((summary.supportVotes / summary.totalVotes) * 100).toFixed(1) : '0';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          {t('analytics:disputes.votes.summary')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold">{summary.totalVotes}</p>
            <p className="text-xs text-muted-foreground">
              {t('analytics:disputes.votes.totalVotes')}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold">{summary.uniqueVoters}</p>
            <p className="text-xs text-muted-foreground">
              {t('analytics:disputes.votes.uniqueVoters')}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{supportPercentage}%</p>
            <p className="text-xs text-green-600">{t('analytics:disputes.votes.supportRate')}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold">{(summary.totalWeight / 1000).toFixed(1)}K</p>
            <p className="text-xs text-muted-foreground">
              {t('analytics:disputes.votes.totalWeight')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
