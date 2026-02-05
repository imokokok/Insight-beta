import type { Address, Hash } from 'viem';

export interface UMAOracleConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  optimisticOracleV2Address?: Address;
  optimisticOracleV3Address?: Address;
  ooV3KpiAddress?: Address;
  finderAddress: Address;
  defaultCurrency?: Address;
  defaultIdentifier: string;
}

export interface UMAMarket {
  identifier: string;
  AncillaryData?: string;
  requestTimestamp: bigint;
  proposePrice: bigint;
  proposeBond: bigint;
  liveness: bigint;
  state: UMAOracleState;
}

export type UMAOracleState =
  | 'Invalid'
  | 'Requested'
  | 'Proposed'
  | 'Expired'
  | 'Disputed'
  | 'Resolved'
  | 'Settled';

export interface UMAPriceRequest {
  identifier: string;
  timestamp: bigint;
  ancillaryData: string;
  currency: Address;
  reward: bigint;
  finalFee: bigint;
  bond: bigint;
  customLiveness: bigint;
}

export interface UMAAssertion {
  assertionId: Hash;
  claim: string;
  asserter: Address;
  callbackContract: Address;
  escalateManually: boolean;
  expirationTime: bigint;
  currency: Address;
  disputeSolver: Address;
  noDataPresent: boolean;
}

export interface UMADispute {
  assertionId: Hash;
  disputer: Address;
  requestTimestamp: bigint;
  identifier: string;
  ancillaryData: string;
  proposedValue: bigint;
  disputeTimestamp: bigint;
  settlementResolution: boolean;
}

export interface UMASlashingLibrary {
  maximumTranche: () => Promise<bigint>;
  tranches: (index: bigint) => Promise<{
    startTime: bigint;
    observedSlash: bigint;
    correctSlash: bigint;
  }>;
  recordEpochSlashForWallet: (wallet: Address, epoch: bigint, amount: bigint) => Promise<Hash>;
}
