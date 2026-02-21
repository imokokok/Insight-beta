/**
 * Unified Empty State Component
 *
 * 统一的空状态组件 - 支持基础和动画两种模式
 * - 基础模式：简单的静态展示
 * - 动画模式：丰富的动画效果和视觉表现
 */

'use client';

import type { ReactNode } from 'react';

import { motion, type Variants } from 'framer-motion';
import {
  Search,
  ShieldCheck,
  Brain,
  BarChart3,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  Globe,
  TrendingUp,
  Activity,
  Zap,
  Plus,
  AlertCircle,
  FileX,
  Database,
  WifiOff,
  Box,
  FilterX,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/shared/utils';

interface UnifiedEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    href?: string;
    variant?: 'default' | 'outline' | 'ghost';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'healthy' | 'action' | 'info' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  children?: ReactNode;
}

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
};

const iconVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
    },
  },
};

const variantStyles = {
  default: {
    iconBg: 'bg-gradient-to-br from-primary/20 to-primary/10',
    iconColor: 'text-primary',
    borderColor: 'border-primary/20',
    bgColor: 'bg-card/50',
    gradient: 'from-primary/5 via-primary/3 to-transparent',
    buttonColor: 'bg-primary hover:bg-primary-600',
    shadow: 'shadow-primary/10',
  },
  healthy: {
    iconBg: 'bg-gradient-to-br from-green-500/20 to-green-400/10',
    iconColor: 'text-green-600',
    borderColor: 'border-green-500/20',
    bgColor: 'bg-green-500/5',
    gradient: 'from-green-500/5 via-green-500/3 to-transparent',
    buttonColor: 'bg-green-600 hover:bg-green-700',
    shadow: 'shadow-green-500/10',
  },
  action: {
    iconBg: 'bg-gradient-to-br from-primary/20 to-primary/10',
    iconColor: 'text-primary',
    borderColor: 'border-primary/20',
    bgColor: 'bg-primary/5',
    gradient: 'from-primary/5 via-primary/3 to-transparent',
    buttonColor: 'bg-primary hover:bg-primary-600',
    shadow: 'shadow-primary/10',
  },
  info: {
    iconBg: 'bg-gradient-to-br from-blue-500/20 to-blue-400/10',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-500/5',
    gradient: 'from-blue-500/5 via-blue-500/3 to-transparent',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    shadow: 'shadow-blue-500/10',
  },
  warning: {
    iconBg: 'bg-gradient-to-br from-amber-500/20 to-amber-400/10',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-500/20',
    bgColor: 'bg-amber-500/5',
    gradient: 'from-amber-500/5 via-amber-500/3 to-transparent',
    buttonColor: 'bg-amber-600 hover:bg-amber-700',
    shadow: 'shadow-amber-500/10',
  },
  error: {
    iconBg: 'bg-gradient-to-br from-red-500/20 to-red-400/10',
    iconColor: 'text-red-600',
    borderColor: 'border-red-500/20',
    bgColor: 'bg-red-500/5',
    gradient: 'from-red-500/5 via-red-500/3 to-transparent',
    buttonColor: 'bg-red-600 hover:bg-red-700',
    shadow: 'shadow-red-500/10',
  },
};

const sizeStyles = {
  sm: {
    container: 'p-6',
    icon: 'h-10 w-10',
    iconWrapper: 'h-14 w-14',
    title: 'text-base font-semibold',
    description: 'text-sm',
  },
  md: {
    container: 'p-10',
    icon: 'h-10 w-10',
    iconWrapper: 'h-18 w-18',
    title: 'text-lg font-semibold',
    description: 'text-sm',
  },
  lg: {
    container: 'p-14',
    icon: 'h-12 w-12',
    iconWrapper: 'h-24 w-24',
    title: 'text-xl font-semibold',
    description: 'text-base',
  },
};

