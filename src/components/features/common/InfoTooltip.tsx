'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  content: string;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({ content, className, side = 'top' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <Info
        size={14}
        className={cn(
          'cursor-help text-gray-400 transition-colors hover:text-purple-600',
          className,
        )}
      />

      {/* Tooltip Popup */}
      <div
        className={cn(
          'pointer-events-none absolute z-50 w-64 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white shadow-xl transition-all duration-200',
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
          side === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2',
          side === 'bottom' && 'left-1/2 top-full mt-2 -translate-x-1/2',
          side === 'left' && 'right-full top-1/2 mr-2 -translate-y-1/2',
          side === 'right' && 'left-full top-1/2 ml-2 -translate-y-1/2',
        )}
      >
        {content}
        {/* Arrow */}
        <div
          className={cn(
            'absolute h-2 w-2 rotate-45 bg-gray-900',
            side === 'top' && 'bottom-[-4px] left-1/2 -translate-x-1/2',
            side === 'bottom' && 'left-1/2 top-[-4px] -translate-x-1/2',
            side === 'left' && 'right-[-4px] top-1/2 -translate-y-1/2',
            side === 'right' && 'left-[-4px] top-1/2 -translate-y-1/2',
          )}
        />
      </div>
    </div>
  );
}
