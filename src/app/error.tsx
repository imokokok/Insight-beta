'use client';

import { useEffect } from 'react';

import Link from 'next/link';

import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

import { logger } from '@/lib/logger';
import { useI18n } from '@/i18n';

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

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* 错误图标 */}
        <motion.div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <AlertTriangle className="h-10 w-10 text-red-600" />
        </motion.div>

        {/* 标题 */}
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          {t('errorPage.title')}
        </h1>

        {/* 描述 */}
        <p className="mb-6 max-w-md text-gray-600">
          {t('errorPage.description')}
        </p>

        {/* 错误详情（仅在开发环境显示） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 rounded-lg bg-gray-100 p-4 text-left">
            <p className="mb-2 text-sm font-medium text-gray-700">{t('errors.errorMessage')}</p>
            <pre className="overflow-x-auto text-xs text-red-600">
              {error.message}
            </pre>
            {error.digest && (
              <p className="mt-2 text-xs text-gray-500">
                {t('errorPage.digest')}: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <motion.button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className="h-4 w-4" />
            {t('errorPage.retry')}
          </motion.button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Home className="h-4 w-4" />
            {t('errorPage.home')}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
