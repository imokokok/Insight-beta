import type { PriceData } from '@oracle-monitor/shared';
import { BaseSyncService } from '@oracle-monitor/shared';
import { Connection } from '@solana/web3.js';
import { PythHttpClient, getPythProgramKeyForCluster, PriceStatus } from '@pythnetwork/client';
import { getAvailablePythSymbols, mergePriceFeedIds } from './config/pythPriceFeeds';

interface PythConfig {
  cluster: 'mainnet-beta' | 'devnet' | 'testnet';
  customPriceIds?: Record<string, string>;
}

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

    const customConfig = config.customConfig as PythConfig | undefined;
    this.pythConfig = {
      cluster: customConfig?.cluster || 'mainnet-beta',
      customPriceIds: customConfig?.customPriceIds,
    };

    this.connection = new Connection(config.rpcUrl, 'confirmed');

    const pythProgramKey = getPythProgramKeyForCluster(this.pythConfig.cluster);
    this.pythClient = new PythHttpClient(this.connection, pythProgramKey);

    this.logger.info('Pyth service initialized', {
      cluster: this.pythConfig.cluster,
      symbols: config.symbols,
      availableSymbols: getAvailablePythSymbols(),
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

          const priceAccount = pythData.productPrice.get(priceId);
          if (!priceAccount) {
            this.logger.warn(`Price account not found for ${symbol}`);
            continue;
          }

          if (priceAccount.status !== PriceStatus.Trading) {
            this.logger.warn(`Invalid price status for ${symbol}: ${priceAccount.status}`);
            continue;
          }

          const price = priceAccount.price;
          const confidence = priceAccount.confidence;

          if (price === undefined || confidence === undefined) {
            this.logger.warn(`Missing price or confidence for ${symbol}`);
            continue;
          }

          prices.push({
            symbol,
            price,
            timestamp: Date.now(),
            protocol: 'pyth',
            chain: this.config.chain,
            confidence: confidence / price,
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
    return mergePriceFeedIds(this.pythConfig.customPriceIds);
  }
}
