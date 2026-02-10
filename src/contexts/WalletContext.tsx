'use client';

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
  useRef,
  type ReactNode,
} from 'react';

import { createWalletClient, custom, type WalletClient, type Address, type Chain } from 'viem';
import { arbitrum, hardhat, mainnet, optimism, polygon, polygonAmoy } from 'viem/chains';

import { normalizeWalletError } from '@/lib/errors/walletErrors';
import { logger } from '@/lib/logger';

interface WalletState {
  address: Address | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  errorKind: string | null;
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (targetChainId: number) => Promise<void>;
  getWalletClient: (chainIdOverride?: number) => Promise<WalletClient | null>;
  clearError: () => void;
  addNetwork: (targetChainId: number) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

const chainConfigs: Record<number, { name: string; chain: Chain }> = {
  [polygon.id]: { name: 'Polygon', chain: polygon },
  [polygonAmoy.id]: { name: 'Polygon Amoy', chain: polygonAmoy },
  [arbitrum.id]: { name: 'Arbitrum', chain: arbitrum },
  [optimism.id]: { name: 'Optimism', chain: optimism },
  [mainnet.id]: { name: 'Ethereum Mainnet', chain: mainnet },
  [hardhat.id]: { name: 'Hardhat', chain: hardhat },
};

function getChainConfig(chainId: number) {
  return chainConfigs[chainId] || null;
}

function getAddChainParams(targetChainId: number) {
  const config = getChainConfig(targetChainId);
  if (!config) return null;

  const chain = config.chain;
  const rpcUrls = chain.rpcUrls?.default?.http ?? [];
  const blockExplorerUrl = chain.blockExplorers?.default?.url;
  const blockExplorerUrls = blockExplorerUrl ? [blockExplorerUrl] : undefined;

  return {
    chainId: `0x${targetChainId.toString(16)}`,
    chainName: config.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls,
    blockExplorerUrls,
  };
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<string | null>(null);

  const isConnected = useMemo(() => {
    return address !== null && chainId !== null;
  }, [address, chainId]);

  const clearError = useCallback(() => {
    setError(null);
    setErrorKind(null);
  }, []);

  const handleError = useCallback((err: unknown, context: string) => {
    const errorDetail = normalizeWalletError(err);
    setError(errorDetail.userMessage);
    setErrorKind(errorDetail.kind);
    logger.error(`Wallet ${context} failed`, {
      error: err,
      kind: errorDetail.kind,
      userMessage: errorDetail.userMessage,
      recoveryAction: errorDetail.recoveryAction,
    });
  }, []);

  // 使用 ref 存储 handleError 以避免依赖问题
  const handleErrorRef = useRef(handleError);
  handleErrorRef.current = handleError;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const provider = window.ethereum as {
      request: (args: { method: string; params?: unknown }) => Promise<unknown>;
      on?: (event: string, handler: (payload: unknown) => void) => void;
      removeListener?: (event: string, handler: (payload: unknown) => void) => void;
    };

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = Array.isArray(accounts) ? accounts : [];
      const newAddress = typeof accs[0] === 'string' ? (accs[0] as Address) : null;
      setAddress((currentAddress) => {
        if (newAddress !== currentAddress) {
          return newAddress;
        }
        return currentAddress;
      });
      if (accs.length === 0) {
        setChainId(null);
      }
    };

    const handleChainChanged = (id: unknown) => {
      if (typeof id !== 'string') return;
      setChainId(parseInt(id, 16));
    };

    const handleDisconnect = (error: unknown) => {
      // Only log as error if there's an actual error object
      // MetaMask often sends disconnect events when switching chains or accounts, which are not errors
      if (error instanceof Error) {
        logger.error('Wallet disconnect failed', { error });
        handleErrorRef.current(error, 'disconnect');
      } else {
        logger.info('Wallet disconnected', { error });
      }
      setAddress(null);
      setChainId(null);
    };

