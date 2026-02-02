/**
 * UMA Log Processor
 *
 * 处理 UMA 合约事件日志
 */

import { getAddress } from 'viem';
import type { UMAChain, UMAAssertion } from '@/lib/types/oracleTypes';
import { decodeIdentifier } from '@/lib/blockchain/umaOptimisticOracle';
import { toIsoFromSeconds } from '@/lib/utils';
import { upsertUMAAssertion } from '../../umaState';

// OOV2 Event ABIs
export const OOV2_ABI = [
  {
    name: 'PriceRequestAdded',
    type: 'event',
    inputs: [
      { indexed: true, name: 'identifier', type: 'bytes32' },
      { indexed: true, name: 'timestamp', type: 'uint256' },
      { indexed: false, name: 'ancillaryData', type: 'bytes' },
      { indexed: false, name: 'price', type: 'int256' },
      { indexed: false, name: 'proposer', type: 'address' },
      { indexed: false, name: 'reward', type: 'uint256' },
    ],
  },
  {
    name: 'PriceDisputed',
    type: 'event',
    inputs: [
      { indexed: true, name: 'identifier', type: 'bytes32' },
      { indexed: true, name: 'timestamp', type: 'uint256' },
      { indexed: false, name: 'ancillaryData', type: 'bytes' },
      { indexed: false, name: 'disputer', type: 'address' },
      { indexed: false, name: 'disputeBond', type: 'uint256' },
    ],
  },
  {
    name: 'PriceSettled',
    type: 'event',
    inputs: [
      { indexed: true, name: 'identifier', type: 'bytes32' },
      { indexed: true, name: 'timestamp', type: 'uint256' },
      { indexed: false, name: 'ancillaryData', type: 'bytes' },
      { indexed: false, name: 'price', type: 'int256' },
      { indexed: false, name: 'payout', type: 'uint256' },
    ],
  },
] as const;

// OOV3 Event ABIs
export const OOV3_ABI = [
  {
    name: 'AssertionMade',
    type: 'event',
    inputs: [
      { indexed: true, name: 'assertionId', type: 'bytes32' },
      { indexed: false, name: 'claim', type: 'bytes' },
      { indexed: true, name: 'asserter', type: 'address' },
      { indexed: false, name: 'bond', type: 'uint256' },
      { indexed: false, name: 'identifier', type: 'bytes32' },
    ],
  },
  {
    name: 'AssertionDisputed',
    type: 'event',
    inputs: [
      { indexed: true, name: 'assertionId', type: 'bytes32' },
      { indexed: false, name: 'disputer', type: 'address' },
    ],
  },
  {
    name: 'AssertionSettled',
    type: 'event',
    inputs: [
      { indexed: true, name: 'assertionId', type: 'bytes32' },
      { indexed: false, name: 'settledTruth', type: 'bool' },
      { indexed: false, name: 'payout', type: 'uint256' },
    ],
  },
  {
    name: 'VoteCast',
    type: 'event',
    inputs: [
      { indexed: true, name: 'assertionId', type: 'bytes32' },
      { indexed: true, name: 'voter', type: 'address' },
      { indexed: false, name: 'weight', type: 'uint256' },
      { indexed: false, name: 'support', type: 'bool' },
    ],
  },
] as const;

export interface LogFetchConfig {
  ooV2Address?: string;
  ooV3Address?: string;
  fromBlock: bigint;
  toBlock: bigint;
}

export interface ProcessedLogs {
  oov2Proposed: Array<{
    args: {
      identifier: unknown;
      timestamp: unknown;
      ancillaryData: unknown;
      price: unknown;
      proposer: unknown;
      reward: unknown;
    };
    transactionHash: unknown;
    blockNumber: unknown;
    logIndex: unknown;
  }>;
  oov2Disputed: Array<{
    args: {
      identifier: unknown;
      timestamp: unknown;
      ancillaryData: unknown;
      disputer: unknown;
      disputeBond: unknown;
    };
    transactionHash: unknown;
    blockNumber: unknown;
    logIndex: unknown;
  }>;
  oov2Settled: Array<{
    args: {
      identifier: unknown;
      timestamp: unknown;
      ancillaryData: unknown;
      price: unknown;
      payout: unknown;
    };
    transactionHash: unknown;
    blockNumber: unknown;
    logIndex: unknown;
  }>;
  oov3Made: Array<{
    args: {
      assertionId: unknown;
      claim: unknown;
      asserter: unknown;
      bond: unknown;
      identifier: unknown;
    };
    transactionHash: unknown;
    blockNumber: unknown;
    logIndex: unknown;
  }>;
  oov3Disputed: Array<{
    args: { assertionId: unknown; disputer: unknown };
    transactionHash: unknown;
    blockNumber: unknown;
    logIndex: unknown;
  }>;
  oov3Settled: Array<{
    args: { assertionId: unknown; settledTruth: unknown; payout: unknown };
    transactionHash: unknown;
    blockNumber: unknown;
    logIndex: unknown;
  }>;
  oov3Vote: Array<{
    args: { assertionId: unknown; voter: unknown; weight: unknown; support: unknown };
    transactionHash: unknown;
    blockNumber: unknown;
    logIndex: unknown;
  }>;
  totalCount: number;
}