export function UnifiedEmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = 'default',
  size = 'md',
  animated = true,
  children,
}: UnifiedEmptyStateProps) {
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];

  const Wrapper = animated ? motion.div : 'div';
  const wrapperProps = animated
    ? {
        initial: 'hidden',
        animate: 'visible',
        variants: containerVariants,
      }
    : {};

  return (
    <Wrapper
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border text-center transition-all duration-300',
        'bg-gradient-to-br',
        styles.borderColor,
        styles.gradient,
        sizes.container,
        'hover:shadow-lg',
        styles.shadow,
        className,
      )}
      {...wrapperProps}
    >
      {Icon && (
        <motion.div
          variants={animated ? iconVariants : undefined}
          className={cn(
            'mb-5 flex items-center justify-center rounded-2xl shadow-sm',
            styles.iconBg,
            sizes.iconWrapper,
          )}
        >
          <Icon className={cn(styles.iconColor, sizes.icon)} />
        </motion.div>
      )}

      <motion.h3
        variants={animated ? itemVariants : undefined}
        className={cn('text-gray-900 dark:text-gray-100', sizes.title)}
      >
        {title}
      </motion.h3>

      {description && (
        <motion.p
          variants={animated ? itemVariants : undefined}
          className={cn(
            'mt-3 max-w-md leading-relaxed text-gray-600 dark:text-gray-400',
            sizes.description,
          )}
        >
          {description}
        </motion.p>
      )}

      {children && (
        <motion.div variants={animated ? itemVariants : undefined} className="mt-5">
          {children}
        </motion.div>
      )}

      {(action || secondaryAction) && (
        <motion.div
          variants={animated ? itemVariants : undefined}
          className="mt-7 flex flex-wrap items-center justify-center gap-3"
        >
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              size="sm"
              className="shadow-sm"
            >
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              onClick={action.onClick}
              className={cn('gap-2 shadow-sm', styles.buttonColor)}
              variant={action.variant || 'default'}
              size="sm"
            >
              {action.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </motion.div>
      )}
    </Wrapper>
  );
}

export function EmptyState(props: Omit<UnifiedEmptyStateProps, 'animated'>) {
  return <UnifiedEmptyState {...props} animated={false} />;
}

export function EmptyStateEnhanced(props: UnifiedEmptyStateProps) {
  return <UnifiedEmptyState {...props} animated={true} />;
}

export const EnhancedEmptyState = UnifiedEmptyState;

export function EmptySearchState({
  searchTerm,
  onClear,
  onRefresh,
  className,
  animated = true,
  suggestions,
}: {
  searchTerm?: string;
  onClear?: () => void;
  onRefresh?: () => void;
  className?: string;
  animated?: boolean;
  suggestions?: string[];
}) {
  return (
    <UnifiedEmptyState
      icon={searchTerm ? FilterX : Search}
      title={searchTerm ? `未找到 "${searchTerm}" 的结果` : '暂无搜索结果'}
      description={
        searchTerm ? '请尝试使用其他关键词，或检查拼写是否正确' : '开始搜索以查找您需要的数据'
      }
      variant="info"
      className={className}
      animated={animated}
      action={
        onClear
          ? {
              label: '清除筛选',
              onClick: onClear,
              variant: 'default',
            }
          : onRefresh
            ? {
                label: '刷新搜索',
                onClick: onRefresh,
                variant: 'default',
              }
            : undefined
      }
      secondaryAction={
        onRefresh && onClear
          ? {
              label: '刷新',
              onClick: onRefresh,
            }
          : undefined
      }
    >
      {suggestions && suggestions.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {suggestions.map((suggestion, index) => (
            <span
              key={index}
              className="inline-flex cursor-pointer items-center rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
            >
              {suggestion}
            </span>
          ))}
        </div>
      )}
    </UnifiedEmptyState>
  );
}

