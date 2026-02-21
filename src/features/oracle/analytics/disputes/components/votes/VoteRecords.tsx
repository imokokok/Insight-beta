'use client';

import { ExternalLink, ThumbsUp, ThumbsDown, Scale, Clock } from 'lucide-react';

import type { Vote } from '@/app/api/oracle/uma/votes/route';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonList } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn, truncateAddress, formatTime } from '@/shared/utils';

interface VoteRecordsProps {
  votes: Vote[];
  isLoading: boolean;
  chain?: string;
}

function VoteBadge({ support }: { support: boolean }) {
  const { t } = useI18n();

  return (
    <Badge
      variant={support ? 'default' : 'destructive'}
      className={cn(
        'flex items-center gap-1',
        support
          ? 'bg-green-100 text-green-700 hover:bg-green-100'
          : 'bg-red-100 text-red-700 hover:bg-red-100',
      )}
    >
      {support ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
      {support ? t('analytics:disputes.votes.support') : t('analytics:disputes.votes.against')}
    </Badge>
  );
}

export function VoteRecords({ votes, isLoading }: VoteRecordsProps) {
  const { t } = useI18n();

  if (isLoading) {
    return <SkeletonList count={5} />;
  }

  if (votes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Scale className="mb-4 h-10 w-10 text-gray-300" />
        <h3 className="text-sm font-medium text-gray-900">{t('analytics:disputes.votes.empty')}</h3>
        <p className="mt-1 text-xs text-gray-500">
          {t('analytics:disputes.votes.emptyDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {votes.map((vote) => (
        <Card key={vote.id} className="transition-all hover:shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">
                    {truncateAddress(vote.voter)}
                  </span>
                  <VoteBadge support={vote.support} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Scale className="h-3 w-3" />
                    <span>
                      {t('analytics:disputes.votes.weight')}: {vote.weight.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(vote.timestamp)}</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                <a
                  href={`https://etherscan.io/tx/${vote.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {t('analytics:disputes.votes.viewTx')}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface VoteRecordsCardProps {
  votes: Vote[];
  isLoading: boolean;
  chain?: string;
}

export function VoteRecordsCard({ votes, isLoading, chain }: VoteRecordsCardProps) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4" />
          {t('analytics:disputes.votes.title')}
          {!isLoading && (
            <Badge variant="secondary" className="ml-auto">
              {votes.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto">
        <VoteRecords votes={votes} isLoading={isLoading} chain={chain} />
      </CardContent>
    </Card>
  );
}
