'use client';

import * as React from 'react';

import { motion } from 'framer-motion';
import { Activity, Radio, Database, ExternalLink } from 'lucide-react';

import { StatusBadge } from '@/components/ui';
import { CardEnhanced } from '@/components/ui/Card';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import type { StatusType } from '@/types/common/status';

export interface ProtocolHealthCardProps {
  protocolId: string;
  protocolName: string;
  icon?: React.ReactNode;
  healthStatus: StatusType;
  onlineRate: number;
  feedCount: number;
  lastUpdated?: string;
  onClick?: () => void;
  className?: string;
  showExternalLink?: boolean;
}

const ProtocolHealthCard = React.memo(function ProtocolHealthCard({
  protocolId,
  protocolName,
  icon,
  healthStatus,
  onlineRate,
  feedCount,
  lastUpdated,
  onClick,
  className,
  showExternalLink = false,
}: ProtocolHealthCardProps) {
  const { t } = useI18n();
  const [isHovered, setIsHovered] = React.useState(false);

  const getOnlineRateColor = (rate: number) => {
    if (rate >= 99) return 'text-success';
    if (rate >= 95) return 'text-warning';
    return 'text-error';
  };

  const getOnlineRateBg = (rate: number) => {
    if (rate >= 99) return 'bg-success/10';
    if (rate >= 95) return 'bg-warning/10';
    return 'bg-error/10';
  };

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
      className={cn(onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      <CardEnhanced
        className={cn(
          'group relative overflow-hidden p-4',
          onClick && 'hover:border-primary/30',
          className,
        )}
        hover={!!onClick}
        clickable={!!onClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl',
                'bg-primary/10 text-primary',
              )}
              animate={{ scale: isHovered ? 1.05 : 1 }}
              transition={{ duration: 0.2 }}
            >
              {icon || <Activity className="h-5 w-5" />}
            </motion.div>
            <div>
              <h3 className="font-semibold text-foreground">{protocolName}</h3>
              <p className="text-xs text-muted-foreground">{protocolId.toUpperCase()}</p>
            </div>
          </div>
          <StatusBadge status={healthStatus} size="sm" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className={cn('rounded-lg p-2.5', getOnlineRateBg(onlineRate))}>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Radio className="h-3 w-3" />
              <span>{t('oracle.health.onlineRate')}</span>
            </div>
            <p className={cn('mt-1 text-lg font-bold', getOnlineRateColor(onlineRate))}>
              {onlineRate.toFixed(2)}%
            </p>
          </div>

          <div className="rounded-lg bg-muted/30 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              <span>{t('oracle.health.feedCount')}</span>
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">{feedCount}</p>
          </div>
        </div>

        {lastUpdated && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t('common.lastUpdated')}: {lastUpdated}
            </span>
            {showExternalLink && onClick && (
              <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </div>
        )}
      </CardEnhanced>
    </motion.div>
  );
});

ProtocolHealthCard.displayName = 'ProtocolHealthCard';

export { ProtocolHealthCard };
