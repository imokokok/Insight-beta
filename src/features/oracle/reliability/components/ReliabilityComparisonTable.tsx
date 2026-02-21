'use client';

import { motion } from 'framer-motion';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type { ProtocolRanking } from '../hooks/useReliabilityScores';

interface ReliabilityComparisonTableProps {
  rankings: ProtocolRanking[];
  isLoading?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 80) return 'text-blue-500';
  if (score >= 70) return 'text-yellow-500';
  if (score >= 60) return 'text-orange-500';
  return 'text-red-500';
}

export function ReliabilityComparisonTable({
  rankings,
  isLoading,
}: ReliabilityComparisonTableProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('oracle.reliability.comparisonTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rankings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('oracle.reliability.comparisonTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            {t('oracle.reliability.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('oracle.reliability.comparisonTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t('oracle.reliability.rank')}</TableHead>
                  <TableHead>{t('oracle.reliability.protocol')}</TableHead>
                  <TableHead className="text-right">
                    {t('oracle.reliability.overallScore')}
                  </TableHead>
                  <TableHead className="text-right">{t('oracle.reliability.accuracy')}</TableHead>
                  <TableHead className="text-right">{t('oracle.reliability.latency')}</TableHead>
                  <TableHead className="text-right">
                    {t('oracle.reliability.availability')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('oracle.reliability.avgDeviation')}
                  </TableHead>
                  <TableHead className="text-right">{t('oracle.reliability.samples')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings.map((ranking) => (
                  <TableRow key={ranking.protocol}>
                    <TableCell className="font-medium">#{ranking.rank}</TableCell>
                    <TableCell className="capitalize">{ranking.protocol}</TableCell>
                    <TableCell className={cn('text-right font-bold', getScoreColor(ranking.score))}>
                      {ranking.score.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {ranking.metrics.accuracyScore.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {ranking.metrics.latencyScore.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {ranking.metrics.availabilityScore.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {(ranking.metrics.deviationAvg * 100).toFixed(3)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {ranking.metrics.sampleCount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
