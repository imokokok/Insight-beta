/**
 * Reentrancy Guard Module
 *
 * 重入防护模块
 * 防止跨合约重入攻击、回调攻击
 */

import { logger } from '@/shared/logger';

// ============================================================================
// 类型定义
// ============================================================================

export interface ReentrancyState {
  isLocked: boolean;
  lockOwner?: string;
  lockTimestamp?: number;
  callDepth: number;
  operationStack: string[];
}

export interface ReentrancyConfig {
  maxCallDepth: number;
  lockTimeoutMs: number;
  enableLogging: boolean;
}

// ============================================================================
// 常量
// ============================================================================

export const REENTRANCY_DEFAULTS = {
  MAX_CALL_DEPTH: 10,
  LOCK_TIMEOUT_MS: 30000, // 30 seconds
  ENABLE_LOGGING: true,
} as const;

// ============================================================================
// 重入防护器
// ============================================================================

export class ReentrancyGuard {
  private states: Map<string, ReentrancyState> = new Map();
  private config: ReentrancyConfig;

  constructor(config: Partial<ReentrancyConfig> = {}) {
    this.config = {
      maxCallDepth: config.maxCallDepth ?? REENTRANCY_DEFAULTS.MAX_CALL_DEPTH,
      lockTimeoutMs: config.lockTimeoutMs ?? REENTRANCY_DEFAULTS.LOCK_TIMEOUT_MS,
      enableLogging: config.enableLogging ?? REENTRANCY_DEFAULTS.ENABLE_LOGGING,
    };
  }

  /**
   * 获取或创建状态
   */
  private getState(key: string): ReentrancyState {
    let state = this.states.get(key);
    if (!state) {
      state = {
        isLocked: false,
        callDepth: 0,
        operationStack: [],
      };
      this.states.set(key, state);
    }
    return state;
  }

  /**
   * 尝试获取锁
   */
  acquireLock(key: string, operation: string): boolean {
    const state = this.getState(key);
    const now = Date.now();

    // 检查是否已锁定
    if (state.isLocked) {
      // 检查锁是否超时
      if (state.lockTimestamp && now - state.lockTimestamp > this.config.lockTimeoutMs) {
        this.log('Lock timeout, releasing', { key, operation });
        this.releaseLock(key);
      } else {
        this.log('Reentrancy detected, lock already held', {
          key,
          operation,
          lockOwner: state.lockOwner,
          callDepth: state.callDepth,
        });
        return false;
      }
    }

    // 检查调用深度
    if (state.callDepth >= this.config.maxCallDepth) {
      this.log('Max call depth exceeded', {
        key,
        operation,
        callDepth: state.callDepth,
      });
      return false;
    }

    // 获取锁
    state.isLocked = true;
    state.lockOwner = operation;
    state.lockTimestamp = now;
    state.callDepth++;
    state.operationStack.push(operation);

    this.log('Lock acquired', { key, operation, callDepth: state.callDepth });

    return true;
  }

  /**
   * 释放锁
   */
  releaseLock(key: string): void {
    const state = this.states.get(key);
    if (!state) return;

    state.isLocked = false;
    state.lockOwner = undefined;
    state.lockTimestamp = undefined;
    state.callDepth = Math.max(0, state.callDepth - 1);
    state.operationStack.pop();

    this.log('Lock released', { key, callDepth: state.callDepth });
  }

  /**
   * 检查是否锁定
   */
  isLocked(key: string): boolean {
    const state = this.states.get(key);
    if (!state) return false;

    // 检查超时
    if (state.lockTimestamp && Date.now() - state.lockTimestamp > this.config.lockTimeoutMs) {
      this.releaseLock(key);
      return false;
    }

    return state.isLocked;
  }

  /**
   * 获取调用深度
   */
  getCallDepth(key: string): number {
    const state = this.states.get(key);
    return state?.callDepth ?? 0;
  }

  /**
   * 获取操作栈
   */
  getOperationStack(key: string): string[] {
    const state = this.states.get(key);
    return state?.operationStack ? [...state.operationStack] : [];
  }

  /**
   * 清除状态
   */
  clear(key?: string): void {
    if (key) {
      this.states.delete(key);
    } else {
      this.states.clear();
    }
  }

  /**
   * 使用锁执行操作
   */
  async withLock<T>(key: string, operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.acquireLock(key, operation)) {
      throw new ReentrancyError(`Reentrancy detected for key: ${key}`);
    }

    try {
      return await fn();
    } finally {
      this.releaseLock(key);
    }
  }

  /**
   * 同步版本
   */
  withLockSync<T>(key: string, operation: string, fn: () => T): T {
    if (!this.acquireLock(key, operation)) {
      throw new ReentrancyError(`Reentrancy detected for key: ${key}`);
    }

    try {
      return fn();
    } finally {
      this.releaseLock(key);
    }
  }

  private log(message: string, meta: Record<string, unknown>): void {
    if (this.config.enableLogging) {
      logger.debug(`[ReentrancyGuard] ${message}`, meta);
    }
  }
}

