/**
 * Event Timeline Page
 *
 * 事件时间线页面 - 统一展示系统事件
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { logger } from '@/lib/logger';

interface TimelineEvent {
  id: string;
  eventType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description?: string;
  protocol?: string;
  chain?: string;
  symbol?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
  parentEventId?: string;
  relatedEventIds?: string[];
  source: string;
  sourceUser?: string;
}

interface EventStats {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  today: number;
}

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/timeline/events?limit=100');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.data.events);

        // 计算统计
        const events = data.data.events;
        const today = new Date().toDateString();
        setStats({
          total: events.length,
          bySeverity: events.reduce((acc: Record<string, number>, e: TimelineEvent) => {
            acc[e.severity] = (acc[e.severity] || 0) + 1;
            return acc;
          }, {}),
          byType: events.reduce((acc: Record<string, number>, e: TimelineEvent) => {
            acc[e.eventType] = (acc[e.eventType] || 0) + 1;
            return acc;
          }, {}),
          today: events.filter((e: TimelineEvent) =>
            new Date(e.occurredAt).toDateString() === today
          ).length,
        });
      }
    } catch (error) {
      logger.error('Failed to fetch timeline events', { error });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Auto refresh every 30 seconds
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true;
    if (filter === 'alert') return event.eventType.includes('alert');
    if (filter === 'dispute') return event.eventType.includes('dispute');
    if (filter === 'deployment') return event.eventType.includes('deployment');
    if (filter === 'critical') return event.severity === 'critical';
    return true;
  });

  // Group events by date
  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const date = new Date(event.occurredAt).toLocaleDateString('zh-CN');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, TimelineEvent[]>);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">事件时间线</h1>
          <p className="text-muted-foreground text-sm">
            追踪系统事件、告警和关键操作
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            title="今日事件"
            value={stats.today}
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            title="总计"
            value={stats.total}
            icon={<Activity className="h-5 w-5" />}
          />
          <StatCard
            title="严重事件"
            value={stats.bySeverity.critical || 0}
            icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
            variant="danger"
          />
          <StatCard
            title="告警"
            value={stats.bySeverity.warning || 0}
            icon={<Clock className="h-5 w-5 text-yellow-500" />}
            variant="warning"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
          全部
        </FilterButton>
        <FilterButton active={filter === 'alert'} onClick={() => setFilter('alert')}>
          告警
        </FilterButton>
        <FilterButton active={filter === 'dispute'} onClick={() => setFilter('dispute')}>
          争议
        </FilterButton>
        <FilterButton active={filter === 'deployment'} onClick={() => setFilter('deployment')}>
          部署
        </FilterButton>
        <FilterButton active={filter === 'critical'} onClick={() => setFilter('critical')} variant="danger">
          严重
        </FilterButton>
      </div>

      {/* Timeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              时间线
            </CardTitle>
            <CardDescription>
              共 {filteredEvents.length} 个事件
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-6">
                {Object.entries(groupedEvents).map(([date, dateEvents]) => (
                  <div key={date}>
                    <div className="sticky top-0 mb-4 flex items-center gap-2 bg-background py-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {date}
                      </span>
                      <Separator className="flex-1" />
                    </div>
                    <div className="space-y-4">
                      {dateEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          selected={selectedEvent?.id === event.id}
                          onClick={() => setSelectedEvent(event)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {filteredEvents.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    暂无事件
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Event Detail */}
        <Card>
          <CardHeader>
            <CardTitle>事件详情</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEvent ? (
              <div className="space-y-4">
                <div>
                  <Badge
                    variant={getSeverityVariant(selectedEvent.severity)}
                    className="mb-2"
                  >
                    {selectedEvent.severity}
                  </Badge>
                  <h3 className="font-semibold">{selectedEvent.title}</h3>
                  {selectedEvent.description && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {selectedEvent.description}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">类型</span>
                    <span>{selectedEvent.eventType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">时间</span>
                    <span>
                      {new Date(selectedEvent.occurredAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  {selectedEvent.protocol && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">协议</span>
                      <span>{selectedEvent.protocol}</span>
                    </div>
                  )}
                  {selectedEvent.chain && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">链</span>
                      <span>{selectedEvent.chain}</span>
                    </div>
                  )}
                  {selectedEvent.symbol && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">交易对</span>
                      <span>{selectedEvent.symbol}</span>
                    </div>
                  )}
                  {selectedEvent.sourceUser && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">操作人</span>
                      <span>{selectedEvent.sourceUser}</span>
                    </div>
                  )}
                </div>

                {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="mb-2 text-sm font-medium">元数据</h4>
                      <pre className="bg-muted max-h-40 overflow-auto rounded p-2 text-xs">
                        {JSON.stringify(selectedEvent.metadata, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                选择一个事件查看详情
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  variant = 'default',
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger';
}) {
  const variantStyles = {
    default: 'bg-muted',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20',
    danger: 'bg-red-50 dark:bg-red-900/20',
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="rounded-lg bg-background p-2">{icon}</div>
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterButton({
  children,
  active,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <Button
      variant={active ? (variant === 'danger' ? 'destructive' : 'default') : 'outline'}
      size="sm"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function EventCard({
  event,
  selected,
  onClick,
}: {
  event: TimelineEvent;
  selected: boolean;
  onClick: () => void;
}) {
  const icons: Record<string, React.ReactNode> = {
    alert_triggered: <AlertTriangle className="h-4 w-4" />,
    alert_resolved: <CheckCircle className="h-4 w-4" />,
    dispute_created: <XCircle className="h-4 w-4" />,
    dispute_resolved: <CheckCircle className="h-4 w-4" />,
    deployment: <Server className="h-4 w-4" />,
    config_changed: <Settings className="h-4 w-4" />,
    price_spike: <TrendingUp className="h-4 w-4" />,
    price_drop: <TrendingDown className="h-4 w-4" />,
    system_maintenance: <Activity className="h-4 w-4" />,
  };

  const severityColors: Record<string, string> = {
    info: 'border-l-blue-500',
    warning: 'border-l-yellow-500',
    error: 'border-l-orange-500',
    critical: 'border-l-red-500',
  };

  return (
    <div
      className={`cursor-pointer rounded-lg border border-l-4 p-4 transition-colors hover:bg-muted ${
        severityColors[event.severity]
      } ${selected ? 'bg-muted' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="text-muted-foreground mt-0.5">
          {icons[event.eventType] || <Activity className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{event.title}</span>
            <Badge variant="outline" className="shrink-0 text-xs">
              {event.eventType}
            </Badge>
          </div>
          {event.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {event.description}
            </p>
          )}
          <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
            <span>{new Date(event.occurredAt).toLocaleTimeString('zh-CN')}</span>
            {event.protocol && <span>{event.protocol}</span>}
            {event.chain && <span>{event.chain}</span>}
            {event.symbol && <span>{event.symbol}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function getSeverityVariant(severity: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (severity) {
    case 'critical':
    case 'error':
      return 'destructive';
    case 'warning':
      return 'secondary';
    default:
      return 'default';
  }
}
