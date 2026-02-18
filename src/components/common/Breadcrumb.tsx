'use client';

import React, { memo } from 'react';

import Link from 'next/link';

import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';

import { cn } from '@/shared/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  homeHref?: string;
  separator?: React.ReactNode;
  animated?: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const Breadcrumb = memo(function Breadcrumb({
  items,
  className,
  showHome = true,
  homeHref = '/',
  separator,
  animated = true,
}: BreadcrumbProps) {
  const allItems = showHome
    ? [{ label: '', href: homeHref, icon: <Home className="h-3.5 w-3.5" /> }, ...items]
    : items;

  const defaultSeparator = (
    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
  );

  const content = (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-sm', className)}>
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        const isHome = showHome && index === 0;

        return (
          <React.Fragment key={index}>
            {index > 0 && (separator || defaultSeparator)}
            <motion.div
              variants={animated ? itemVariants : undefined}
              className={cn(
                'flex items-center gap-1.5',
                isLast ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {item.href && !isLast ? (
                <Link
                  href={item.href as unknown as any}
                  className={cn(
                    'flex items-center gap-1.5 transition-colors hover:text-foreground',
                    isHome && 'rounded-md p-1 hover:bg-muted',
                  )}
                >
                  {item.icon}
                  {!isHome && item.label}
                </Link>
              ) : (
                <span className="flex items-center gap-1.5">
                  {item.icon}
                  {item.label}
                </span>
              )}
            </motion.div>
          </React.Fragment>
        );
      })}
    </nav>
  );

  if (animated) {
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {content}
      </motion.div>
    );
  }

  return content;
});

export interface BreadcrumbWithActionsProps extends BreadcrumbProps {
  actions?: React.ReactNode;
  className?: string;
}

export const BreadcrumbWithActions = memo(function BreadcrumbWithActions({
  items,
  actions,
  className,
  ...props
}: BreadcrumbWithActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <Breadcrumb items={items} {...props} />
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
});

export default Breadcrumb;
