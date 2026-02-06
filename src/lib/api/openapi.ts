/**
 * OpenAPI/Swagger 文档生成器
 * 自动生成 API 文档，支持 Swagger UI 展示
 */

import { z } from 'zod';

// OpenAPI 规范类型定义
export type OpenAPISpec = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name: string;
      email: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, PathItem>;
  components: {
    schemas: Record<string, Schema>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
  tags: Array<{
    name: string;
    description: string;
  }>;
};

type PathItem = {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
  head?: Operation;
};

type Operation = {
  summary: string;
  description?: string;
  tags: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security?: Array<Record<string, string[]>>;
};

type Parameter = {
  name: string;
  in: 'query' | 'path' | 'header';
  required?: boolean;
  schema: Schema;
  description?: string;
};

type RequestBody = {
  required?: boolean;
  content: {
    'application/json': {
      schema: Schema;
    };
  };
};

type Response = {
  description: string;
  content?: {
    'application/json': {
      schema: Schema;
    };
  };
};

type Schema =
  | {
      type: 'string';
      enum?: string[];
      description?: string;
      example?: string;
      format?: string;
      nullable?: boolean;
      pattern?: string;
    }
  | { type: 'number'; description?: string; example?: number; nullable?: boolean }
  | { type: 'integer'; description?: string; example?: number; nullable?: boolean }
  | { type: 'boolean'; description?: string; example?: boolean }
  | { type: 'array'; items: Schema; description?: string }
  | {
      type: 'object';
      properties?: Record<string, Schema>;
      required?: string[];
      description?: string;
    }
  | { $ref: string };

type SecurityScheme =
  | { type: 'http'; scheme: 'bearer'; bearerFormat?: string }
  | { type: 'apiKey'; in: 'header'; name: string };

// Zod Schema 转 OpenAPI Schema
export function zodToOpenAPISchema(zodSchema: z.ZodTypeAny): Schema {
  // 处理可选类型
  if (zodSchema instanceof z.ZodOptional) {
    return zodToOpenAPISchema(zodSchema.unwrap());
  }

  // 处理默认值
  if (zodSchema instanceof z.ZodDefault) {
    return zodToOpenAPISchema(zodSchema.removeDefault());
  }

  // 处理字符串
  if (zodSchema instanceof z.ZodString) {
    const schema: Schema = { type: 'string' };
    // 检查是否有枚举
    if ('enumValues' in zodSchema._def && zodSchema._def.enumValues) {
      schema.enum = zodSchema._def.enumValues as string[];
    }
    return schema;
  }

  // 处理数字
  if (zodSchema instanceof z.ZodNumber) {
    return { type: 'number' };
  }

  // 处理整数
  if (zodSchema instanceof z.ZodBigInt) {
    return { type: 'integer' };
  }

  // 处理布尔值
  if (zodSchema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }

  // 处理数组
  if (zodSchema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToOpenAPISchema(zodSchema.element),
    };
  }

  // 处理对象
  if (zodSchema instanceof z.ZodObject) {
    const shape = zodSchema.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, Schema> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToOpenAPISchema(value);
      if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  // 处理联合类型（枚举）
  if (zodSchema instanceof z.ZodUnion) {
    const options = zodSchema._def.options as z.ZodTypeAny[];
    if (options.every((opt) => opt instanceof z.ZodLiteral)) {
      return {
        type: 'string',
        enum: options.map((opt) => (opt as z.ZodLiteral<string>).value),
      };
    }
  }

  // 处理字面量
  if (zodSchema instanceof z.ZodLiteral) {
    return { type: 'string', enum: [zodSchema.value as string] };
  }

  // 处理可空类型
  if (zodSchema instanceof z.ZodNullable) {
    return zodToOpenAPISchema(zodSchema.unwrap());
  }

  // 默认返回字符串
  return { type: 'string' };
}

// API 路由注册表
class APIRegistry {
  private paths: Record<string, PathItem> = {};
  private schemas: Record<string, Schema> = {};
  private tags: Set<string> = new Set();

