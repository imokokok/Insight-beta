'use client';

import { motion } from 'framer-motion';

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <motion.div
        className="relative h-16 w-16"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* 外圈 */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-purple-200"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute -top-1 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-purple-500" />
        </motion.div>
        
        {/* 内圈 */}
        <motion.div
          className="absolute inset-3 rounded-full border-4 border-cyan-200"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-cyan-500" />
        </motion.div>
      </motion.div>
      
      <motion.p
        className="mt-6 text-sm text-muted-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        加载中...
      </motion.p>
    </div>
  );
}
