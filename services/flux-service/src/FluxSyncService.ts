import { BaseSyncService } from '@oracle-monitor/shared';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import * as chains from 'viem/chains';

import type { PriceData, SupportedChain } from '@oracle-monitor/shared';

// Flux Price Feed ABI (simplified)
const FLUX_FEED_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Flux contract addresses
const FLUX_CONTRACT_ADDRESSES: Record<string, Address> = {
  ethereum: '0x8BAA40e4f7F7F3A4EfF7F4B1F8C8D8E6F7A8B9C0',
  polygon: '0x7A3B3e2F8A9C4D5E6F7A8B9C0D1E2F3A4B5C6D7E',
  arbitrum: '0x6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A',
  optimism: '0x5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4',
  base: '0x4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3',
  avalanche: '0x3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2',
  bsc: '0x2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1',
  fantom: '0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0',
};

// Flux Feed IDs
const FLUX_FEED_IDS: Record<string, string> = {
  'ETH/USD': '0x4554482f55534400000000000000000000000000000000000000000000000000',
  'BTC/USD': '0x4254432f55534400000000000000000000000000000000000000000000000000',
  'AVAX/USD': '0x415641582f555344000000000000000000000000000000000000000000000000',
  'SOL/USD': '0x534f4c2f55534400000000000000000000000000000000000000000000000000',
  'ARB/USD': '0x4152422f55534400000000000000000000000000000000000000000000000000',
  'OP/USD': '0x4f502f5553440000000000000000000000000000000000000000000000000000',
  'MATIC/USD': '0x4d415449432f5553440000000000000000000000000000000000000000000000',
  'BNB/USD': '0x424e422f55534400000000000000000000000000000000000000000000000000',
  'USDC/USD': '0x555344432f555344000000000000000000000000000000000000000000000000',
  'USDT/USD': '0x555344542f555344000000000000000000000000000000000000000000000000',
  'DAI/USD': '0x4441492f55534400000000000000000000000000000000000000000000000000',
  'LINK/USD': '0x4c494e4b2f555344000000000000000000000000000000000000000000000000',
  'UNI/USD': '0x554e492f55534400000000000000000000000000000000000000000000000000',
  'AAVE/USD': '0x414156452f555344000000000000000000000000000000000000000000000000',
};

// Supported feeds per chain
const FLUX_SUPPORTED_SYMBOLS: Record<string, string[]> = {
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

interface FluxConfig {
  contractAddress?: Address;
  feedIds?: Record<string, string>;
  symbols?: string[];
}

export class FluxSyncService extends BaseSyncService {
  private client: ReturnType<typeof createPublicClient> | null = null;
  private fluxConfig: FluxConfig = {};
  private feedDecimals: Map<string, number> = new Map();

  constructor() {
    super({
      serviceName: 'flux-service',
      protocol: 'flux',
    });
  }

  async initialize(
    config: Parameters<typeof BaseSyncService.prototype.initialize>[0],
  ): Promise<void> {
    await super.initialize(config);

    // Parse custom config
    this.fluxConfig = (config.customConfig as FluxConfig) || {};

    // Initialize viem client
    const chain = this.getChainConfig(config.chain as SupportedChain);
    this.client = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });

    // Pre-fetch decimals for all feeds
    await this.prefetchDecimals(config.symbols, config.chain);

    this.logger.info('Flux service initialized', {
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

        const contractAddress = this.getContractAddress();
        const decimals = this.feedDecimals.get(symbol) || 8;

        const roundData = await this.client.readContract({
          address: contractAddress,
          abi: FLUX_FEED_ABI,
          functionName: 'latestRoundData',
        });

        const answer = roundData[1];
        const updatedAt = Number(roundData[3]) * 1000; // Convert to milliseconds
        const price = parseFloat(formatUnits(answer, decimals));

        prices.push({
          symbol,
          price,
          timestamp: updatedAt,
          protocol: 'flux',
          chain: this.config.chain,
          confidence: 0.96,
          source: contractAddress,
        });
      } catch (error) {
        this.logger.error(`Failed to fetch price for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return prices;
  }

  private async prefetchDecimals(symbols: string[], _chain: string): Promise<void> {
    if (!this.client) return;

    const contractAddress = this.getContractAddress();

    for (const symbol of symbols) {
      try {
        const decimals = await this.client.readContract({
          address: contractAddress,
          abi: FLUX_FEED_ABI,
          functionName: 'decimals',
        });
        this.feedDecimals.set(symbol, decimals);
      } catch {
        this.logger.warn(`Failed to fetch decimals for ${symbol}, using default 8`);
        this.feedDecimals.set(symbol, 8);
      }
    }
  }

  private getContractAddress(): Address {
    const chain = this.config?.chain || 'ethereum';
    return this.fluxConfig.contractAddress || FLUX_CONTRACT_ADDRESSES[chain];
  }

  private getSupportedSymbols(): string[] {
    const chain = this.config?.chain || 'ethereum';
    return this.fluxConfig.symbols || FLUX_SUPPORTED_SYMBOLS[chain] || [];
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

  /**
   * Get available feeds for current chain
   */
  getAvailableFeeds(): string[] {
    return this.getSupportedSymbols();
  }

  /**
   * Check if a feed is supported
   */
  isFeedSupported(symbol: string): boolean {
    return this.getSupportedSymbols().includes(symbol);
  }

  /**
   * Get feed ID for a symbol
   */
  getFeedIdForSymbol(symbol: string): string | undefined {
    return this.fluxConfig.feedIds?.[symbol] || FLUX_FEED_IDS[symbol];
  }
}
