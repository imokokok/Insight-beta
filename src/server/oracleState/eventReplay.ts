/**
 * Oracle State 事件回放处理器
 *
 * 处理 Oracle 事件的重放逻辑，支持从内存或数据库回放事件
 */

import crypto from 'node:crypto';
import { logger } from '@/lib/logger';
import { query } from '../db';
import { hasDatabase } from '../db';
import { getMemoryInstance } from '../memoryBackend';
import { DEFAULT_ORACLE_INSTANCE_ID } from '../oracleConfig';
import { normalizeInstanceId } from './utils';
import {
  upsertAssertion,
  upsertDispute,
  insertVoteEvent,
  recomputeDisputeVotes,
} from './operations';
import type { Assertion, Dispute, OracleChain } from '@/lib/types/oracleTypes';
import type { ReplayResult } from './types';

/**
 * 事件处理器函数类型
 */
type EventHandler = (
  payload: unknown,
  assertionId: string | null,
  normalizedInstanceId: string,
) => Promise<boolean>;

/**
 * 事件处理器映射表
 */
const eventHandlers: Record<string, EventHandler> = {
  /**
   * 处理断言创建事件
   */
  assertion_created: async (payload, _assertionId, normalizedInstanceId) => {
    const a = payload as Assertion;
    if (!a?.id) return false;
    await upsertAssertion(a, normalizedInstanceId);
    return true;
  },

  /**
   * 处理断言争议事件
   */
  assertion_disputed: async (payload, _assertionId, normalizedInstanceId) => {
    const d = payload as Dispute;
    if (!d?.assertionId) return false;

    const assertion = await import('./operations').then((m) =>
      m.fetchAssertion(d.assertionId, normalizedInstanceId),
    );
    if (assertion) {
      assertion.status = 'Disputed';
      assertion.disputer = d.disputer;
      await upsertAssertion(assertion, normalizedInstanceId);
    }
    await upsertDispute(d, normalizedInstanceId);
    return true;
  },

  /**
   * 处理投票事件
   */
  vote_cast: async (payload, _assertionId, normalizedInstanceId) => {
    const v = payload as {
      chain: OracleChain;
      assertionId: string;
      voter: string;
      support: boolean;
      weight: string;
      txHash: string;
      blockNumber: string;
      logIndex: number;
    };
    if (!v?.assertionId) return false;

    await insertVoteEvent(
      {
        chain: v.chain,
        assertionId: v.assertionId,
        voter: v.voter,
        support: Boolean(v.support),
        weight: BigInt(v.weight || '0'),
        txHash: v.txHash,
        blockNumber: BigInt(v.blockNumber || '0'),
        logIndex: Number(v.logIndex ?? 0),
      },
      normalizedInstanceId,
    );
    await recomputeDisputeVotes(v.assertionId, normalizedInstanceId);
    return true;
  },

  /**
   * 处理断言解决事件
   */
  assertion_resolved: async (payload, rowAssertionId, normalizedInstanceId) => {
    const r = payload as {
      assertionId: string;
      resolvedAt: string;
      outcome: boolean;
    };
    const assertionId = r?.assertionId || rowAssertionId;
    if (!assertionId) return false;

    const assertion = await import('./operations').then((m) =>
      m.fetchAssertion(assertionId, normalizedInstanceId),
    );
    if (assertion) {
      assertion.status = 'Resolved';
      assertion.resolvedAt = r.resolvedAt;
      assertion.settlementResolution = r.outcome;
      await upsertAssertion(assertion, normalizedInstanceId);
    }

    const dispute = await import('./operations').then((m) =>
      m.fetchDispute(`D:${assertionId}`, normalizedInstanceId),
    );
    if (dispute) {
      dispute.status = 'Executed';
      dispute.votingEndsAt = r.resolvedAt;
      await upsertDispute(dispute, normalizedInstanceId);
    }
    return true;
  },
};

/**
 * 验证事件负载完整性
 * @param payload - 事件负载
 * @param payloadChecksum - 预期的校验和
 * @returns 是否验证通过
 */
function verifyPayloadChecksum(payload: unknown, payloadChecksum: string | null): boolean {
  if (!payloadChecksum) return true;

  const computedChecksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');

  return computedChecksum === payloadChecksum;
}

/**
 * 处理单个事件
 * @param eventType - 事件类型
 * @param payload - 事件负载
 * @param assertionId - 关联的断言 ID
 * @param normalizedInstanceId - 规范化后的实例 ID
 * @returns 是否成功处理
 */