  registerPath(
    path: string,
    method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head',
    operation: Operation,
  ) {
    if (!this.paths[path]) {
      this.paths[path] = {};
    }
    this.paths[path][method] = operation;
    operation.tags.forEach((tag) => this.tags.add(tag));
  }

  registerSchema(name: string, schema: Schema) {
    this.schemas[name] = schema;
  }

  getSpec(baseUrl: string): OpenAPISpec {
    return {
      openapi: '3.0.3',
      info: {
        title: 'OracleMonitor API',
        version: '1.0.0',
        description:
          'Universal Oracle Monitoring Platform API supporting Chainlink, Pyth, API3, DIA, Band, RedStone and more',
        contact: {
          name: 'API Support',
          email: 'api@oracle-monitor.foresight.build',
        },
      },
      servers: [
        {
          url: baseUrl,
          description: 'Current server',
        },
      ],
      paths: this.paths,
      components: {
        schemas: this.schemas,
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
      tags: Array.from(this.tags).map((tag) => ({
        name: tag,
        description: `${tag} operations`,
      })),
    };
  }
}

export const apiRegistry = new APIRegistry();

// 预定义常用 Schema
apiRegistry.registerSchema('Error', {
  type: 'object',
  properties: {
    error: { type: 'string', description: 'Error message' },
    code: { type: 'string', description: 'Error code' },
    details: { type: 'object', description: 'Additional error details' },
  },
  required: ['error'],
});

apiRegistry.registerSchema('OracleConfig', {
  type: 'object',
  properties: {
    rpcUrl: { type: 'string', description: 'RPC endpoint URL' },
    contractAddress: { type: 'string', description: 'Oracle contract address' },
    chain: {
      type: 'string',
      enum: ['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local'],
      description: 'Blockchain network',
    },
    startBlock: { type: 'integer', description: 'Start block number' },
    maxBlockRange: { type: 'integer', description: 'Maximum block range per query' },
    votingPeriodHours: { type: 'integer', description: 'Voting period in hours' },
    confirmationBlocks: { type: 'integer', description: 'Confirmation block count' },
  },
  required: ['rpcUrl', 'contractAddress', 'chain'],
});

apiRegistry.registerSchema('Assertion', {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Assertion ID' },
    chain: { type: 'string', description: 'Blockchain network' },
    asserter: { type: 'string', description: 'Asserter address' },
    protocol: { type: 'string', description: 'Protocol name' },
    market: { type: 'string', description: 'Market identifier' },
    assertionData: { type: 'string', description: 'Assertion content' },
    assertedAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
    livenessEndsAt: { type: 'string', format: 'date-time', description: 'Liveness end timestamp' },
    status: {
      type: 'string',
      enum: ['Active', 'Disputed', 'Resolved'],
      description: 'Assertion status',
    },
    bondUsd: { type: 'number', description: 'Bond amount in USD' },
  },
  required: ['id', 'chain', 'asserter', 'status'],
});

apiRegistry.registerSchema('Dispute', {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Dispute ID' },
    assertionId: { type: 'string', description: 'Related assertion ID' },
    disputer: { type: 'string', description: 'Disputer address' },
    reason: { type: 'string', description: 'Dispute reason' },
    disputedAt: { type: 'string', format: 'date-time', description: 'Dispute timestamp' },
    status: { type: 'string', description: 'Dispute status' },
    votesFor: { type: 'number', description: 'Votes in support' },
    votesAgainst: { type: 'number', description: 'Votes against' },
  },
  required: ['id', 'assertionId', 'disputer', 'status'],
});

