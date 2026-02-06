/**
 * Price Aggregation Worker
 *
 * 在 Web Worker 中执行价格聚合计算
 * - 避免阻塞主线程
 * - 处理大量价格数据
 */

// 聚合计算函数
function aggregatePrices(prices) {
  if (!prices || prices.length === 0) {
    return null;
  }

  const validPrices = prices.filter((p) => typeof p === 'number' && !isNaN(p));

  if (validPrices.length === 0) {
    return null;
  }

  const sorted = [...validPrices].sort((a, b) => a - b);
  const sum = validPrices.reduce((a, b) => a + b, 0);
  const count = validPrices.length;

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / count,
    median: sorted[Math.floor(count / 2)],
    count,
    stdDev: calculateStdDev(validPrices, sum / count),
  };
}

function calculateStdDev(values, mean) {
  const squareDiffs = values.map((value) => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

function calculateDeviation(price, consensus) {
  if (!consensus || consensus === 0) return 0;
  return ((price - consensus) / consensus) * 100;
}

function processHeatmapData(data) {
  const { symbols, protocols, prices } = data;
  const result = {
    rows: [],
    protocols,
    lastUpdated: new Date().toISOString(),
    totalPairs: symbols.length,
    criticalDeviations: 0,
  };

  symbols.forEach((symbol) => {
    const symbolPrices = prices[symbol] || {};
    const allPrices = Object.values(symbolPrices).map((p) => p.price);
    const consensus = aggregatePrices(allPrices)?.median || 0;

    const cells = protocols.map((protocol) => {
      const priceData = symbolPrices[protocol];
      const price = priceData?.price || 0;
      const deviation = calculateDeviation(price, consensus);

      let deviationLevel = 'low';
      const absDeviation = Math.abs(deviation);
      if (absDeviation > 2) {
        deviationLevel = 'critical';
        result.criticalDeviations++;
      } else if (absDeviation > 1) {
        deviationLevel = 'high';
      } else if (absDeviation > 0.5) {
        deviationLevel = 'medium';
      }

      return {
        protocol,
        symbol,
        price,
        referencePrice: consensus,
        deviation: price - consensus,
        deviationPercent: deviation,
        deviationLevel,
        timestamp: priceData?.timestamp || new Date().toISOString(),
        isStale: priceData?.isStale || false,
      };
    });

    const deviations = cells.map((c) => Math.abs(c.deviationPercent));

    result.rows.push({
      symbol,
      baseAsset: symbol.split('/')[0] || '',
      quoteAsset: symbol.split('/')[1] || '',
      cells,
      maxDeviation: Math.max(...deviations),
      avgDeviation: deviations.reduce((a, b) => a + b, 0) / deviations.length,
      consensusPrice: consensus,
      consensusMethod: 'median',
    });
  });

  return result;
}

function processLatencyData(data) {
  const { protocols, metrics } = data;

  const protocolMetrics = {};
  protocols.forEach((protocol) => {
    const protocolData = metrics.filter((m) => m.protocol === protocol);
    const latencies = protocolData.map((m) => m.latency);

    protocolMetrics[protocol] = {
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      maxLatency: Math.max(...latencies),
      minLatency: Math.min(...latencies),
      p50: percentile(latencies, 0.5),
      p90: percentile(latencies, 0.9),
      p99: percentile(latencies, 0.99),
    };
  });

  return {
    protocolMetrics,
    summary: {
      totalProtocols: protocols.length,
      totalMetrics: metrics.length,
    },
    lastUpdated: new Date().toISOString(),
  };
}

function percentile(sortedValues, p) {
  const index = Math.ceil(sortedValues.length * p) - 1;
  return sortedValues[Math.max(0, index)];
}

// 消息处理器
self.onmessage = function (event) {
  const { id, type, input } = event.data;

  try {
    let result;

    switch (type) {
      case 'aggregatePrices':
        result = aggregatePrices(input.prices);
        break;

      case 'processHeatmap':
        result = processHeatmapData(input);
        break;

      case 'processLatency':
        result = processLatencyData(input);
        break;

      case 'calculateDeviations':
        result = input.prices.map((price) => ({
          price,
          deviation: calculateDeviation(price, input.consensus),
        }));
        break;

      default:
        throw new Error(`Unknown task type: ${type}`);
    }

    self.postMessage({
      id,
      type,
      payload: result,
    });
  } catch (error) {
    self.postMessage({
      id,
      type,
      payload: null,
      error: error.message,
    });
  }
};

// 心跳检测
setInterval(() => {
  self.postMessage({ type: 'ping', timestamp: Date.now() });
}, 30000);
