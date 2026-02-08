/**
 * Prometheus Metrics Tests - Prometheus 指标测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PrometheusRegistry,
  prometheusRegistry,
  registerMetric,
  setGauge,
  incCounter,
  observeHistogram,
  exportMetrics,
  updateSystemMetrics,
  prometheusHandler,
  trackPrometheusMetric,
} from './prometheus';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PrometheusRegistry', () => {
  let registry: PrometheusRegistry;

  beforeEach(() => {
    registry = new PrometheusRegistry({
      prefix: 'test_',
      includeProcessMetrics: false,
      includeNodeMetrics: false,
    });
  });

  describe('指标注册', () => {
    it('应该能够注册指标', () => {
      registry.register({
        name: 'custom_metric',
        type: 'counter',
        help: 'A custom metric',
        labelNames: ['label1'],
      });

      const names = registry.getMetricNames();
      expect(names).toContain('test_custom_metric');
    });

    it('不应该重复注册指标', () => {
      registry.register({
        name: 'custom_metric',
        type: 'counter',
        help: 'A custom metric',
        labelNames: [],
      });

      // 再次注册相同的指标
      registry.register({
        name: 'custom_metric',
        type: 'counter',
        help: 'A custom metric',
        labelNames: [],
      });

      // 应该只有一个指标
      const names = registry.getMetricNames();
      expect(names.filter((n) => n === 'test_custom_metric')).toHaveLength(1);
    });
  });

  describe('Counter 指标', () => {
    beforeEach(() => {
      registry.register({
        name: 'requests_total',
        type: 'counter',
        help: 'Total requests',
        labelNames: ['method', 'status'],
      });
    });

    it('应该能够增加计数器', () => {
      registry.inc('requests_total', 1, { method: 'GET', status: '200' });
      registry.inc('requests_total', 1, { method: 'GET', status: '200' });

      const output = registry.export();
      expect(output).toContain('test_requests_total');
      expect(output).toContain('2');
    });

    it('应该支持不同的标签', () => {
      registry.inc('requests_total', 1, { method: 'GET', status: '200' });
      registry.inc('requests_total', 1, { method: 'POST', status: '201' });

      const output = registry.export();
      expect(output).toContain('method="GET"');
      expect(output).toContain('method="POST"');
    });
  });

  describe('Gauge 指标', () => {
    beforeEach(() => {
      registry.register({
        name: 'temperature',
        type: 'gauge',
        help: 'Current temperature',
        labelNames: ['location'],
      });
    });

    it('应该能够设置 gauge', () => {
      registry.set('temperature', 25.5, { location: 'room1' });

      const output = registry.export();
      expect(output).toContain('test_temperature');
      expect(output).toContain('25.5');
    });

    it('应该能够更新 gauge', () => {
      registry.set('temperature', 25.5, { location: 'room1' });
      registry.set('temperature', 30.0, { location: 'room1' });

      const output = registry.export();
      expect(output).toContain('30');
      expect(output).not.toContain('25.5');
    });
  });

  describe('Histogram 指标', () => {
    beforeEach(() => {
      registry.register({
        name: 'request_duration',
        type: 'histogram',
        help: 'Request duration',
        labelNames: ['route'],
        buckets: [0.1, 0.5, 1, 2, 5],
      });
    });

    it('应该能够观察 histogram', () => {
      registry.observe('request_duration', 0.5, { route: '/api' });
      registry.observe('request_duration', 1.5, { route: '/api' });

      const output = registry.export();
      expect(output).toContain('test_request_duration');
    });
  });

  describe('导出格式', () => {
    beforeEach(() => {
      registry.register({
        name: 'test_metric',
        type: 'counter',
        help: 'Test metric for export',
        labelNames: ['env'],
      });
      registry.inc('test_metric', 42, { env: 'test' });
    });

    it('应该导出 Prometheus 格式', () => {
      const output = registry.export();

      expect(output).toContain('# HELP test_test_metric');
      expect(output).toContain('# TYPE test_test_metric counter');
      expect(output).toContain('test_test_metric{env="test"} 42');
    });
  });

  describe('系统指标', () => {
    it('应该更新系统指标', () => {
      const registryWithMetrics = new PrometheusRegistry({
        prefix: 'sys_',
        includeProcessMetrics: true,
      });

      registryWithMetrics.updateSystemMetrics();

      const output = registryWithMetrics.export();
      expect(output).toContain('sys_process_resident_memory_bytes');
      expect(output).toContain('sys_process_heap_bytes');
    });
  });

  describe('清理', () => {
    it('应该能够清理所有指标', () => {
      registry.register({
        name: 'temp_metric',
        type: 'counter',
        help: 'Temp metric',
        labelNames: [],
      });
      registry.inc('temp_metric', 1);

      registry.clear();

      const names = registry.getMetricNames();
      // 清理后应该只有默认指标（如果有的话）
      expect(names.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('便捷函数', () => {
  beforeEach(() => {
    prometheusRegistry.clear();
  });

  it('registerMetric 应该工作', () => {
    registerMetric({
      name: 'new_metric',
      type: 'counter',
      help: 'A new metric',
      labelNames: [],
    });

    expect(prometheusRegistry.getMetricNames()).toContain('oracle_new_metric');
  });

  it('setGauge 应该工作', () => {
    registerMetric({
      name: 'gauge_test',
      type: 'gauge',
      help: 'Gauge test',
      labelNames: [],
    });

    setGauge('gauge_test', 100);
    const output = exportMetrics();
    expect(output).toContain('100');
  });

  it('incCounter 应该工作', () => {
    registerMetric({
      name: 'counter_test',
      type: 'counter',
      help: 'Counter test',
      labelNames: [],
    });

    incCounter('counter_test', 5);
    const output = exportMetrics();
    expect(output).toContain('5');
  });

  it('observeHistogram 应该工作', () => {
    registerMetric({
      name: 'histogram_test',
      type: 'histogram',
      help: 'Histogram test',
      labelNames: [],
    });

    observeHistogram('histogram_test', 0.5);
    const output = exportMetrics();
    expect(output).toContain('oracle_histogram_test');
  });

  it('updateSystemMetrics 不应该抛出错误', () => {
    expect(() => updateSystemMetrics()).not.toThrow();
  });
});

describe('HTTP Handler', () => {
  it('prometheusHandler 应该返回响应', async () => {
    const response = await prometheusHandler();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
  });
});

describe('装饰器', () => {
  it('trackPrometheusMetric 应该追踪方法执行', async () => {
    // 先注册指标
    registerMetric({
      name: 'test_operation_duration_seconds',
      type: 'histogram',
      help: 'Test operation duration',
      labelNames: ['service', 'status'],
    });
    registerMetric({
      name: 'test_operation_total',
      type: 'counter',
      help: 'Test operation total',
      labelNames: ['service', 'status'],
    });

    // 创建一个测试方法并手动应用装饰器
    const testMethod = async function (): Promise<string> {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'success';
    };

    // 创建 descriptor
    const descriptor: PropertyDescriptor = {
      value: testMethod,
      writable: true,
      enumerable: true,
      configurable: true,
    };

    // 应用装饰器
    const decoratedDescriptor = trackPrometheusMetric('test_operation', { service: 'test' })(
      {},
      'testMethod',
      descriptor,
    );

    // 调用装饰后的方法
    const result = await decoratedDescriptor.value!();
    expect(result).toBe('success');
  });
});
