import type { PriceData } from '@oracle-monitor/shared';
import { BaseSyncService } from '@oracle-monitor/shared';
import { Connection, PublicKey } from '@solana/web3.js';
import { PythHttpClient, getPythProgramKeyForCluster } from '@pythnetwork/client';

interface PythConfig {
  cluster: 'mainnet-beta' | 'devnet' | 'testnet';
  customPriceIds?: string[];
}

// Pyth price feed IDs for common symbols
const PYTH_PRICE_IDS: Record<string, string> = {
  'BTC/USD': 'GVXRSBjFk6e6J3NbVPXohRJetcUXxt93nkhU233t2Jnp',
  'ETH/USD': 'JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB',
  'SOL/USD': 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712k4LcF21',
  'AVAX/USD': 'FVb5h1VmHPfVb1RfqZckchq18GxRv4iKt8T4eVTQAqdz',
  'ARB/USD': '4mRGHzjGnQNKeCbWdmytccPYyxyGoJtZWSrVfPFa9D6f',
};

export class PythSyncService extends BaseSyncService {
  private connection: Connection | null = null;
  private pythClient: PythHttpClient | null = null;
  private pythConfig: PythConfig = { cluster: 'mainnet-beta' };

  constructor() {
    super({
      serviceName: 'pyth-service',
      protocol: 'pyth',
    });
  }

  async initialize(
    config: Parameters<typeof BaseSyncService.prototype.initialize>[0],
  ): Promise<void> {
    await super.initialize(config);

    // Parse custom config
    this.pythConfig = (config.customConfig as PythConfig) || { cluster: 'mainnet-beta' };

    // Initialize Solana connection
    this.connection = new Connection(config.rpcUrl, 'confirmed');

    // Initialize Pyth client
    const pythProgramKey = getPythProgramKeyForCluster(this.pythConfig.cluster);
    this.pythClient = new PythHttpClient(this.connection, pythProgramKey);

    this.logger.info('Pyth service initialized', {
      cluster: this.pythConfig.cluster,
      symbols: config.symbols,
    });
  }

  protected async fetchPrices(): Promise<PriceData[]> {
    if (!this.connection || !this.pythClient || !this.config) {
      throw new Error('Service not initialized');
    }

    const prices: PriceData[] = [];
    const priceIds = this.getPriceIds();

    try {
      const pythData = await this.pythClient.getData();

      for (const symbol of this.config.symbols) {
        try {
          const priceId = priceIds[symbol];
          if (!priceId) {
            this.logger.warn(`No price ID for ${symbol}`);
            continue;
          }

          const priceAccount = pythData.productPrice.get(new PublicKey(priceId));
          if (!priceAccount) {
            this.logger.warn(`Price account not found for ${symbol}`);
            continue;
          }

          // Check if price is valid
          if (priceAccount.aggregate.priceType === 'unknown') {
            this.logger.warn(`Invalid price type for ${symbol}`);
            continue;
          }

          const price = priceAccount.aggregate.price;
          const confidence = priceAccount.aggregate.confidence;

          prices.push({
            symbol,
            price,
            timestamp: Date.now(),
            protocol: 'pyth',
            chain: this.config.chain,
            confidence: confidence / price, // Normalize confidence as percentage
            source: priceId,
          });
        } catch (error) {
          this.logger.error(`Failed to fetch price for ${symbol}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to fetch Pyth data', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return prices;
  }

  private getPriceIds(): Record<string, string> {
    return { ...PYTH_PRICE_IDS, ...(this.pythConfig.customPriceIds || {}) };
  }
}