export function processLogResults(logsResults: unknown[]): ProcessedLogs {
  return {
    oov2Proposed: (logsResults[0] || []) as ProcessedLogs['oov2Proposed'],
    oov2Disputed: (logsResults[1] || []) as ProcessedLogs['oov2Disputed'],
    oov2Settled: (logsResults[2] || []) as ProcessedLogs['oov2Settled'],
    oov3Made: (logsResults[3] || []) as ProcessedLogs['oov3Made'],
    oov3Disputed: (logsResults[4] || []) as ProcessedLogs['oov3Disputed'],
    oov3Settled: (logsResults[5] || []) as ProcessedLogs['oov3Settled'],
    oov3Vote: (logsResults[6] || []) as ProcessedLogs['oov3Vote'],
    totalCount:
      ((logsResults[0] || []) as unknown[]).length +
      ((logsResults[1] || []) as unknown[]).length +
      ((logsResults[2] || []) as unknown[]).length +
      ((logsResults[3] || []) as unknown[]).length +
      ((logsResults[4] || []) as unknown[]).length +
      ((logsResults[5] || []) as unknown[]).length +
      ((logsResults[6] || []) as unknown[]).length,
  };
}

export async function processOOV2ProposedLogs(
  logs: ProcessedLogs['oov2Proposed'],
  chain: UMAChain,
  instanceId: string,
): Promise<Promise<unknown>[]> {
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;

    const identifier = decodeIdentifier(args.identifier as string);
    const ancillaryData = args.ancillaryData ? decodeIdentifier(args.ancillaryData as string) : '';
    const requestKey = `${identifier}-${args.timestamp}`;

    const assertion: UMAAssertion = {
      id: requestKey,
      chain,
      identifier,
      ancillaryData,
      proposer: getAddress(args.proposer as string),
      proposedValue: args.price as bigint,
      reward: args.reward as bigint,
      proposedAt: toIsoFromSeconds(args.timestamp as bigint),
      livenessEndsAt: undefined,
      disputedAt: undefined,
      settledAt: undefined,
      settlementValue: undefined,
      status: 'Proposed',
      bond: args.reward as bigint,
      disputeBond: 0n,
      txHash: (log.transactionHash as string) ?? '0x0',
      blockNumber: String(log.blockNumber ?? 0),
      logIndex: Number(log.logIndex ?? 0),
      version: 'v2',
    };

    dbOps.push(upsertUMAAssertion(assertion, instanceId));
  }

  return dbOps;
}

export async function processOOV2DisputedLogs(
  logs: ProcessedLogs['oov2Disputed'],
  _chain: UMAChain,
  _instanceId: string,
): Promise<Promise<unknown>[]> {
  // Implementation for disputed logs
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;

    // Update assertion status to Disputed
    // This would need to be implemented based on your state management
    // dbOps.push(updateUMAAssertionStatus(...));
  }

  return dbOps;
}

export async function processOOV2SettledLogs(
  logs: ProcessedLogs['oov2Settled'],
  _chain: UMAChain,
  _instanceId: string,
): Promise<Promise<unknown>[]> {
  // Implementation for settled logs
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;

    // Update assertion status to Settled
    // dbOps.push(updateUMAAssertionStatus(...));
  }

  return dbOps;
}

export async function processOOV3MadeLogs(
  logs: ProcessedLogs['oov3Made'],
  chain: UMAChain,
  instanceId: string,
): Promise<Promise<unknown>[]> {
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;

    const assertion: UMAAssertion = {
      id: args.assertionId as string,
      chain,
      identifier: decodeIdentifier(args.identifier as string),
      ancillaryData: decodeIdentifier(args.claim as string),
      proposer: getAddress(args.asserter as string),
      proposedValue: 0n,
      reward: args.bond as bigint,
      proposedAt: new Date().toISOString(),
      livenessEndsAt: undefined,
      disputedAt: undefined,
      settledAt: undefined,
      settlementValue: undefined,
      status: 'Proposed',
      bond: args.bond as bigint,
      disputeBond: 0n,
      txHash: (log.transactionHash as string) ?? '0x0',
      blockNumber: String(log.blockNumber ?? 0),
      logIndex: Number(log.logIndex ?? 0),
      version: 'v3',
    };

    dbOps.push(upsertUMAAssertion(assertion, instanceId));
  }

  return dbOps;
}

export async function processOOV3DisputedLogs(
  logs: ProcessedLogs['oov3Disputed'],
  _chain: UMAChain,
  _instanceId: string,
): Promise<Promise<unknown>[]> {
  // Implementation for disputed logs
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;

    // Update assertion status to Disputed
    // dbOps.push(updateUMAAssertionStatus(...));
  }

  return dbOps;
}

export async function processOOV3SettledLogs(
  logs: ProcessedLogs['oov3Settled'],
  _chain: UMAChain,
  _instanceId: string,
): Promise<Promise<unknown>[]> {
  // Implementation for settled logs
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;

    // Update assertion status to Settled
    // dbOps.push(updateUMAAssertionStatus(...));
  }

  return dbOps;
}

export async function processOOV3VoteLogs(
  logs: ProcessedLogs['oov3Vote'],
  _chain: UMAChain,
  _instanceId: string,
): Promise<Promise<unknown>[]> {
  // Implementation for vote logs
  const dbOps: Promise<unknown>[] = [];

  for (const log of logs) {
    const args = log.args;
    if (!args) continue;

    // Record vote
    // dbOps.push(recordUMAVote(...));
  }

  return dbOps;
}
