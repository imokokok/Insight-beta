'use client';

import * as React from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
  disabled?: boolean;
}

function TooltipEnhanced({
  children,
  content,
  position = 'top',
  delay = 200,
  className,
  disabled,
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent',
  };

  if (!isMounted) return <>{children}</>;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute z-50 whitespace-nowrap',
              'rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-xl',
              'pointer-events-none',
              positionClasses[position],
              className
            )}
          >
            {content}
            {/* Arrow */}
            <span
              className={cn(
                'absolute h-0 w-0 border-4 border-gray-900',
                arrowClasses[position]
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Info Tooltip with icon
interface InfoTooltipProps {
  content: string;
  className?: string;
}

function InfoTooltip({ content, className }: InfoTooltipProps) {
  return (
    <TooltipEnhanced content={content} position="top" className={className}>
      <span className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-purple-100 text-purple-600 transition-colors hover:bg-purple-200">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </span>
    </TooltipEnhanced>
  );
}

// Copy to clipboard with tooltip feedback
interface CopyTooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
}

function CopyTooltip({ text, children, className }: CopyTooltipProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy text', { error: err });
    }
  };

  return (
    <TooltipEnhanced
      content={copied ? 'Copied!' : 'Click to copy'}
      position="top"
      className={className}
    >
      <span
        className="cursor-pointer"
        onClick={handleCopy}
      >
        {children}
      </span>
    </TooltipEnhanced>
  );
}

export { TooltipEnhanced, InfoTooltip, CopyTooltip };
