'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FeatureCalloutProps {
  title: string;
  description: string;
  icon: ReactNode;
  className?: string;
}

export function FeatureCallout({ title, description, icon, className }: FeatureCalloutProps) {
  return (
    <div
      className={cn('flex items-start rounded-lg border border-blue-100 bg-blue-50 p-4', className)}
    >
      <div className="mr-3 text-blue-600">{icon}</div>
      <div>
        <h3 className="mb-1 text-sm font-semibold text-blue-900">{title}</h3>
        <p className="text-xs text-blue-800">{description}</p>
      </div>
    </div>
  );
}
