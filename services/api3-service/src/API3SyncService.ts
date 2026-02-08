import { EnhancedSyncService } from '@oracle-monitor/shared';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import * as chains from 'viem/chains';

import type { PriceData, SupportedChain } from '@oracle-monitor/shared';

// API3 dAPI Server ABI
const DAPI_ABI = [
  {
    inputs: [{ name: 'dapiNameHash', type: 'bytes32' }],
    name: 'readDataFeedWithDapiNameHash',
    outputs: [
      { name: 'value', type: 'int224' },
      { name: 'timestamp', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// API3 dAPI Server addresses
const API3_DAPI_SERVER_ADDRESSES: Record<string, Address> = {
  ethereum: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  polygon: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  arbitrum: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  optimism: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  base: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  avalanche: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  bsc: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
  fantom: '0x9EB9798Dc1b602067DFe5C6A463dBae0D60c67fE',
};

// Supported dAPIs per chain
const API3_SUPPORTED_DAPIS: Record<string, string[]> = {
  ethereum: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'DAI/USD', 'LINK/USD'],
  polygon: ['MATIC/USD', 'ETH/USD', 'BTC/USD', 'USDC/USD'],
  arbitrum: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'ARB/USD'],
  optimism: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'OP/USD'],
  base: ['ETH/USD', 'BTC/USD', 'USDC/USD'],
  avalanche: ['AVAX/USD', 'ETH/USD', 'BTC/USD'],
  bsc: ['BNB/USD', 'ETH/USD', 'BTC/USD'],
  fantom: ['FTM/USD', 'ETH/USD', 'BTC/USD'],
};

interface API3Config {
  dapiServerAddress?: Address;
  dapis?: string[];
}

export class API3SyncService extends EnhancedSyncService {
  private client: ReturnType<typeof createPublicClient> | null = null;
  private api3Config: API3Config = {};

  constructor() {
    super({
      serviceName: 'api3-service',
      protocol: 'api3',
    });
  }

  async initialize(
    config: Parameters<typeof EnhancedSyncService.prototype.initialize>[0],
  ): Promise<void> {
    await super.initialize(config);

    // Parse custom config
    this.api3Config = (config.customConfig as API3Config) || {};

    // Initialize viem client
    const chain = this.getChainConfig(config.chain as SupportedChain);
    this.client = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });

    this.logger.info('API3 service initialized', {
      chain: config.chain,
      symbols: config.symbols,
    });
  }

  protected async fetchPrices(): Promise<PriceData[]> {
    if (!this.client || !this.config) {
      throw new Error('Service not initialized');
    }

    const prices: PriceData[] = [];
    const dapis = this.getDapiList();

    for (const symbol of this.config.symbols) {
      try {
        if (!dapis.includes(symbol)) {
          this.logger.warn(`dAPI ${symbol} not supported on ${this.config.chain}`);
          continue;
        }

        const dapiNameHash = this.encodeDapiName(symbol);
        const dapiServerAddress = this.getDapiServerAddress();

        const result = await this.client.readContract({
          address: dapiServerAddress,
          abi: DAPI_ABI,
          functionName: 'readDataFeedWithDapiNameHash',
          args: [dapiNameHash],
        });

        const value = result[0];
        const timestamp = Number(result[1]) * 1000;
        const price = parseFloat(formatUnits(value, 18));

        prices.push({
          symbol,
          price,
          timestamp,
          protocol: 'api3',
          chain: this.config.chain,
          confidence: 0.98,
          source: dapiServerAddress,
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

  private getDapiServerAddress(): Address {
    const chain = this.config?.chain || 'ethereum';
    return this.api3Config.dapiServerAddress || API3_DAPI_SERVER_ADDRESSES[chain];
  }

  private getDapiList(): string[] {
    const chain = this.config?.chain || 'ethereum';
    return this.api3Config.dapis || API3_SUPPORTED_DAPIS[chain] || [];
  }

  private encodeDapiName(dapiName: string): `0x${string}` {
    const encoded = Buffer.from(dapiName.padEnd(32, '\0')).toString('hex');
    return `0x${encoded}` as `0x${string}`;
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

  getAvailableDapis(): string[] {
    return this.getDapiList();
  }

  isDapiSupported(symbol: string): boolean {
    return this.getDapiList().includes(symbol);
  }
}
