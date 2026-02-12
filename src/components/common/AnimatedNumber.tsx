/**
 * Animated Number Component
 *
 * 数字动画组件 - 数字变化时带有平滑过渡动画和差异高亮
 */

'use client';

import { useEffect, useRef, useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/shared/utils';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  highlightClassName?: string;
  duration?: number;
  format?: 'number' | 'currency' | 'percent' | 'compact';
  locale?: string;
  showDiff?: boolean;
  diffDuration?: number;
}

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  className,
  highlightClassName,
  duration = 0.5,
  format = 'number',
  locale = 'en-US',
  showDiff = true,
  diffDuration = 2000,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [, setPreviousValue] = useState(value);
  const [diff, setDiff] = useState<number | null>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (value !== displayValue) {
      setPreviousValue(displayValue);
      
      // Calculate difference
      const difference = value - displayValue;
      if (showDiff && Math.abs(difference) > 0.000001) {
        setDiff(difference);
        setIsHighlighted(true);
        
        // Clear highlight after duration
        setTimeout(() => {
          setIsHighlighted(false);
          setDiff(null);
        }, diffDuration);
      }

      // Animate to new value
      const startTime = performance.now();
      const startValue = displayValue;
      const endValue = value;
      const diffValue = endValue - startValue;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        
        // Easing function (ease-out-cubic)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        const currentValue = startValue + diffValue * easeOut;
        setDisplayValue(currentValue);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
    return undefined;
  }, [value, duration, showDiff, diffDuration, displayValue]);

  const formatNumber = (num: number): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(num);
      case 'percent':
        return new Intl.NumberFormat(locale, {
          style: 'percent',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(num / 100);
      case 'compact':
        return new Intl.NumberFormat(locale, {
          notation: 'compact',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(num);
      default:
        return new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(num);
    }
  };

  const getDiffColor = (difference: number): string => {
    if (difference > 0) return 'text-emerald-500';
    if (difference < 0) return 'text-rose-500';
    return 'text-gray-500';
  };

  const getDiffIcon = (difference: number): string => {
    if (difference > 0) return '▲';
    if (difference < 0) return '▼';
    return '—';
  };

  return (
    <span className="relative inline-flex items-center gap-2">
      <motion.span
        className={cn(
          'inline-block transition-colors duration-300',
          isHighlighted && highlightClassName,
          className
        )}
        animate={{
          scale: isHighlighted ? [1, 1.05, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        {prefix}
        {formatNumber(displayValue)}
        {suffix}
      </motion.span>

      <AnimatePresence>
        {diff !== null && showDiff && (
          <motion.span
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
              getDiffColor(diff),
              diff > 0 ? 'bg-emerald-50' : diff < 0 ? 'bg-rose-50' : 'bg-gray-50'
            )}
          >
            <span>{getDiffIcon(diff)}</span>
            <span>{formatNumber(Math.abs(diff))}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

// Price Change Indicator Component
interface PriceChangeIndicatorProps {
  currentPrice: number;
  previousPrice: number;
  className?: string;
  showPercentage?: boolean;
}

export function PriceChangeIndicator({
  currentPrice,
  previousPrice,
  className,
  showPercentage = true,
}: PriceChangeIndicatorProps) {
  const change = currentPrice - previousPrice;
  const percentChange = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <motion.div
      initial={false}
      animate={{
        backgroundColor: isPositive 
          ? ['rgba(16, 185, 129, 0)', 'rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0)']
          : isNeutral
          ? ['rgba(107, 114, 128, 0)', 'rgba(107, 114, 128, 0.1)', 'rgba(107, 114, 128, 0)']
          : ['rgba(244, 63, 94, 0)', 'rgba(244, 63, 94, 0.1)', 'rgba(244, 63, 94, 0)'],
      }}
      transition={{ duration: 1 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg',
        className
      )}
    >
      <motion.span
        key={isPositive ? 'up' : isNeutral ? 'neutral' : 'down'}
        initial={{ scale: 0, rotate: isPositive ? -180 : 180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          'text-lg',
          isPositive ? 'text-emerald-500' : isNeutral ? 'text-gray-400' : 'text-rose-500'
        )}
      >
        {isPositive ? '↗' : isNeutral ? '→' : '↘'}
      </motion.span>
      
      <span
        className={cn(
          'font-medium',
          isPositive ? 'text-emerald-600' : isNeutral ? 'text-gray-500' : 'text-rose-600'
        )}
      >
        {isPositive ? '+' : ''}
        {showPercentage ? `${percentChange.toFixed(2)}%` : Math.abs(change).toFixed(2)}
      </span>
    </motion.div>
  );
}

// Flash Highlight Component for any value changes
interface FlashHighlightProps {
  children: React.ReactNode;
  trigger: unknown;
  className?: string;
  flashClassName?: string;
  duration?: number;
}

export function FlashHighlight({
  children,
  trigger,
  className,
  flashClassName = 'bg-yellow-100',
  duration = 1000,
}: FlashHighlightProps) {
  const [isFlashing, setIsFlashing] = useState(false);
  const previousTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger !== previousTrigger.current) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), duration);
      previousTrigger.current = trigger;
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [trigger, duration]);

  return (
    <motion.span
      className={cn(
        'inline-block rounded px-1 transition-colors duration-300',
        isFlashing && flashClassName,
        className
      )}
      animate={{
        scale: isFlashing ? [1, 1.02, 1] : 1,
      }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.span>
  );
}
