import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Insight Oracle API',
        version: '1.0.0',
        description: 'REST API documentation for Oracle monitoring and dispute resolution system',
        contact: {
          name: 'Insight Team',
        },
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
          description: 'API Server',
        },
      ],
      tags: [
        { name: 'Oracle', description: 'Oracle Core Functions' },
        { name: 'Assertions', description: 'Assertion Management' },
        { name: 'Disputes', description: 'Dispute Management' },
        { name: 'Alerts', description: 'Alert Management' },
        { name: 'Config', description: 'Configuration Management' },
        { name: 'UMA', description: 'UMA Protocol Integration' },
        { name: 'Admin', description: 'Admin Interface' },
        { name: 'Health', description: 'Health Check' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Admin Token Authentication',
          },
        },
        schemas: {
          Assertion: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique assertion identifier' },
              claim: { type: 'string', description: 'Assertion claim content' },
              asserter: { type: 'string', description: 'Asserter address' },
              bond: { type: 'string', description: 'Bond amount' },
              expirationTime: {
                type: 'string',
                format: 'date-time',
                description: 'Expiration time',
              },
              status: {
                type: 'string',
                enum: ['pending', 'expired', 'disputed', 'settled'],
                description: 'Assertion status',
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'claim', 'asserter', 'status'],
          },
          Dispute: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique dispute identifier' },
              assertionId: { type: 'string', description: 'Associated assertion ID' },
              disputer: { type: 'string', description: 'Disputer address' },
              bond: { type: 'string', description: 'Dispute bond amount' },
              status: {
                type: 'string',
                enum: ['active', 'resolved', 'rejected'],
                description: 'Dispute status',
              },
              createdAt: { type: 'string', format: 'date-time' },
              resolvedAt: { type: 'string', format: 'date-time', nullable: true },
            },
            required: ['id', 'assertionId', 'disputer', 'status'],
          },
          Alert: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique alert identifier' },
              type: {
                type: 'string',
                enum: ['assertion', 'dispute', 'system'],
                description: 'Alert type',
              },
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Severity level',
              },
              message: { type: 'string', description: 'Alert message' },
              metadata: { type: 'object', description: 'Additional metadata' },
              acknowledged: { type: 'boolean', description: 'Whether acknowledged' },
              createdAt: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'type', 'severity', 'message'],
          },
          OracleConfig: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              key: { type: 'string', description: 'Configuration key' },
              value: { type: 'object', description: 'Configuration value' },
              description: { type: 'string', description: 'Configuration description' },
              updatedBy: { type: 'string', description: 'Updater address' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'key', 'value'],
          },
          ApiResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', description: 'Whether request succeeded' },
              data: { type: 'object', description: 'Response data' },
              error: { type: 'string', description: 'Error message', nullable: true },
              meta: {
                type: 'object',
                properties: {
                  page: { type: 'integer', description: 'Current page number' },
                  limit: { type: 'integer', description: 'Items per page' },
                  total: { type: 'integer', description: 'Total records' },
                  totalPages: { type: 'integer', description: 'Total pages' },
                },
              },
            },
            required: ['success'],
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', description: 'Error description' },
              code: { type: 'string', description: 'Error code' },
              details: {
                type: 'object',
                description: 'Detailed error information',
                nullable: true,
              },
            },
            required: ['success', 'error'],
          },
          OracleStats: {
            type: 'object',
            properties: {
              tvsUsd: { type: 'number', description: 'Total value secured (USD)' },
              activeDisputes: { type: 'number', description: 'Active disputes count' },
              resolved24h: { type: 'number', description: 'Disputes resolved in 24h' },
              avgResolutionMinutes: {
                type: 'number',
                description: 'Average resolution time (minutes)',
              },
            },
            required: ['tvsUsd', 'activeDisputes', 'resolved24h', 'avgResolutionMinutes'],
          },
          AuditLogEntry: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique log identifier' },
              timestamp: { type: 'string', format: 'date-time', description: 'Log timestamp' },
              action: { type: 'string', description: 'Action type' },
              actor: { type: 'string', description: 'Actor' },
              actorType: {
                type: 'string',
                enum: ['user', 'admin', 'system', 'anonymous'],
                description: 'Actor type',
              },
              severity: {
                type: 'string',
                enum: ['info', 'warning', 'critical'],
                description: 'Severity level',
              },
              details: { type: 'object', description: 'Detailed content' },
              ip: { type: 'string', description: 'IP address' },
              userAgent: { type: 'string', description: 'User agent' },
              success: { type: 'boolean', description: 'Whether successful' },
              errorMessage: { type: 'string', description: 'Error message', nullable: true },
            },
            required: ['id', 'timestamp', 'action', 'actor', 'severity', 'success'],
          },
          PaginationMeta: {
            type: 'object',
            properties: {
              total: { type: 'integer', description: 'Total records' },
              limit: { type: 'integer', description: 'Items per page' },
              offset: { type: 'integer', description: 'Offset' },
              nextCursor: { type: 'integer', description: 'Next page cursor', nullable: true },
            },
            required: ['total', 'limit', 'offset'],
          },
        },
      },
    },
  });
  return spec;
};
