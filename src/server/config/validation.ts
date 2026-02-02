/**
 * Validation Module - 配置验证模块
 *
 * 支持配置字段验证、RPC 连接检查、合约地址验证
 */

import type { OracleConfig } from '@/lib/types/oracleTypes';

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ConfigValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

/**
 * 验证 Oracle 配置
 */
export async function validateOracleConfig(
  config: Partial<OracleConfig>,
  options: {
    checkConnectivity?: boolean;
    strictMode?: boolean;
  } = {},
): Promise<ConfigValidationResult> {
  const { checkConnectivity = false, strictMode = false } = options;
  const errors: ConfigValidationError[] = [];
  const warnings: ConfigValidationWarning[] = [];

  // 验证 RPC URL
  if (config.rpcUrl !== undefined) {
    if (!config.rpcUrl.trim()) {
      errors.push({
        field: 'rpcUrl',
        message: 'RPC URL cannot be empty',
        code: 'empty_rpc_url',
      });
    } else {
      const urls = config.rpcUrl.split(/[,\s]+/).filter(Boolean);
      for (const url of urls) {
        try {
          const parsed = new URL(url);
          if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
            errors.push({
              field: 'rpcUrl',
              message: `Invalid protocol: ${parsed.protocol}`,
              code: 'invalid_protocol',
            });
          }
        } catch {
          errors.push({
            field: 'rpcUrl',
            message: `Invalid URL: ${url}`,
            code: 'invalid_url',
          });
        }
      }

      // 检查连接性
      if (checkConnectivity && urls.length > 0) {
        const firstUrl = urls[0];
        if (firstUrl) {
          const connectivityResult = await checkRpcConnectivity(firstUrl);
          if (!connectivityResult.success) {
            errors.push({
              field: 'rpcUrl',
              message: `Cannot connect to RPC: ${connectivityResult.error}`,
              code: 'rpc_connectivity_failed',
            });
          }
        }
      }
    }
  }

  // 验证合约地址
  if (config.contractAddress !== undefined) {
    if (config.contractAddress) {
      if (!/^0x[0-9a-fA-F]{40}$/.test(config.contractAddress)) {
        errors.push({
          field: 'contractAddress',
          message: 'Invalid Ethereum address format',
          code: 'invalid_address',
        });
      }

      // 检查地址是否为合约（如果启用严格模式）
      if (strictMode && config.rpcUrl) {
        const isContract = await checkIsContract(config.contractAddress, config.rpcUrl);
        if (!isContract) {
          warnings.push({
            field: 'contractAddress',
            message: 'Address does not appear to be a contract',
            suggestion: 'Verify the contract address is correct',
          });
        }
      }
    }
  }

  // 验证链类型
  if (config.chain !== undefined) {
    const validChains = ['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local'];
    if (!validChains.includes(config.chain)) {
      errors.push({
        field: 'chain',
        message: `Invalid chain: ${config.chain}. Must be one of: ${validChains.join(', ')}`,
        code: 'invalid_chain',
      });
    }
  }

  // 验证数值字段
  if (config.maxBlockRange !== undefined) {
    if (config.maxBlockRange < 100 || config.maxBlockRange > 200000) {
      errors.push({
        field: 'maxBlockRange',
        message: 'maxBlockRange must be between 100 and 200000',
        code: 'invalid_block_range',
      });
    }
    if (config.maxBlockRange > 50000) {
      warnings.push({
        field: 'maxBlockRange',
        message: 'Large block range may cause performance issues',
        suggestion: 'Consider reducing to 50000 or less',
      });
    }
  }

  if (config.votingPeriodHours !== undefined) {
    if (config.votingPeriodHours < 1 || config.votingPeriodHours > 720) {
      errors.push({
        field: 'votingPeriodHours',
        message: 'votingPeriodHours must be between 1 and 720',
        code: 'invalid_voting_period',
      });
    }
  }

  if (config.confirmationBlocks !== undefined) {
    if (config.confirmationBlocks < 1) {
      errors.push({
        field: 'confirmationBlocks',
        message: 'confirmationBlocks must be at least 1',
        code: 'invalid_confirmation_blocks',
      });
    }
    if (config.confirmationBlocks < 6) {
      warnings.push({
        field: 'confirmationBlocks',
        message: 'Low confirmation blocks may cause reorg issues',
        suggestion: 'Consider using at least 6 confirmation blocks',
      });
    }
  }

  // 验证 startBlock
  if (config.startBlock !== undefined) {
    if (config.startBlock < 0) {
      errors.push({
        field: 'startBlock',
        message: 'startBlock cannot be negative',
        code: 'negative_start_block',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 检查 RPC 连接性
 */
async function checkRpcConnectivity(
  rpcUrl: string,
): Promise<{ success: boolean; error?: string; blockNumber?: number }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return {
      success: true,
      blockNumber: parseInt(data.result, 16),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 检查地址是否为合约
 */
async function checkIsContract(address: string, rpcUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getCode',
        params: [address, 'latest'],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return false;

    const data = await response.json();
    if (data.error) return false;

    // 如果 code 不是 "0x"，则是合约
    return data.result && data.result !== '0x';
  } catch {
    return false;
  }
}
