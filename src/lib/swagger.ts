/**
 * Swagger/OpenAPI Configuration
 *
 * API 文档配置
 */

import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'OracleMonitor API',
        version: '1.0.0',
        description: 'Universal Oracle Monitoring Platform API',
        contact: {
          name: 'OracleMonitor Team',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000/api',
          description: 'Development server',
        },
        {
          url: 'https://api.oracle-monitor.example.com/api',
          description: 'Production server',
        },
      ],
      tags: [
        {
          name: 'Oracle',
          description: 'Oracle data endpoints',
        },
        {
          name: 'Analytics',
          description: 'Analytics and reporting endpoints',
        },
        {
          name: 'Health',
          description: 'Health check endpoints',
        },
      ],
      components: {
        schemas: {
          UnifiedPriceFeed: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              instanceId: { type: 'string' },
              protocol: { type: 'string', enum: ['uma', 'chainlink', 'pyth', 'redstone'] },
              chain: { type: 'string' },
              symbol: { type: 'string' },
              baseAsset: { type: 'string' },
              quoteAsset: { type: 'string' },
              price: { type: 'number' },
              priceRaw: { type: 'string' },
              decimals: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
              blockNumber: { type: 'number' },
              confidence: { type: 'number' },
              sources: { type: 'number' },
              isStale: { type: 'boolean' },
              stalenessSeconds: { type: 'number' },
            },
          },
          CrossOracleComparison: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              symbol: { type: 'string' },
              baseAsset: { type: 'string' },
              quoteAsset: { type: 'string' },
              prices: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    protocol: { type: 'string' },
                    instanceId: { type: 'string' },
                    price: { type: 'number' },
                    timestamp: { type: 'string', format: 'date-time' },
                    confidence: { type: 'number' },
                    isStale: { type: 'boolean' },
                  },
                },
              },
              avgPrice: { type: 'number' },
              medianPrice: { type: 'number' },
              minPrice: { type: 'number' },
              maxPrice: { type: 'number' },
              priceRange: { type: 'number' },
              priceRangePercent: { type: 'number' },
              maxDeviation: { type: 'number' },
              maxDeviationPercent: { type: 'number' },
              outlierProtocols: { type: 'array', items: { type: 'string' } },
              recommendedPrice: { type: 'number' },
              recommendationSource: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          DeviationTrend: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              trendDirection: { type: 'string', enum: ['increasing', 'decreasing', 'stable'] },
              trendStrength: { type: 'number' },
              avgDeviation: { type: 'number' },
              maxDeviation: { type: 'number' },
              volatility: { type: 'number' },
              anomalyScore: { type: 'number' },
              recommendation: { type: 'string' },
            },
          },
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
  });
  return spec;
};