    provider
      .request({ method: 'eth_accounts' })
      .then((accounts) => {
        handleAccountsChanged(accounts);
        if (accounts && Array.isArray(accounts) && accounts.length > 0) {
          return provider.request({ method: 'eth_chainId' });
        }
        return null;
      })
      .then((id) => {
        if (id) handleChainChanged(id);
      })
      .catch((e) => logger.debug('Wallet auto-connect failed:', e));

    provider.on?.('accountsChanged', handleAccountsChanged);
    provider.on?.('chainChanged', handleChainChanged);
    provider.on?.('disconnect', handleDisconnect);

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged);
      provider.removeListener?.('chainChanged', handleChainChanged);
      provider.removeListener?.('disconnect', handleDisconnect);
    };
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      const errorDetail = normalizeWalletError(new Error('Wallet not found'));
      setError(errorDetail.userMessage);
      setErrorKind(errorDetail.kind);
      return;
    }

    setIsConnecting(true);
    clearError();

    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (accounts && Array.isArray(accounts) && accounts.length > 0) {
        setAddress(accounts[0] as Address);
        const id = (await window.ethereum.request({
          method: 'eth_chainId',
        })) as string;
        setChainId(parseInt(id, 16));
        logger.info('Wallet connected successfully', {
          address: accounts[0],
          chainId: parseInt(id, 16),
        });
      }
    } catch (error: unknown) {
      handleError(error, 'connect');
    } finally {
      setIsConnecting(false);
    }
  }, [clearError, handleError]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    clearError();
    logger.info('Wallet disconnected by user');
  }, [clearError]);

  const switchChain = useCallback(
    async (targetChainId: number) => {
      if (typeof window === 'undefined' || !window.ethereum) {
        handleError(new Error('Wallet not found'), 'switchChain');
        return;
      }

      clearError();

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
        setChainId(targetChainId);
        logger.info('Chain switched successfully', { targetChainId });
      } catch (err: unknown) {
        const errorDetail = normalizeWalletError(err);
        if (errorDetail.kind === 'CHAIN_NOT_ADDED' && errorDetail.code === 4902) {
          throw err;
        }
        handleError(err, 'switchChain');
      }
    },
    [clearError, handleError],
  );

  const addNetwork = useCallback(
    async (targetChainId: number) => {
      if (typeof window === 'undefined' || !window.ethereum) {
        handleError(new Error('Wallet not found'), 'addNetwork');
        return;
      }

      clearError();

      const chainParams = getAddChainParams(targetChainId);
      if (!chainParams) {
        handleError(new Error(`Unsupported chain: ${targetChainId}`), 'addNetwork');
        return;
      }

      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [chainParams],
        });
        setChainId(targetChainId);
        logger.info('Network added successfully', { targetChainId });
      } catch (error: unknown) {
        handleError(error, 'addNetwork');
      }
    },
    [clearError, handleError],
  );

  const getWalletClient = useCallback(
    async (chainIdOverride?: number) => {
      if (typeof window === 'undefined' || !window.ethereum || !address) {
        return null;
      }

      const targetChainId = chainIdOverride ?? chainId;
      const chainConfig = targetChainId ? getChainConfig(targetChainId) : null;
      const chain = chainConfig?.chain || polygon;

      return createWalletClient({
        account: address,
        chain,
        transport: custom(window.ethereum),
      });
    },
    [address, chainId],
  );

  const value: WalletContextType = useMemo(
    () => ({
      address,
      chainId,
      isConnecting,
      isConnected,
      error,
      errorKind,
      connect,
      disconnect,
      switchChain,
      getWalletClient,
      clearError,
      addNetwork,
    }),
    [
      address,
      chainId,
      isConnecting,
      isConnected,
      error,
      errorKind,
      connect,
      disconnect,
      switchChain,
      getWalletClient,
      clearError,
      addNetwork,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
