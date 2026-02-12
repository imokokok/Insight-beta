/**
 * Page Transitions Component
 *
 * 页面转场动画组件 - 提供流畅的页面切换体验
 */

'use client';

import type { ReactNode } from 'react';

import { usePathname } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';

import type { Variants } from 'framer-motion';

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

interface HoverCardProps {
  children: ReactNode;
  className?: string;
  hoverScale?: number | false;
  hoverY?: number;
  glowColor?: string;
  hoverShadow?: boolean;
  hoverBorder?: boolean;
}

export function HoverCard({
  children,
  className,
  hoverScale = 1.02,
  hoverY = -4,
  glowColor = 'rgba(139, 92, 246, 0.15)',
  hoverShadow = false,
  hoverBorder = false,
}: HoverCardProps) {
  const scaleValue = hoverScale === false ? 1 : hoverScale;

  return (
    <motion.div
      className={className}
      whileHover={{
        scale: scaleValue,
        y: hoverY,
        ...(hoverShadow ? { boxShadow: `0 20px 40px ${glowColor}` } : {}),
        ...(hoverBorder ? { borderColor: 'rgba(139, 92, 246, 0.3)' } : {}),
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
