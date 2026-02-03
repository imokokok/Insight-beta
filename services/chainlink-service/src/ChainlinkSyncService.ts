import type { PriceData, SupportedChain } from '@oracle-monitor/shared';
import { BaseSyncService } from '@oracle-monitor/shared';
import { createPublicClient, http, formatUnits } from 'viem';
import * as chains from 'viem/chains';

// Chainlink Price Feed ABI (simplified)
const PRICE_FEED_ABI = [
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
  {
    inputs: [],
    name: 'description',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Chainlink feed addresses for different chains
const FEED_ADDRESSES: Record<string, Record<string, string>> = {
  ethereum: {
    'ETH/USD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    'BTC/USD': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    'LINK/USD': '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
    'MATIC/USD': '0x7bAC85A8a73A2B3aD82b0Ef45A3D8d2C1E2B8C4A',
    'AVAX/USD': '0xFF3EEb22B5E3dE6e705b44749C2559d704923FD7',
  },
  polygon: {
    'ETH/USD': '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    'BTC/USD': '0xc907E116054Ad103354f2D33FD1d5D0Ad9D9f9f9',
    'LINK/USD': '0xd9FFdb71EbE7496cC440152d43986Aae0AB76665',
    'MATIC/USD': '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
  },
  arbitrum: {
    'ETH/USD': '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    'BTC/USD': '0x6ce185860a4963106506C203335A2910413708e9',
    'LINK/USD': '0x86E53CF1B870786351Da77A57575e79CB55812CB',
  },
};

interface ChainlinkConfig {
  feeds?: Record<string, string>;
  confirmations?: number;
}

export class ChainlinkSyncService extends BaseSyncService {
  private client: ReturnType<typeof createPublicClient> | null = null;
  private feedDecimals: Map<string, number> = new Map();
  private chainlinkConfig: ChainlinkConfig = {};

  constructor() {
    super({
      serviceName: 'chainlink-service',
      protocol: 'chainlink',
    });
  }

  async initialize(
    config: Parameters<typeof BaseSyncService.prototype.initialize>[0],
  ): Promise<void> {
    await super.initialize(config);

    // Parse custom config
    this.chainlinkConfig = (config.customConfig as ChainlinkConfig) || {};

    // Initialize viem client
    const chain = this.getChainConfig(config.chain as SupportedChain);
    this.client = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });

    // Pre-fetch decimals for all feeds
    await this.prefetchDecimals(config.symbols, config.chain);

    this.logger.info('Chainlink service initialized', {
      chain: config.chain,
      symbols: config.symbols,
    });
  }

  protected async fetchPrices(): Promise<PriceData[]> {
    if (!this.client || !this.config) {
      throw new Error('Service not initialized');
    }

    const prices: PriceData[] = [];
    const feeds = this.getFeedAddresses();

    for (const symbol of this.config.symbols) {
      try {
        const feedAddress = feeds[symbol];
        if (!feedAddress) {
          this.logger.warn(`No feed address for ${symbol}`);
          continue;
        }

        const roundData = await this.client.readContract({
          address: feedAddress as `0x${string}`,
          abi: PRICE_FEED_ABI,
          functionName: 'latestRoundData',
        });

        const decimals = this.feedDecimals.get(symbol) || 8;
        const price = parseFloat(formatUnits(roundData[1], decimals));

        prices.push({
          symbol,
          price,
          timestamp: Date.now(),
          protocol: 'chainlink',
          chain: this.config.chain,
          confidence: 0.95,
          source: feedAddress,
        });
      } catch (error) {
        this.logger.error(`Failed to fetch price for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return prices;
  }

  private getFeedAddresses(): Record<string, string> {
    const chain = this.config?.chain || 'ethereum';
    const defaultFeeds = FEED_ADDRESSES[chain] || {};
    return { ...defaultFeeds, ...(this.chainlinkConfig.feeds || {}) };
  }

  private async prefetchDecimals(symbols: string[], _chain: string): Promise<void> {
    if (!this.client) return;

    const feeds = this.getFeedAddresses();

    for (const symbol of symbols) {
      const feedAddress = feeds[symbol];
      if (!feedAddress) continue;

      try {
        const decimals = await this.client.readContract({
          address: feedAddress as `0x${string}`,
          abi: PRICE_FEED_ABI,
          functionName: 'decimals',
        });
        this.feedDecimals.set(symbol, decimals);
      } catch {
        this.logger.warn(`Failed to fetch decimals for ${symbol}, using default 8`);
        this.feedDecimals.set(symbol, 8);
      }
    }
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
}
