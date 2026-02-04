'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  content: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function HelpTooltip({ content, title, children, className }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        className="cursor-help"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
      >
        {children}
      </div>

      {isOpen && (
        <div className="absolute -top-4 left-1/2 z-50 w-64 -translate-x-1/2 transform rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          {title && <h4 className="mb-1 text-sm font-semibold text-gray-900">{title}</h4>}
          <p className="text-xs text-gray-600">{content}</p>
          <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 transform border-b border-r border-gray-200 bg-white" />
        </div>
      )}
    </div>
  );
}
