'use client';

import { memo } from 'react';

import { cn } from '@/shared/utils';

export interface FeatureTag {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface FeatureTagsProps {
  features: FeatureTag[];
  className?: string;
  variant?: 'inline' | 'grid';
}

export const FeatureTags = memo(function FeatureTags({
  features,
  className,
  variant = 'inline',
}: FeatureTagsProps) {
  if (variant === 'grid') {
    return (
      <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-3 rounded-lg bg-muted/30 px-4 py-3">
            <span className="flex-shrink-0 text-primary">{feature.icon}</span>
            <div>
              <p className="text-sm font-medium text-foreground">{feature.title}</p>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/50 bg-card/30 p-4', className)}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-primary">{feature.icon}</span>
            <span className="text-sm font-medium text-foreground">{feature.title}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{feature.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default FeatureTags;
