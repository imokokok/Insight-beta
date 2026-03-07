'use client';

import React from 'react';

import Link from 'next/link';

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
}

export interface BreadcrumbWithActionsProps extends BreadcrumbProps {
  actions?: React.ReactNode;
}

export function Breadcrumb({ items, className, showHome = true }: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      {showHome && (
        <Link
          href="/"
          className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
        >
          <Home className="h-4 w-4" />
        </Link>
      )}
      {showHome && items.length > 0 && (
        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
      )}
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.href ? (
            <Link
              href={item.href}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-all duration-200 hover:bg-muted/50 hover:text-foreground"
            >
              {item.icon}
              {item.label}
            </Link>
          ) : (
            <span className="flex items-center gap-1 font-medium text-foreground">
              {item.icon}
              {item.label}
            </span>
          )}
          {index < items.length - 1 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function BreadcrumbWithActions({ items, className, showHome = true, actions }: BreadcrumbWithActionsProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <Breadcrumb items={items} showHome={showHome} />
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