// ============================================================================
// 自定义错误
// ============================================================================

export class ReentrancyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReentrancyError';
  }
}

// ============================================================================
// 跨合约重入检测器
// ============================================================================

export class CrossContractReentrancyDetector {
  private activeOperations: Map<string, Set<string>> = new Map();
  private callGraph: Map<string, string[]> = new Map();

  /**
   * 记录合约调用开始
   */
  beginOperation(operationId: string, contractAddress: string): void {
    let contracts = this.activeOperations.get(operationId);
    if (!contracts) {
      contracts = new Set();
      this.activeOperations.set(operationId, contracts);
    }
    contracts.add(contractAddress);
  }

  /**
   * 记录合约调用结束
   */
  endOperation(operationId: string, contractAddress: string): void {
    const contracts = this.activeOperations.get(operationId);
    if (contracts) {
      contracts.delete(contractAddress);
      if (contracts.size === 0) {
        this.activeOperations.delete(operationId);
      }
    }
  }

  /**
   * 检查是否存在跨合约重入
   */
  checkReentrancy(operationId: string, targetContract: string): boolean {
    const contracts = this.activeOperations.get(operationId);
    if (!contracts) return false;

    // 如果目标合约已经在当前操作中被调用，则可能存在重入
    return contracts.has(targetContract);
  }

  /**
   * 记录调用图
   */
  recordCall(from: string, to: string): void {
    const calls = this.callGraph.get(from) || [];
    calls.push(to);
    this.callGraph.set(from, calls);
  }

  /**
   * 检测循环调用
   */
  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = this.callGraph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, [...path, neighbor])) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // 找到循环
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            cycles.push(path.slice(cycleStart));
          }
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of this.callGraph.keys()) {
      if (!visited.has(node)) {
        dfs(node, [node]);
      }
    }

    return cycles;
  }

  /**
   * 清除
   */
  clear(): void {
    this.activeOperations.clear();
    this.callGraph.clear();
  }
}

// ============================================================================
// 回调攻击防护
// ============================================================================

export class CallbackAttackProtector {
  private trustedCallbacks: Map<string, Set<string>> = new Map();
  private pendingCallbacks: Map<string, { timestamp: number; callback: string }> = new Map();

  /**
   * 注册可信回调
   */
  registerTrustedCallback(contract: string, callback: string): void {
    let callbacks = this.trustedCallbacks.get(contract);
    if (!callbacks) {
      callbacks = new Set();
      this.trustedCallbacks.set(contract, callbacks);
    }
    callbacks.add(callback);
  }

  /**
   * 检查回调是否可信
   */
  isTrustedCallback(contract: string, callback: string): boolean {
    const callbacks = this.trustedCallbacks.get(contract);
    return callbacks?.has(callback) ?? false;
  }

  /**
   * 开始等待回调
   */
  beginWaitForCallback(operationId: string, expectedCallback: string): void {
    this.pendingCallbacks.set(operationId, {
      timestamp: Date.now(),
      callback: expectedCallback,
    });
  }

  /**
   * 验证回调
   */
  validateCallback(
    operationId: string,
    callback: string,
  ): {
    valid: boolean;
    reason?: string;
  } {
    const pending = this.pendingCallbacks.get(operationId);

    if (!pending) {
      return { valid: false, reason: 'No pending callback expected' };
    }

    if (pending.callback !== callback) {
      return { valid: false, reason: 'Callback mismatch' };
    }

    // 清除
    this.pendingCallbacks.delete(operationId);
    return { valid: true };
  }

  /**
   * 清除过期回调
   */
  clearExpiredCallbacks(maxAgeMs: number = 60000): number {
    const now = Date.now();
    let cleared = 0;

    for (const [id, pending] of this.pendingCallbacks) {
      if (now - pending.timestamp > maxAgeMs) {
        this.pendingCallbacks.delete(id);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * 清除所有
   */
  clear(): void {
    this.trustedCallbacks.clear();
    this.pendingCallbacks.clear();
  }
}

// ============================================================================
// 全局实例
// ============================================================================

let globalGuard: ReentrancyGuard | null = null;

export function getGlobalReentrancyGuard(): ReentrancyGuard {
  if (!globalGuard) {
    globalGuard = new ReentrancyGuard();
  }
  return globalGuard;
}

// ============================================================================
// 装饰器（用于保护方法）
// ============================================================================

export function protectedOperation(key?: string) {
  return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const guard = getGlobalReentrancyGuard();
    const lockKey = key || `${String(propertyKey)}`;

    descriptor.value = async function (...args: unknown[]) {
      return guard.withLock(lockKey, String(propertyKey), () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createReentrancyGuard(config?: Partial<ReentrancyConfig>): ReentrancyGuard {
  return new ReentrancyGuard(config);
}

export function createCrossContractDetector(): CrossContractReentrancyDetector {
  return new CrossContractReentrancyDetector();
}

export function createCallbackProtector(): CallbackAttackProtector {
  return new CallbackAttackProtector();
}
