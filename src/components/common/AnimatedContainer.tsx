/**
 * Animated Container Components
 *
 * 增强版动画容器组件
 * - 统一的动画效果
 * - 交错动画支持
 * - 滚动触发动画
 * - 无障碍支持
 */

'use client';

import React from 'react';
import { motion, AnimatePresence, Variants, Transition } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  containerVariants,
  componentVariants,
  scrollVariants,
  transitionPresets,
  STAGGER_CONFIG,
} from '@/lib/design-system/tokens/animation';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface AnimatedContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof containerVariants;
  delay?: number;
  stagger?: boolean;
  staggerConfig?: typeof STAGGER_CONFIG.normal;
}

interface AnimatedItemProps {
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof componentVariants;
  index?: number;
}

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof scrollVariants;
  delay?: number;
  threshold?: number;
  once?: boolean;
}

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  mode?: 'wait' | 'sync' | 'popLayout';
}

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerChildren?: number;
  delayChildren?: number;
}

interface HoverScaleProps {
  children: React.ReactNode;
  className?: string;
  scale?: number;
  y?: number;
}

// ============================================================================
// Hook: useReducedMotion
// ============================================================================

function useReducedMotion(): boolean {
  // Check if window is defined (SSR)
  if (typeof window === 'undefined') return false;

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

// ============================================================================
// Animated Container
// ============================================================================

export function AnimatedContainer({
  children,
  className,
  variant = 'list',
  delay = 0,
  stagger = true,
  staggerConfig = STAGGER_CONFIG.normal,
}: AnimatedContainerProps) {
  const prefersReducedMotion = useReducedMotion();

  const variants = containerVariants[variant];
  const customVariants: Variants = {
    hidden: variants.hidden,
    visible: {
      ...variants.visible,
      transition: {
        ...(variants.visible as { transition: object }).transition,
        delayChildren: delay,
        ...(stagger ? staggerConfig : {}),
      },
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={prefersReducedMotion ? undefined : customVariants}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Animated Item
// ============================================================================

export function AnimatedItem({
  children,
  className,
  variant = 'listItem',
  index = 0,
}: AnimatedItemProps) {
  const prefersReducedMotion = useReducedMotion();
  const variants = componentVariants[variant];

  return (
    <motion.div
      className={className}
      variants={prefersReducedMotion ? undefined : variants}
      custom={index}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Scroll Reveal
// ============================================================================

export function ScrollReveal({
  children,
  className,
  variant = 'slideUp',
  delay = 0,
  threshold = 0.1,
  once = true,
}: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const variants = scrollVariants[variant];

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? undefined : variants.hidden}
      whileInView={prefersReducedMotion ? undefined : variants.visible}
      viewport={{ once, amount: threshold }}
      transition={{
        ...transitionPresets.normal,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Page Transition
// ============================================================================

export function PageTransition({
  children,
  className,
  mode = 'wait',
}: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode={mode}>
      <motion.div
        key={typeof window !== 'undefined' ? window.location.pathname : ''}
        className={className}
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -20 }}
        transition={transitionPresets.normal}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// Stagger Container
// ============================================================================

export function StaggerContainer({
  children,
  className,
  staggerChildren = 0.05,
  delayChildren = 0.1,
}: StaggerContainerProps) {
  const prefersReducedMotion = useReducedMotion();

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: transitionPresets.normal,
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={prefersReducedMotion ? undefined : container}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Stagger Item
// ============================================================================

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: transitionPresets.normal,
    },
  };

  return (
    <motion.div
      className={className}
      variants={prefersReducedMotion ? undefined : item}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Hover Scale
// ============================================================================

export function HoverScale({
  children,
  className,
  scale = 1.02,
  y = -2,
}: HoverScaleProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={
        prefersReducedMotion
          ? undefined
          : { scale, y, transition: transitionPresets.fast }
      }
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Fade In
// ============================================================================

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.3,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Slide In
// ============================================================================

export function SlideIn({
  children,
  className,
  direction = 'up',
  delay = 0,
  distance = 20,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  distance?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  const directions = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
  };

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? undefined : { opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ ...transitionPresets.normal, delay }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Scale In
// ============================================================================

export function ScaleIn({
  children,
  className,
  delay = 0,
  initialScale = 0.9,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  initialScale?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? undefined : { opacity: 0, scale: initialScale }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...transitionPresets.normal, delay }}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Animated List
// ============================================================================

export function AnimatedList<T>({
  items,
  renderItem,
  className,
  itemClassName,
  staggerChildren = 0.05,
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  staggerChildren?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: transitionPresets.normal,
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={prefersReducedMotion ? undefined : container}
    >
      {items.map((itemData, index) => (
        <motion.div
          key={index}
          className={itemClassName}
          variants={prefersReducedMotion ? undefined : item}
        >
          {renderItem(itemData, index)}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ============================================================================
// Animated Grid
// ============================================================================

export function AnimatedGrid({
  children,
  className,
  staggerChildren = 0.05,
  columns = 4,
}: {
  children: React.ReactNode;
  className?: string;
  staggerChildren?: number;
  columns?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: transitionPresets.normal,
    },
  };

  return (
    <motion.div
      className={cn(
        'grid gap-4',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-4',
        className
      )}
      initial="hidden"
      animate="visible"
      variants={prefersReducedMotion ? undefined : container}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Animated Grid Item
// ============================================================================

export function AnimatedGridItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  const item: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: transitionPresets.normal,
    },
  };

  return (
    <motion.div
      className={className}
      variants={prefersReducedMotion ? undefined : item}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// Presence Animation
// ============================================================================

export function PresenceAnimation({
  children,
  isVisible,
  className,
  mode = 'wait',
}: {
  children: React.ReactNode;
  isVisible: boolean;
  className?: string;
  mode?: 'wait' | 'sync' | 'popLayout';
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode={mode}>
      {isVisible && (
        <motion.div
          className={className}
          initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
          transition={transitionPresets.fast}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Number Counter
// ============================================================================

export function NumberCounter({
  value,
  className,
  duration = 0.8,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  value: number;
  className?: string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.span className={className}>
      {prefix}
      <motion.span
        initial={prefersReducedMotion ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {value.toFixed(decimals)}
      </motion.span>
      {suffix}
    </motion.span>
  );
}

// ============================================================================
// Export
// ============================================================================

export default {
  AnimatedContainer,
  AnimatedItem,
  ScrollReveal,
  PageTransition,
  StaggerContainer,
  StaggerItem,
  HoverScale,
  FadeIn,
  SlideIn,
  ScaleIn,
  AnimatedList,
  AnimatedGrid,
  AnimatedGridItem,
  PresenceAnimation,
  NumberCounter,
};