export function EmptySecurityState({
  onRefresh,
  className,
  animated = true,
}: {
  onRefresh?: () => void;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  return (
    <UnifiedEmptyState
      icon={ShieldCheck}
      title={t('security.emptyStates.systemSecure')}
      description={t('security.emptyStates.systemSecureDesc')}
      variant="healthy"
      className={className}
      animated={animated}
      action={
        onRefresh
          ? {
              label: t('common.refresh'),
              onClick: onRefresh,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2 rounded-lg bg-emerald-100/50 px-4 py-2 text-sm text-emerald-700">
        <Sparkles className="h-4 w-4" />
        <span>{t('security.emptyStates.allSystemsOperational')}</span>
      </div>
    </UnifiedEmptyState>
  );
}

export function EmptyAnomalyState({
  onRefresh,
  className,
  animated = true,
}: {
  onRefresh?: () => void;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  return (
    <UnifiedEmptyState
      icon={Brain}
      title={t('security.emptyStates.noAnomaliesDetected')}
      description={t('security.emptyStates.noAnomaliesDesc')}
      variant="healthy"
      className={className}
      animated={animated}
      action={
        onRefresh
          ? {
              label: t('common.refresh'),
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
  animated = true,
}: {
  onRefresh?: () => void;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  return (
    <UnifiedEmptyState
      icon={BarChart3}
      title={t('analytics.deviation.trends.empty')}
      description={t('analytics.deviation.trends.emptyDescription')}
      variant="info"
      className={className}
      animated={animated}
      action={
        onRefresh
          ? {
              label: t('common.refresh'),
              onClick: onRefresh,
            }
          : undefined
      }
    />
  );
}

export function EmptyAlertsState({
  onSetAlertRules,
  className,
  animated = true,
}: {
  onSetAlertRules?: () => void;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  return (
    <UnifiedEmptyState
      icon={ShieldCheck}
      title={t('security.emptyStates.allSystemsHealthy')}
      description={t('security.emptyStates.allSystemsHealthyDesc')}
      variant="healthy"
      className={className}
      animated={animated}
      action={
        onSetAlertRules
          ? {
              label: t('security.emptyStates.configureAlerts'),
              onClick: onSetAlertRules,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2 rounded-lg bg-emerald-100/50 px-4 py-2 text-sm text-emerald-700">
        <Sparkles className="h-4 w-4" />
        <span>{t('security.emptyStates.everythingRunningSmoothly')}</span>
      </div>
    </UnifiedEmptyState>
  );
}

export function EmptyErrorState({
  error,
  onRetry,
  className,
  animated = true,
}: {
  error?: string;
  onRetry?: () => void;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  return (
    <UnifiedEmptyState
      icon={AlertCircle}
      title={t('dashboard.emptyStates.failedToLoadData')}
      description={error || t('dashboard.emptyStates.failedToLoadDataDesc')}
      variant="error"
      className={className}
      animated={animated}
      action={
        onRetry
          ? {
              label: t('common.tryAgain'),
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}

export function EmptyConnectionState({
  onRetry,
  className,
  animated = true,
}: {
  onRetry?: () => void;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  return (
    <UnifiedEmptyState
      icon={WifiOff}
      title={t('dashboard.emptyStates.connectionLost')}
      description={t('dashboard.emptyStates.connectionLostDesc')}
      variant="warning"
      className={className}
      animated={animated}
      action={
        onRetry
          ? {
              label: t('common.reconnect'),
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}

export function EmptyDashboardState({
  onRefresh,
  className,
  animated = true,
}: {
  onRefresh?: () => void;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  return (
    <UnifiedEmptyState
      icon={LayoutDashboard}
      title={t('dashboard.emptyStates.dashboardReady')}
      description={t('dashboard.emptyStates.dashboardReadyDesc')}
      variant="info"
      className={className}
      animated={animated}
      action={
        onRefresh
          ? {
              label: t('common.refreshData'),
              onClick: onRefresh,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
        <span className="text-sm text-blue-600">{t('dashboard.emptyStates.syncingData')}</span>
      </div>
    </UnifiedEmptyState>
  );
}

export function EmptyProtocolsState({
  onExplore,
  className,
  animated = true,
}: {
  onExplore?: () => void;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  const protocols = [
    t('common.chainlink'),
    t('common.pythNetwork'),
    t('common.redstone'),
    t('common.uma'),
  ];
  return (
    <UnifiedEmptyState
      icon={Globe}
      title={t('protocol.emptyStates.exploreProtocols')}
      description={t('protocol.emptyStates.exploreProtocolsDesc')}
      variant="action"
      className={className}
      animated={animated}
      action={
        onExplore
          ? {
              label: t('protocol.emptyStates.exploreProtocols'),
              onClick: onExplore,
            }
          : undefined
      }
    >
      <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {protocols.map((protocol) => (
          <div key={protocol} className="rounded-lg bg-primary/10 px-3 py-2">
            <span className="text-primary-dark text-sm font-medium">{protocol}</span>
          </div>
        ))}
      </div>
    </UnifiedEmptyState>
  );
}

export function EmptyPriceDataState({
  pair,
  onSelectPair,
  className,
  animated = true,
}: {
  pair?: string;
  onSelectPair?: () => void;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  return (
    <UnifiedEmptyState
      icon={TrendingUp}
      title={
        pair
          ? t('protocol.emptyStates.dataUnavailable', { pair })
          : t('protocol.emptyStates.selectTradingPair')
      }
      description={
        pair
          ? t('protocol.emptyStates.dataSynchronizing')
          : t('protocol.emptyStates.selectPairDesc')
      }
      variant="info"
      className={className}
      animated={animated}
      action={
        onSelectPair
          ? {
              label: t('common.selectPair'),
              onClick: onSelectPair,
            }
          : undefined
      }
    >
      {!pair && (
        <div className="flex flex-wrap justify-center gap-2">
          {['ETH/USD', 'BTC/USD', 'LINK/USD'].map((p) => (
            <span key={p} className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
              {p}
            </span>
          ))}
        </div>
      )}
    </UnifiedEmptyState>
  );
}

export function EmptyEventsState({
  onViewHistory,
  className,
  animated = true,
}: {
  onViewHistory?: () => void;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  return (
    <UnifiedEmptyState
      icon={Activity}
      title={t('common.noData')}
      description={t('protocol.emptyStates.noDataDesc')}
      variant="healthy"
      className={className}
      animated={animated}
      action={
        onViewHistory
          ? {
              label: t('common.viewHistory'),
              onClick: onViewHistory,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2 rounded-lg bg-emerald-100/50 px-4 py-2 text-sm text-emerald-700">
        <Zap className="h-4 w-4" />
        <span>{t('security.emptyStates.systemRunningSmoothly')}</span>
      </div>
    </UnifiedEmptyState>
  );
}

export function EmptyFirstItemState({
  icon,
  title,
  description,
  onAdd,
  actionLabel,
  className,
  animated = true,
}: {
  icon?: LucideIcon;
  title?: string;
  itemName?: string;
  description?: string;
  onAdd?: () => void;
  actionLabel?: string;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  return (
    <UnifiedEmptyState
      icon={icon || Plus}
      title={title || t('common.createNew')}
      description={description || t('protocol.emptyStates.noDataDesc')}
      variant="action"
      className={className}
      animated={animated}
      action={
        onAdd
          ? {
              label: actionLabel || t('common.createNew'),
              onClick: onAdd,
            }
          : undefined
      }
    />
  );
}

export function EmptyDataState({
  icon,
  title,
  description,
  onRefresh,
  className,
  animated = true,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  onRefresh?: () => void;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  return (
    <UnifiedEmptyState
      icon={icon || Database}
      title={title || t('protocol.emptyStates.noDataAvailable')}
      description={description || t('protocol.emptyStates.noDataDesc')}
      variant="default"
      className={className}
      animated={animated}
      action={
        onRefresh
          ? {
              label: t('common.refresh'),
              onClick: onRefresh,
            }
          : undefined
      }
    />
  );
}

export function EmptyFileState({
  onUpload,
  className,
  animated = true,
}: {
  onUpload?: () => void;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  return (
    <UnifiedEmptyState
      icon={FileX}
      title={t('common.noData')}
      description={t('protocol.emptyStates.noDataDesc')}
      variant="default"
      className={className}
      animated={animated}
      action={
        onUpload
          ? {
              label: t('common.uploadFile'),
              onClick: onUpload,
            }
          : undefined
      }
    />
  );
}

export function EmptyBoxState({
  title,
  description,
  onAction,
  actionLabel,
  className,
  animated = true,
}: {
  title?: string;
  description?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
  animated?: boolean;
}) {
  const { t } = useI18n();
  return (
    <UnifiedEmptyState
      icon={Box}
      title={title || t('common.noData')}
      description={description || t('protocol.emptyStates.noDataDesc')}
      variant="default"
      className={className}
      animated={animated}
      action={
        onAction
          ? {
              label: actionLabel || t('common.createNew'),
              onClick: onAction,
            }
          : undefined
      }
    />
  );
}

export function EmptyAlertsListState({
  isFiltered,
  onClearFilters,
  onRefresh,
  onCreateRule,
  className,
  animated = true,
}: {
  isFiltered?: boolean;
  onClearFilters?: () => void;
  onRefresh?: () => void;
  onCreateRule?: () => void;
  className?: string;
  animated?: boolean;
}) {
  return (
    <UnifiedEmptyState
      icon={isFiltered ? FilterX : ShieldCheck}
      title={isFiltered ? '没有匹配的告警' : '一切正常！'}
      description={
        isFiltered
          ? '当前筛选条件下没有找到任何告警，请尝试调整筛选条件'
          : '没有活动的告警，所有系统运行正常'
      }
      variant={isFiltered ? 'info' : 'healthy'}
      className={className}
      animated={animated}
      action={
        isFiltered && onClearFilters
          ? {
              label: '清除筛选',
              onClick: onClearFilters,
            }
          : onCreateRule
            ? {
                label: '创建告警规则',
                onClick: onCreateRule,
              }
            : onRefresh
              ? {
                  label: '刷新',
                  onClick: onRefresh,
                }
              : undefined
      }
      secondaryAction={
        isFiltered && onRefresh
          ? {
              label: '刷新',
              onClick: onRefresh,
            }
          : undefined
      }
    >
      {!isFiltered && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          <Sparkles className="h-4 w-4" />
          <span>所有系统运行正常，继续保持</span>
        </div>
      )}
    </UnifiedEmptyState>
  );
}

export default UnifiedEmptyState;
