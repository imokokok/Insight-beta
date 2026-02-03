/**
 * Solana RPC Client
 *
 * 使用 fetch API 直接调用 Solana RPC
 * 避免 @solana/web3.js 依赖冲突
 */

import { SOLANA_RPC_ENDPOINTS, SOLANA_CONNECTION_CONFIG } from './config';
import { SolanaError, SolanaErrorCode } from './types';

// ============================================================================
// RPC Types
// ============================================================================

interface RpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: unknown[];
}

interface RpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface AccountInfoResponse {
  data: [string, string] | string;
  executable: boolean;
  lamports: number;
  owner: string;
  rentEpoch: number;
  space?: number;
}

// ============================================================================
// RPC Client
// ============================================================================

export class SolanaRpcClient {
  private endpoint: string;
  private requestId = 0;

  constructor(chain: 'solana' | 'solanaDevnet' = 'solana', customEndpoint?: string) {
    this.endpoint =
      customEndpoint ??
      (chain === 'solanaDevnet'
        ? (SOLANA_RPC_ENDPOINTS.devnet[0] ?? 'https://api.devnet.solana.com')
        : (SOLANA_RPC_ENDPOINTS.mainnet[0] ?? 'https://api.mainnet-beta.solana.com'));
  }

  /**
   * Set custom endpoint
   */
  setEndpoint(endpoint: string): void {
    this.endpoint = endpoint;
  }

  /**
   * Make RPC call
   */
  private async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const request: RpcRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params,
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new SolanaError(
          `HTTP error: ${response.status} ${response.statusText}`,
          SolanaErrorCode.RPC_ERROR,
        );
      }

      const data: RpcResponse<T> = await response.json();

      if (data.error) {
        throw new SolanaError(
          `RPC error: ${data.error.message}`,
          SolanaErrorCode.RPC_ERROR,
          data.error,
        );
      }

      if (data.result === undefined) {
        throw new SolanaError('RPC response missing result', SolanaErrorCode.RPC_ERROR);
      }

      return data.result;
    } catch (error) {
      if (error instanceof SolanaError) {
        throw error;
      }
      throw new SolanaError(
        `RPC call failed: ${error instanceof Error ? error.message : String(error)}`,
        SolanaErrorCode.RPC_ERROR,
        error,
      );
    }
  }

  /**
   * Get account info
   */
  async getAccountInfo(
    pubkey: string,
    commitment: string = SOLANA_CONNECTION_CONFIG.commitment,
    encoding: 'base64' | 'jsonParsed' = 'base64',
  ): Promise<AccountInfoResponse | null> {
    const result = await this.call<{
      context: { slot: number };
      value: AccountInfoResponse | null;
    }>('getAccountInfo', [pubkey, { commitment, encoding }]);

    return result.value;
  }

  /**
   * Get multiple accounts
   */
  async getMultipleAccounts(
    pubkeys: string[],
    commitment: string = SOLANA_CONNECTION_CONFIG.commitment,
    encoding: 'base64' | 'jsonParsed' = 'base64',
  ): Promise<(AccountInfoResponse | null)[]> {
    const result = await this.call<{
      context: { slot: number };
      value: (AccountInfoResponse | null)[];
    }>('getMultipleAccounts', [pubkeys, { commitment, encoding }]);

    return result.value;
  }

  /**
   * Get slot
   */
  async getSlot(commitment?: string): Promise<number> {
    const params = commitment ? [commitment] : [];
    return this.call<number>('getSlot', params);
  }

  /**
   * Get latest blockhash
   */
  async getLatestBlockhash(commitment?: string): Promise<{
    blockhash: string;
    lastValidBlockHeight: number;
  }> {
    const result = await this.call<{
      context: { slot: number };
      value: {
        blockhash: string;
        lastValidBlockHeight: number;
      };
    }>('getLatestBlockhash', commitment ? [{ commitment }] : []);

    return result.value;
  }

  /**
   * Get block time
   */
  async getBlockTime(slot: number): Promise<number | null> {
    return this.call<number | null>('getBlockTime', [slot]);
  }

  /**
   * Get balance
   */
  async getBalance(pubkey: string, commitment?: string): Promise<number> {
    const result = await this.call<{
      context: { slot: number };
      value: number;
    }>('getBalance', commitment ? [pubkey, { commitment }] : [pubkey]);

    return result.value;
  }

  /**
   * Get program accounts
   */
  async getProgramAccounts(
    programId: string,
    commitment?: string,
    filters?: unknown[],
  ): Promise<{ pubkey: string; account: AccountInfoResponse }[]> {
    const config: Record<string, unknown> = {};
    if (commitment) config.commitment = commitment;
    if (filters) config.filters = filters;

    const params = Object.keys(config).length > 0 ? [programId, config] : [programId];
    return this.call<{ pubkey: string; account: AccountInfoResponse }[]>(
      'getProgramAccounts',
      params,
    );
  }

  /**
   * Get signature statuses
   */
  async getSignatureStatuses(
    signatures: string[],
    searchTransactionHistory = false,
  ): Promise<(SignatureStatus | null)[]> {
    const result = await this.call<{
      context: { slot: number };
      value: (SignatureStatus | null)[];
    }>('getSignatureStatuses', [signatures, { searchTransactionHistory }]);

    return result.value;
  }

  /**
   * Get transaction
   */
  async getTransaction(
    signature: string,
    commitment?: string,
  ): Promise<TransactionResponse | null> {
    const params = commitment ? [signature, { commitment }] : [signature];
    return this.call<TransactionResponse | null>('getTransaction', params);
  }

  /**
   * Get health
   */
  async getHealth(): Promise<string> {
    return this.call<string>('getHealth', []);
  }

  /**
   * Get version
   */
  async getVersion(): Promise<{
    'solana-core': string;
    'feature-set'?: number;
  }> {
    return this.call<{ 'solana-core': string; 'feature-set'?: number }>('getVersion', []);
  }

  /**
   * Get first available block
   */
  async getFirstAvailableBlock(): Promise<number> {
    return this.call<number>('getFirstAvailableBlock', []);
  }

  /**
   * Get block
   */
  async getBlock(
    slot: number,
    commitment?: string,
    maxSupportedTransactionVersion?: number,
  ): Promise<BlockResponse | null> {
    const config: Record<string, unknown> = {};
    if (commitment) config.commitment = commitment;
    if (maxSupportedTransactionVersion !== undefined) {
      config.maxSupportedTransactionVersion = maxSupportedTransactionVersion;
    }

    const params = Object.keys(config).length > 0 ? [slot, config] : [slot];
    return this.call<BlockResponse | null>('getBlock', params);
  }
}

