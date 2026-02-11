'use client';

import { motion } from 'framer-motion';
import { useAccessibility } from '@/components/common/AccessibilityProvider';

export default function Loading() {
  const { reduceMotion } = useAccessibility();

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <motion.div
        className="relative h-20 w-20"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* 外圈 - 品牌紫色 */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-purple-200"
          animate={reduceMotion ? {} : { rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute -top-1 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30" />
        </motion.div>

        {/* 中圈 - 青色 */}
        <motion.div
          className="absolute inset-2 rounded-full border-4 border-cyan-200"
          animate={reduceMotion ? {} : { rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 shadow-lg shadow-cyan-500/30" />
        </motion.div>

        {/* 内圈 - 中心 Logo */}
        <motion.div
          className="absolute inset-5 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-cyan-100"
          animate={reduceMotion ? {} : { scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg
            className="h-6 w-6 text-purple-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </motion.div>

        {/* 装饰光点 */}
        {!reduceMotion && (
          <>
            <motion.div
              className="absolute -right-2 top-1/2 h-2 w-2 rounded-full bg-yellow-400"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="absolute -left-2 top-1/3 h-1.5 w-1.5 rounded-full bg-blue-400"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}
      </motion.div>

      {/* 加载文字 */}
      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-base font-medium text-purple-900">加载中</p>
        <motion.p
          className="mt-1 text-sm text-muted-foreground"
          animate={reduceMotion ? {} : { opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          正在准备数据...
        </motion.p>
      </motion.div>

      {/* 进度条 */}
      <motion.div
        className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-gray-200"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500"
          initial={{ width: '0%' }}
          animate={reduceMotion ? { width: '100%' } : { width: ['0%', '100%', '0%'] }}
          transition={
            reduceMotion
              ? { duration: 0.5 }
              : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          }
        />
      </motion.div>
    </div>
  );
}