async function processEvent(
  eventType: string,
  payload: unknown,
  assertionId: string | null,
  normalizedInstanceId: string,
): Promise<boolean> {
  const trimmedEventType = eventType.trim();
  if (!trimmedEventType) return false;

  const handler = eventHandlers[trimmedEventType];
  if (!handler) {
    logger.warn('Unknown event type during replay', { eventType: trimmedEventType });
    return false;
  }

  try {
    return await handler(payload, assertionId, normalizedInstanceId);
  } catch (error) {
    logger.error('Event handler failed', {
      eventType: trimmedEventType,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * 从内存回放事件
 * @param mem - 内存实例
 * @param fromBlock - 起始区块
 * @param toBlock - 结束区块
 * @param normalizedInstanceId - 规范化后的实例 ID
 * @returns 回放结果
 */
async function replayFromMemory(
  mem: ReturnType<typeof getMemoryInstance>,
  fromBlock: bigint,
  toBlock: bigint,
  normalizedInstanceId: string,
): Promise<ReplayResult> {
  // 筛选指定区块范围内的事件
  const events = Array.from(mem.oracleEvents.values())
    .filter((event) => event.blockNumber >= fromBlock && event.blockNumber <= toBlock)
    .sort((a, b) => {
      if (a.blockNumber === b.blockNumber) {
        if (a.logIndex === b.logIndex) return a.id - b.id;
        return a.logIndex - b.logIndex;
      }
      return a.blockNumber < b.blockNumber ? -1 : 1;
    });

  let applied = 0;
  for (const event of events) {
    // 验证负载完整性
    if (event.payloadChecksum) {
      if (!verifyPayloadChecksum(event.payload, event.payloadChecksum)) {
        logger.warn('Event payload checksum mismatch', {
          eventType: event.eventType,
          assertionId: event.assertionId,
        });
        continue;
      }
    }

    const success = await processEvent(
      event.eventType ?? '',
      event.payload,
      event.assertionId ?? null,
      normalizedInstanceId,
    );
    if (success) applied++;
  }

  return { applied };
}

/**
 * 从数据库回放事件
 * @param fromBlock - 起始区块
 * @param toBlock - 结束区块
 * @param normalizedInstanceId - 规范化后的实例 ID
 * @returns 回放结果
 */
async function replayFromDatabase(
  fromBlock: bigint,
  toBlock: bigint,
  normalizedInstanceId: string,
): Promise<ReplayResult> {
  const res = await query<{
    event_type: string;
    assertion_id: string | null;
    payload: unknown;
    payload_checksum: string | null;
  }>(
    `
    SELECT event_type, assertion_id, payload, payload_checksum
    FROM oracle_events
    WHERE instance_id = $1 AND block_number >= $2 AND block_number <= $3
    ORDER BY block_number ASC, log_index ASC, id ASC
    `,
    [normalizedInstanceId, fromBlock.toString(10), toBlock.toString(10)],
  );

  let applied = 0;
  for (const row of res.rows) {
    // 验证负载完整性
    if (row.payload_checksum) {
      if (!verifyPayloadChecksum(row.payload, row.payload_checksum)) {
        logger.warn('Event payload checksum mismatch', {
          eventType: row.event_type,
          assertionId: row.assertion_id,
        });
        continue;
      }
    }

    const success = await processEvent(
      row.event_type ?? '',
      row.payload,
      row.assertion_id ?? null,
      normalizedInstanceId,
    );
    if (success) applied++;
  }

  return { applied };
}

/**
 * 回放指定区块范围内的事件
 * 支持从内存或数据库回放，自动选择存储后端
 * @param fromBlock - 起始区块
 * @param toBlock - 结束区块
 * @param instanceId - 实例 ID（可选，默认使用 'default'）
 * @returns 回放结果，包含成功应用的事件数量
 */
export async function replayOracleEventsRange(
  fromBlock: bigint,
  toBlock: bigint,
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
): Promise<ReplayResult> {
  const normalizedInstanceId = normalizeInstanceId(instanceId, DEFAULT_ORACLE_INSTANCE_ID);

  // 根据存储后端选择回放方式
  if (!hasDatabase()) {
    const mem = getMemoryInstance(normalizedInstanceId);
    return replayFromMemory(mem, fromBlock, toBlock, normalizedInstanceId);
  }

  return replayFromDatabase(fromBlock, toBlock, normalizedInstanceId);
}
