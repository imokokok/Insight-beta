'use client';

import { cn } from '@/shared/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-6',
      icon: 'h-8 w-8',
      title: 'text-sm',
      description: 'text-xs',
    },
    md: {
      container: 'py-12',
      icon: 'h-12 w-12',
      title: 'text-base',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'h-16 w-16',
      title: 'text-lg',
      description: 'text-base',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        classes.container,
        className,
      )}
    >
      {icon && <div className={cn('mb-3 text-muted-foreground/50', classes.icon)}>{icon}</div>}
      <h3 className={cn('font-medium text-muted-foreground', classes.title)}>{title}</h3>
      {description && (
        <p className={cn('mt-1 text-muted-foreground/70', classes.description)}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