apiRegistry.registerSchema('Alert', {
  type: 'object',
  properties: {
    id: { type: 'integer', description: 'Alert ID' },
    fingerprint: { type: 'string', description: 'Alert fingerprint' },
    type: { type: 'string', description: 'Alert type' },
    severity: {
      type: 'string',
      enum: ['info', 'warning', 'critical'],
      description: 'Alert severity',
    },
    title: { type: 'string', description: 'Alert title' },
    message: { type: 'string', description: 'Alert message' },
    status: {
      type: 'string',
      enum: ['Open', 'Acknowledged', 'Resolved'],
      description: 'Alert status',
    },
    occurrences: { type: 'integer', description: 'Occurrence count' },
    firstSeenAt: { type: 'string', format: 'date-time' },
    lastSeenAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'fingerprint', 'type', 'severity', 'title', 'status'],
});

apiRegistry.registerSchema('WebVitalsMetrics', {
  type: 'object',
  properties: {
    lcp: { type: 'number', description: 'Largest Contentful Paint (ms)' },
    fid: { type: 'number', description: 'First Input Delay (ms)' },
    cls: { type: 'number', description: 'Cumulative Layout Shift' },
    fcp: { type: 'number', description: 'First Contentful Paint (ms)' },
    ttfb: { type: 'number', description: 'Time to First Byte (ms)' },
    inp: { type: 'number', description: 'Interaction to Next Paint (ms)' },
    pagePath: { type: 'string', description: 'Page path' },
    timestamp: { type: 'string', format: 'date-time' },
  },
});

// 注册 API 路由
apiRegistry.registerPath('/api/oracle/config', 'get', {
  summary: 'Get Oracle configuration',
  tags: ['Config'],
  responses: {
    '200': {
      description: 'Configuration retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/OracleConfig' },
        },
      },
    },
    '401': {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
});

apiRegistry.registerPath('/api/oracle/config', 'put', {
  summary: 'Update Oracle configuration',
  tags: ['Config'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/OracleConfig' },
      },
    },
  },
  responses: {
    '200': {
      description: 'Configuration updated successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/OracleConfig' },
        },
      },
    },
    '400': {
      description: 'Invalid configuration',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
});

apiRegistry.registerPath('/api/oracle/assertions', 'get', {
  summary: 'List assertions',
  tags: ['Assertions'],
  parameters: [
    {
      name: 'status',
      in: 'query',
      schema: { type: 'string', enum: ['Active', 'Disputed', 'Resolved'] },
      description: 'Filter by status',
    },
    {
      name: 'chain',
      in: 'query',
      schema: { type: 'string' },
      description: 'Filter by chain',
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', example: 20 },
      description: 'Number of results to return',
    },
    {
      name: 'cursor',
      in: 'query',
      schema: { type: 'string' },
      description: 'Pagination cursor',
    },
  ],
  responses: {
    '200': {
      description: 'List of assertions',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              items: { type: 'array', items: { $ref: '#/components/schemas/Assertion' } },
              nextCursor: { type: 'string', nullable: true },
              total: { type: 'integer' },
            },
          },
        },
      },
    },
  },
});

apiRegistry.registerPath('/api/oracle/disputes', 'get', {
  summary: 'List disputes',
  tags: ['Disputes'],
  parameters: [
    {
      name: 'status',
      in: 'query',
      schema: { type: 'string' },
      description: 'Filter by status',
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', example: 20 },
      description: 'Number of results to return',
    },
  ],
  responses: {
    '200': {
      description: 'List of disputes',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              items: { type: 'array', items: { $ref: '#/components/schemas/Dispute' } },
              nextCursor: { type: 'string', nullable: true },
              total: { type: 'integer' },
            },
          },
        },
      },
    },
  },
});

apiRegistry.registerPath('/api/oracle/alerts', 'get', {
  summary: 'List alerts',
  tags: ['Alerts'],
  parameters: [
    {
      name: 'status',
      in: 'query',
      schema: { type: 'string', enum: ['Open', 'Acknowledged', 'Resolved', 'All'] },
      description: 'Filter by status',
    },
    {
      name: 'severity',
      in: 'query',
      schema: { type: 'string', enum: ['info', 'warning', 'critical', 'All'] },
      description: 'Filter by severity',
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', example: 30 },
      description: 'Number of results to return',
    },
  ],
  responses: {
    '200': {
      description: 'List of alerts',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              items: { type: 'array', items: { $ref: '#/components/schemas/Alert' } },
              nextCursor: { type: 'integer', nullable: true },
              total: { type: 'integer' },
            },
          },
        },
      },
    },
  },
});

