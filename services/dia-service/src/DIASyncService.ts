import { EnhancedSyncService } from '@oracle-monitor/shared';

import type { PriceData } from '@oracle-monitor/shared';

const DIA_API_BASE = 'https://api.diadata.org/v1';

const DIA_SUPPORTED_ASSETS: Record<string, string[]> = {
  ethereum: ['ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'LINK', 'UNI', 'AAVE', 'MKR', 'SNX'],
  polygon: ['MATIC', 'ETH', 'BTC', 'USDC', 'USDT', 'DAI'],
  arbitrum: ['ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'ARB'],
  optimism: ['ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'OP'],
  base: ['ETH', 'BTC', 'USDC', 'USDT'],
  avalanche: ['AVAX', 'ETH', 'BTC', 'USDC', 'USDT'],
  bsc: ['BNB', 'ETH', 'BTC', 'USDC', 'USDT', 'CAKE'],
  fantom: ['FTM', 'ETH', 'BTC', 'USDC', 'USDT'],
};

interface DIAQuotationResponse {
  Symbol: string;
  Name: string;
  Address: string;
  Blockchain: string;
  Price: number;
  PriceYesterday: number;
  VolumeYesterdayUSD: number;
  Time: string;
  Source: string;
}

interface DIAConfig {
  apiEndpoint?: string;
  assets?: string[];
}

export class DIASyncService extends EnhancedSyncService {
  private diaConfig: DIAConfig = {};

  constructor() {
    super({
      serviceName: 'dia-service',
      protocol: 'dia',
    });
  }

  async initialize(
    config: Parameters<typeof EnhancedSyncService.prototype.initialize>[0],
  ): Promise<void> {
    await super.initialize(config);

    this.diaConfig = (config.customConfig as DIAConfig) || {};
    this.diaConfig.apiEndpoint = this.diaConfig.apiEndpoint || DIA_API_BASE;

    this.logger.info('DIA service initialized', {
      chain: config.chain,
      symbols: config.symbols,
      endpoint: this.diaConfig.apiEndpoint,
    });
  }

  protected async fetchPrices(): Promise<PriceData[]> {
    if (!this.config) {
      throw new Error('Service not initialized');
    }

    const prices: PriceData[] = [];
    const assetsToFetch = this.getAssetsToFetch();

    for (const asset of assetsToFetch) {
      try {
        const price = await this.fetchDIAPrice(asset);
        if (price) {
          prices.push(price);
        }
      } catch (error) {
        this.logger.error(`Failed to fetch price for ${asset}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    return prices;
  }

  private getAssetsToFetch(): string[] {
    if (this.diaConfig.assets) {
      return this.diaConfig.assets;
    }
    return this.config?.symbols.map((symbol) => symbol.split('/')[0]).filter(Boolean) ?? [];
  }

  private async fetchDIAPrice(asset: string): Promise<PriceData | null> {
    const endpoint = `${this.diaConfig.apiEndpoint}/quotation/${asset}`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`DIA API error: ${response.status} ${response.statusText}`);
      }

      const data: DIAQuotationResponse = await response.json();

      return {
        symbol: `${asset}/USD`,
        price: data.Price,
        timestamp: new Date(data.Time).getTime(),
        protocol: 'dia',
        chain: this.config?.chain || 'ethereum',
        confidence: 0.95,
        source: data.Source,
      };
    } catch (error) {
      this.logger.error(`DIA API request failed for ${asset}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  getAvailableAssets(): string[] {
    const chain = this.config?.chain || 'ethereum';
    return DIA_SUPPORTED_ASSETS[chain] || [];
  }

  isAssetSupported(asset: string): boolean {
    return this.getAvailableAssets().includes(asset);
  }
}
