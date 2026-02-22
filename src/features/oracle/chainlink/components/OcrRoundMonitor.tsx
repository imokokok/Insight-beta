'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';

import { AlertTriangle, RefreshCw, Users, Target, ChevronDown, ChevronRight } from 'lucide-react';

import { ContentSection } from '@/components/common';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { SkeletonList } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatTime } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import type { OcrRound, NodeContribution } from '../types';

interface OcrRoundMonitorProps {
  className?: string;
}

export function OcrRoundMonitor({ className }: OcrRoundMonitorProps) {
  const { t } = useI18n();
  const [rounds, setRounds] = useState<OcrRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());

  const fetchOcrRounds = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchApiData<OcrRound[]>('/api/oracle/chainlink/ocr');
      setRounds(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch OCR rounds');
      setRounds([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOcrRounds();
  }, [fetchOcrRounds]);

  const formatAnswer = (answer: string) => {
    const num = parseFloat(answer);
    if (isNaN(num)) return answer;
    if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (num >= 1) return num.toFixed(4);
    return num.toFixed(8);
  };

  const toggleRound = useCallback((roundId: string) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(roundId)) {
        next.delete(roundId);
      } else {
        next.add(roundId);
      }
      return next;
    });
  }, []);

  const renderNodeContributions = (contributions: NodeContribution[]) => {
    return (
      <div className="space-y-2 bg-muted/30 p-3">
        <div className="text-xs font-medium text-muted-foreground">
          {t('chainlink.ocr.nodeContributions') || '节点贡献度'}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {contributions.slice(0, 6).map((node, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between rounded border p-2 text-xs ${
                node.role === 'proposer'
                  ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
                  : 'border-muted'
              }`}
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="truncate font-medium">{node.nodeName}</span>
                {node.role === 'proposer' && (
                  <Badge variant="outline" className="h-4 px-1 py-0 text-[10px]">
                    {t('chainlink.ocr.proposer') || '提议者'}
                  </Badge>
                )}
              </div>
              <span className="font-mono text-muted-foreground">
                {node.contributionPercentage.toFixed(1)}%
              </span>
            </div>
          ))}
          {contributions.length > 6 && (
            <div className="text-xs text-muted-foreground">
              +{contributions.length - 6} {t('chainlink.ocr.moreNodes') || '更多节点'}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <ContentSection className={className}>
        <SkeletonList count={5} />
      </ContentSection>
    );
  }

  if (error) {
    return (
      <ContentSection className={className}>
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <div>
            <p className="font-medium text-foreground">{t('common.error')}</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOcrRounds}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.retry')}
          </Button>
        </div>
      </ContentSection>
    );
  }

  if (rounds.length === 0) {
    return (
      <ContentSection className={className}>
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Target className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t('chainlink.ocr.noData')}</p>
        </div>
      </ContentSection>
    );
  }

  return (
    <ContentSection
      className={className}
      title={
        <span className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          {t('chainlink.ocr.title')}
          <Badge variant="secondary" className="ml-2">
            {rounds.length}
          </Badge>
        </span>
      }
      action={
        <Button variant="outline" size="sm" onClick={fetchOcrRounds}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      }
    >
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('chainlink.ocr.roundId')}</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Users className="h-3 w-3" />
                  {t('chainlink.ocr.participatingNodes')}
                </div>
              </TableHead>
              <TableHead className="text-center">{t('chainlink.ocr.threshold')}</TableHead>
              <TableHead>{t('chainlink.ocr.answer')}</TableHead>
              <TableHead>{t('chainlink.ocr.startedAt')}</TableHead>
              <TableHead>{t('chainlink.ocr.updatedAt')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rounds.map((round) => (
              <Fragment key={round.roundId}>
                <TableRow>
                  <TableCell>
                    <button
                      onClick={() => round.nodeContributions && toggleRound(round.roundId)}
                      className={`flex items-center gap-2 font-mono font-medium ${
                        round.nodeContributions
                          ? 'cursor-pointer hover:text-primary'
                          : 'cursor-default'
                      }`}
                      disabled={!round.nodeContributions}
                    >
                      {round.nodeContributions ? (
                        expandedRounds.has(round.roundId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )
                      ) : null}
                      {round.roundId}
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={round.participatingNodes >= 3 ? 'success' : 'warning'}
                      size="sm"
                    >
                      {round.participatingNodes}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-sm">{round.aggregationThreshold}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-medium">{formatAnswer(round.answer)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(round.startedAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(round.updatedAt)}
                    </span>
                  </TableCell>
                </TableRow>
                {round.nodeContributions && expandedRounds.has(round.roundId) && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      {renderNodeContributions(round.nodeContributions)}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </ContentSection>
  );
}
