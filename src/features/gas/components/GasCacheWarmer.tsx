'use client';

import { useEffect } from 'react';

import { useWarmupGasCache } from '@/features/gas/hooks';
import { logger } from '@/shared/logger';

const DEFAULT_CHAINS = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base'];

export function GasCacheWarmer() {
  const warmup = useWarmupGasCache(DEFAULT_CHAINS);

  useEffect(() => {
    const timer = setTimeout(() => {
      warmup().catch((error) => {
        logger.error('Failed to warm up gas cache', { error });
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [warmup]);

  return null;
}
