'use client';

import {
  FileText,
  Gavel,
  CheckCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  Circle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import type {
  UMAAssertionEvent,
  UMADisputeEvent,
  UMASettlementEvent,
} from '@/lib/blockchain/umaOracle';
import { cn, formatTime, truncateAddress, getExplorerUrl } from '@/shared/utils';

export interface TimelineNode {
  id: string;
  type: 'created' | 'waiting' | 'disputed' | 'settled';
  timestamp: number;
  txHash?: string;
  status: 'completed' | 'active' | 'pending';
  label: string;
  description?: string;
}

interface AssertionTimelineProps {
  assertionEvent?: UMAAssertionEvent | null;
  disputeEvent?: UMADisputeEvent | null;
  settlementEvent?: UMASettlementEvent | null;
  chain?: string;
  expirationTime?: number;
  className?: string;
}

function TxLink({ txHash, chain }: { txHash?: string; chain?: string }) {
  if (!txHash) return null;

  const explorerUrl = getExplorerUrl(chain, txHash, 'tx');

  if (!explorerUrl) {
    return (
      <span className="font-mono text-xs text-muted-foreground">{truncateAddress(txHash)}</span>
    );
  }

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
    >
      {truncateAddress(txHash)}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function TimelineNodeComponent({
  node,
  isLast,
  chain,
}: {
  node: TimelineNode;
  isLast: boolean;
  chain?: string;
}) {
  const iconConfig = {
    created: {
      icon: <FileText className="h-4 w-4" />,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
    },
    waiting: {
      icon: <Clock className="h-4 w-4" />,
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
    },
    disputed: {
      icon: <Gavel className="h-4 w-4" />,
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
    settled: {
      icon: <CheckCircle className="h-4 w-4" />,
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
  };

  const statusConfig = {
    completed: { dotColor: 'bg-green-500', label: '已完成' },
    active: { dotColor: 'bg-blue-500 animate-pulse', label: '进行中' },
    pending: { dotColor: 'bg-gray-300', label: '待处理' },
  };

  const config = iconConfig[node.type];
  const statusConf = statusConfig[node.status];

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
            config.bgColor,
            config.borderColor,
            node.status === 'active' && 'ring-2 ring-blue-300 ring-offset-2',
          )}
        >
          <div className={config.textColor}>{config.icon}</div>
        </div>
        {!isLast && (
          <div
            className={cn(
              'min-h-[40px] w-0.5 flex-1',
              node.status === 'completed' ? 'bg-green-300' : 'bg-gray-200',
            )}
          />
        )}
      </div>
      <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <p className="text-sm font-medium">{node.label}</p>
              <Badge
                variant="outline"
                className={cn(
                  'px-1.5 py-0 text-[10px]',
                  node.status === 'completed' && 'border-green-300 text-green-600',
                  node.status === 'active' && 'border-blue-300 text-blue-600',
                  node.status === 'pending' && 'border-gray-300 text-gray-500',
                )}
              >
                <Circle className={cn('mr-1 h-1.5 w-1.5 fill-current', statusConf.dotColor)} />
                {statusConf.label}
              </Badge>
            </div>
            {node.description && (
              <p className="mb-2 text-xs text-muted-foreground">{node.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formatTime(node.timestamp)}</span>
              {node.txHash && (
                <>
                  <span className="text-border">|</span>
                  <TxLink txHash={node.txHash} chain={chain} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AssertionTimeline({
  assertionEvent,
  disputeEvent,
  settlementEvent,
  chain,
  expirationTime,
  className,
}: AssertionTimelineProps) {
  const { t } = useI18n();

  const nodes: TimelineNode[] = [];

  if (assertionEvent) {
    nodes.push({
      id: 'created',
      type: 'created',
      timestamp: assertionEvent.timestamp,
      txHash: assertionEvent.transactionHash,
      status: 'completed',
      label: t('analytics:disputes.timeline.assertionCreated'),
      description: t('analytics:disputes.timeline.assertionCreatedDesc'),
    });
  }

  const isDisputed = !!disputeEvent;
  const isSettled = !!settlementEvent;

  if (isDisputed && disputeEvent) {
    nodes.push({
      id: 'disputed',
      type: 'disputed',
      timestamp: disputeEvent.timestamp,
      txHash: disputeEvent.transactionHash,
      status: 'completed',
      label: t('analytics:disputes.timeline.assertionDisputed'),
      description: t('analytics:disputes.timeline.assertionDisputedDesc'),
    });
  }

  if (!isDisputed && !isSettled && expirationTime) {
    const currentTime = Math.floor(Date.now() / 1000);
    const isWaiting = currentTime < expirationTime;

    nodes.push({
      id: 'waiting',
      type: 'waiting',
      timestamp: expirationTime,
      status: isWaiting ? 'active' : 'completed',
      label: t('analytics:disputes.timeline.waitingPeriod'),
      description: isWaiting
        ? t('analytics:disputes.timeline.waitingPeriodDesc')
        : t('analytics:disputes.timeline.waitingPeriodEnded'),
    });
  }

  if (isSettled && settlementEvent) {
    nodes.push({
      id: 'settled',
      type: 'settled',
      timestamp: settlementEvent.timestamp,
      txHash: settlementEvent.transactionHash,
      status: 'completed',
      label: t('analytics:disputes.timeline.assertionSettled'),
      description: settlementEvent.disputed
        ? t('analytics:disputes.timeline.settledAfterDispute')
        : t('analytics:disputes.timeline.settledWithoutDispute'),
    });
  }

  if (nodes.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            {t('analytics:disputes.detail.timeline')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">{t('analytics:disputes.timeline.noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          {t('analytics:disputes.detail.timeline')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {nodes.map((node, index) => (
            <TimelineNodeComponent
              key={node.id}
              node={node}
              isLast={index === nodes.length - 1}
              chain={chain}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
