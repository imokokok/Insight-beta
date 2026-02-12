/**
 * Animated Empty State Component
 *
 * 动画空状态组件 - 带有 Lottie 风格的 SVG 动画和引导功能
 */

'use client';

import type { ReactNode } from 'react';

import { motion } from 'framer-motion';
import {
  Search,
  ShieldCheck,
  Star,
  ArrowRight,
  Sparkles,
  Plus,
  Inbox,
  FileSearch,
  Bell,
  Wallet,
  Lock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { Variants } from 'framer-motion';

// ==================== 动画变体 ====================

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

const iconVariants: Variants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 15,
    },
  },
};

const floatVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

// ==================== 基础动画空状态 ====================

interface AnimatedEmptyStateProps {
  icon?: React.ElementType;
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
  children?: ReactNode;
  variant?: 'default' | 'compact' | 'card';
  animated?: boolean;
}

export function AnimatedEmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
  variant = 'default',
  animated = true,
}: AnimatedEmptyStateProps) {
  const Wrapper = animated ? motion.div : 'div';
  const wrapperProps = animated
    ? {
        variants: containerVariants,
        initial: 'hidden',
        animate: 'visible',
      }
    : {};

  const isCompact = variant === 'compact';
  const isCard = variant === 'card';

  return (
    <Wrapper
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isCompact ? 'py-6' : 'py-12',
        isCard &&
          'rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8',
        className
      )}
      {...wrapperProps}
    >
      {/* Animated Icon */}
      {Icon && (
        <motion.div
          variants={animated ? iconVariants : undefined}
          animate={animated ? 'animate' : undefined}
          className={cn(
            'relative mb-4',
            isCompact ? 'h-12 w-12' : 'h-20 w-20'
          )}
        >
          {/* Background glow */}
          <motion.div
            variants={animated ? pulseVariants : undefined}
            animate="animate"
            className={cn(
              'absolute inset-0 rounded-full bg-gradient-to-br from-purple-200 to-blue-200 opacity-50 blur-xl',
              isCompact ? 'scale-75' : 'scale-100'
            )}
          />

          {/* Icon container */}
          <motion.div
            variants={animated ? floatVariants : undefined}
            animate="animate"
            className={cn(
              'relative flex items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100',
              isCompact ? 'h-12 w-12' : 'h-20 w-20'
            )}
          >
            <Icon
              className={cn(
                'text-purple-600',
                isCompact ? 'h-6 w-6' : 'h-10 w-10'
              )}
            />
          </motion.div>

          {/* Decorative elements */}
          {animated && !isCompact && (
            <>
              <motion.div
                className="absolute -right-2 top-0 h-3 w-3 rounded-full bg-yellow-400"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
              <motion.div
                className="absolute -left-1 bottom-2 h-2 w-2 rounded-full bg-blue-400"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              />
            </>
          )}
        </motion.div>
      )}

      {/* Title */}
      <motion.h3
        variants={animated ? itemVariants : undefined}
        className={cn(
          'font-semibold text-gray-900',
          isCompact ? 'text-base' : 'text-lg'
        )}
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          variants={animated ? itemVariants : undefined}
          className={cn(
            'mt-2 text-gray-500',
            isCompact ? 'max-w-xs text-xs' : 'max-w-sm text-sm'
          )}
        >
          {description}
        </motion.p>
      )}

      {/* Custom children */}
      {children && (
        <motion.div variants={animated ? itemVariants : undefined} className="mt-4">
          {children}
        </motion.div>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          variants={animated ? itemVariants : undefined}
          className={cn(
            'mt-6 flex items-center gap-3',
            isCompact && 'mt-4'
          )}
        >
          {secondaryAction && (
            <Button
              variant="outline"
              size={isCompact ? 'sm' : 'default'}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              variant={action.variant || 'default'}
              size={isCompact ? 'sm' : 'default'}
              onClick={action.onClick}
              className="gap-2"
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

// ==================== 引导式空状态 ====================

interface GuidedEmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  steps: {
    icon: React.ElementType;
    title: string;
    description: string;
  }[];
  onGetStarted: () => void;
  className?: string;
}

export function GuidedEmptyState({
  icon: Icon,
  title,
  description,
  steps,
  onGetStarted,
  className,
}: GuidedEmptyStateProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50 p-8 text-center',
        className
      )}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-6">
        <motion.div
          variants={iconVariants}
          className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100"
        >
          <Icon className="h-10 w-10 text-purple-600" />
        </motion.div>
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <p className="mt-2 max-w-md text-gray-500">{description}</p>
      </motion.div>

      {/* Steps */}
      <div className="mb-8 w-full max-w-lg">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="relative flex items-start gap-4 py-4"
          >
            {/* Connector line */}
            {index < steps.length - 1 && (
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.5 + index * 0.2, duration: 0.3 }}
                className="absolute left-5 top-12 h-full w-0.5 origin-top bg-gradient-to-b from-purple-300 to-transparent"
              />
            )}

            {/* Step number */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + index * 0.15, type: 'spring' }}
              className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-sm font-bold text-white shadow-lg"
            >
              {index + 1}
            </motion.div>

            {/* Step content */}
            <div className="flex-1 pt-1 text-left">
              <div className="flex items-center gap-2">
                <step.icon className="h-4 w-4 text-purple-500" />
                <h4 className="font-semibold text-gray-900">{step.title}</h4>
              </div>
              <p className="mt-1 text-sm text-gray-500">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div variants={itemVariants}>
        <Button onClick={onGetStarted} size="lg" className="gap-2">
          <Sparkles className="h-4 w-4" />
          开始使用
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ==================== 预定义的空状态场景 ====================

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
    <AnimatedEmptyState
      icon={FileSearch}
      title={searchTerm ? `未找到 "${searchTerm}" 的结果` : '无搜索结果'}
      description="尝试调整搜索词或筛选条件，或者浏览所有可用数据。"
      variant="card"
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

