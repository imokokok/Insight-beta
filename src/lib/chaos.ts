// Chaos Engineering Utilities
// This module provides utilities for injecting chaos into the system

import { logger } from '@/lib/logger';

import { chaosTests, globalChaosConfig } from '../../chaos.config';

// Chaos injection utilities
export class ChaosInjector {
  private activeTests: Set<string> = new Set();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  // Initialize chaos testing
  start(): void {
    if (!globalChaosConfig.enabled) {
      logger.debug('Chaos testing disabled');
      return;
    }

    logger.info('Starting chaos testing');

    // Start each enabled test
    chaosTests.forEach((test) => {
      if (test.enabled) {
        this.startTest(test);
      }
    });
  }

  // Stop chaos testing
  stop(): void {
    logger.info('Stopping chaos testing');

    // Clear all timers
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers.clear();
    this.activeTests.clear();
  }

  // Start a specific chaos test
  private startTest(test: (typeof chaosTests)[0]): void {
    const timer = setInterval(() => {
      if (Math.random() < test.failureProbability) {
        this.executeTest(test);
      }
    }, test.frequency);

    this.timers.set(test.name, timer);
    logger.info('Started chaos test', { name: test.name });
  }

  // Execute a chaos test
  private async executeTest(test: (typeof chaosTests)[0]): Promise<void> {
    if (this.activeTests.size >= globalChaosConfig.maxConcurrentTests) {
      return;
    }

    if (globalChaosConfig.dryRun) {
      logger.info('Chaos dry run', { name: test.name });
      return;
    }

    this.activeTests.add(test.name);
    logger.info('Executing chaos test', { name: test.name });

    try {
      // Execute the test based on type
      switch (test.type) {
        case 'network':
          await this.injectNetworkDelay(test);
          break;
        case 'service':
          await this.injectServiceFailure(test);
          break;
        case 'infrastructure':
          await this.injectInfrastructureFailure(test);
          break;
        case 'data':
          await this.injectDataCorruption(test);
          break;
      }

      // Wait for the test duration
      await new Promise((resolve) => setTimeout(resolve, test.duration));
    } catch (error) {
      logger.error('Error executing chaos test', { name: test.name, error });
    } finally {
      this.activeTests.delete(test.name);
      logger.info('Completed chaos test', { name: test.name });
    }
  }

  // Inject network delay
  private async injectNetworkDelay(test: (typeof chaosTests)[0]): Promise<void> {
    // This would be implemented with a proxy or middleware in a real system
    logger.info('Injecting network delay', {
      minImpact: test.minImpact,
      maxImpact: test.maxImpact,
      scope: test.scope.join(', '),
    });
  }

  // Inject service failure
  private async injectServiceFailure(test: (typeof chaosTests)[0]): Promise<void> {
    logger.info('Injecting service failure', { scope: test.scope.join(', ') });
  }

  // Inject infrastructure failure
  private async injectInfrastructureFailure(test: (typeof chaosTests)[0]): Promise<void> {
    logger.info('Injecting infrastructure failure', {
      scope: test.scope.join(', '),
    });
  }

  // Inject data corruption
  private async injectDataCorruption(test: (typeof chaosTests)[0]): Promise<void> {
    logger.info('Injecting data corruption', { scope: test.scope.join(', ') });
  }

  // Static method to check if chaos is enabled
  static isEnabled(): boolean {
    return globalChaosConfig.enabled;
  }

  // Static method to get random failure probability
  static getRandomFailureProbability(): number {
    return Math.random();
  }
}

// Singleton instance
export const chaosInjector = new ChaosInjector();

// Utility function to inject delays
export function withChaosDelay<T>(
  fn: () => Promise<T>,
  minDelay: number = 0,
  maxDelay: number = 1000,
): Promise<T> {
  if (!ChaosInjector.isEnabled()) {
    return fn();
  }

  const delay = minDelay + Math.random() * (maxDelay - minDelay);
  return new Promise((resolve) => {
    setTimeout(() => {
      fn()
        .then(resolve)
        .catch((error) => logger.error('Chaos delay execution failed', { error }));
    }, delay);
  });
}

// Utility function to inject random failures
export function withChaosFailure<T>(
  fn: () => Promise<T>,
  failureProbability: number = 0.1,
  errorMessage: string = 'Chaos injection: random failure',
): Promise<T> {
  if (!ChaosInjector.isEnabled()) {
    return fn();
  }

  if (Math.random() < failureProbability) {
    return Promise.reject(new Error(errorMessage));
  }

  return fn();
}
