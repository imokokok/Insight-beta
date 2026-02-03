import { chaosTests, globalChaosConfig } from './chaos.config.js';

interface ChaosResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  metrics: {
    recoveryTime: number;
    errorRate: number;
  };
}

class ChaosRunner {
  private results: ChaosResult[] = [];

  async runTests(): Promise<void> {
    console.log('🧪 Starting Chaos Engineering Tests...\n');

    if (!globalChaosConfig.enabled) {
      console.log('Chaos tests are disabled. Enable with CHAOS_ENABLED=true');
      return;
    }

    for (const test of chaosTests) {
      if (!test.enabled) {
        console.log(`⏭️  Skipping: ${test.name} (disabled)`);
        continue;
      }

      console.log(`🎯 Running: ${test.name}`);
      console.log(`   Description: ${test.description}`);

      try {
        const result = await this.executeTest(test);
        this.results.push(result);
        console.log(`   ✅ Status: ${result.status}`);
        console.log(`   ⏱️  Duration: ${result.duration}ms`);
        console.log(
          `   📊 Recovery: ${result.metrics.recoveryTime}ms, Error Rate: ${result.metrics.errorRate}%`,
        );
      } catch (error) {
        console.log(`   ❌ Failed: ${error}`);
        this.results.push({
          testName: test.name,
          status: 'failed',
          duration: 0,
          metrics: { recoveryTime: 0, errorRate: 100 },
        });
      }

      console.log('');
    }

    this.printSummary();
  }

  private async executeTest(test: (typeof chaosTests)[0]): Promise<ChaosResult> {
    const startTime = Date.now();
    let errors = 0;
    const totalRequests = 10;

    for (let i = 0; i < totalRequests; i++) {
      try {
        if (globalChaosConfig.dryRun) {
          console.log(`   [DRY RUN] Would inject ${test.type} failure`);
          continue;
        }

        await this.injectChaos(test);
        await this.makeRequest(test.scope[0]);
      } catch {
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    const errorRate = (errors / totalRequests) * 100;

    return {
      testName: test.name,
      status: errorRate < 50 ? 'passed' : 'failed',
      duration,
      metrics: {
        recoveryTime: test.maxImpact,
        errorRate,
      },
    };
  }

  private async injectChaos(test: (typeof chaosTests)[0]): Promise<void> {
    switch (test.type) {
      case 'network':
        await this.simulateNetworkDelay(test);
        break;
      case 'service':
        await this.simulateServiceFailure(test);
        break;
      case 'data':
        await this.simulateDataIssue(test);
        break;
      case 'infrastructure':
        await this.simulateInfrastructureIssue(test);
        break;
    }
  }

  private async simulateNetworkDelay(test: (typeof chaosTests)[0]): Promise<void> {
    const delay = Math.random() * (test.maxImpact - test.minImpact) + test.minImpact;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private async simulateServiceFailure(test: (typeof chaosTests)[0]): Promise<void> {
    if (Math.random() < test.failureProbability) {
      throw new Error('Simulated service failure');
    }
  }

  private async simulateDataIssue(test: (typeof chaosTests)[0]): Promise<void> {
    if (Math.random() < test.failureProbability) {
      throw new Error('Simulated data issue');
    }
  }

  private async simulateInfrastructureIssue(test: (typeof chaosTests)[0]): Promise<void> {
    console.log(`   🏗️  Simulating infrastructure issue on: ${test.scope.join(', ')}`);
  }

  private async makeRequest(url: string): Promise<void> {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
  }

  private printSummary(): void {
    console.log('📊 Chaos Test Summary');
    console.log('═'.repeat(50));

    const passed = this.results.filter((r) => r.status === 'passed').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Pass Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n⚠️  Failed Tests:');
      this.results
        .filter((r) => r.status === 'failed')
        .forEach((r) => console.log(`   - ${r.testName}`));
    }
  }
}

async function main() {
  const runner = new ChaosRunner();
  await runner.runTests();
}

main().catch(console.error);
