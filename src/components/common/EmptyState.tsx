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
import { cn } from '@/shared/utils';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Animation Variants
// ============================================================================

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
    iconBg: 'bg-primary/20',
    iconColor: 'text-primary',
    borderColor: 'border-primary/20',
    bgColor: 'bg-card/50',
    gradient: 'from-primary/5 to-transparent',
    buttonColor: 'bg-primary hover:bg-primary-600',
  },
  healthy: {
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-500',
    borderColor: 'border-green-500/20',
    bgColor: 'bg-green-500/5',
    gradient: 'from-green-500/5 to-transparent',
    buttonColor: 'bg-green-500 hover:bg-green-600',
  },
  action: {
    iconBg: 'bg-primary/20',
    iconColor: 'text-primary',
    borderColor: 'border-primary/20',
    bgColor: 'bg-primary/5',
    gradient: 'from-primary/5 to-transparent',
    buttonColor: 'bg-primary hover:bg-primary-600',
  },
  info: {
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-500/5',
    gradient: 'from-blue-500/5 to-transparent',
    buttonColor: 'bg-blue-500 hover:bg-blue-600',
  },
  warning: {
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-500',
    borderColor: 'border-amber-500/20',
    bgColor: 'bg-amber-500/5',
    gradient: 'from-amber-500/5 to-transparent',
    buttonColor: 'bg-amber-500 hover:bg-amber-600',
  },
  error: {
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-500',
    borderColor: 'border-red-500/20',
    bgColor: 'bg-red-500/5',
    gradient: 'from-red-500/5 to-transparent',
    buttonColor: 'bg-red-500 hover:bg-red-600',
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
// Legacy Components (Backward Compatibility)
// ============================================================================

export function EmptyState(props: Omit<UnifiedEmptyStateProps, 'animated'>) {
  return <UnifiedEmptyState {...props} animated={false} />;
}

export function EmptyStateEnhanced(props: UnifiedEmptyStateProps) {
  return <UnifiedEmptyState {...props} animated={true} />;
}

export const EnhancedEmptyState = UnifiedEmptyState;

// ============================================================================
// Predefined Empty States
// ============================================================================

export function EmptySearchState({
  searchTerm,
  onClear,
  className,
  animated = true,
}: {
  searchTerm?: string;
  onClear?: () => void;
  className?: string;
  animated?: boolean;
}) {
  return (
    <UnifiedEmptyState
      icon={Search}
      title={searchTerm ? `No results for "${searchTerm}"` : 'No results found'}
      description="Try adjusting your search or filters to find what you're looking for."
      variant="info"
      className={className}
      animated={animated}
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
  animated = true,
}: {
  onRefresh?: () => void;
  className?: string;
  animated?: boolean;
}) {
  return (
    <UnifiedEmptyState
      icon={ShieldCheck}
      title="System Secure"
      description="No suspicious activities detected. The system is actively monitoring and will alert you immediately when threats are identified."
      variant="healthy"
      className={className}
      animated={animated}
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
  return (
    <UnifiedEmptyState
      icon={Brain}
      title="No Anomalies Detected"
      description="ML models are actively monitoring price feeds. When anomalies are detected, they will appear here with detailed analysis and confidence scores."
      variant="healthy"
      className={className}
      animated={animated}
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
  animated = true,
}: {
  onRefresh?: () => void;
  className?: string;
  animated?: boolean;
}) {
  return (
    <UnifiedEmptyState
      icon={BarChart3}
      title="No Deviation Data"
      description="Price deviation analysis will appear here once data is collected. This helps identify when different oracle protocols report significantly different prices."
      variant="info"
      className={className}
      animated={animated}
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
  animated = true,
}: {
  onSetAlertRules?: () => void;
  className?: string;
  animated?: boolean;
}) {
  return (
    <UnifiedEmptyState
      icon={ShieldCheck}
      title="All Systems Healthy"
      description="No active alerts at the moment. All oracle protocols are running normally. Configure alert rules to get notified of anomalies."
      variant="healthy"
      className={className}
      animated={animated}
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
    </UnifiedEmptyState>
  );
}

export function EmptyWatchlistState({
  onBrowseAssets,
  className,
  animated = true,
}: {
  onBrowseAssets?: () => void;
  className?: string;
  animated?: boolean;
}) {
  return (
    <UnifiedEmptyState
      icon={Star}
      title="Start Building Your Watchlist"
      description="You haven't added any items to your watchlist yet. Browse oracle data and add assets you're interested in monitoring."
      variant="action"
      className={className}
      animated={animated}
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
        <div className="rounded-lg bg-primary/10 p-3">
          <div className="text-primary-dark text-lg font-semibold">100+</div>
          <div className="text-xs text-primary">Assets</div>
        </div>
        <div className="rounded-lg bg-primary/10 p-3">
          <div className="text-primary-dark text-lg font-semibold">6</div>
          <div className="text-xs text-primary">Protocols</div>
        </div>
        <div className="rounded-lg bg-primary/10 p-3">
          <div className="text-primary-dark text-lg font-semibold">Real-time</div>
          <div className="text-xs text-primary">Updates</div>
        </div>
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
  return (
    <UnifiedEmptyState
      icon={AlertCircle}
      title="Failed to Load Data"
      description={error || 'Something went wrong while loading the data. Please try again.'}
      variant="error"
      className={className}
      animated={animated}
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
  animated = true,
}: {
  onRetry?: () => void;
  className?: string;
  animated?: boolean;
}) {
  return (
    <UnifiedEmptyState
      icon={WifiOff}
      title="Connection Lost"
      description="Unable to connect to the server. Please check your internet connection and try again."
      variant="warning"
      className={className}
      animated={animated}
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
  animated = true,
}: {
  onRefresh?: () => void;
  className?: string;
  animated?: boolean;
}) {
  return (
    <UnifiedEmptyState
      icon={LayoutDashboard}
      title="Dashboard Ready"
      description="Data is being synchronized. The dashboard will display all key metrics and real-time data shortly."
      variant="info"
      className={className}
      animated={animated}
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
  return (
    <UnifiedEmptyState
      icon={Globe}
      title="Explore Oracle Protocols"
      description="View real-time data and performance metrics from Chainlink, Pyth, Band, and other major oracle protocols."
      variant="action"
      className={className}
      animated={animated}
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
        {['Chainlink', 'Pyth', 'RedStone', 'UMA'].map((protocol) => (
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
  return (
    <UnifiedEmptyState
      icon={TrendingUp}
      title={pair ? `${pair} Data Unavailable` : 'Select a Trading Pair'}
      description={
        pair
          ? 'Data for this pair is being synchronized. Please try again later.'
          : 'Select a trading pair to view real-time price data and analysis charts.'
      }
      variant="info"
      className={className}
      animated={animated}
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
  return (
    <UnifiedEmptyState
      icon={Activity}
      title="No Active Events"
      description="There are no ongoing disputes or assertions at the moment. View history to see past events."
      variant="healthy"
      className={className}
      animated={animated}
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
    </UnifiedEmptyState>
  );
}

export function EmptyFirstItemState({
  itemName,
  description,
  onAdd,
  className,
  animated = true,
}: {
  itemName: string;
  description?: string;
  onAdd?: () => void;
  className?: string;
  animated?: boolean;
}) {
  return (
    <UnifiedEmptyState
      icon={Plus}
      title={`Add Your First ${itemName}`}
      description={
        description || `Start by adding a ${itemName.toLowerCase()} to use this feature.`
      }
      variant="action"
      className={className}
      animated={animated}
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

export function EmptyDataState({
  title = 'No Data Available',
  description = 'There is no data to display at the moment.',
  onRefresh,
  className,
  animated = true,
}: {
  title?: string;
  description?: string;
  onRefresh?: () => void;
  className?: string;
  animated?: boolean;
}) {
  return (
    <UnifiedEmptyState
      icon={Database}
      title={title}
      description={description}
      variant="default"
      className={className}
      animated={animated}
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

export function EmptyFileState({
  onUpload,
  className,
  animated = true,
}: {
  onUpload?: () => void;
  className?: string;
  animated?: boolean;
}) {
  return (
    <UnifiedEmptyState
      icon={FileX}
      title="No Files Found"
      description="Upload files to get started. Supported formats include CSV, JSON, and Excel."
      variant="default"
      className={className}
      animated={animated}
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
  animated = true,
}: {
  title?: string;
  description?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
  animated?: boolean;
}) {
  return (
    <UnifiedEmptyState
      icon={Box}
      title={title}
      description={description}
      variant="default"
      className={className}
      animated={animated}
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

export default UnifiedEmptyState;
