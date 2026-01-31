/**
 * Cross-Protocol Analysis Scheduler
 *
 * 跨协议分析定时任务调度器
 * 自动定期运行价格偏差分析和生成告警
 */

import { runCrossProtocolAnalysis, type PriceDeviationConfig } from './crossProtocolAnalysis';
import { logger } from '@/lib/logger';

// ============================================================================
// Configuration
// ============================================================================

interface SchedulerConfig {
  enabled: boolean;
  intervalMinutes: number;
  symbols: string[];
  deviationConfig: Partial<PriceDeviationConfig>;
}

const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  enabled: true,
  intervalMinutes: 5,
  symbols: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'USDC/USD', 'DAI/USD'],
  deviationConfig: {
    warningThreshold: 0.5, // 0.5%
    criticalThreshold: 1.0, // 1%
    minDataPoints: 3,
    timeWindowMinutes: 5,
  },
};

// ============================================================================
// Scheduler State
// ============================================================================

let schedulerInterval: NodeJS.Timeout | null = null;
let isRunning = false;
let lastRunTime: Date | null = null;
let totalRuns = 0;
let totalAlertsGenerated = 0;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * 启动分析调度器
 */
export function startAnalysisScheduler(
  config: Partial<SchedulerConfig> = {},
): { success: boolean; message: string } {
  const finalConfig = { ...DEFAULT_SCHEDULER_CONFIG, ...config };

  if (!finalConfig.enabled) {
    return { success: false, message: 'Scheduler is disabled in configuration' };
  }

  if (schedulerInterval) {
    return { success: false, message: 'Scheduler is already running' };
  }

  // 立即执行一次
  runScheduledAnalysis(finalConfig);

  // 设置定时任务
  const intervalMs = finalConfig.intervalMinutes * 60 * 1000;
  schedulerInterval = setInterval(() => {
    runScheduledAnalysis(finalConfig);
  }, intervalMs);

  logger.info('Cross-protocol analysis scheduler started', {
    intervalMinutes: finalConfig.intervalMinutes,
    symbols: finalConfig.symbols,
  });

  return {
    success: true,
    message: `Scheduler started with ${finalConfig.intervalMinutes} minute interval`,
  };
}

/**
 * 停止分析调度器
 */
export function stopAnalysisScheduler(): { success: boolean; message: string } {
  if (!schedulerInterval) {
    return { success: false, message: 'Scheduler is not running' };
  }

  clearInterval(schedulerInterval);
  schedulerInterval = null;
  isRunning = false;

  logger.info('Cross-protocol analysis scheduler stopped');

  return { success: true, message: 'Scheduler stopped successfully' };
}

/**
 * 执行定时分析任务
 */
async function runScheduledAnalysis(config: SchedulerConfig): Promise<void> {
  if (isRunning) {
    logger.warn('Previous analysis job is still running, skipping this cycle');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    logger.info('Starting scheduled cross-protocol analysis', {
      symbols: config.symbols,
      runNumber: totalRuns + 1,
    });

    const results = await runCrossProtocolAnalysis(config.symbols, config.deviationConfig);

    const durationMs = Date.now() - startTime;
    totalRuns++;
    totalAlertsGenerated += results.alertsGenerated;
    lastRunTime = new Date();

    logger.info('Scheduled analysis completed', {
      durationMs,
      symbolsAnalyzed: results.analyzed,
      alertsGenerated: results.alertsGenerated,
      totalRuns,
      totalAlertsGenerated,
    });
  } catch (error) {
    logger.error('Scheduled analysis failed', {
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
  } finally {
    isRunning = false;
  }
}

/**
 * 手动触发分析
 */
export async function triggerManualAnalysis(
  symbols?: string[],
  config?: Partial<PriceDeviationConfig>,
): Promise<{
  success: boolean;
  message: string;
  results?: {
    symbolsAnalyzed: number;
    alertsGenerated: number;
    durationMs: number;
  };
}> {
  if (isRunning) {
    return { success: false, message: 'Analysis is already running' };
  }

  isRunning = true;
  const startTime = Date.now();
  const finalSymbols = symbols || DEFAULT_SCHEDULER_CONFIG.symbols;
  const finalConfig = config || DEFAULT_SCHEDULER_CONFIG.deviationConfig;

  try {
    logger.info('Starting manual cross-protocol analysis', {
      symbols: finalSymbols,
    });

    const results = await runCrossProtocolAnalysis(finalSymbols, finalConfig);

    const durationMs = Date.now() - startTime;
    totalRuns++;
    totalAlertsGenerated += results.alertsGenerated;
    lastRunTime = new Date();

    logger.info('Manual analysis completed', {
      durationMs,
      symbolsAnalyzed: results.analyzed,
      alertsGenerated: results.alertsGenerated,
    });

    return {
      success: true,
      message: `Analysis completed: ${results.analyzed} symbols analyzed, ${results.alertsGenerated} alerts generated`,
      results: {
        symbolsAnalyzed: results.analyzed,
        alertsGenerated: results.alertsGenerated,
        durationMs,
      },
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('Manual analysis failed', {
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });

    return {
      success: false,
      message: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    isRunning = false;
  }
}

/**
 * 获取调度器状态
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  isScheduled: boolean;
  lastRunTime: Date | null;
  totalRuns: number;
  totalAlertsGenerated: number;
  nextRunTime: Date | null;
} {
  const intervalMs = DEFAULT_SCHEDULER_CONFIG.intervalMinutes * 60 * 1000;
  const nextRunTime = lastRunTime
    ? new Date(lastRunTime.getTime() + intervalMs)
    : null;

  return {
    isRunning,
    isScheduled: schedulerInterval !== null,
    lastRunTime,
    totalRuns,
    totalAlertsGenerated,
    nextRunTime,
  };
}

/**
 * 更新调度器配置
 */
export function updateSchedulerConfig(
  updates: Partial<SchedulerConfig>,
): { success: boolean; message: string } {
  const wasRunning = schedulerInterval !== null;

  // 如果正在运行，先停止
  if (wasRunning) {
    stopAnalysisScheduler();
  }

  // 更新配置
  const newConfig = { ...DEFAULT_SCHEDULER_CONFIG, ...updates };

  // 如果之前正在运行且新配置启用了，重新启动
  if (wasRunning && newConfig.enabled) {
    return startAnalysisScheduler(newConfig);
  }

  // 更新默认配置
  Object.assign(DEFAULT_SCHEDULER_CONFIG, updates);

  logger.info('Scheduler configuration updated', {
    enabled: newConfig.enabled,
    intervalMinutes: newConfig.intervalMinutes,
    symbols: newConfig.symbols,
  });

  return { success: true, message: 'Configuration updated successfully' };
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * 初始化调度器（在应用启动时调用）
 */
export function initializeScheduler(): void {
  const autoStart = process.env.ENABLE_ANALYSIS_SCHEDULER === 'true';

  if (autoStart) {
    const interval = parseInt(process.env.ANALYSIS_INTERVAL_MINUTES || '5', 10);
    const symbols = process.env.ANALYSIS_SYMBOLS?.split(',') || DEFAULT_SCHEDULER_CONFIG.symbols;

    startAnalysisScheduler({
      enabled: true,
      intervalMinutes: interval,
      symbols,
    });

    logger.info('Analysis scheduler auto-started from environment configuration');
  } else {
    logger.info('Analysis scheduler auto-start is disabled');
  }
}
