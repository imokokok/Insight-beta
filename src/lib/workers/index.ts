/**
 * Web Worker Manager - Web Worker 管理器
 *
 * 提供 Web Worker 的创建、管理和通信功能
 * - 计算密集型任务卸载
 * - 数据格式化
 * - 图表数据生成
 */

import { logger } from '@/lib/logger';

export interface WorkerTask<TInput, TOutput> {
  id: string;
  type: string;
  input: TInput;
  resolve: (value: TOutput) => void;
  reject: (reason: Error) => void;
  timeoutId?: NodeJS.Timeout;
}

export interface WorkerMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
  error?: string;
}

/**
 * Worker 管理器
 */
export class WorkerManager {
  private worker: Worker | null = null;
  private tasks = new Map<string, WorkerTask<unknown, unknown>>();
  private taskId = 0;
  private workerUrl: string;

  constructor(workerUrl: string) {
    this.workerUrl = workerUrl;
  }

  /**
   * 初始化 Worker
   */
  private initWorker(): Worker {
    if (this.worker) return this.worker;

    if (typeof window === 'undefined') {
      throw new Error('Worker can only be initialized in browser');
    }

    this.worker = new Worker(this.workerUrl);

    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const { id, payload, error } = event.data;
      const task = this.tasks.get(id);

      if (!task) {
        logger.warn('Received message for unknown task', { id });
        return;
      }

      // 清理超时定时器
      if (task.timeoutId) {
        clearTimeout(task.timeoutId);
      }

      this.tasks.delete(id);

      if (error) {
        task.reject(new Error(error));
      } else {
        task.resolve(payload);
      }
    };

    this.worker.onerror = (error) => {
      logger.error('Worker error', { error });
      // 拒绝所有待处理的任务
      this.tasks.forEach((task) => {
        task.reject(new Error('Worker error'));
      });
      this.tasks.clear();
    };

    return this.worker;
  }

  /**
   * 执行任务
   */
  async execute<TInput, TOutput>(
    type: string,
    input: TInput,
    timeoutMs: number = 30000,
  ): Promise<TOutput> {
    const worker = this.initWorker();
    const id = `${++this.taskId}_${Date.now()}`;

    return new Promise((resolve, reject) => {
      const task: WorkerTask<TInput, TOutput> = {
        id,
        type,
        input,
        resolve: resolve as (value: unknown) => void,
        reject,
      };

      // 设置超时
      task.timeoutId = setTimeout(() => {
        this.tasks.delete(id);
        reject(new Error(`Worker task "${type}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.tasks.set(id, task as WorkerTask<unknown, unknown>);

      // 发送任务到 Worker
      worker.postMessage({ id, type, input });
    });
  }

  /**
   * 终止 Worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // 拒绝所有待处理的任务
    this.tasks.forEach((task) => {
      task.reject(new Error('Worker terminated'));
    });
    this.tasks.clear();
  }
}

// 全局 Worker 实例
let priceAggregationWorker: WorkerManager | null = null;
let dataProcessingWorker: WorkerManager | null = null;

/**
 * 获取价格聚合 Worker
 */
export function getPriceAggregationWorker(): WorkerManager {
  if (!priceAggregationWorker) {
    priceAggregationWorker = new WorkerManager('/workers/priceAggregation.worker.js');
  }
  return priceAggregationWorker;
}

/**
 * 获取数据处理 Worker
 */
export function getDataProcessingWorker(): WorkerManager {
  if (!dataProcessingWorker) {
    dataProcessingWorker = new WorkerManager('/workers/dataProcessing.worker.js');
  }
  return dataProcessingWorker;
}

/**
 * 终止所有 Worker
 */
export function terminateAllWorkers(): void {
  priceAggregationWorker?.terminate();
  priceAggregationWorker = null;

  dataProcessingWorker?.terminate();
  dataProcessingWorker = null;
}

const workerExports = {
  WorkerManager,
  getPriceAggregationWorker,
  getDataProcessingWorker,
  terminateAllWorkers,
};

export default workerExports;
