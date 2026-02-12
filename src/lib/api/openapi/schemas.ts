/**
 * OpenAPI Schemas - 预定义的 OpenAPI Schema
 */

import type { Schema, SecurityScheme } from './types';

export const commonSchemas: Record<string, Schema> = {
  Error: {
    type: 'object',
    properties: {
      error: { type: 'string', description: 'Error message' },
      code: { type: 'string', description: 'Error code' },
      details: { type: 'object', description: 'Additional error details' },
    },
    required: ['error'],
  },

  OracleConfig: {
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
  },

  Assertion: {
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
  },

  Dispute: {
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
  },

  Alert: {
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
  },

  WebVitalsMetrics: {
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
  },
};

export const securitySchemes: Record<string, SecurityScheme> = {
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
};
