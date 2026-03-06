'use client';

import { memo, useState, useEffect, useCallback } from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { ScrollArea } from '@/components/ui';
import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';
import { formatTime } from '@/shared/utils/format/date';
import { cn } from '@/shared/utils/ui';

interface VoteRecord {
  id: string;
  disputeId: string;
  assertionId: string;
  voter: string;
  vote: boolean;
  weight: string;
  timestamp: string;
  result?: 'correct' | 'incorrect' | 'pending';
}

interface VotesResponse {
  votes: VoteRecord[];
  metadata: {
    total: number;
    source: string;
    lastUpdated: string;
  };
}

export interface VoterHistoryModalProps {
  voterAddress: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VoterHistoryModal = memo(function VoterHistoryModal({
  voterAddress,
  open,
  onOpenChange,
}: VoterHistoryModalProps) {
  const { t } = useI18n();
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalVotes: 0,
    correctVotes: 0,
    successRate: 0,
  });

  const fetchVotes = useCallback(async (address: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/oracle/uma/votes?voter=${address}`);
      const result: VotesResponse = await response.json();
      if (result.votes) {
        setVotes(result.votes);
        const total = result.votes.length;
        const correct = result.votes.filter((v) => v.result === 'correct').length;
        setStats({
          totalVotes: total,
          correctVotes: correct,
          successRate: total > 0 ? Math.round((correct / total) * 100) : 0,
        });
      }
    } catch (err) {
      logger.error('Failed to fetch votes', { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && voterAddress) {
      fetchVotes(voterAddress);
    }
  }, [open, voterAddress, fetchVotes]);

  const getResultBadge = (result?: string) => {
    switch (result) {
      case 'correct':
        return <Badge variant="default">{t('uma.votes.correct')}</Badge>;
      case 'incorrect':
        return <Badge variant="destructive">{t('uma.votes.incorrect')}</Badge>;
      default:
        return <Badge variant="secondary">{t('uma.votes.pending')}</Badge>;
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-3xl translate-x-[-50%] translate-y-[-50%]',
            'border border-border bg-background shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100',
            'rounded-lg',
          )}
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold">
                {t('uma.detail.voterHistory')}
              </DialogPrimitive.Title>
              <p className="font-mono text-sm text-muted-foreground">
                {voterAddress.slice(0, 10)}...{voterAddress.slice(-8)}
              </p>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold">{stats.totalVotes}</p>
                  <p className="text-sm text-muted-foreground">{t('uma.votes.totalVotes')}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold text-green-500">{stats.correctVotes}</p>
                  <p className="text-sm text-muted-foreground">{t('uma.votes.correct')}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold">{stats.successRate}%</p>
                  <p className="text-sm text-muted-foreground">{t('uma.votes.successRate')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t('uma.detail.voteRecords')}
                </h3>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : votes.length > 0 ? (
                  <div className="rounded-lg border border-border">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-border bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                              {t('uma.disputes.assertionId')}
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                              {t('uma.votes.result')}
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                              {t('uma.votes.support')}
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                              {t('uma.votes.weight')}
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium">
                              {t('uma.votes.timestamp')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {votes.map((vote) => (
                            <tr key={vote.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 font-mono text-sm">
                                {vote.assertionId.slice(0, 10)}...{vote.assertionId.slice(-6)}
                              </td>
                              <td className="px-4 py-3">{getResultBadge(vote.result)}</td>
                              <td className="px-4 py-3">
                                <Badge variant={vote.vote ? 'default' : 'destructive'}>
                                  {vote.vote ? t('uma.votes.support') : t('uma.votes.against')}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {Number(vote.weight).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {formatTime(vote.timestamp)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
                    <p className="text-muted-foreground">{t('uma.detail.noVotes')}</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
});
