"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { castUMAVote, checkUMAVoteStatus, type UMAVoteResult, type UMAVoteStatus } from "@/lib/umaDvm";
import { logger } from "@/lib/logger";

interface UseUMAVoteReturn {
  vote: (assertionId: string, support: boolean) => Promise<UMAVoteResult>;
  checkStatus: (assertionId: string) => Promise<UMAVoteStatus>;
  loading: boolean;
  error: string | null;
}

export function useUMAVote(): UseUMAVoteReturn {
  const { address, chainId } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vote = useCallback(
    async (assertionId: string, support: boolean): Promise<UMAVoteResult> => {
      if (!address) {
        const errorMsg = "Wallet not connected";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      setLoading(true);
      setError(null);

      try {
        const result = await castUMAVote(
          assertionId,
          support,
          address,
          chainId || 137,
          process.env.INSIGHT_RPC_URL || "",
          process.env.NEXT_PUBLIC_INSIGHT_ORACLE_ADDRESS || ("0x0000000000000000000000000000000000000000" as `0x${string}`),
        );

        if (!result.success) {
          setError(result.error || "Vote failed");
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setError(errorMsg);
        logger.error("UMA vote error", { error: err, assertionId, support });
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

      try {
        return await checkUMAVoteStatus(
          assertionId,
          address,
          chainId || 137,
          process.env.INSIGHT_RPC_URL || "",
          process.env.NEXT_PUBLIC_INSIGHT_ORACLE_ADDRESS || ("0x0000000000000000000000000000000000000000" as `0x${string}`),
        );
      } catch (err) {
        logger.error("Failed to check UMA vote status", { error: err, assertionId });
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
  };
}