apiRegistry.registerPath('/api/analytics/web-vitals', 'get', {
  summary: 'Get Web Vitals metrics',
  tags: ['Analytics'],
  parameters: [
    {
      name: 'path',
      in: 'query',
      schema: { type: 'string', example: '/' },
      description: 'Page path',
    },
    {
      name: 'hours',
      in: 'query',
      schema: { type: 'integer', example: 24 },
      description: 'Time window in hours',
    },
  ],
  responses: {
    '200': {
      description: 'Web Vitals metrics summary',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              summary: {
                type: 'object',
                properties: {
                  avgLcp: { type: 'integer', nullable: true },
                  avgFid: { type: 'integer', nullable: true },
                  avgCls: { type: 'string', nullable: true },
                  avgFcp: { type: 'integer', nullable: true },
                  avgTtfb: { type: 'integer', nullable: true },
                  avgInp: { type: 'integer', nullable: true },
                  totalSamples: { type: 'integer' },
                },
              },
              thresholds: {
                type: 'object',
                properties: {
                  lcp: {
                    type: 'object',
                    properties: { good: { type: 'integer' }, poor: { type: 'integer' } },
                  },
                  fid: {
                    type: 'object',
                    properties: { good: { type: 'integer' }, poor: { type: 'integer' } },
                  },
                  cls: {
                    type: 'object',
                    properties: { good: { type: 'number' }, poor: { type: 'number' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

apiRegistry.registerPath('/api/analytics/web-vitals', 'post', {
  summary: 'Report Web Vitals metrics',
  tags: ['Analytics'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/WebVitalsMetrics' },
      },
    },
  },
  responses: {
    '200': {
      description: 'Metrics recorded successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
  },
});

// 扁平化后的 API 路由 - UMA Users
apiRegistry.registerPath('/api/oracle/uma-users/{address}/assertions', 'get', {
  summary: 'Get UMA user assertions (flattened)',
  tags: ['UMA Users'],
  parameters: [
    {
      name: 'address',
      in: 'path',
      required: true,
      schema: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
      description: 'User Ethereum address',
    },
    {
      name: 'instanceId',
      in: 'query',
      schema: { type: 'string' },
      description: 'Instance ID',
    },
    {
      name: 'status',
      in: 'query',
      schema: { type: 'string', enum: ['Active', 'Disputed', 'Resolved'] },
      description: 'Filter by status',
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', example: 100 },
      description: 'Number of results to return',
    },
    {
      name: 'offset',
      in: 'query',
      schema: { type: 'integer', example: 0 },
      description: 'Pagination offset',
    },
  ],
  responses: {
    '200': {
      description: 'List of user assertions',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              assertions: { type: 'array', items: { $ref: '#/components/schemas/Assertion' } },
              total: { type: 'integer' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
            },
          },
        },
      },
    },
    '400': {
      description: 'Invalid address',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
});

apiRegistry.registerPath('/api/oracle/uma-users/{address}/stats', 'get', {
  summary: 'Get UMA user stats (flattened)',
  tags: ['UMA Users'],
  parameters: [
    {
      name: 'address',
      in: 'path',
      required: true,
      schema: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
      description: 'User Ethereum address',
    },
    {
      name: 'instanceId',
      in: 'query',
      schema: { type: 'string' },
      description: 'Instance ID',
    },
  ],
  responses: {
    '200': {
      description: 'User statistics',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              totalAssertions: { type: 'integer' },
              activeAssertions: { type: 'integer' },
              disputedAssertions: { type: 'integer' },
              resolvedAssertions: { type: 'integer' },
              totalBonded: { type: 'number' },
            },
          },
        },
      },
    },
    '400': {
      description: 'Invalid address',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
});

// 扁平化后的 API 路由 - Config History
apiRegistry.registerPath('/api/oracle/config-history/{id}', 'get', {
  summary: 'Get config history entry (flattened)',
  tags: ['Config History'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
      description: 'History entry ID',
    },
  ],
  responses: {
    '200': {
      description: 'History entry details',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              config: { type: 'object' },
              changedAt: { type: 'string', format: 'date-time' },
              changedBy: { type: 'string' },
              changeReason: { type: 'string' },
            },
          },
        },
      },
    },
    '404': {
      description: 'History entry not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
});

apiRegistry.registerPath('/api/oracle/config-history/{id}', 'post', {
  summary: 'Rollback to config version (flattened)',
  tags: ['Config History'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'integer' },
      description: 'History entry ID',
    },
  ],
  requestBody: {
    required: false,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            changeReason: { type: 'string' },
            changedBy: { type: 'string' },
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Rollback successful',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              config: { type: 'object' },
            },
          },
        },
      },
    },
    '400': {
      description: 'Rollback failed',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
});

