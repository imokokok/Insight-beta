/**
 * Enhanced Empty State Components
 *
 * 增强版空状态组件
 * - 动画效果
 * - 丰富的视觉表现
 * - 品牌一致性
 */

'use client';

import type { ReactNode } from 'react';

import { motion } from 'framer-motion';
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
  AlertCircle,
  FileX,
  Database,
  WifiOff,
  Box,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface EnhancedEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
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

// ============================================================================
// Animation Variants
// ============================================================================

import type { Variants } from 'framer-motion';

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

// ============================================================================
// Variant Configurations
// ============================================================================

const variantStyles = {
  default: {
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-400',
    borderColor: 'border-gray-200',
    bgColor: 'bg-white/50',
    gradient: 'from-gray-50 to-white',
    buttonColor: 'bg-gray-900 hover:bg-gray-800',
  },
  healthy: {
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
    bgColor: 'bg-emerald-50/30',
    gradient: 'from-emerald-50/50 to-white',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
  },
  action: {
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    bgColor: 'bg-purple-50/30',
    gradient: 'from-purple-50/50 to-white',
    buttonColor: 'bg-purple-600 hover:bg-purple-700',
  },
  info: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50/30',
    gradient: 'from-blue-50/50 to-white',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50/30',
    gradient: 'from-amber-50/50 to-white',
    buttonColor: 'bg-amber-600 hover:bg-amber-700',
  },
  error: {
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    borderColor: 'border-rose-200',
    bgColor: 'bg-rose-50/30',
    gradient: 'from-rose-50/50 to-white',
    buttonColor: 'bg-rose-600 hover:bg-rose-700',
  },
};

const sizeStyles = {
  sm: {
    container: 'p-6',
    icon: 'h-12 w-12',
    iconWrapper: 'h-16 w-16',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'p-8',
    icon: 'h-8 w-8',
    iconWrapper: 'h-16 w-16',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'p-12',
    icon: 'h-10 w-10',
    iconWrapper: 'h-20 w-20',
    title: 'text-xl',
    description: 'text-base',
  },
};

// ============================================================================
// Main Component
// ============================================================================

