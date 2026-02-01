import type { OracleConfig as SharedOracleConfig, OracleChain } from '@/lib/types/oracleTypes';

export type OracleConfig = SharedOracleConfig & {
  instanceId: string;
  createdAt?: string;
  updatedAt?: string;
};

export const DEFAULT_ORACLE_INSTANCE_ID = 'default';

export const CHAIN_VALUES: readonly OracleChain[] = [
  'Polygon',
  'PolygonAmoy',
  'Arbitrum',
  'Optimism',
  'Local',
];

export const ValidationErrors = {
  INVALID_REQUEST_BODY: 'invalid_request_body',
  INVALID_INSTANCE_ID: 'invalid_instance_id',
  INVALID_RPC_URL: 'invalid_rpc_url',
  INVALID_CONTRACT_ADDRESS: 'invalid_contract_address',
  INVALID_CHAIN: 'invalid_chain',
  INVALID_MAX_BLOCK_RANGE: 'invalid_max_block_range',
  INVALID_VOTING_PERIOD_HOURS: 'invalid_voting_period_hours',
} as const;

export type ValidationErrorCode = (typeof ValidationErrors)[keyof typeof ValidationErrors];

export interface ValidationErrorDetails {
  message: string;
  field?: string;
  expected?: string;
  received?: unknown;
}

export class ValidationError extends Error {
  constructor(
    code: ValidationErrorCode,
    public field?: string,
    public details?: ValidationErrorDetails,
  ) {
    super(code);
    this.name = 'ValidationError';
  }
}

export interface ValidationResult {
  valid: boolean;
  error?: ValidationError;
  value?: unknown;
}
