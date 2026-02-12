/**
 * Contextual Help Component
 *
 * 上下文帮助组件 - 提供页面内的功能说明和使用提示
 */

'use client';

import { useState, useCallback, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  X,
  Lightbulb,
  Info,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';

import { cn } from '@/shared/utils';

interface ContextualHelpProps {
  title?: string;
  description: string;
  type?: 'info' | 'tip' | 'warning' | 'success';
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function ContextualHelp({
  title,
  description,
  type = 'info',
  className,
  dismissible = true,
  onDismiss,
  action,
}: ContextualHelpProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!isVisible) return null;

  const typeConfig = {
    info: {
      icon: Info,
      bgColor: 'bg-blue-50/50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      textColor: 'text-blue-700',
    },
    tip: {
      icon: Lightbulb,
      bgColor: 'bg-amber-50/50',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
      textColor: 'text-amber-700',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-amber-50/50',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-600',
      titleColor: 'text-amber-900',
      textColor: 'text-amber-700',
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-emerald-50/50',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      titleColor: 'text-emerald-900',
      textColor: 'text-emerald-700',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'rounded-xl border p-4',
        config.bgColor,
        config.borderColor,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconColor)} />
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={cn('font-semibold text-sm mb-1', config.titleColor)}>
              {title}
            </h4>
          )}
          <p className={cn('text-sm', config.textColor)}>{description}</p>
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-sm font-medium hover:underline',
                config.iconColor,
              )}
            >
              {action.label}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0 rounded-full p-1 transition-colors',
              `hover:${config.bgColor}`,
              config.iconColor,
            )}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// 浮动帮助按钮组件
interface FloatingHelpButtonProps {
  onClick?: () => void;
  className?: string;
  pulse?: boolean;
}

export function FloatingHelpButton({
  onClick,
  className,
  pulse = false,
}: FloatingHelpButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg shadow-purple-500/30 transition-colors hover:bg-purple-700',
        className,
      )}
    >
      {pulse && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
      )}
      <HelpCircle className="h-6 w-6" />
    </motion.button>
  );
}

// 页面提示横幅组件
interface PageTipBannerProps {
  tips: string[];
  className?: string;
  autoRotate?: boolean;
  interval?: number;
}

export function PageTipBanner({
  tips,
  className,
  autoRotate = false,
  interval = 5000,
}: PageTipBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!autoRotate) return;

    const timer = setInterval(() => {
      if (!isPaused) {
        setCurrentIndex((prev) => (prev + 1) % tips.length);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [autoRotate, interval, isPaused, tips.length]);

  if (tips.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 p-3',
        className,
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center gap-3">
        <Lightbulb className="h-5 w-5 text-purple-600 flex-shrink-0" />
        <AnimatePresence mode="wait">
          <motion.p
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-sm text-purple-800 flex-1"
          >
            {tips[currentIndex]}
          </motion.p>
        </AnimatePresence>
        {tips.length > 1 && (
          <div className="flex gap-1">
            {tips.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  idx === currentIndex ? 'bg-purple-600' : 'bg-purple-200',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 功能引导提示组件
interface FeatureHighlightProps {
  children: React.ReactNode;
  title: string;
  description: string;
  isOpen: boolean;
  onClose: () => void;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function FeatureHighlight({
  children,
  title,
  description,
  isOpen,
  onClose,
  placement = 'bottom',
}: FeatureHighlightProps) {
  return (
    <div className="relative inline-block">
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              'absolute z-50 w-64 rounded-lg bg-purple-900 p-4 text-white shadow-xl',
              placement === 'bottom' && 'top-full mt-2 left-1/2 -translate-x-1/2',
              placement === 'top' && 'bottom-full mb-2 left-1/2 -translate-x-1/2',
              placement === 'left' && 'right-full mr-2 top-1/2 -translate-y-1/2',
              placement === 'right' && 'left-full ml-2 top-1/2 -translate-y-1/2',
            )}
          >
            <button
              onClick={onClose}
              className="absolute right-2 top-2 rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
            <h4 className="font-semibold text-sm mb-1 pr-4">{title}</h4>
            <p className="text-xs text-white/80">{description}</p>
            {/* Arrow */}
            <div
              className={cn(
                'absolute h-2 w-2 rotate-45 bg-purple-900',
                placement === 'bottom' && '-top-1 left-1/2 -translate-x-1/2',
                placement === 'top' && '-bottom-1 left-1/2 -translate-x-1/2',
                placement === 'left' && '-right-1 top-1/2 -translate-y-1/2',
                placement === 'right' && '-left-1 top-1/2 -translate-y-1/2',
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 快捷操作提示组件
interface QuickActionTipProps {
  actions: {
    label: string;
    shortcut?: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }[];
  className?: string;
}

export function QuickActionTip({ actions, className }: QuickActionTipProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-200"
      >
        <Lightbulb className="h-4 w-4" />
        <span>快捷操作</span>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl bg-white p-2 shadow-xl ring-1 ring-black/5"
          >
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  action.onClick();
                  setIsExpanded(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-purple-50"
              >
                <span className="flex items-center gap-2">
                  {action.icon}
                  {action.label}
                </span>
                {action.shortcut && (
                  <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                    {action.shortcut}
                  </kbd>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
