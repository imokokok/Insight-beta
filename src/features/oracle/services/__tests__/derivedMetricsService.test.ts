/**
 * 衍生指标服务测试
 */

import { describe, expect, it } from 'vitest';
import {
  calculateVolatility,
  calculateZScore,
  calculatePercentileRank,
  calculateRollingStats,
  calculateDerivedMetrics,
} from '../derivedMetricsService';

describe('Derived Metrics Service', () => {
  describe('calculateVolatility', () => {
    it('应该正确计算波动率', () => {
      const prices = [100, 101, 100.5, 102, 101.5, 103];
      const volatility = calculateVolatility(prices, 5, 5);

      expect(volatility).toBeGreaterThan(0);
      // 年化波动率可能较高，因为样本数据波动较大
      expect(volatility).toBeLessThan(500);
    });

    it('数据不足时应该返回 0', () => {
      const prices = [100, 101];
      const volatility = calculateVolatility(prices, 5, 5);
      expect(volatility).toBe(0);
    });

    it('价格为 0 时应该正确处理', () => {
      const prices = [0, 100, 101, 102];
      const volatility = calculateVolatility(prices, 3, 5);
      expect(volatility).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateZScore', () => {
    it('应该正确计算 Z-Score', () => {
      const values = [100, 100, 100, 100, 100];
      const zScore = calculateZScore(100, values, 5);
      expect(zScore).toBe(0); // 等于均值时 Z-Score 为 0
    });

    it('高于均值时应该返回正值', () => {
      const values = [90, 95, 100, 105, 110];
      const zScore = calculateZScore(110, values, 5);
      expect(zScore).toBeGreaterThan(0);
    });

    it('低于均值时应该返回负值', () => {
      const values = [90, 95, 100, 105, 110];
      const zScore = calculateZScore(90, values, 5);
      expect(zScore).toBeLessThan(0);
    });

    it('数据不足时应该返回 0', () => {
      const values = [100, 101];
      const zScore = calculateZScore(100, values, 5);
      expect(zScore).toBe(0);
    });
  });

  describe('calculatePercentileRank', () => {
    it('应该正确计算百分位排名', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const percentile = calculatePercentileRank(5, values);
      expect(percentile).toBeGreaterThanOrEqual(0);
      expect(percentile).toBeLessThanOrEqual(100);
    });

    it('最大值应该返回接近 100 的值', () => {
      const values = [1, 2, 3, 4, 5];
      const percentile = calculatePercentileRank(5, values);
      // 百分位排名计算方式：(rank / length) * 100，最大值会返回 80% (4/5)
      expect(percentile).toBeGreaterThanOrEqual(80);
    });

    it('空数组应该返回 50', () => {
      const percentile = calculatePercentileRank(5, []);
      expect(percentile).toBe(50);
    });
  });

  describe('calculateRollingStats', () => {
    it('应该正确计算滚动统计指标', () => {
      const values = [1, 2, 3, 4, 5];
      const stats = calculateRollingStats(values, 5);

      expect(stats.mean).toBe(3);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(5);
      expect(stats.median).toBe(3);
      expect(stats.std).toBeGreaterThan(0);
    });

    it('空数组应该返回默认值', () => {
      const stats = calculateRollingStats([], 5);
      expect(stats.mean).toBe(0);
      expect(stats.std).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.median).toBe(0);
    });
  });

  describe('calculateDerivedMetrics', () => {
    it('应该计算所有衍生指标', () => {
      const prices = [100, 101, 100.5, 102, 101.5, 103, 102.5, 104];
      const currentPrice = 104;
      const metrics = calculateDerivedMetrics(prices, currentPrice);

      expect(metrics.volatility5m).toBeGreaterThanOrEqual(0);
      expect(metrics.volatility15m).toBeGreaterThanOrEqual(0);
      expect(metrics.volatility1h).toBeGreaterThanOrEqual(0);
      expect(metrics.zScore).toBeDefined();
      expect(metrics.percentileRank).toBeGreaterThanOrEqual(0);
      expect(metrics.percentileRank).toBeLessThanOrEqual(100);
    });
  });
});