export function EnhancedEmptyState({
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
}: EnhancedEmptyStateProps) {
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
        'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center',
        'bg-gradient-to-br',
        styles.borderColor,
        styles.gradient,
        sizes.container,
        className,
      )}
      {...wrapperProps}
    >
      {Icon && (
        <motion.div
          variants={animated ? iconVariants : undefined}
          className={cn(
            'mb-4 flex items-center justify-center rounded-full',
            styles.iconBg,
            sizes.iconWrapper,
          )}
        >
          <Icon className={cn(styles.iconColor, sizes.icon)} />
        </motion.div>
      )}

      <motion.h3
        variants={animated ? itemVariants : undefined}
        className={cn('font-semibold text-gray-900', sizes.title)}
      >
        {title}
      </motion.h3>

      {description && (
        <motion.p
          variants={animated ? itemVariants : undefined}
          className={cn('mt-2 max-w-sm text-gray-500', sizes.description)}
        >
          {description}
        </motion.p>
      )}

      {children && (
        <motion.div variants={animated ? itemVariants : undefined} className="mt-4">
          {children}
        </motion.div>
      )}

      {(action || secondaryAction) && (
        <motion.div
          variants={animated ? itemVariants : undefined}
          className="mt-6 flex flex-wrap items-center justify-center gap-3"
        >
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size="sm">
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              onClick={action.onClick}
              className={cn('gap-2', styles.buttonColor)}
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

// ============================================================================
// Predefined Empty States
// ============================================================================

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
    <EnhancedEmptyState
      icon={Search}
      title={searchTerm ? `No results for "${searchTerm}"` : 'No results found'}
      description="Try adjusting your search or filters to find what you're looking for."
      variant="info"
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

export function EmptyDataState({
  title = 'No Data Available',
  description = 'There is no data to display at the moment.',
  onRefresh,
  className,
}: {
  title?: string;
  description?: string;
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EnhancedEmptyState
      icon={Database}
      title={title}
      description={description}
      variant="default"
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

export function EmptySecurityState({
  onRefresh,
  className,
}: {
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EnhancedEmptyState
      icon={ShieldCheck}
      title="System Secure"
      description="No suspicious activities detected. The system is actively monitoring and will alert you immediately when threats are identified."
      variant="healthy"
      className={className}
      action={
        onRefresh
          ? {
              label: 'Refresh',
              onClick: onRefresh,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2 rounded-lg bg-emerald-100/50 px-4 py-2 text-sm text-emerald-700">
        <Sparkles className="h-4 w-4" />
        <span>All systems operational</span>
      </div>
    </EnhancedEmptyState>
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
    <EnhancedEmptyState
      icon={Brain}
      title="No Anomalies Detected"
      description="ML models are actively monitoring price feeds. When anomalies are detected, they will appear here with detailed analysis and confidence scores."
      variant="healthy"
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

export function EmptyChartState({
  title = 'No Chart Data',
  description = 'Data will appear here once it becomes available.',
  onRefresh,
  className,
}: {
  title?: string;
  description?: string;
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EnhancedEmptyState
      icon={BarChart3}
      title={title}
      description={description}
      variant="info"
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

export function EmptyAlertsState({
  onSetAlertRules,
  className,
}: {
  onSetAlertRules?: () => void;
  className?: string;
}) {
  return (
    <EnhancedEmptyState
      icon={ShieldCheck}
      title="All Systems Healthy"
      description="No active alerts at the moment. All oracle protocols are running normally. Configure alert rules to get notified of anomalies."
      variant="healthy"
      className={className}
      action={
        onSetAlertRules
          ? {
              label: 'Configure Alerts',
              onClick: onSetAlertRules,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2 rounded-lg bg-emerald-100/50 px-4 py-2 text-sm text-emerald-700">
        <Sparkles className="h-4 w-4" />
        <span>Everything is running smoothly</span>
      </div>
    </EnhancedEmptyState>
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
    <EnhancedEmptyState
      icon={Star}
      title="Start Building Your Watchlist"
      description="You haven't added any items to your watchlist yet. Browse oracle data and add assets you're interested in monitoring."
      variant="action"
      className={className}
      action={
        onBrowseAssets
          ? {
              label: 'Browse Assets',
              onClick: onBrowseAssets,
            }
          : undefined
      }
    >
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-purple-100/50 p-3">
          <div className="text-lg font-semibold text-purple-700">100+</div>
          <div className="text-xs text-purple-600">Assets</div>
        </div>
        <div className="rounded-lg bg-purple-100/50 p-3">
          <div className="text-lg font-semibold text-purple-700">6</div>
          <div className="text-xs text-purple-600">Protocols</div>
        </div>
        <div className="rounded-lg bg-purple-100/50 p-3">
          <div className="text-lg font-semibold text-purple-700">Real-time</div>
          <div className="text-xs text-purple-600">Updates</div>
        </div>
      </div>
    </EnhancedEmptyState>
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
    <EnhancedEmptyState
      icon={AlertCircle}
      title="Failed to Load Data"
      description={error || 'Something went wrong while loading the data. Please try again.'}
      variant="error"
      className={className}
      action={
        onRetry
          ? {
              label: 'Try Again',
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
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EnhancedEmptyState
      icon={WifiOff}
      title="Connection Lost"
      description="Unable to connect to the server. Please check your internet connection and try again."
      variant="warning"
      className={className}
      action={
        onRetry
          ? {
              label: 'Reconnect',
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
}: {
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <EnhancedEmptyState
      icon={LayoutDashboard}
      title="Dashboard Ready"
      description="Data is being synchronized. The dashboard will display all key metrics and real-time data shortly."
      variant="info"
      className={className}
      action={
        onRefresh
          ? {
              label: 'Refresh Data',
              onClick: onRefresh,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
        <span className="text-sm text-blue-600">Syncing data...</span>
      </div>
    </EnhancedEmptyState>
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
    <EnhancedEmptyState
      icon={Globe}
      title="Explore Oracle Protocols"
      description="View real-time data and performance metrics from Chainlink, Pyth, Band, and other major oracle protocols."
      variant="action"
      className={className}
      action={
        onExplore
          ? {
              label: 'Explore Protocols',
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
    </EnhancedEmptyState>
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
    <EnhancedEmptyState
      icon={TrendingUp}
      title={pair ? `${pair} Data Unavailable` : 'Select a Trading Pair'}
      description={
        pair
          ? 'Data for this pair is being synchronized. Please try again later.'
          : 'Select a trading pair to view real-time price data and analysis charts.'
      }
      variant="info"
      className={className}
      action={
        onSelectPair
          ? {
              label: 'Select Pair',
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
    </EnhancedEmptyState>
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
    <EnhancedEmptyState
      icon={Activity}
      title="No Active Events"
      description="There are no ongoing disputes or assertions at the moment. View history to see past events."
      variant="healthy"
      className={className}
      action={
        onViewHistory
          ? {
              label: 'View History',
              onClick: onViewHistory,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2 rounded-lg bg-emerald-100/50 px-4 py-2 text-sm text-emerald-700">
        <Zap className="h-4 w-4" />
        <span>System running smoothly</span>
      </div>
    </EnhancedEmptyState>
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
    <EnhancedEmptyState
      icon={Plus}
      title={`Add Your First ${itemName}`}
      description={description || `Start by adding a ${itemName.toLowerCase()} to use this feature.`}
      variant="action"
      className={className}
      action={
        onAdd
          ? {
              label: `Add ${itemName}`,
              onClick: onAdd,
            }
          : undefined
      }
    />
  );
}

export function EmptyFileState({
  onUpload,
  className,
}: {
  onUpload?: () => void;
  className?: string;
}) {
  return (
    <EnhancedEmptyState
      icon={FileX}
      title="No Files Found"
      description="Upload files to get started. Supported formats include CSV, JSON, and Excel."
      variant="default"
      className={className}
      action={
        onUpload
          ? {
              label: 'Upload File',
              onClick: onUpload,
            }
          : undefined
      }
    />
  );
}

export function EmptyBoxState({
  title = 'Nothing Here Yet',
  description = 'This area is empty. Check back later or create something new.',
  onAction,
  actionLabel = 'Create New',
  className,
}: {
  title?: string;
  description?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <EnhancedEmptyState
      icon={Box}
      title={title}
      description={description}
      variant="default"
      className={className}
      action={
        onAction
          ? {
              label: actionLabel,
              onClick: onAction,
            }
          : undefined
      }
    />
  );
}

// ============================================================================
// Export
// ============================================================================

export default EnhancedEmptyState;
