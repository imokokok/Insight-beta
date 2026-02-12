'use client';

import { type Address, type Chain } from 'viem';
import { mainnet, polygon, arbitrum, optimism, polygonAmoy, hardhat } from 'viem/chains';

// WalletConnect Project ID
// 注意：需要在 https://cloud.walletconnect.com 申请
export const WALLET_CONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

// 支持的链
export const SUPPORTED_CHAINS: Chain[] = [
  mainnet,
  polygon,
  arbitrum,
  optimism,
  polygonAmoy,
  hardhat,
];

// 钱包连接类型
export type WalletConnectionType = 'browser' | 'walletconnect';

// Ethereum Provider 类型
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EthereumProviderType = any;

// 钱包提供者接口
export interface WalletProvider {
  type: WalletConnectionType;
  address: Address | null;
  chainId: number | null;
  provider: unknown;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchChain: (chainId: number) => Promise<void>;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

// WalletConnect 提供者类
export class WalletConnectProvider implements WalletProvider {
  type: WalletConnectionType = 'walletconnect';
  address: Address | null = null;
  chainId: number | null = null;
  private ethereumProvider: EthereumProviderType | null = null;
  private eventHandlers: Map<string, ((payload: unknown) => void)[]> = new Map();

  get provider(): EthereumProviderType | null {
    return this.ethereumProvider;
  }

  async initialize(): Promise<void> {
    if (!WALLET_CONNECT_PROJECT_ID) {
      throw new Error('WalletConnect Project ID is not configured');
    }

    const { EthereumProvider } = await import('@walletconnect/ethereum-provider');

    this.ethereumProvider = await EthereumProvider.init({
      projectId: WALLET_CONNECT_PROJECT_ID,
      chains: [polygon.id], // 默认链
      optionalChains: SUPPORTED_CHAINS.map((c) => c.id).filter((id) => id !== polygon.id),
      showQrModal: true,
      methods: ['eth_sendTransaction', 'eth_sign', 'personal_sign', 'eth_signTypedData'],
      optionalMethods: ['wallet_switchEthereumChain', 'wallet_addEthereumChain'],
      events: ['chainChanged', 'accountsChanged'],
      optionalEvents: ['connect', 'disconnect'],
      metadata: {
        name: 'Insight Beta - Oracle Monitoring Platform',
        description: 'Universal Oracle Monitoring Platform',
        url: typeof window !== 'undefined' ? window.location.origin : '',
        icons: [
          typeof window !== 'undefined'
            ? `${window.location.origin}/icons/icon-192x192.png`
            : '',
        ],
      },
    });

    // 监听事件
    this.ethereumProvider.on('accountsChanged', (accounts: string[]) => {
      this.address = accounts[0] as Address || null;
      this.emit('accountsChanged', accounts);
    });

    this.ethereumProvider.on('chainChanged', (chainId: string) => {
      this.chainId = parseInt(chainId, 16);
      this.emit('chainChanged', chainId);
    });

    this.ethereumProvider.on('disconnect', (error: unknown) => {
      this.address = null;
      this.chainId = null;
      this.emit('disconnect', error);
    });

    // 检查是否已有会话
    if (this.ethereumProvider.session) {
      const accounts = this.ethereumProvider.accounts;
      const chainId = this.ethereumProvider.chainId;
      this.address = accounts[0] as Address || null;
      this.chainId = chainId;
    }
  }

  async connect(): Promise<void> {
    if (!this.ethereumProvider) {
      await this.initialize();
    }

    if (!this.ethereumProvider) {
      throw new Error('Failed to initialize WalletConnect provider');
    }

    await this.ethereumProvider.enable();

    const accounts = this.ethereumProvider.accounts;
    const chainId = this.ethereumProvider.chainId;

    this.address = accounts[0] as Address || null;
    this.chainId = chainId;
  }

  async disconnect(): Promise<void> {
    if (this.ethereumProvider) {
      await this.ethereumProvider.disconnect();
      this.address = null;
      this.chainId = null;
    }
  }

  async switchChain(targetChainId: number): Promise<void> {
    if (!this.ethereumProvider) {
      throw new Error('WalletConnect provider not initialized');
    }

    try {
      await this.ethereumProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error: unknown) {
      // 如果链未添加，尝试添加
      const err = error as { code?: number };
      if (err.code === 4902) {
        await this.addChain(targetChainId);
      } else {
        throw error;
      }
    }
  }

  private async addChain(chainId: number): Promise<void> {
    if (!this.ethereumProvider) return;

    const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    const params = {
      chainId: `0x${chainId.toString(16)}`,
      chainName: chain.name,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: chain.rpcUrls.default.http,
      blockExplorerUrls: chain.blockExplorers?.default?.url
        ? [chain.blockExplorers.default.url]
        : undefined,
    };

    await this.ethereumProvider.request({
      method: 'wallet_addEthereumChain',
      params: [params],
    });
  }

  async request(args: { method: string; params?: unknown[] }): Promise<unknown> {
    if (!this.ethereumProvider) {
      throw new Error('WalletConnect provider not initialized');
    }
    return this.ethereumProvider.request(args);
  }

  // 事件监听
  on(event: string, handler: (payload: unknown) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }

  off(event: string, handler: (payload: unknown) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, payload: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(payload));
    }
  }
}

// 检测是否在移动端
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

// 检测是否在钱包浏览器中
export function isWalletBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ethereum = window.ethereum;
  if (!ethereum) return false;
  return !!(ethereum.isMetaMask || ethereum.isPhantom || ethereum.isBraveWallet);
}

// 获取推荐的钱包连接类型
export function getRecommendedConnectionType(): WalletConnectionType {
  if (isWalletBrowser()) {
    return 'browser';
  }
  return 'walletconnect';
}

// 获取钱包名称
export function getWalletName(): string {
  if (typeof window === 'undefined') return 'Unknown';
  const ethereum = window.ethereum;
  if (!ethereum) return 'Unknown';
  if (ethereum.isPhantom) return 'Phantom';
  if (ethereum.isBraveWallet) return 'Brave Wallet';
  if (ethereum.isMetaMask) return 'MetaMask';
  return 'Browser Wallet';
}


