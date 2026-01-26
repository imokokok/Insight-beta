'use client';

import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import {
  castUMAVote,
  checkUMAVoteStatus,
  type UMAVoteResult,
  type UMAVoteStatus,
} from '@/lib/blockchain/umaDvm';
import { logger } from '@/lib/logger';

interface UseUMAVoteReturn {
  vote: (assertionId: string, support: boolean) => Promise<UMAVoteResult>;
  checkStatus: (assertionId: string) => Promise<UMAVoteStatus>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useUMAVote(): UseUMAVoteReturn {
  const { address, chainId } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const voteCache = useRef<Map<string, UMAVoteStatus>>(new Map());

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const vote = useCallback(
    async (assertionId: string, support: boolean): Promise<UMAVoteResult> => {
      if (!address) {
        const errorMsg = 'Wallet not connected';
        setError(errorMsg);
        logger.warn('UMA vote attempt without wallet connection');
        return { success: false, error: errorMsg };
      }

      if (!chainId) {
        const errorMsg = 'Chain not detected';
        setError(errorMsg);
        logger.warn('UMA vote attempt without chain detection');
        return { success: false, error: errorMsg };
      }

      setLoading(true);
      setError(null);

      try {
        const rpcUrl = process.env.INSIGHT_RPC_URL;
        const oracleAddress = process.env.NEXT_PUBLIC_INSIGHT_ORACLE_ADDRESS;

        if (!rpcUrl) {
          throw new Error('RPC URL not configured');
        }

        if (!oracleAddress) {
          throw new Error('Oracle address not configured');
        }

        const result = await castUMAVote(
          assertionId,
          support,
          address,
          chainId,
          rpcUrl,
          oracleAddress as `0x${string}`,
        );

        if (!result.success) {
          setError(result.error || 'Vote failed');
          logger.error('UMA vote failed', {
            assertionId,
            support,
            error: result.error,
          });
        } else {
          logger.info('UMA vote successful', {
            assertionId,
            support,
            voter: address,
            txHash: result.txHash,
          });
          voteCache.current.set(assertionId, { hasVoted: true, support });
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMsg);
        logger.error('UMA vote error', {
          error: err,
          assertionId,
          support,
          address,
          chainId,
        });
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [address, chainId],
  );

  const checkStatus = useCallback(
    async (assertionId: string): Promise<UMAVoteStatus> => {
      if (!address) {
        return { hasVoted: false };
      }

      if (!chainId) {
        return { hasVoted: false };
      }

      const cached = voteCache.current.get(assertionId);
      if (cached) {
        return cached;
      }

      try {
        const rpcUrl = process.env.INSIGHT_RPC_URL;
        const oracleAddress = process.env.NEXT_PUBLIC_INSIGHT_ORACLE_ADDRESS;

        if (!rpcUrl || !oracleAddress) {
          return { hasVoted: false };
        }

        const status = await checkUMAVoteStatus(
          assertionId,
          address,
          chainId,
          rpcUrl,
          oracleAddress as `0x${string}`,
        );

        if (status.hasVoted) {
          voteCache.current.set(assertionId, status);
        }

        return status;
      } catch (err) {
        logger.error('Failed to check UMA vote status', {
          error: err,
          assertionId,
          address,
        });
        return { hasVoted: false };
      }
    },
    [address, chainId],
  );

  return {
    vote,
    checkStatus,
    loading,
    error,
    clearError,
  };
}
