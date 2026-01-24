"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import {
  createWalletClient,
  custom,
  type WalletClient,
  type Address,
} from "viem";
import {
  arbitrum,
  hardhat,
  mainnet,
  optimism,
  polygon,
  polygonAmoy,
} from "viem/chains";
import { logger } from "@/lib/logger";

interface WalletContextType {
  address: Address | null;
  chainId: number | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (targetChainId: number) => Promise<void>;
  getWalletClient: (chainIdOverride?: number) => Promise<WalletClient | null>;
}

const WalletContext = createContext<WalletContextType | null>(null);

function getAddChainParams(targetChainId: number) {
  const chain =
    targetChainId === polygon.id
      ? polygon
      : targetChainId === polygonAmoy.id
        ? polygonAmoy
        : targetChainId === arbitrum.id
          ? arbitrum
          : targetChainId === optimism.id
            ? optimism
            : targetChainId === hardhat.id
              ? hardhat
              : targetChainId === mainnet.id
                ? mainnet
                : undefined;

  if (!chain) return null;

  const rpcUrls = chain.rpcUrls?.default?.http ?? [];
  const blockExplorerUrl = chain.blockExplorers?.default?.url;
  const blockExplorerUrls = blockExplorerUrl ? [blockExplorerUrl] : undefined;

  return {
    chainId: `0x${targetChainId.toString(16)}`,
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls,
    blockExplorerUrls,
  };
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const provider = window.ethereum as {
      request: (args: { method: string; params?: unknown }) => Promise<unknown>;
      on?: (event: string, handler: (payload: unknown) => void) => void;
      removeListener?: (
        event: string,
        handler: (payload: unknown) => void,
      ) => void;
    };

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = Array.isArray(accounts) ? accounts : [];
      const newAddress =
        typeof accs[0] === "string" ? (accs[0] as Address) : null;
      setAddress((currentAddress) => {
        if (newAddress !== currentAddress) {
          return newAddress;
        }
        return currentAddress;
      });
    };

    const handleChainChanged = (id: unknown) => {
      if (typeof id !== "string") return;
      setChainId(parseInt(id, 16));
    };

    provider
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        handleAccountsChanged(accounts);
        return provider.request({ method: "eth_chainId" });
      })
      .then((id) => handleChainChanged(id))
      .catch((e) => logger.debug("wallet auto-connect failed:", e));

    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("Wallet not found. Please install MetaMask or Rabby.");
    }

    setIsConnecting(true);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (accounts && Array.isArray(accounts) && accounts.length > 0) {
        setAddress(accounts[0] as Address);
        const id = (await window.ethereum.request({
          method: "eth_chainId",
        })) as string;
        setChainId(parseInt(id, 16));
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
  }, []);

  const switchChain = useCallback(async (targetChainId: number) => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("Wallet not found. Please install MetaMask or Rabby.");
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? (err as { code?: unknown }).code
          : undefined;
      if (code !== 4902) throw err;

      const params = getAddChainParams(targetChainId);
      if (!params) throw err;

      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [params],
      });

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    }
    const id = (await window.ethereum.request({
      method: "eth_chainId",
    })) as string;
    setChainId(parseInt(id, 16));
  }, []);

  const getWalletClient = useCallback(
    async (chainIdOverride?: number): Promise<WalletClient | null> => {
      if (!address || typeof window === "undefined" || !window.ethereum)
        return null;
      const effectiveChainId = chainIdOverride ?? chainId;
      const chain =
        effectiveChainId === polygon.id
          ? polygon
          : effectiveChainId === polygonAmoy.id
            ? polygonAmoy
            : effectiveChainId === arbitrum.id
              ? arbitrum
              : effectiveChainId === optimism.id
                ? optimism
                : effectiveChainId === hardhat.id
                  ? hardhat
                  : effectiveChainId === mainnet.id
                    ? mainnet
                    : undefined;
      return createWalletClient({
        account: address,
        chain,
        transport: custom(window.ethereum),
      });
    },
    [address, chainId],
  );

  const contextValue = useMemo(
    () => ({
      address,
      chainId,
      isConnecting,
      connect,
      disconnect,
      switchChain,
      getWalletClient,
    }),
    [
      address,
      chainId,
      isConnecting,
      connect,
      disconnect,
      switchChain,
      getWalletClient,
    ],
  );

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}
