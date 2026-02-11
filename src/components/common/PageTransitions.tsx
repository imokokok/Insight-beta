/**
 * Page Transitions Component
 *
 * 页面转场动画组件 - 提供流畅的页面切换体验
 */

'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

// ==================== 页面转场动画变体 ====================

const pageVariants: Record<string, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
  },
  slideInRight: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
  },
};

interface PageTransitionProps {
  children: ReactNode;
  variant?: keyof typeof pageVariants;
  duration?: number;
  className?: string;
  mode?: 'wait' | 'sync' | 'popLayout';
}

export function PageTransition({
  children,
  variant = 'fade',
  duration = 0.3,
  className,
  mode = 'wait',
}: PageTransitionProps) {
  const pathname = usePathname();
  const variants = pageVariants[variant];

  return (
    <AnimatePresence mode={mode}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={{
          duration,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ==================== 列表项动画容器 ====================

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.05,
  initialDelay = 0,
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delayChildren: initialDelay,
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ==================== 列表项动画 ====================

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
}

export function StaggerItem({
  children,
  className,
  direction = 'up',
  distance = 20,
}: StaggerItemProps) {
  const directionOffset = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
  };

  return (
    <motion.div
      variants={{
        hidden: {
          opacity: 0,
          ...directionOffset[direction],
        },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: {
            duration: 0.4,
            ease: [0.25, 0.1, 0.25, 1],
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ==================== 卡片列表动画 ====================

interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
  layout?: boolean;
}

export function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  itemClassName,
  staggerDelay = 0.05,
  layout = true,
}: AnimatedListProps<T>) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item)}
            layout={layout}
            variants={{
              hidden: { opacity: 0, y: 20, scale: 0.95 },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  duration: 0.3,
                  ease: [0.25, 0.1, 0.25, 1],
                },
              },
              exit: {
                opacity: 0,
                scale: 0.9,
                transition: { duration: 0.2 },
              },
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={itemClassName}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== 网格动画 ====================

interface AnimatedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
  itemClassName?: string;
  columns?: number;
  staggerDelay?: number;
}

export function AnimatedGrid<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  itemClassName,
  staggerDelay = 0.03,
}: AnimatedGridProps<T>) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item)}
            layout
            variants={{
              hidden: { opacity: 0, scale: 0.8 },
              visible: {
                opacity: 1,
                scale: 1,
                transition: {
                  duration: 0.3,
                  ease: [0.25, 0.1, 0.25, 1],
                },
              },
              exit: {
                opacity: 0,
                scale: 0.8,
                transition: { duration: 0.2 },
              },
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            className={itemClassName}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== 数字增长动画 ====================

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  separator?: string;
}

export function CountUp({
  end,
  start = 0,
  duration = 2,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  separator = ',',
}: CountUpProps) {
  const [count, setCount] = useState(start);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentCount = start + (end - start) * easeOut;

      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, start, duration]);

  const formatNumber = (num: number): string => {
    const fixed = num.toFixed(decimals);
    const parts = fixed.split('.');
    if (parts[0]) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    }
    return parts.join('.');
  };

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {prefix}
      {formatNumber(count)}
      {suffix}
    </motion.span>
  );
}

// ==================== 骨架屏动画 ====================

interface SkeletonPulseProps {
  className?: string;
  delay?: number;
}

export function SkeletonPulse({ className, delay = 0 }: SkeletonPulseProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    />
  );
}

// ==================== 加载占位符 ====================

interface LoadingPlaceholderProps {
  className?: string;
  rows?: number;
  columns?: number;
}

export function LoadingPlaceholder({
  className,
  rows = 3,
  columns = 1,
}: LoadingPlaceholderProps) {
  return (
    <div className={className}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 mb-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonPulse
              key={colIndex}
              delay={rowIndex * 0.1 + colIndex * 0.05}
              className="h-4 flex-1 rounded bg-gray-200"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ==================== 滚动显示动画 ====================

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  once?: boolean;
  threshold?: number;
}

export function ScrollReveal({
  children,
  className,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  once = true,
  threshold = 0.1,
}: ScrollRevealProps) {
  const directionOffset = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        ...directionOffset[direction],
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
      viewport={{ once, amount: threshold }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ==================== 视差滚动效果 ====================

interface ParallaxProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  direction?: 'up' | 'down';
}

export function Parallax({
  children,
  className,
  speed = 0.5,
  direction = 'up',
}: ParallaxProps) {
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffsetY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const multiplier = direction === 'up' ? -1 : 1;

  return (
    <motion.div
      className={className}
      style={{
        transform: `translateY(${offsetY * speed * multiplier}px)`,
      }}
    >
      {children}
    </motion.div>
  );
}

// ==================== 悬停卡片效果 ====================

interface HoverCardProps {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
  hoverY?: number;
  glowColor?: string;
}

export function HoverCard({
  children,
  className,
  hoverScale = 1.02,
  hoverY = -4,
  glowColor = 'rgba(139, 92, 246, 0.15)',
}: HoverCardProps) {
  return (
    <motion.div
      className={className}
      whileHover={{
        scale: hoverScale,
        y: hoverY,
        boxShadow: `0 20px 40px ${glowColor}`,
      }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
    >
      {children}
    </motion.div>
  );
}

// ==================== 波纹效果按钮 ====================

interface RippleButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function RippleButton({
  children,
  className,
  onClick,
  disabled,
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<
    Array<{ x: number; y: number; id: number }>
  >([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);

    onClick?.();
  };

  return (
    <motion.button
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full bg-white/30"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
          initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 1 }}
          animate={{
            width: 400,
            height: 400,
            x: -200,
            y: -200,
            opacity: 0,
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
      {children}
    </motion.button>
  );
}
