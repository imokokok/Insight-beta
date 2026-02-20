'use client';

import { useState, useEffect, useCallback } from 'react';

import { AlertTriangle, RefreshCw, Users, Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonList } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/i18n';
import { formatTime } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import type { OcrRound } from '../types';

interface OcrRoundMonitorProps {
  className?: string;
}

export function OcrRoundMonitor({ className }: OcrRoundMonitorProps) {
  const { t } = useI18n();
  const [rounds, setRounds] = useState<OcrRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('chainlink.ocr.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={5} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('chainlink.ocr.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  if (rounds.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('chainlink.ocr.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Target className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t('chainlink.ocr.noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('chainlink.ocr.title')}
            <Badge variant="secondary" className="ml-2">
              {rounds.length}
            </Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchOcrRounds}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
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
                <TableRow key={round.roundId} className="group">
                  <TableCell>
                    <span className="font-mono font-medium">{round.roundId}</span>
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
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
