'use client';

import { useState, useEffect, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

import { cn, formatTimeAgo } from '@/shared/utils';

type ActivityType = 'price_update' | 'status_change' | 'anomaly' | 'sync';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  protocol?: string;
  symbol?: string;
  value?: string;
  change?: 'up' | 'down' | 'neutral';
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

const activityConfig: Record<ActivityType, { icon: React.ReactNode; color: string; bg: string }> = {
  price_update: {
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  status_change: {
    icon: <Activity className="h-3.5 w-3.5" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  anomaly: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
  sync: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
};

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newActivityId, setNewActivityId] = useState<string | null>(null);

  // Auto scroll to top when new activities arrive
  useEffect(() => {
    if (activities.length > 0 && scrollRef.current) {
      const latestActivity = activities[0];
      if (latestActivity && latestActivity.id !== newActivityId) {
        setNewActivityId(latestActivity.id);
        scrollRef.current.scrollTop = 0;
      }
    }
  }, [activities, newActivityId]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/30" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 rounded-full bg-muted/30 p-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="scrollbar-thin max-h-[400px] space-y-1 overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {activities.map((activity, index) => (
          <ActivityItemComponent
            key={activity.id}
            activity={activity}
            index={index}
            isNew={activity.id === newActivityId}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ActivityItemComponent({
  activity,
  index,
  isNew,
}: {
  activity: ActivityItem;
  index: number;
  isNew: boolean;
}) {
  const config = activityConfig[activity.type];

  const ChangeIcon =
    activity.change === 'up'
      ? ArrowUpRight
      : activity.change === 'down'
        ? ArrowDownRight
        : ArrowUpRight;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{
        opacity: 1,
        x: 0,
        scale: 1,
        backgroundColor: isNew ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
      }}
      exit={{ opacity: 0, x: 20 }}
      transition={{
        duration: 0.3,
        delay: index * 0.02,
        backgroundColor: { duration: 1 },
      }}
      className={cn(
        'flex items-start gap-3 rounded-xl p-3 transition-all duration-300',
        'hover:bg-background/50',
      )}
    >
      {/* Icon */}
      <div className={cn('mt-0.5 flex-shrink-0 rounded-lg p-2', config.bg, config.color)}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{activity.title}</span>
          {activity.change && (
            <span
              className={cn(
                'flex items-center text-xs',
                activity.change === 'up'
                  ? 'text-emerald-400'
                  : activity.change === 'down'
                    ? 'text-red-400'
                    : 'text-muted-foreground',
              )}
            >
              <ChangeIcon className="h-3 w-3" />
            </span>
          )}
        </div>
        <p className="line-clamp-1 text-xs text-muted-foreground">{activity.description}</p>
        <div className="mt-1.5 flex items-center gap-2">
          {activity.protocol && (
            <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {activity.protocol}
            </span>
          )}
          {activity.symbol && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
              {activity.symbol}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            {formatTimeAgo(activity.timestamp, 'en')}
          </span>
        </div>
      </div>

      {/* Value */}
      {activity.value && (
        <div className="flex-shrink-0 text-right">
          <span className="text-sm font-medium tabular-nums">{activity.value}</span>
        </div>
      )}
    </motion.div>
  );
}
