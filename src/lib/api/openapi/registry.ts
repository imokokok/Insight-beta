/**
 * OpenAPI Registry - API 路由注册表
 */

import { apiRoutes } from './routes';
import { commonSchemas } from './schemas';

import type { OpenAPISpec, Operation, PathItem, Schema } from './types';

export class APIRegistry {
  private paths: Record<string, PathItem> = {};
  private schemas: Record<string, Schema> = {};
  private tags: Set<string> = new Set();

  constructor() {
    this.registerCommonSchemas();
    this.registerApiRoutes();
  }

  private registerCommonSchemas(): void {
    for (const [name, schema] of Object.entries(commonSchemas)) {
      this.schemas[name] = schema;
    }
  }

  private registerApiRoutes(): void {
    for (const { path, method, operation } of apiRoutes) {
      this.registerPath(path, method, operation);
    }
  }

  registerPath(
    path: string,
    method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head',
    operation: Operation,
  ): void {
    if (!this.paths[path]) {
      this.paths[path] = {};
    }
    this.paths[path][method] = operation;
    operation.tags.forEach((tag) => this.tags.add(tag));
  }

  registerSchema(name: string, schema: Schema): void {
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
