import useSWR from "swr";
import { fetchApiData } from "@/lib/utils";
import type { UserStats } from "@/lib/oracleTypes";

export function useUserStats(address?: string | null) {
  const { data, error, isLoading } = useSWR<UserStats>(
    address ? `/api/oracle/stats/user?address=${address}` : null,
    fetchApiData,
    {
      refreshInterval: 10000,
      shouldRetryOnError: false
    }
  );

  return {
    stats: data ?? null,
    loading: isLoading,
    error: error?.message ?? null
  };
}
