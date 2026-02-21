'use client';

import { motion } from 'framer-motion';
import { Trophy, Award, Medal } from 'lucide-react';

import { Card, CardContent } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface ReliabilityScoreCardProps {
  protocol: string;
  score: number;
  rank: number;
  accuracyScore: number;
  latencyScore: number;
  availabilityScore: number;
  deviationAvg: number;
  sampleCount: number;
}

const protocolColors: Record<string, { bg: string; border: string; text: string }> = {
  chainlink: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
  pyth: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500' },
  redstone: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500' },
  uma: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500' },
};

const rankIcons = [
  <Trophy key="1" className="h-5 w-5 text-yellow-500" />,
  <Medal key="2" className="h-5 w-5 text-gray-400" />,
  <Award key="3" className="h-5 w-5 text-amber-600" />,
];

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 80) return 'text-blue-500';
  if (score >= 70) return 'text-yellow-500';
  if (score >= 60) return 'text-orange-500';
  return 'text-red-500';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'fair';
  if (score >= 60) return 'poor';
  return 'critical';
}

export function ReliabilityScoreCard({
  protocol,
  score,
  rank,
  accuracyScore,
  latencyScore,
  availabilityScore,
  deviationAvg,
  sampleCount,
}: ReliabilityScoreCardProps) {
  const { t } = useI18n();
  const colors = protocolColors[protocol.toLowerCase()] ?? {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    text: 'text-gray-500',
  };

  const rankIcon = rankIcons[rank - 1] ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden border-2 transition-all hover:shadow-lg',
          colors.border,
        )}
      >
        <div className={cn('absolute inset-x-0 top-0 h-1', colors.bg.replace('/10', ''))} />
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {rankIcon}
              <span className={cn('text-lg font-bold capitalize', colors.text)}>{protocol}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {t('oracle.reliability.rank')} #{rank}
            </span>
          </div>

          <div className="mt-4 text-center">
            <div className={cn('text-4xl font-bold', getScoreColor(score))}>{score.toFixed(0)}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {t(`oracle.reliability.${getScoreLabel(score)}`)}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="font-medium text-foreground">{accuracyScore.toFixed(0)}</div>
              <div className="text-muted-foreground">{t('oracle.reliability.accuracy')}</div>
            </div>
            <div>
              <div className="font-medium text-foreground">{latencyScore.toFixed(0)}</div>
              <div className="text-muted-foreground">{t('oracle.reliability.latency')}</div>
            </div>
            <div>
              <div className="font-medium text-foreground">{availabilityScore.toFixed(0)}</div>
              <div className="text-muted-foreground">{t('oracle.reliability.availability')}</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t('oracle.reliability.avgDeviation')}: {(deviationAvg * 100).toFixed(3)}%
            </span>
            <span>
              {t('oracle.reliability.samples')}: {sampleCount.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
