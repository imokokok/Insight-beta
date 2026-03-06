/**
 * API3 Operator Information
 * 
 * 提供 Airnode 运营商信息
 */

import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';

interface OperatorInfo {
  name: string;
  operatorAddress: string;
  totalAirnodes: number;
  activeAirnodes: number;
  reputationScore: number;
  totalUpdates: number;
  avgResponseTime: number;
  uptimeRate: number;
  website?: string;
  description?: string;
}

interface OperatorResponse {
  operators: Map<string, OperatorInfo>;
  metadata: {
    totalOperators: number;
    fetchedAt: string;
  };
}

// Mock 运营商数据 - 实际应该从链上或数据库获取
const MOCK_OPERATORS: Record<string, OperatorInfo> = {
  '0x0000000000000000000000000000000000000000': {
    name: 'API3 Foundation',
    operatorAddress: '0x0000000000000000000000000000000000000000',
    totalAirnodes: 15,
    activeAirnodes: 14,
    reputationScore: 98.5,
    totalUpdates: 125000,
    avgResponseTime: 85,
    uptimeRate: 99.2,
    website: 'https://api3.org',
    description: 'API3 基金会官方运营节点',
  },
  '0x1111111111111111111111111111111111111111': {
    name: 'ChainLayer',
    operatorAddress: '0x1111111111111111111111111111111111111111',
    totalAirnodes: 8,
    activeAirnodes: 8,
    reputationScore: 96.2,
    totalUpdates: 85000,
    avgResponseTime: 92,
    uptimeRate: 98.8,
    website: 'https://chainlayer.io',
    description: '专业节点运营商',
  },
  '0x2222222222222222222222222222222222222222': {
    name: 'StakeWithUs',
    operatorAddress: '0x2222222222222222222222222222222222222222',
    totalAirnodes: 5,
    activeAirnodes: 5,
    reputationScore: 95.8,
    totalUpdates: 62000,
    avgResponseTime: 98,
    uptimeRate: 98.5,
    website: 'https://stakewith.us',
    description: '可信赖的质押服务提供商',
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operatorAddress = searchParams.get('address');

    if (operatorAddress) {
      // 获取单个运营商信息
      const operator = MOCK_OPERATORS[operatorAddress.toLowerCase()];
      if (!operator) {
        return error(
          { code: 'OPERATOR_NOT_FOUND', message: 'Operator not found' },
          404,
        );
      }
      return ok(operator);
    }

    // 获取所有运营商列表
    const operators = Object.values(MOCK_OPERATORS);
    
    return ok({
      operators,
      metadata: {
        totalOperators: operators.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