export function EmptyNotificationsState({
  onSettings,
  className,
}: {
  onSettings?: () => void;
  className?: string;
}) {
  return (
    <AnimatedEmptyState
      icon={Bell}
      title="暂无通知"
      description="当有新的事件或告警时，您将在这里收到通知。"
      variant="card"
      className={className}
      action={
        onSettings
          ? {
              label: '通知设置',
              onClick: onSettings,
            }
          : undefined
      }
    >
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-100/50 px-4 py-2 text-sm text-emerald-700">
        <Sparkles className="h-4 w-4" />
        <span>一切正常，暂无需要关注的事项</span>
      </div>
    </AnimatedEmptyState>
  );
}

export function EmptyWalletState({
  onConnect,
  className,
}: {
  onConnect?: () => void;
  className?: string;
}) {
  return (
    <AnimatedEmptyState
      icon={Wallet}
      title="连接钱包"
      description="连接您的钱包以查看资产、参与治理和接收奖励。"
      variant="card"
      className={className}
      action={
        onConnect
          ? {
              label: '连接钱包',
              onClick: onConnect,
            }
          : undefined
      }
    >
      <div className="mt-4 flex items-center justify-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
          <Lock className="h-5 w-5 text-gray-400" />
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-gray-700">安全连接</div>
          <div className="text-xs text-gray-500">您的私钥始终安全</div>
        </div>
      </div>
    </AnimatedEmptyState>
  );
}

export function EmptyDataState({
  title = '暂无数据',
  description = '数据正在同步中，请稍后再试。',
  onRefresh,
  className,
}: {
  title?: string;
  description?: string;
  onRefresh?: () => void;
  className?: string;
}) {
  return (
    <AnimatedEmptyState
      icon={Inbox}
      title={title}
      description={description}
      variant="card"
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
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="h-2 w-2 rounded-full bg-blue-500"
        />
        <span className="text-sm text-blue-600">正在同步数据...</span>
      </div>
    </AnimatedEmptyState>
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
    <AnimatedEmptyState
      icon={ShieldCheck}
      title="系统安全"
      description="未发现安全威胁或异常活动。系统正在持续监控中。"
      variant="card"
      className={className}
      action={
        onRefresh
          ? {
              label: '刷新',
              onClick: onRefresh,
            }
          : undefined
      }
    >
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: '监控中', value: '24/7' },
          { label: '威胁', value: '0' },
          { label: '状态', value: '安全' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
            className="rounded-lg bg-emerald-100/50 p-3 text-center"
          >
            <div className="text-lg font-bold text-emerald-700">
              {stat.value}
            </div>
            <div className="text-xs text-emerald-600">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </AnimatedEmptyState>
  );
}

export function EmptyWatchlistState({
  onBrowse,
  className,
}: {
  onBrowse?: () => void;
  className?: string;
}) {
  return (
    <GuidedEmptyState
      icon={Star}
      title="开始添加关注"
      description="按照以下步骤添加您感兴趣的资产到关注列表"
      steps={[
        {
          icon: Search,
          title: '浏览资产',
          description: '查看所有可用的预言机数据和价格信息',
        },
        {
          icon: Plus,
          title: '添加到关注',
          description: '点击星标图标将资产添加到您的关注列表',
        },
        {
          icon: Bell,
          title: '接收通知',
          description: '当价格变动或出现异常时及时收到通知',
        },
      ]}
      onGetStarted={onBrowse || (() => {})}
      className={className}
    />
  );
}

// ==================== 首次使用引导 ====================

interface OnboardingEmptyStateProps {
  feature: string;
  description: string;
  benefits: string[];
  onGetStarted: () => void;
  onLearnMore?: () => void;
  illustration?: ReactNode;
  className?: string;
}

export function OnboardingEmptyState({
  feature,
  description,
  benefits,
  onGetStarted,
  onLearnMore,
  illustration,
  className,
}: OnboardingEmptyStateProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8 text-center',
        className
      )}
    >
      {/* Illustration */}
      {illustration && (
        <motion.div variants={itemVariants} className="mb-6">
          {illustration}
        </motion.div>
      )}

      {/* Content */}
      <motion.div variants={itemVariants} className="max-w-md">
        <h3 className="text-2xl font-bold text-gray-900">欢迎使用 {feature}</h3>
        <p className="mt-2 text-gray-500">{description}</p>
      </motion.div>

      {/* Benefits */}
      <motion.div variants={itemVariants} className="my-6 w-full max-w-sm">
        {benefits.map((benefit, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="flex items-center gap-3 py-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 + index * 0.1, type: 'spring' }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100"
            >
              <svg
                className="h-4 w-4 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>
            <span className="text-sm text-gray-700">{benefit}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Actions */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-center justify-center gap-3"
      >
        <Button onClick={onGetStarted} size="lg" className="gap-2">
          <Sparkles className="h-4 w-4" />
          开始使用
        </Button>
        {onLearnMore && (
          <Button variant="outline" size="lg" onClick={onLearnMore}>
            了解更多
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}
