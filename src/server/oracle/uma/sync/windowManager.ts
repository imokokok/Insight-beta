/**
 * UMA Sync Window Manager
 *
 * 管理同步窗口大小和自适应调整
 */

export interface WindowConfig {
  minWindow: bigint;
  maxWindow: bigint;
  targetLogsPerWindow: number;
}

export interface WindowState {
  currentSize: bigint;
  consecutiveEmptyRanges: number;
}

export class WindowManager {
  private config: WindowConfig;
  private state: WindowState;

  constructor(config: WindowConfig, initialSize?: bigint) {
    this.config = config;
    this.state = {
      currentSize: initialSize || config.minWindow,
      consecutiveEmptyRanges: 0,
    };
  }

  getCurrentSize(): bigint {
    return this.state.currentSize;
  }

  /**
   * 根据日志数量调整窗口大小
   */
  adjustWindow(logsCount: number): void {
    if (logsCount === 0) {
      this.state.consecutiveEmptyRanges++;
      // 连续空范围时增加窗口大小
      if (this.state.consecutiveEmptyRanges >= 2) {
        this.increaseWindow();
        this.state.consecutiveEmptyRanges = 0;
      }
    } else {
      this.state.consecutiveEmptyRanges = 0;
      // 日志太多时减小窗口
      if (logsCount > this.config.targetLogsPerWindow * 2) {
        this.decreaseWindow();
      }
    }
  }

  /**
   * 增加窗口大小（指数增长，但不超过最大值）
   */
  private increaseWindow(): void {
    const newSize = this.state.currentSize * 2n;
    this.state.currentSize = newSize > this.config.maxWindow ? this.config.maxWindow : newSize;
  }

  /**
   * 减小窗口大小（减半，但不小于最小值）
   */
  private decreaseWindow(): void {
    const newSize = this.state.currentSize / 2n;
    this.state.currentSize = newSize < this.config.minWindow ? this.config.minWindow : newSize;
  }

  /**
   * 计算下一个范围
   */
  calculateNextRange(cursor: bigint, toBlock: bigint): { from: bigint; to: bigint } | null {
    if (cursor > toBlock) {
      return null;
    }

    const rangeTo =
      cursor + this.state.currentSize - 1n <= toBlock
        ? cursor + this.state.currentSize - 1n
        : toBlock;

    return { from: cursor, to: rangeTo };
  }

  /**
   * 获取状态快照
   */
  getState(): WindowState {
    return { ...this.state };
  }

  /**
   * 重置窗口大小
   */
  reset(initialSize?: bigint): void {
    this.state.currentSize = initialSize || this.config.minWindow;
    this.state.consecutiveEmptyRanges = 0;
  }
}

/**
 * 计算初始游标位置
 */
export function calculateInitialCursor(
  lastProcessedBlock: bigint,
  startBlock: bigint,
  safeBlock: bigint | null,
  maxBlockRange: bigint,
): bigint {
  // 如果从未处理过，从安全块或起始块开始
  if (lastProcessedBlock === 0n) {
    if (startBlock > 0n) {
      return startBlock;
    }
    if (safeBlock && safeBlock > maxBlockRange) {
      return safeBlock - maxBlockRange;
    }
    return 0n;
  }

  // 否则从上次处理位置前 10 个块开始（处理可能的重组）
  return lastProcessedBlock > 10n ? lastProcessedBlock - 10n : 0n;
}

/**
 * 计算目标块
 */
export function calculateTargetBlock(
  latestBlock: bigint,
  confirmationBlocks: bigint,
): { safeBlock: bigint; targetBlock: bigint } {
  const safeBlock = latestBlock > confirmationBlocks ? latestBlock - confirmationBlocks : 0n;

  return { safeBlock, targetBlock: safeBlock };
}
