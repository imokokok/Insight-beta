'use client';

import { useState, useEffect, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, Clock, AlertCircle, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui';
import { Progress } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface LoadingWithProgressProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingMessage?: string;
  timeout?: number;
  onTimeout?: () => void;
  showProgress?: boolean;
  progressInterval?: number;
  className?: string;
  fallback?: React.ReactNode;
  showRetry?: boolean;
  onRetry?: () => void;
}

export function LoadingWithProgress({
  isLoading,
  children,
  loadingMessage,
  timeout = 5000,
  onTimeout,
  showProgress = true,
  progressInterval = 500,
  className,
  fallback,
  showRetry = true,
  onRetry,
}: LoadingWithProgressProps) {
  const { t } = useI18n();
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isTimeout, setIsTimeout] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const messageRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadingMessagesRaw = t('common.loading.messages');
  const timeoutMessagesRaw = t('common.loading.timeoutMessages');
  const loadingMessages = Array.isArray(loadingMessagesRaw)
    ? loadingMessagesRaw
    : [loadingMessagesRaw];
  const timeoutMessages = Array.isArray(timeoutMessagesRaw)
    ? timeoutMessagesRaw
    : [timeoutMessagesRaw];

  useEffect(() => {
    if (isLoading) {
      setShowLoading(true);
      setProgress(0);
      setIsTimeout(false);
      setMessageIndex(0);

      if (showProgress) {
        progressRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) return 90;
            const increment = prev < 30 ? 10 : prev < 60 ? 5 : 2;
            return Math.min(prev + increment, 90);
          });
        }, progressInterval);
      }

      messageRef.current = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);

      timeoutRef.current = setTimeout(() => {
        setIsTimeout(true);
        onTimeout?.();
      }, timeout);
    } else {
      setProgress(100);
      if (progressRef.current) clearInterval(progressRef.current);
      if (messageRef.current) clearInterval(messageRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const timer = setTimeout(() => {
        setShowLoading(false);
        setProgress(0);
        setIsTimeout(false);
      }, 500);

      return () => clearTimeout(timer);
    }

    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (messageRef.current) clearInterval(messageRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isLoading, timeout, showProgress, progressInterval, onTimeout, loadingMessages.length]);

  const currentMessage = loadingMessage
    ? loadingMessage
    : isTimeout
      ? timeoutMessages[messageIndex % timeoutMessages.length]
      : loadingMessages[messageIndex];

  if (!showLoading || !isLoading) {
    return <>{children}</>;
  }

  return (
    <div className={cn('relative', className)}>
      <div className="pointer-events-none opacity-30">{fallback || children}</div>

      <AnimatePresence>
        {showLoading && isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm dark:bg-gray-900/80"
          >
            <div className="flex max-w-sm flex-col items-center gap-4 p-6 text-center">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                {isTimeout && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -right-1 -top-1"
                  >
                    <Clock className="h-5 w-5 text-amber-500" />
                  </motion.div>
                )}
              </div>

              <div className="space-y-2">
                <p
                  className={cn(
                    'font-medium',
                    isTimeout
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-gray-700 dark:text-gray-300',
                  )}
                >
                  {currentMessage}
                </p>

                {isTimeout && (
                  <p className="flex items-center justify-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <span>{t('common.loading.checkNetwork')}</span>
                  </p>
                )}
              </div>

              {showProgress && (
                <div className="w-full max-w-xs">
                  <Progress value={progress} className="h-2" />
                  <p className="mt-2 text-xs text-gray-500">{Math.round(progress)}%</p>
                </div>
              )}

              {showRetry && onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t('common.retry')}
                </Button>
              )}

              {!isTimeout && (
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                  <Sparkles className="h-3 w-3" />
                  <span>{t('common.loading.optimizing')}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LoadingWithProgress;
