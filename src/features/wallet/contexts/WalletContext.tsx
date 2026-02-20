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

import {
  WalletConnectProvider,
  isMobile,
  isWalletBrowser,
  getRecommendedConnectionType,
  getWalletName,
  WALLET_CONNECT_PROJECT_ID,
} from '@/lib/blockchain/walletConnect';
import { normalizeWalletError } from '@/lib/errors';
import { logger } from '@/shared/logger';

export type WalletConnectionType = 'browser' | 'walletconnect';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown }) => Promise<unknown>;
      on?: (event: string, handler: (payload: unknown) => void) => void;
      removeListener?: (event: string, handler: (payload: unknown) => void) => void;
      isMetaMask?: boolean;
      isPhantom?: boolean;
      isBraveWallet?: boolean;
      isCoinbaseWallet?: boolean;
    };
  }
}

export interface WalletState {
  address: Address | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  errorKind: string | null;
  connectionType: WalletConnectionType | null;
  walletName: string | null;
}

export interface WalletActions {
  connect: (type?: WalletConnectionType) => Promise<void>;
  disconnect: () => void;
  switchChain: (targetChainId: number) => Promise<void>;
  getWalletClient: (chainIdOverride?: number) => Promise<WalletClient | null>;
  clearError: () => void;
  addNetwork: (targetChainId: number) => Promise<void>;
}

export interface WalletStatic {
  isMobile: boolean;
  isWalletBrowser: boolean;
  recommendedConnectionType: WalletConnectionType;
  hasBrowserWallet: boolean;
  hasWalletConnect: boolean;
}

type WalletStateContextType = WalletState;
type WalletActionsContextType = WalletActions;
type WalletStaticContextType = WalletStatic;

const WalletStateContext = createContext<WalletStateContextType | null>(null);
const WalletActionsContext = createContext<WalletActionsContextType | null>(null);
const WalletStaticContext = createContext<WalletStaticContextType | null>(null);

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

export function useWalletState() {
  const context = useContext(WalletStateContext);
  if (!context) {
    throw new Error('useWalletState must be used within WalletProvider');
  }
  return context;
}

export function useWalletActions() {
  const context = useContext(WalletActionsContext);
  if (!context) {
    throw new Error('useWalletActions must be used within WalletProvider');
  }
  return context;
}

export function useWalletStatic() {
  const context = useContext(WalletStaticContext);
  if (!context) {
    throw new Error('useWalletStatic must be used within WalletProvider');
  }
  return context;
}