apiRegistry.registerPath('/api/oracle/config-history/stats', 'get', {
  summary: 'Get config history stats (flattened)',
  tags: ['Config History'],
  parameters: [
    {
      name: 'instanceId',
      in: 'query',
      schema: { type: 'string' },
      description: 'Instance ID',
    },
  ],
  responses: {
    '200': {
      description: 'History statistics',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              totalChanges: { type: 'integer' },
              changesLast24h: { type: 'integer' },
              changesLast7d: { type: 'integer' },
              mostChangedFields: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  },
});

// ============================================================================
// Unified Oracle API - 统一预言机 API
// ============================================================================

apiRegistry.registerSchema('UnifiedPriceFeed', {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Unique feed identifier' },
    symbol: { type: 'string', description: 'Trading pair symbol (e.g., ETH/USD)' },
    protocol: {
      type: 'string',
      enum: ['chainlink', 'pyth', 'band', 'dia', 'redstone', 'api3', 'switchboard', 'uma'],
      description: 'Oracle protocol',
    },
    chain: { type: 'string', description: 'Blockchain network' },
    price: { type: 'number', description: 'Current price' },
    priceRaw: { type: 'string', description: 'Raw price value (bigint as string)' },
    timestamp: { type: 'integer', description: 'Last update timestamp (ms)' },
    confidence: { type: 'number', description: 'Confidence score (0-1)' },
    source: { type: 'string', description: 'Data source' },
    decimals: { type: 'integer', description: 'Price decimals' },
    isStale: { type: 'boolean', description: 'Whether the data is stale' },
    stalenessSeconds: { type: 'integer', description: 'Seconds since last update' },
    baseAsset: { type: 'string', description: 'Base asset symbol' },
    quoteAsset: { type: 'string', description: 'Quote asset symbol' },
  },
  required: ['id', 'symbol', 'protocol', 'chain', 'price', 'timestamp'],
});

apiRegistry.registerSchema('PlatformStats', {
  type: 'object',
  properties: {
    totalProtocols: { type: 'integer', description: 'Number of supported protocols' },
    totalPriceFeeds: { type: 'integer', description: 'Total number of price feeds' },
    supportedChains: { type: 'integer', description: 'Number of supported chains' },
    avgUpdateLatency: { type: 'integer', description: 'Average update latency in ms' },
    lastUpdated: { type: 'string', format: 'date-time', description: 'Last statistics update' },
  },
  required: ['totalProtocols', 'totalPriceFeeds', 'supportedChains'],
});

apiRegistry.registerPath('/api/oracle/unified/stats', 'get', {
  summary: 'Get unified platform statistics',
  tags: ['Unified Oracle'],
  responses: {
    '200': {
      description: 'Platform statistics',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PlatformStats' },
        },
      },
    },
  },
});

