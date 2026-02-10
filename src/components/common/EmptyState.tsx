/**
 * Empty State Component
 *
 * 空状态组件 - 用于无数据时展示，支持基础和增强两种模式
 */

import type { ReactNode } from 'react';

import {
  Search,
  ShieldCheck,
  Brain,
  BarChart3,
  Star,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  Globe,
  TrendingUp,
  Activity,
  Zap,
  Plus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

// ==================== 基础 EmptyState 组件 ====================

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {Icon && (
        <div className="mb-4 rounded-full bg-gray-100 p-4">
          <Icon className="h-12 w-12 text-gray-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
      {action && (
        <Button onClick={action.onClick} className="mt-4" variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ==================== 增强版 EmptyState 组件 ====================

interface EmptyStateEnhancedProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
  variant?: 'default' | 'healthy' | 'action' | 'info';
}

export function EmptyStateEnhanced({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
  variant = 'default',
}: EmptyStateEnhancedProps) {
  const variantStyles = {
    default: {
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-400',
      borderColor: 'border-gray-200',
      bgColor: 'bg-white/50',
    },
    healthy: {
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      bgColor: 'bg-emerald-50/30',
    },
    action: {
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      bgColor: 'bg-purple-50/30',
    },
    info: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      bgColor: 'bg-blue-50/30',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center',
        styles.borderColor,
        styles.bgColor,
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            'mb-4 flex h-16 w-16 items-center justify-center rounded-full',
            styles.iconBg,
          )}
        >
          <Icon className={cn('h-8 w-8', styles.iconColor)} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size="sm">
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              onClick={action.onClick}
              className={cn(
                'gap-2',
                variant === 'healthy' && 'bg-emerald-600 hover:bg-emerald-700',
                variant === 'action' && 'bg-purple-600 hover:bg-purple-700',
                variant === 'info' && 'bg-blue-600 hover:bg-blue-700',
              )}
              size="sm"
            >
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== 预定义的空状态场景 ====================

// ----- 基础版本 -----

export function EmptySearchState({
  searchTerm,
  onClear,
  className,
}: {
  searchTerm?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Search}
      title={searchTerm ? `No results for "${searchTerm}"` : 'No results found'}
      description="Try adjusting your search or filters to find what you're looking for."
      className={className}
      action={
        onClear
          ? {
              label: 'Clear filters',
              onClick: onClear,
            }
          : undefined
      }
    />
  );
}

export function EmptySecurityState({
  onRefresh,
  className,
}: {
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={ShieldCheck}
      title="No Detections Found"
      description="Great news! No suspicious activities have been detected. The system is actively monitoring and will alert you immediately when threats are identified."
      className={className}
      action={
        onRefresh
          ? {
              label: 'Refresh',
              onClick: onRefresh,
            }
          : undefined
      }
    />
  );
}

export function EmptyAnomalyState({
  onRefresh,
  className,
}: {
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Brain}
      title="No Anomalies Detected"
      description="ML models are actively monitoring price feeds. When anomalies are detected, they will appear here with detailed analysis and confidence scores."
      className={className}
      action={
        onRefresh
          ? {
              label: 'Refresh',
              onClick: onRefresh,
            }
          : undefined
      }
    />
  );
}

export function EmptyDeviationState({
  onRefresh,
  className,
}: {
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={BarChart3}
      title="No Deviation Data"
      description="Price deviation analysis will appear here once data is collected. This helps identify when different oracle protocols report significantly different prices."
      className={className}
      action={
        onRefresh
          ? {
              label: 'Refresh',
              onClick: onRefresh,
            }
          : undefined
      }
    />
  );
}

export function EmptyErrorState({
  error,
  onRetry,
  className,
}: {
  error?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Search}
      title="Failed to load data"
      description={error || 'Something went wrong while loading the data. Please try again.'}
      className={className}
      action={
        onRetry
          ? {
              label: 'Try again',
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}

// ----- 增强版本 -----

export function EmptyAlertsState({
  onSetAlertRules,
  className,
}: {
  onSetAlertRules?: () => void;
  className?: string;
}) {
  return (
    <EmptyStateEnhanced
      icon={ShieldCheck}
      title="系统运行健康"
      description="当前没有活跃告警，所有预言机协议正常运行。配置告警规则以及时获取异常通知。"
      variant="healthy"
      className={className}
      action={
        onSetAlertRules
          ? {
              label: '设置告警规则',
              onClick: onSetAlertRules,
            }
          : undefined
      }
    >
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-100/50 px-4 py-2 text-sm text-emerald-700">
        <Sparkles className="h-4 w-4" />
        <span>所有系统正常运行</span>
      </div>
    </EmptyStateEnhanced>
  );
}

export function EmptyWatchlistState({
  onBrowseAssets,
  className,
}: {
  onBrowseAssets?: () => void;
  className?: string;
}) {
  return (
    <EmptyStateEnhanced
      icon={Star}
      title="开始添加监控"
      description="您还没有添加任何监控项。浏览预言机数据并添加您感兴趣的资产到关注列表。"
      variant="action"
      className={className}
      action={
        onBrowseAssets
          ? {
              label: '添加第一个监控',
              onClick: onBrowseAssets,
            }
          : undefined
      }
    >
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-purple-100/50 p-3">
          <div className="text-lg font-semibold text-purple-700">100+</div>
          <div className="text-xs text-purple-600">资产</div>
        </div>
        <div className="rounded-lg bg-purple-100/50 p-3">
          <div className="text-lg font-semibold text-purple-700">6</div>
          <div className="text-xs text-purple-600">协议</div>
        </div>
        <div className="rounded-lg bg-purple-100/50 p-3">
          <div className="text-lg font-semibold text-purple-700">实时</div>
          <div className="text-xs text-purple-600">更新</div>
        </div>
      </div>
    </EmptyStateEnhanced>
  );
}

export function EmptySearchStateEnhanced({
  searchTerm,
  onClear,
  className,
}: {
  searchTerm?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <EmptyStateEnhanced
      icon={Search}
      title={searchTerm ? `未找到 "${searchTerm}" 的结果` : '未找到结果'}
      description="尝试调整搜索词或筛选条件，或者浏览所有可用数据。"
      variant="info"
      className={className}
      action={
        onClear
          ? {
              label: '清除筛选',
              onClick: onClear,
            }
          : undefined
      }
    />
  );
}

export function EmptySecurityStateEnhanced({
  onRefresh,
  className,
}: {
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EmptyStateEnhanced
      icon={ShieldCheck}
      title="未发现异常"
      description="好消息！系统未检测到可疑活动。我们会持续监控并在发现威胁时立即通知您。"
      variant="healthy"
      className={className}
      action={
        onRefresh
          ? {
              label: '刷新',
              onClick: onRefresh,
            }
          : undefined
      }
    />
  );
}

export function EmptyAnomalyStateEnhanced({
  onRefresh,
  className,
}: {
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EmptyStateEnhanced
      icon={Brain}
      title="未检测到异常"
      description="ML 模型正在持续监控价格数据。当检测到异常时，将显示详细的分析和置信度评分。"
      variant="healthy"
      className={className}
      action={
        onRefresh
          ? {
              label: '刷新',
              onClick: onRefresh,
            }
          : undefined
      }
    />
  );
}

export function EmptyDeviationStateEnhanced({
  onRefresh,
  className,
}: {
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EmptyStateEnhanced
      icon={BarChart3}
      title="暂无偏差数据"
      description="价格偏差分析将在数据收集后显示。这有助于识别不同预言机协议报告显著不同价格的情况。"
      variant="info"
      className={className}
      action={
        onRefresh
          ? {
              label: '刷新',
              onClick: onRefresh,
            }
          : undefined
      }
    />
  );
}

export function EmptyDashboardState({
  onRefresh,
  className,
}: {
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EmptyStateEnhanced
      icon={LayoutDashboard}
      title="仪表板准备就绪"
      description="数据正在同步中，请稍候。仪表板将显示所有关键指标和实时数据。"
      variant="info"
      className={className}
      action={
        onRefresh
          ? {
              label: '刷新数据',
              onClick: onRefresh,
            }
          : undefined
      }
    >
      <div className="mt-4 flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
        <span className="text-sm text-blue-600">正在同步数据...</span>
      </div>
    </EmptyStateEnhanced>
  );
}

export function EmptyProtocolsState({
  onExplore,
  className,
}: {
  onExplore?: () => void;
  className?: string;
}) {
  return (
    <EmptyStateEnhanced
      icon={Globe}
      title="探索预言机协议"
      description="查看 Chainlink、Pyth、Band 等主流预言机协议的实时数据和性能指标。"
      variant="action"
      className={className}
      action={
        onExplore
          ? {
              label: '浏览协议',
              onClick: onExplore,
            }
          : undefined
      }
    >
      <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {['Chainlink', 'Pyth', 'Band', 'API3'].map((protocol) => (
          <div key={protocol} className="rounded-lg bg-purple-100/50 px-3 py-2">
            <span className="text-sm font-medium text-purple-700">{protocol}</span>
          </div>
        ))}
      </div>
    </EmptyStateEnhanced>
  );
}

export function EmptyPriceDataState({
  pair,
  onSelectPair,
  className,
}: {
  pair?: string;
  onSelectPair?: () => void;
  className?: string;
}) {
  return (
    <EmptyStateEnhanced
      icon={TrendingUp}
      title={pair ? `${pair} 暂无数据` : '选择交易对'}
      description={
        pair ? '该交易对的数据正在同步中，请稍后再试。' : '选择交易对以查看实时价格数据和分析图表。'
      }
      variant="info"
      className={className}
      action={
        onSelectPair
          ? {
              label: '选择交易对',
              onClick: onSelectPair,
            }
          : undefined
      }
    >
      {!pair && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {['ETH/USD', 'BTC/USD', 'LINK/USD'].map((p) => (
            <span key={p} className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
              {p}
            </span>
          ))}
        </div>
      )}
    </EmptyStateEnhanced>
  );
}

export function EmptyEventsState({
  onViewHistory,
  className,
}: {
  onViewHistory?: () => void;
  className?: string;
}) {
  return (
    <EmptyStateEnhanced
      icon={Activity}
      title="暂无活跃事件"
      description="当前没有正在进行的争议或断言事件。您可以查看历史记录了解过往事件。"
      variant="healthy"
      className={className}
      action={
        onViewHistory
          ? {
              label: '查看历史',
              onClick: onViewHistory,
            }
          : undefined
      }
    >
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-100/50 px-4 py-2 text-sm text-emerald-700">
        <Zap className="h-4 w-4" />
        <span>系统运行平稳</span>
      </div>
    </EmptyStateEnhanced>
  );
}

export function EmptyFirstItemState({
  itemName,
  description,
  onAdd,
  className,
}: {
  itemName: string;
  description?: string;
  onAdd?: () => void;
  className?: string;
}) {
  return (
    <EmptyStateEnhanced
      icon={Plus}
      title={`添加第一个${itemName}`}
      description={description || `开始添加${itemName}以使用此功能。`}
      variant="action"
      className={className}
      action={
        onAdd
          ? {
              label: `添加${itemName}`,
              onClick: onAdd,
            }
          : undefined
      }
    />
  );
}

export function EmptyErrorStateEnhanced({
  error,
  onRetry,
  className,
}: {
  error?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyStateEnhanced
      icon={Search}
      title="加载数据失败"
      description={error || '加载数据时出现问题，请稍后重试。'}
      variant="default"
      className={className}
      action={
        onRetry
          ? {
              label: '重试',
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}
