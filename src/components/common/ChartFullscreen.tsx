'use client';

import { memo, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Maximize } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/shared/utils';

import { ExportButton } from './ExportButton';

export interface ChartFullscreenProps {
  children: ReactNode;
  title?: string;
  description?: string;
  icon?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  data?: object[];
  filename?: string;
  className?: string;
}

export const ChartFullscreen = memo(function ChartFullscreen({
  children,
  title,
  description,
  icon,
  isOpen,
  onClose,
  data,
  filename,
  className,
}: ChartFullscreenProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 flex flex-col',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100',
            'duration-200',
            className,
          )}
        >
          <div className="flex h-full flex-col bg-background">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                {icon && <div className="flex-shrink-0 text-primary">{icon}</div>}
                <div>
                  {title && (
                    <DialogPrimitive.Title className="text-xl font-semibold">
                      {title}
                    </DialogPrimitive.Title>
                  )}
                  {description && (
                    <DialogPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
                      {description}
                    </DialogPrimitive.Description>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ExportButton chartRef={chartRef} data={data} filename={filename} />
                <Button variant="outline" size="sm" onClick={onClose}>
                  <X className="mr-2 h-4 w-4" />
                  Exit Fullscreen
                </Button>
              </div>
            </div>

            <div ref={chartRef} className="flex-1 overflow-auto p-6">
              <div className="mx-auto h-full max-w-7xl">{children}</div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
});

export function ChartFullscreenButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button variant="ghost" size="sm" className={cn('h-8 w-8 p-0', className)} onClick={onClick}>
      <Maximize className="h-4 w-4" />
    </Button>
  );
}