apiRegistry.registerPath('/api/oracle/unified/feeds', 'get', {
  summary: 'Get unified price feeds',
  tags: ['Unified Oracle'],
  parameters: [
    {
      name: 'protocol',
      in: 'query',
      schema: {
        type: 'string',
        enum: ['chainlink', 'pyth', 'band', 'dia', 'redstone', 'api3', 'switchboard'],
      },
      description: 'Filter by protocol',
    },
    {
      name: 'chain',
      in: 'query',
      schema: { type: 'string' },
      description: 'Filter by chain',
    },
    {
      name: 'symbol',
      in: 'query',
      schema: { type: 'string' },
      description: 'Filter by symbol (e.g., ETH/USD)',
    },
    {
      name: 'page',
      in: 'query',
      schema: { type: 'integer', example: 1 },
      description: 'Page number',
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', example: 20 },
      description: 'Items per page',
    },
  ],
  responses: {
    '200': {
      description: 'List of price feeds',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: '#/components/schemas/UnifiedPriceFeed' } },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  total: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
  },
});

apiRegistry.registerPath('/api/oracle/unified/feeds/{id}', 'get', {
  summary: 'Get specific price feed by ID',
  tags: ['Unified Oracle'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Feed identifier',
    },
  ],
  responses: {
    '200': {
      description: 'Price feed details',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UnifiedPriceFeed' },
        },
      },
    },
    '404': {
      description: 'Feed not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
});

// ============================================================================
// Price Comparison API - 价格比较 API
// ============================================================================

apiRegistry.registerSchema('PriceComparison', {
  type: 'object',
  properties: {
    symbol: { type: 'string', description: 'Trading pair symbol' },
    comparisons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          protocol: { type: 'string', description: 'Protocol name' },
          price: { type: 'number', description: 'Price value' },
          timestamp: { type: 'integer', description: 'Update timestamp' },
          latency: { type: 'integer', description: 'Response latency in ms' },
          confidence: { type: 'number', description: 'Confidence score' },
        },
      },
    },
    deviation: {
      type: 'object',
      properties: {
        absolute: { type: 'number', description: 'Absolute price difference' },
        percentage: { type: 'number', description: 'Percentage difference' },
      },
    },
    anomalyDetected: { type: 'boolean', description: 'Whether anomaly was detected' },
    severity: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'critical'],
      description: 'Anomaly severity',
    },
  },
  required: ['symbol', 'comparisons'],
});

apiRegistry.registerPath('/api/oracle/comparison/{symbol}', 'get', {
  summary: 'Compare prices across protocols',
  tags: ['Price Comparison'],
  parameters: [
    {
      name: 'symbol',
      in: 'path',
      required: true,
      schema: { type: 'string', example: 'ETH/USD' },
      description: 'Trading pair symbol',
    },
    {
      name: 'protocols',
      in: 'query',
      schema: { type: 'string', example: 'chainlink,pyth,band' },
      description: 'Comma-separated list of protocols to compare',
    },
  ],
  responses: {
    '200': {
      description: 'Price comparison results',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PriceComparison' },
        },
      },
    },
    '400': {
      description: 'Invalid symbol or protocols',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
});

