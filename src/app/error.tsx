'use client';

import { useEffect } from 'react';

import { ErrorFallback } from '@/components/common/ErrorHandler';
import { logger } from '@/lib/logger';
import { useI18n } from '@/i18n';
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
} from '@/components/common/AnimatedContainer';
import {
  Container,
  Stack,
  Row,
} from '@/components/common/Layout';
import {
  ResponsivePadding,
  MobileOnly,
  DesktopOnly,
} from '@/components/common/Responsive';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const { t } = useI18n();

  useEffect(() => {
    // 上报错误到监控服务
    logger.error('页面错误', { error });
  }, [error]);

  // 根据错误信息判断错误类型
  const getErrorType = () => {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found';
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return 'forbidden';
    }
    return 'unknown';
  };

  return (
    <ErrorFallback
      error={{
        type: getErrorType(),
        message: error.message || t('errorPage.description'),
        timestamp: new Date(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        requestId: error.digest,
      }}
      onRetry={reset}
      onHome={() => window.location.href = '/'}
      showDetails={process.env.NODE_ENV === 'development'}
    />
  );
}
