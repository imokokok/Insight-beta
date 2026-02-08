'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PriceFlashProps {
  price: number;
  previousPrice?: number;
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export function PriceFlash({
  price,
  previousPrice,
  className,
  decimals = 2,
  prefix = '$',
  suffix = '',
}: PriceFlashProps) {
  const [flashState, setFlashState] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (previousPrice !== undefined && previousPrice !== price) {
      const newState = price > previousPrice ? 'up' : 'down';
      setFlashState(newState);

      const timer = setTimeout(() => {
        setFlashState(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [price, previousPrice]);

  const formatPrice = (value: number) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <span
      className={cn(
        'inline-block transition-all duration-300',
        flashState === 'up' && 'animate-flash-green text-emerald-600',
        flashState === 'down' && 'animate-flash-red text-rose-600',
        className
      )}
    >
      {prefix}{formatPrice(price)}{suffix}
    </span>
  );
}

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
  const changePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className={cn('flex items-center gap-1 text-sm', className)}>
      <span
        className={cn(
          'flex items-center gap-0.5 font-medium',
          isPositive && 'text-emerald-600',
          isNegative && 'text-rose-600',
          !isPositive && !isNegative && 'text-muted-foreground'
        )}
      >
        {isPositive && '▲'}
        {isNegative && '▼'}
        {!isPositive && !isNegative && '—'}
        {showPercentage && (
          <span>
            {isPositive ? '+' : ''}
            {changePercent.toFixed(2)}%
          </span>
        )}
      </span>
      <span className="text-muted-foreground text-xs">
        ({isPositive ? '+' : ''}{change.toFixed(4)})
      </span>
    </div>
  );
}

// Animated number counter
interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({
  value,
  duration = 500,
  className,
  decimals = 0,
  prefix = '',
  suffix = '',
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easeOut;
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <span className={className}>
      {prefix}{formatNumber(displayValue)}{suffix}
    </span>
  );
}