apiRegistry.registerPath('/api/oracle/comparison/{symbol}/anomaly', 'get', {
  summary: 'Detect price anomalies for symbol',
  tags: ['Price Comparison'],
  parameters: [
    {
      name: 'symbol',
      in: 'path',
      required: true,
      schema: { type: 'string', example: 'ETH/USD' },
      description: 'Trading pair symbol',
    },
    {
      name: 'threshold',
      in: 'query',
      schema: { type: 'number', example: 1.0 },
      description: 'Deviation threshold percentage',
    },
  ],
  responses: {
    '200': {
      description: 'Anomaly detection results',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              anomalyDetected: { type: 'boolean' },
              severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
              details: {
                type: 'object',
                properties: {
                  maxDeviation: { type: 'number' },
                  protocols: { type: 'array', items: { type: 'string' } },
                  recommendedAction: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
});

// ============================================================================
// Health & Monitoring API - 健康监控 API
// ============================================================================

apiRegistry.registerSchema('HealthStatus', {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['healthy', 'degraded', 'unhealthy'],
      description: 'Overall health status',
    },
    timestamp: { type: 'string', format: 'date-time', description: 'Check timestamp' },
    services: {
      type: 'object',
      properties: {
        database: { type: 'string', enum: ['connected', 'disconnected'] },
        cache: { type: 'string', enum: ['connected', 'disconnected'] },
        blockchain: { type: 'string', enum: ['connected', 'disconnected'] },
      },
    },
    latency: {
      type: 'object',
      properties: { database: { type: 'integer' }, cache: { type: 'integer' } },
    },
    version: { type: 'string', description: 'API version' },
  },
  required: ['status', 'timestamp'],
});

apiRegistry.registerPath('/api/health', 'get', {
  summary: 'Get system health status',
  tags: ['Health'],
  responses: {
    '200': {
      description: 'Health status',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/HealthStatus' },
        },
      },
    },
  },
});

apiRegistry.registerPath('/api/v1/health', 'get', {
  summary: 'Get detailed health status (v1)',
  tags: ['Health'],
  responses: {
    '200': {
      description: 'Detailed health status',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/HealthStatus' },
        },
      },
    },
  },
});

// ============================================================================
// Watchlist API - 关注列表 API
// ============================================================================

apiRegistry.registerSchema('WatchlistItem', {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Watchlist item ID' },
    symbol: { type: 'string', description: 'Trading pair symbol' },
    protocol: { type: 'string', description: 'Protocol name' },
    targetPrice: { type: 'number', description: 'Target price for alert' },
    alertThreshold: { type: 'number', description: 'Alert threshold percentage' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'symbol', 'protocol'],
});

apiRegistry.registerPath('/api/watchlist', 'get', {
  summary: 'Get user watchlist',
  tags: ['Watchlist'],
  responses: {
    '200': {
      description: 'User watchlist',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              items: { type: 'array', items: { $ref: '#/components/schemas/WatchlistItem' } },
              total: { type: 'integer' },
            },
          },
        },
      },
    },
    '401': {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
});

apiRegistry.registerPath('/api/watchlist', 'post', {
  summary: 'Add item to watchlist',
  tags: ['Watchlist'],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Trading pair symbol' },
            protocol: { type: 'string', description: 'Protocol name' },
            targetPrice: { type: 'number' },
            alertThreshold: { type: 'number' },
          },
          required: ['symbol', 'protocol'],
        },
      },
    },
  },
  responses: {
    '201': {
      description: 'Item added successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/WatchlistItem' },
        },
      },
    },
    '400': {
      description: 'Invalid input',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
});

apiRegistry.registerPath('/api/watchlist/{id}', 'put', {
  summary: 'Update watchlist item',
  tags: ['Watchlist'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Watchlist item ID',
    },
  ],
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            targetPrice: { type: 'number' },
            alertThreshold: { type: 'number' },
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Item updated successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/WatchlistItem' },
        },
      },
    },
    '404': {
      description: 'Item not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
});

apiRegistry.registerPath('/api/watchlist/{id}', 'delete', {
  summary: 'Remove item from watchlist',
  tags: ['Watchlist'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Watchlist item ID',
    },
  ],
  responses: {
    '200': {
      description: 'Item removed successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    '404': {
      description: 'Item not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
});

// 生成 OpenAPI JSON
export function generateOpenAPISpec(baseUrl: string): OpenAPISpec {
  return apiRegistry.getSpec(baseUrl);
}

// Swagger UI HTML
export function generateSwaggerUI(openapiUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OracleMonitor API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: '${openapiUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: 'StandaloneLayout'
      });
    };
  </script>
</body>
</html>`;
}
