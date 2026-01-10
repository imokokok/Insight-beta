import useSWR from "swr";
import { useWallet } from "@/contexts/WalletContext";
import { formatEther } from "viem";
import { arbitrum, hardhat, mainnet, optimism, polygon } from "viem/chains";

export function useBalance() {
  const { address, chainId } = useWallet();

  const { data: balance, error, isLoading } = useSWR(
    address ? `balance-${address}-${chainId ?? "unknown"}` : null,
    async () => {
      if (!address) return null;
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
      refreshInterval: 10000,
    }
  );

  const symbol =
    chainId === polygon.id ? polygon.nativeCurrency.symbol :
    chainId === arbitrum.id ? arbitrum.nativeCurrency.symbol :
    chainId === optimism.id ? optimism.nativeCurrency.symbol :
    chainId === hardhat.id ? hardhat.nativeCurrency.symbol :
    chainId === mainnet.id ? mainnet.nativeCurrency.symbol :
    "ETH";

  return { 
    balance, 
    formattedBalance: balance ? parseFloat(balance).toFixed(4) : "0.0000",
    symbol,
    error, 
    isLoading 
  };
}