export function useWallet() {
  const state = useWalletState();
  const actions = useWalletActions();
  const static_ = useWalletStatic();
  return { ...state, ...static_, ...actions };
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
  const [connectionType, setConnectionType] = useState<WalletConnectionType | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);

  const wcProviderRef = useRef<WalletConnectProvider | null>(null);

  const isConnected = address !== null && chainId !== null;

  const hasBrowserWallet = typeof window !== 'undefined' && !!window.ethereum;
  const hasWalletConnect = !!WALLET_CONNECT_PROJECT_ID;
  const recommendedConnectionType = getRecommendedConnectionType();

  const staticValue = useMemo<WalletStatic>(
    () => ({
      isMobile: isMobile(),
      isWalletBrowser: isWalletBrowser(),
      recommendedConnectionType,
      hasBrowserWallet,
      hasWalletConnect,
    }),
    [recommendedConnectionType, hasBrowserWallet, hasWalletConnect],
  );

  const stateValue = useMemo<WalletState>(
    () => ({
      address,
      chainId,
      isConnecting,
      isConnected,
      error,
      errorKind,
      connectionType,
      walletName,
    }),
    [address, chainId, isConnecting, isConnected, error, errorKind, connectionType, walletName],
  );

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
        setConnectionType(null);
        setWalletName(null);
      }
    };

    const handleChainChanged = (id: unknown) => {
      if (typeof id !== 'string') return;
      setChainId(parseInt(id, 16));
    };

    const handleDisconnect = (error: unknown) => {
      if (error instanceof Error) {
        logger.error('Wallet disconnect failed', { error });
        handleErrorRef.current(error, 'disconnect');
      } else {
        logger.info('Wallet disconnected', { error });
      }
      setAddress(null);
      setChainId(null);
      setConnectionType(null);
      setWalletName(null);
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

  useEffect(() => {
    const restoreWCSession = async () => {
      if (!WALLET_CONNECT_PROJECT_ID) return;
      if (connectionType === 'browser') return;

      try {
        const provider = new WalletConnectProvider();
        await provider.initialize();

        if (provider.address) {
          wcProviderRef.current = provider;
          setAddress(provider.address);
          setChainId(provider.chainId);
          setConnectionType('walletconnect');
          setWalletName('WalletConnect');
          logger.info('WalletConnect session restored', {
            address: provider.address,
            chainId: provider.chainId,
          });
        }
      } catch (e) {
        logger.debug('WalletConnect session restore failed:', { error: e });
      }
    };

    restoreWCSession();
  }, [connectionType]);

  const connectBrowserWallet = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      const errorDetail = normalizeWalletError(new Error('Wallet not found'));
      setError(errorDetail.userMessage);
      setErrorKind(errorDetail.kind);
      return;
    }

    const accounts = (await window.ethereum.request({
      method: 'eth_requestAccounts',
    })) as string[];

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      throw new Error('User rejected connection request');
    }

    const newAddress = accounts[0] as Address;
    const id = (await window.ethereum.request({
      method: 'eth_chainId',
    })) as string;
    const newChainId = parseInt(id, 16);

    setAddress(newAddress);
    setChainId(newChainId);
    setConnectionType('browser');
    setWalletName(getWalletName());

    logger.info('Browser wallet connected', {
      address: newAddress,
      chainId: newChainId,
      walletName: getWalletName(),
    });
  }, []);

  const connectWalletConnect = useCallback(async () => {
    if (!WALLET_CONNECT_PROJECT_ID) {
      throw new Error('WalletConnect Project ID is not configured');
    }

    const provider = new WalletConnectProvider();
    await provider.initialize();
    await provider.connect();

    wcProviderRef.current = provider;
    setAddress(provider.address);
    setChainId(provider.chainId);
    setConnectionType('walletconnect');
    setWalletName('WalletConnect');

    provider.on('accountsChanged', (accounts: unknown) => {
      const accs = Array.isArray(accounts) ? accounts : [];
      setAddress((accs[0] as Address) || null);
      if (accs.length === 0) {
        setChainId(null);
        setConnectionType(null);
        setWalletName(null);
      }
    });

    provider.on('chainChanged', (chainId: unknown) => {
      if (typeof chainId === 'string') {
        setChainId(parseInt(chainId, 16));
      }
    });

    provider.on('disconnect', () => {
      setAddress(null);
      setChainId(null);
      setConnectionType(null);
      setWalletName(null);
      wcProviderRef.current = null;
    });

    logger.info('WalletConnect connected', {
      address: provider.address,
      chainId: provider.chainId,
    });
  }, []);

  const connect = useCallback(
    async (type?: WalletConnectionType) => {
      setIsConnecting(true);
      clearError();

      const connectionMethod = type || recommendedConnectionType;

      try {
        if (connectionMethod === 'browser' && hasBrowserWallet) {
          await connectBrowserWallet();
        } else if (hasWalletConnect) {
          await connectWalletConnect();
        } else if (hasBrowserWallet) {
          await connectBrowserWallet();
        } else {
          throw new Error('No wallet connection method available');
        }
      } catch (error: unknown) {
        handleError(error, 'connect');
      } finally {
        setIsConnecting(false);
      }
    },
    [
      clearError,
      recommendedConnectionType,
      hasBrowserWallet,
      hasWalletConnect,
      connectBrowserWallet,
      connectWalletConnect,
      handleError,
    ],
  );

  const disconnect = useCallback(async () => {
    if (connectionType === 'walletconnect' && wcProviderRef.current) {
      await wcProviderRef.current.disconnect();
      wcProviderRef.current = null;
    }

    setAddress(null);
    setChainId(null);
    setConnectionType(null);
    setWalletName(null);
    clearError();
    logger.info('Wallet disconnected by user');
  }, [connectionType, clearError]);

  const switchChain = useCallback(
    async (targetChainId: number) => {
      clearError();

      try {
        if (connectionType === 'walletconnect' && wcProviderRef.current) {
          await wcProviderRef.current.switchChain(targetChainId);
          setChainId(targetChainId);
        } else if (typeof window !== 'undefined' && window.ethereum) {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          });
          setChainId(targetChainId);
        } else {
          throw new Error('No wallet provider available');
        }

        logger.info('Chain switched successfully', { targetChainId });
      } catch (err: unknown) {
        const errorDetail = normalizeWalletError(err);
        if (errorDetail.kind === 'CHAIN_NOT_ADDED' && errorDetail.code === 4902) {
          throw err;
        }
        handleError(err, 'switchChain');
      }
    },
    [connectionType, clearError, handleError],
  );

  const addNetwork = useCallback(
    async (targetChainId: number) => {
      clearError();

      const chainParams = getAddChainParams(targetChainId);
      if (!chainParams) {
        handleError(new Error(`Unsupported chain: ${targetChainId}`), 'addNetwork');
        return;
      }

      try {
        if (connectionType === 'walletconnect' && wcProviderRef.current) {
          await wcProviderRef.current.request({
            method: 'wallet_addEthereumChain',
            params: [chainParams],
          });
        } else if (typeof window !== 'undefined' && window.ethereum) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [chainParams],
          });
        } else {
          throw new Error('No wallet provider available');
        }

        setChainId(targetChainId);
        logger.info('Network added successfully', { targetChainId });
      } catch (error: unknown) {
        handleError(error, 'addNetwork');
      }
    },
    [connectionType, clearError, handleError],
  );

  const getWalletClient = useCallback(
    async (chainIdOverride?: number) => {
      if (!address) {
        return null;
      }

      const targetChainId = chainIdOverride ?? chainId;
      const chainConfig = targetChainId ? getChainConfig(targetChainId) : null;
      const selectedChain = chainConfig?.chain || polygon;

      if (connectionType === 'walletconnect' && wcProviderRef.current) {
        return createWalletClient({
          account: address,
          chain: selectedChain,
          transport: custom(wcProviderRef.current.provider!),
        });
      }

      if (typeof window !== 'undefined' && window.ethereum) {
        return createWalletClient({
          account: address,
          chain: selectedChain,
          transport: custom(window.ethereum),
        });
      }

      return null;
    },
    [address, chainId, connectionType],
  );

  const actionsValue = useMemo<WalletActions>(
    () => ({
      connect,
      disconnect,
      switchChain,
      getWalletClient,
      clearError,
      addNetwork,
    }),
    [connect, disconnect, switchChain, getWalletClient, clearError, addNetwork],
  );

  return (
    <WalletStaticContext.Provider value={staticValue}>
      <WalletStateContext.Provider value={stateValue}>
        <WalletActionsContext.Provider value={actionsValue}>
          {children}
        </WalletActionsContext.Provider>
      </WalletStateContext.Provider>
    </WalletStaticContext.Provider>
  );
}
