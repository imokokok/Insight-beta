/**
 * 价格变动闪烁效果组件
 *
 * 当价格变动时显示闪烁动画，提升视觉反馈
 */

'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type PriceFlashType = 'up' | 'down' | 'neutral';

interface PriceFlashProps {
  children: ReactNode;
  type?: PriceFlashType;
  trigger?: string | number;
  className?: string;
  duration?: number;
}

/**
 * PriceFlash 组件 - 价格变动闪烁效果
 *
 * @example
 * <PriceFlash type="up" trigger={price}>
 *   <span>${price}</span>
 * </PriceFlash>
 */
export function PriceFlash({
  children,
  type = 'neutral',
  trigger,
  className,
  duration = 500,
}: PriceFlashProps) {
  const [isFlashing, setIsFlashing] = useState(false);
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger !== undefined && trigger !== prevTrigger.current) {
      setIsFlashing(true);
      const timer = setTimeout(() => {
        setIsFlashing(false);
      }, duration);
      prevTrigger.current = trigger;
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [trigger, duration]);

  const flashClasses = {
    up: 'animate-price-flash-up',
    down: 'animate-price-flash-down',
    neutral: '',
  };

  return (
    <span
      className={cn(
        'inline-block rounded px-1 transition-colors',
        isFlashing && flashClasses[type],
        className
      )}
    >
      {children}
    </span>
  );
}

interface PriceChangeIndicatorProps {
  value: number;
  previousValue?: number;
  className?: string;
  showIcon?: boolean;
  decimals?: number;
}

/**
 * PriceChangeIndicator 组件 - 价格变化指示器
 *
 * 显示价格变化的百分比和方向
 */
export function PriceChangeIndicator({
  value,
  previousValue,
  className,
  showIcon = true,
  decimals = 2,
}: PriceChangeIndicatorProps) {
  const change = previousValue !== undefined ? value - previousValue : 0;
  const percentChange = previousValue ? (change / previousValue) * 100 : 0;

  const isPositive = change > 0;
  const isNegative = change < 0;

  const colorClass = isPositive
    ? 'text-emerald-500'
    : isNegative
      ? 'text-rose-500'
      : 'text-gray-500';

  const bgClass = isPositive
    ? 'bg-emerald-50'
    : isNegative
      ? 'bg-rose-50'
      : 'bg-gray-50';

  const Icon = isPositive ? '↑' : isNegative ? '↓' : '→';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium',
        bgClass,
        colorClass,
        className
      )}
    >
      {showIcon && <span className="text-xs">{Icon}</span>}
      <span>
        {isPositive ? '+' : ''}
        {percentChange.toFixed(decimals)}%
      </span>
    </span>
  );
}

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatter?: (value: number) => string;
}

/**
 * AnimatedNumber 组件 - 数字滚动动画
 *
 * 数字变化时带有平滑的滚动效果
 */
export function AnimatedNumber({
  value,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  formatter,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(value);
  const targetValueRef = useRef(value);

  useEffect(() => {
    if (value !== targetValueRef.current) {
      startValueRef.current = displayValue;
      targetValueRef.current = value;
      startTimeRef.current = null;
      setIsAnimating(true);
    }
  }, [value, displayValue]);

  useEffect(() => {
    if (!isAnimating) return;

    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentValue =
        startValueRef.current + (targetValueRef.current - startValueRef.current) * easeOut;

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setDisplayValue(targetValueRef.current);
      }
    };

    requestAnimationFrame(animate);
  }, [isAnimating, duration]);

  const formattedValue = formatter
    ? formatter(displayValue)
    : displayValue.toFixed(decimals);

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}

interface LivePriceProps {
  price: number;
  currency?: string;
  className?: string;
  decimals?: number;
}

/**
 * LivePrice 组件 - 实时价格显示
 *
 * 带有价格变动闪烁效果和数字滚动动画
 */
export function LivePrice({
  price,
  currency = '$',
  className,
  decimals = 2,
}: LivePriceProps) {
  const [prevPrice, setPrevPrice] = useState(price);
  const [flashType, setFlashType] = useState<PriceFlashType>('neutral');

  useEffect(() => {
    if (price > prevPrice) {
      setFlashType('up');
    } else if (price < prevPrice) {
      setFlashType('down');
    } else {
      setFlashType('neutral');
    }
    setPrevPrice(price);
  }, [price, prevPrice]);

  return (
    <PriceFlash type={flashType} trigger={price}>
      <AnimatedNumber
        value={price}
        prefix={currency}
        decimals={decimals}
        className={cn(
          'font-mono font-bold',
          flashType === 'up' && 'text-emerald-600',
          flashType === 'down' && 'text-rose-600',
          className
        )}
      />
    </PriceFlash>
  );
}

interface PriceTrendProps {
  data: { value: number; timestamp: number }[];
  className?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}

/**
 * PriceTrend 组件 - 迷你价格趋势图
 *
 * 使用 SVG 绘制简单的趋势线条
 */
export function PriceTrend({
  data,
  className,
  width = 100,
  height = 30,
  strokeWidth = 2,
}: PriceTrendProps) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value - min) / range) * height;
    return `${x},${y}`;
  });

  const firstValue = data[0]?.value ?? 0;
  const lastValue = data[data.length - 1]?.value ?? 0;
  const isPositive = lastValue >= firstValue;
  const strokeColor = isPositive ? '#10b981' : '#ef4444';

  return (
    <svg
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        points={points.join(' ')}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-sm"
      />
    </svg>
  );
}