// ============================================================================
// Additional Types
// ============================================================================

interface SignatureStatus {
  slot: number;
  confirmations?: number;
  err: unknown | null;
  confirmationStatus?: 'processed' | 'confirmed' | 'finalized';
}

interface TransactionResponse {
  slot: number;
  transaction: {
    signatures: string[];
    message: {
      accountKeys: string[];
      header: {
        numRequiredSignatures: number;
        numReadonlySignedAccounts: number;
        numReadonlyUnsignedAccounts: number;
      };
      instructions: {
        programIdIndex: number;
        accounts: number[];
        data: string;
      }[];
      recentBlockhash: string;
    };
  };
  meta: {
    err: unknown | null;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    innerInstructions?: unknown[];
    logMessages?: string[];
    preTokenBalances?: unknown[];
    postTokenBalances?: unknown[];
    rewards?: unknown[];
  } | null;
  blockTime?: number;
}

interface BlockResponse {
  blockhash: string;
  previousBlockhash: string;
  parentSlot: number;
  transactions: TransactionResponse[];
  rewards: {
    pubkey: string;
    lamports: number;
    postBalance: number;
    rewardType: 'fee' | 'rent' | 'voting' | 'staking';
  }[];
  blockTime?: number;
  blockHeight?: number;
}

// ============================================================================
// Export
// ============================================================================

export function createSolanaRpcClient(
  chain: 'solana' | 'solanaDevnet' = 'solana',
  customEndpoint?: string,
): SolanaRpcClient {
  return new SolanaRpcClient(chain, customEndpoint);
}
