'use client';

import type { ReactNode} from 'react';
import { useState, useEffect } from 'react';

import { cn } from '@/lib/utils';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export function FadeIn({
  children,
  delay = 0,
  duration = 500,
  className,
  direction = 'up',
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const directionClasses = {
    up: 'translate-y-4',
    down: '-translate-y-4',
    left: 'translate-x-4',
    right: '-translate-x-4',
    none: '',
  };

  return (
    <div
      className={cn(
        'transition-all',
        directionClasses[direction],
        isVisible ? 'opacity-100 translate-x-0 translate-y-0' : 'opacity-0',
        className
      )}
      style={{ transitionDuration: `${duration}ms`, transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 100,
  initialDelay = 0,
}: StaggerContainerProps) {
  return (
    <div className={className}>
      {Array.isArray(children) ? (
        children.map((child, index) => (
          <FadeIn key={index} delay={initialDelay + index * staggerDelay}>
            {child}
          </FadeIn>
        ))
      ) : (
        <FadeIn delay={initialDelay}>{children}</FadeIn>
      )}
    </div>
  );
}

interface SlideInProps {
  children: ReactNode;
  isOpen: boolean;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  duration?: number;
  className?: string;
}

export function SlideIn({
  children,
  isOpen,
  direction = 'right',
  duration = 300,
  className,
}: SlideInProps) {
  const directionClasses = {
    left: '-translate-x-full',
    right: 'translate-x-full',
    top: '-translate-y-full',
    bottom: 'translate-y-full',
  };

  return (
    <div
      className={cn(
        'transition-transform ease-out',
        isOpen ? 'translate-x-0 translate-y-0' : directionClasses[direction],
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

interface ScaleInProps {
  children: ReactNode;
  isOpen: boolean;
  duration?: number;
  className?: string;
}

export function ScaleIn({ children, isOpen, duration = 200, className }: ScaleInProps) {
  return (
    <div
      className={cn(
        'transition-all ease-out',
        isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

// Page transition wrapper
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        isReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
    >
      {children}
    </div>
  );
}

// Collapsible section
interface CollapsibleProps {
  children: ReactNode;
  isOpen: boolean;
  duration?: number;
  className?: string;
}

export function Collapsible({ children, isOpen, duration = 300, className }: CollapsibleProps) {
  return (
    <div
      className={cn(
        'overflow-hidden transition-all ease-in-out',
        isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

// Blur fade in
interface BlurFadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function BlurFadeIn({ children, delay = 0, duration = 600, className }: BlurFadeInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        'transition-all ease-out',
        isVisible ? 'opacity-100 blur-0' : 'opacity-0 blur-sm',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

// Animated number counter with spring effect
interface SpringNumberProps {
  value: number;
  duration?: number;
  className?: string;
  decimals?: number;
}

export function SpringNumber({ value, duration = 800, className, decimals = 0 }: SpringNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Spring easing
      const springProgress = 1 - Math.pow(1 - progress, 3) * Math.cos(progress * Math.PI * 2);

      const currentValue = startValue + (endValue - startValue) * springProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={className}>
      {displayValue.toFixed(decimals)}
    </span>
  );
}
