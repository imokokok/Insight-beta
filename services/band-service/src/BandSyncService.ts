import { EnhancedSyncService } from '@oracle-monitor/shared';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import * as chains from 'viem/chains';

import type { PriceData, SupportedChain } from '@oracle-monitor/shared';

// Band Protocol Oracle ABI
const BAND_ORACLE_ABI = [
  {
    inputs: [
      { name: 'symbols', type: 'string[]' },
      { name: 'minCount', type: 'uint256' },
      { name: 'askCount', type: 'uint256' },
    ],
    name: 'getReferenceDataBulk',
    outputs: [
      {
        components: [
          { name: 'rate', type: 'uint256' },
          { name: 'lastUpdatedBase', type: 'uint256' },
          { name: 'lastUpdatedQuote', type: 'uint256' },
        ],
        name: 'data',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Band Protocol contract addresses
const BAND_CONTRACT_ADDRESSES: Record<string, Address> = {
  ethereum: '0xD71F8C5eaE1CFc53c9F98D1A30dE6a6f1C3F4B5A',
  polygon: '0xE82F8eD8a1C6C3F4a5B7D9E0A2C4F6B8D0E1A3C5',
  arbitrum: '0xF93A0eD9a1D7B4C5E6F8A0B2D4E6F8A0B2D4E6F8',
  optimism: '0xA0B2C4D6E8F0A2C4D6E8F0A2C4D6E8F0A2C4D6E8',
  base: '0xB1C3D5E7F9A1C3D5E7F9A1C3D5E7F9A1C3D5E7F9',
  avalanche: '0xC2D4E6F8A0C2D4E6F8A0C2D4E6F8A0C2D4E6F8A0',
  bsc: '0xD3E5F7A1B3D5E7F9A1B3D5E7F9A1B3D5E7F9A1B3',
  fantom: '0xE4F6A2C4E6F8A0B2D4E6F8A0B2D4E6F8A0B2D4E6',
};

// Supported symbols per chain
const BAND_SUPPORTED_SYMBOLS: Record<string, string[]> = {
  ethereum: [
    'BTC/USD',
    'ETH/USD',
    'LINK/USD',
    'DAI/USD',
    'USDC/USD',
    'USDT/USD',
    'AAVE/USD',
    'UNI/USD',
    'MKR/USD',
    'SNX/USD',
  ],
  polygon: ['MATIC/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'AAVE/USD'],
  arbitrum: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'ARB/USD', 'LINK/USD'],
  optimism: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'OP/USD', 'LINK/USD'],
  base: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'LINK/USD'],
  avalanche: ['AVAX/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'LINK/USD'],
  bsc: ['BNB/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'CAKE/USD'],
  fantom: ['FTM/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD'],
};

interface BandConfig {
  contractAddress?: Address;
  minCount?: number;
  askCount?: number;
  symbols?: string[];
}

// BandPriceData interface removed - not used

export class BandSyncService extends EnhancedSyncService {
  private client: ReturnType<typeof createPublicClient> | null = null;
  private bandConfig: BandConfig = {};

  constructor() {
    super({
      serviceName: 'band-service',
      protocol: 'band',
    });
  }

  async initialize(
    config: Parameters<typeof EnhancedSyncService.prototype.initialize>[0],
  ): Promise<void> {
    await super.initialize(config);

    // Parse custom config
    this.bandConfig = (config.customConfig as BandConfig) || {};
    this.bandConfig.minCount = this.bandConfig.minCount || 3;
    this.bandConfig.askCount = this.bandConfig.askCount || 4;

    // Initialize viem client
    const chain = this.getChainConfig(config.chain as SupportedChain);
    this.client = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });

    this.logger.info('Band service initialized', {
      chain: config.chain,
      symbols: config.symbols,
      minCount: this.bandConfig.minCount,
      askCount: this.bandConfig.askCount,
    });
  }

  protected async fetchPrices(): Promise<PriceData[]> {
    if (!this.client || !this.config) {
      throw new Error('Service not initialized');
    }

    const prices: PriceData[] = [];
    const symbolsToFetch = this.bandConfig.symbols || this.config.symbols;
    const supportedSymbols = this.getSupportedSymbols();

    // Filter supported symbols
    const validSymbols = symbolsToFetch.filter((symbol) => {
      if (!supportedSymbols.includes(symbol)) {
        this.logger.warn(`Symbol ${symbol} not supported on ${this.config?.chain}`);
        return false;
      }
      return true;
    });

    if (validSymbols.length === 0) {
      this.logger.warn('No valid symbols to fetch');
      return prices;
    }

    try {
      const contractAddress = this.getContractAddress();

      // Batch fetch all prices
      const results = await this.client.readContract({
        address: contractAddress,
        abi: BAND_ORACLE_ABI,
        functionName: 'getReferenceDataBulk',
        args: [
          validSymbols,
          BigInt(this.bandConfig.minCount ?? 3),
          BigInt(this.bandConfig.askCount ?? 5),
        ],
      });

      for (let i = 0; i < validSymbols.length; i++) {
        const symbol = validSymbols[i];
        const data = results[i];

        if (!data) {
          this.logger.warn(`No data returned for ${symbol}`);
          continue;
        }

        const price = parseFloat(formatUnits(data.rate, 18));
        const timestamp = Number(data.lastUpdatedBase) * 1000;

        prices.push({
          symbol,
          price,
          timestamp,
          protocol: 'band',
          chain: this.config.chain,
          confidence: 0.92,
          source: contractAddress,
        });
      }
    } catch (error) {
      this.logger.error('Failed to fetch prices from Band Protocol', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    return prices;
  }

  private getContractAddress(): Address {
    const chain = this.config?.chain || 'ethereum';
    return this.bandConfig.contractAddress || BAND_CONTRACT_ADDRESSES[chain];
  }

  private getSupportedSymbols(): string[] {
    const chain = this.config?.chain || 'ethereum';
    return this.bandConfig.symbols || BAND_SUPPORTED_SYMBOLS[chain] || [];
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
   * Get available symbols for current chain
   */
  getAvailableSymbols(): string[] {
    return this.getSupportedSymbols();
  }

  /**
   * Check if a symbol is supported
   */
  isSymbolSupported(symbol: string): boolean {
    return this.getSupportedSymbols().includes(symbol);
  }
}
