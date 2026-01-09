import useSWR from "swr";
import { useWallet } from "@/contexts/WalletContext";
import { formatEther } from "viem";

export function useBalance() {
  const { address, getWalletClient } = useWallet();

  const { data: balance, error, isLoading } = useSWR(
    address ? `balance-${address}` : null,
    async () => {
      const client = await getWalletClient();
      if (!client || !address) return null;
      
      // We need a public client to get balance, not wallet client. 
      // But we can usually get it from the window.ethereum or construct one.
      // Since WalletContext uses window.ethereum, we can use a basic public client request
      // via the provider, or import createPublicClient.
      // To keep it simple and reuse existing context logic:
      
      // Actually, standard viem usage:
      // const publicClient = createPublicClient({ chain: mainnet, transport: custom(window.ethereum) })
      // But we need the current chain.
      
      // Simplest way with window.ethereum:
      if (typeof window !== "undefined" && window.ethereum) {
        const result = await window.ethereum.request({
          method: "eth_getBalance",
          params: [address, "latest"],
        });
        return result ? formatEther(BigInt(result as string)) : "0";
      }
      return "0";
    },
    {
      refreshInterval: 10000, // Check balance every 10s
    }
  );

  return { 
    balance, 
    formattedBalance: balance ? parseFloat(balance).toFixed(4) : "0.0000",
    error, 
    isLoading 
  };
}
