/**
 * OpenAPI Routes - API 路由注册
 */

import type { Operation } from './types';

export const apiRoutes: Array<{
  path: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head';
  operation: Operation;
}> = [
  {
    path: '/api/oracle/config',
    method: 'get',
    operation: {
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
    },
  },
  {
    path: '/api/oracle/config',
    method: 'put',
    operation: {
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
    },
  },
  {
    path: '/api/oracle/assertions',
    method: 'get',
    operation: {
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
    },
  },
  {
    path: '/api/oracle/disputes',
    method: 'get',
    operation: {
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
    },
  },
  {
    path: '/api/oracle/alerts',
    method: 'get',
    operation: {
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
                  total: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
  },
  {
    path: '/api/oracle/alerts/{id}/acknowledge',
    method: 'post',
    operation: {
      summary: 'Acknowledge an alert',
      tags: ['Alerts'],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
          description: 'Alert ID',
        },
      ],
      responses: {
        '200': {
          description: 'Alert acknowledged',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Alert' },
            },
          },
        },
        '404': {
          description: 'Alert not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  },
  {
    path: '/api/oracle/alerts/{id}/resolve',
    method: 'post',
    operation: {
      summary: 'Resolve an alert',
      tags: ['Alerts'],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
          description: 'Alert ID',
        },
      ],
      responses: {
        '200': {
          description: 'Alert resolved',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Alert' },
            },
          },
        },
        '404': {
          description: 'Alert not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  },
  {
    path: '/api/monitoring/health',
    method: 'get',
    operation: {
      summary: 'Health check endpoint',
      tags: ['Monitoring'],
      responses: {
        '200': {
          description: 'Service is healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                  timestamp: { type: 'string', format: 'date-time' },
                  checks: {
                    type: 'object',
                    properties: {
                      database: { type: 'boolean' },
                      redis: { type: 'boolean' },
                      blockchain: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  {
    path: '/api/monitoring/metrics',
    method: 'get',
    operation: {
      summary: 'Prometheus metrics endpoint',
      tags: ['Monitoring'],
      responses: {
        '200': {
          description: 'Prometheus metrics',
          content: {
            'application/json': {
              schema: { type: 'string' },
            },
          },
        },
      },
      security: [{ apiKeyAuth: [] }],
    },
  },
  {
    path: '/api/analytics/web-vitals',
    method: 'post',
    operation: {
      summary: 'Report web vitals metrics',
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
        '204': {
          description: 'Metrics recorded successfully',
        },
        '400': {
          description: 'Invalid metrics data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
  },
];
