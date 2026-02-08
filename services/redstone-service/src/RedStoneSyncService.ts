import { EnhancedSyncService } from '@oracle-monitor/shared';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import * as chains from 'viem/chains';

import type { PriceData, SupportedChain } from '@oracle-monitor/shared';

const REDSTONE_ABI = [
  {
    inputs: [{ name: 'feedId', type: 'bytes32' }],
    name: 'getPrice',
    outputs: [
      { name: 'price', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const REDSTONE_CONTRACT_ADDRESSES: Record<string, Address> = {
  ethereum: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  polygon: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  arbitrum: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  optimism: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  base: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  avalanche: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  bsc: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
  fantom: '0x6E1389D6E59e83B854c59e7eE608F6B8D5F67355',
};

const REDSTONE_FEED_IDS: Record<string, string> = {
  'ETH/USD': '0x4554480000000000000000000000000000000000000000000000000000000000',
  'BTC/USD': '0x4254430000000000000000000000000000000000000000000000000000000000',
  'AVAX/USD': '0x4156415800000000000000000000000000000000000000000000000000000000',
  'SOL/USD': '0x534f4c0000000000000000000000000000000000000000000000000000000000',
  'ARB/USD': '0x4152420000000000000000000000000000000000000000000000000000000000',
  'OP/USD': '0x4f50000000000000000000000000000000000000000000000000000000000000',
  'MATIC/USD': '0x4d41544943000000000000000000000000000000000000000000000000000000',
  'BNB/USD': '0x424e420000000000000000000000000000000000000000000000000000000000',
  'USDC/USD': '0x5553444300000000000000000000000000000000000000000000000000000000',
  'USDT/USD': '0x5553445400000000000000000000000000000000000000000000000000000000',
  'DAI/USD': '0x4441490000000000000000000000000000000000000000000000000000000000',
  'LINK/USD': '0x4c494e4b00000000000000000000000000000000000000000000000000000000',
  'UNI/USD': '0x554e490000000000000000000000000000000000000000000000000000000000',
  'AAVE/USD': '0x4141564500000000000000000000000000000000000000000000000000000000',
};

const REDSTONE_SUPPORTED_SYMBOLS: Record<string, string[]> = {
  ethereum: [
    'ETH/USD',
    'BTC/USD',
    'USDC/USD',
    'USDT/USD',
    'DAI/USD',
    'LINK/USD',
    'UNI/USD',
    'AAVE/USD',
  ],
  polygon: ['MATIC/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
  arbitrum: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'ARB/USD'],
  optimism: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'OP/USD'],
  base: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
  avalanche: ['AVAX/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
  bsc: ['BNB/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
  fantom: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
};

interface RedStoneConfig {
  contractAddress?: Address;
  feedIds?: Record<string, string>;
  symbols?: string[];
}

export class RedStoneSyncService extends EnhancedSyncService {
  private client: ReturnType<typeof createPublicClient> | null = null;
  private redstoneConfig: RedStoneConfig = {};

  constructor() {
    super({
      serviceName: 'redstone-service',
      protocol: 'redstone',
    });
  }

  async initialize(
    config: Parameters<typeof EnhancedSyncService.prototype.initialize>[0],
  ): Promise<void> {
    await super.initialize(config);
    this.redstoneConfig = (config.customConfig as RedStoneConfig) || {};

    const chain = this.getChainConfig(config.chain as SupportedChain);
    this.client = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });

    this.logger.info('RedStone service initialized', {
      chain: config.chain,
      symbols: config.symbols,
    });
  }

  protected async fetchPrices(): Promise<PriceData[]> {
    if (!this.client || !this.config) {
      throw new Error('Service not initialized');
    }

    const prices: PriceData[] = [];
    const supportedSymbols = this.getSupportedSymbols();

    for (const symbol of this.config.symbols) {
      try {
        if (!supportedSymbols.includes(symbol)) {
          this.logger.warn(`Feed ${symbol} not supported on ${this.config.chain}`);
          continue;
        }

        const feedId = this.getFeedId(symbol);
        if (!feedId) {
          this.logger.warn(`No feed ID found for ${symbol}`);
          continue;
        }

        const contractAddress = this.getContractAddress();

        const result = await this.client.readContract({
          address: contractAddress,
          abi: REDSTONE_ABI,
          functionName: 'getPrice',
          args: [feedId as `0x${string}`],
        });

        const priceValue = result[0];
        const timestamp = Number(result[1]) * 1000;
        const price = parseFloat(formatUnits(priceValue, 8));

        prices.push({
          symbol,
          price,
          timestamp,
          protocol: 'redstone',
          chain: this.config.chain,
          confidence: 0.97,
          source: contractAddress,
        });
      } catch (error) {
        this.logger.error(`Failed to fetch price for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    return prices;
  }

  private getContractAddress(): Address {
    const chain = this.config?.chain || 'ethereum';
    return this.redstoneConfig.contractAddress || REDSTONE_CONTRACT_ADDRESSES[chain];
  }

  private getFeedId(symbol: string): string | undefined {
    return this.redstoneConfig.feedIds?.[symbol] || REDSTONE_FEED_IDS[symbol];
  }

  private getSupportedSymbols(): string[] {
    const chain = this.config?.chain || 'ethereum';
    return this.redstoneConfig.symbols || REDSTONE_SUPPORTED_SYMBOLS[chain] || [];
  }

  private getChainConfig(chainName: SupportedChain) {
    const chainMap: Record<string, chains.Chain> = {
      ethereum: chains.mainnet,
      polygon: chains.polygon,
      arbitrum: chains.arbitrum,
      optimism: chains.optimism,
      base: chains.base,
      avalanche: chains.avalanche,
      bsc: chains.bsc,
      fantom: chains.fantom,
    };

    return chainMap[chainName] || chains.mainnet;
  }

  getAvailableFeeds(): string[] {
    return this.getSupportedSymbols();
  }

  isFeedSupported(symbol: string): boolean {
    return this.getSupportedSymbols().includes(symbol);
  }

  getFeedIdForSymbol(symbol: string): string | undefined {
    return this.getFeedId(symbol);
  }
}
