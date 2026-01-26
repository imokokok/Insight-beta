import useSWR from 'swr';
import { useWallet } from '@/contexts/WalletContext';
import { formatEther } from 'viem';
import { getChainSymbol } from '@/lib/blockchain/chainConfig';

interface BalanceError extends Error {
  code: 'NO_WALLET' | 'RPC_ERROR' | 'UNKNOWN';
}

export function useBalance() {
  const { address, chainId } = useWallet();

  const {
    data: balance,
    error,
    isLoading,
  } = useSWR(
    address ? `balance-${address}-${chainId ?? 'unknown'}` : null,
    async () => {
      if (!address) return null;
      if (typeof window === 'undefined' || !window.ethereum) {
        const err: BalanceError = new Error('Wallet not detected. Please install MetaMask or another Web3 wallet.') as BalanceError;
        err.code = 'NO_WALLET';
        throw err;
      }
      try {
        const result = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        });
        if (!result) {
          return '0';
        }
        const balanceWei = BigInt(result as string);
        return formatEther(balanceWei);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to fetch balance';
        const err: BalanceError = new Error(message) as BalanceError;
        err.code = 'RPC_ERROR';
        throw err;
      }
    },
    {
      refreshInterval: 10000,
      shouldRetryOnError: false,
    },
  );

  const symbol = chainId ? getChainSymbol(chainId) : 'ETH';

  return {
    balance,
    formattedBalance: balance ? parseFloat(balance).toFixed(4) : '0.0000',
    symbol,
    error,
    isLoading,
    hasWallet: typeof window !== 'undefined' && !!window.ethereum,
  };
}
