/**
 * Data Downsampling Utilities - 数据降采样工具
 *
 * 用于大数据集的可视化降采样
 * - LTTB (Largest Triangle Three Buckets) 算法
 * - 最小-最大降采样
 * - 平均值降采样
 */

export interface DataPoint {
  x: number;
  y: number;
  [key: string]: unknown;
}

/**
 * LTTB (Largest Triangle Three Buckets) 降采样算法
 * 在保持数据形状的同时大幅减少数据点数量
 *
 * @param data 原始数据点数组
 * @param threshold 目标数据点数量
 * @returns 降采样后的数据点数组
 */
export function lttbDownsample<T extends DataPoint>(data: T[], threshold: number): T[] {
  if (threshold >= data.length || threshold === 0) {
    return data;
  }

  const sampled: T[] = [];
  let sampledIndex = 0;

  // 始终保留第一个点
  const firstPoint = data[0];
  if (firstPoint) {
    sampled[sampledIndex++] = firstPoint;
  }

  // 桶大小
  const bucketSize = (data.length - 2) / (threshold - 2);

  let lastSelectedPoint = firstPoint;

  for (let i = 0; i < threshold - 2; i++) {
    // 计算当前桶的范围
    const bucketStart = Math.floor((i + 0) * bucketSize) + 1;
    const bucketEnd = Math.floor((i + 1) * bucketSize) + 1;

    // 计算下一桶的平均点
    const nextBucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const nextBucketEnd = Math.floor((i + 2) * bucketSize) + 1;

    let avgX = 0;
    let avgY = 0;
    let avgCount = 0;

    for (let j = nextBucketStart; j < nextBucketEnd && j < data.length; j++) {
      const point = data[j];
      if (point) {
        avgX += point.x;
        avgY += point.y;
        avgCount++;
      }
    }

    if (avgCount === 0) continue;

    avgX /= avgCount;
    avgY /= avgCount;

    // 在当前桶中选择使三角形面积最大的点
    let maxArea = -1;
    let maxAreaIndex = bucketStart;

    for (let j = bucketStart; j < bucketEnd && j < data.length; j++) {
      const point = data[j];
      if (!point || !lastSelectedPoint) continue;

      const area = Math.abs(
        (lastSelectedPoint.x - avgX) * (point.y - lastSelectedPoint.y) -
          (lastSelectedPoint.x - point.x) * (avgY - lastSelectedPoint.y),
      );

      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    const selectedPoint = data[maxAreaIndex];
    if (selectedPoint) {
      sampled[sampledIndex++] = selectedPoint;
      lastSelectedPoint = selectedPoint;
    }
  }

  // 始终保留最后一个点
  const lastPoint = data[data.length - 1];
  if (lastPoint) {
    sampled[sampledIndex++] = lastPoint;
  }

  return sampled;
}

/**
 * 最小-最大降采样
 * 在每个桶中保留最小值和最大值，适合显示极值
 *
 * @param data 原始数据点数组
 * @param threshold 目标数据点数量
 * @returns 降采样后的数据点数组
 */
export function minMaxDownsample<T extends DataPoint>(data: T[], threshold: number): T[] {
  if (threshold >= data.length || threshold === 0) {
    return data;
  }

  const sampled: T[] = [];
  const bucketSize = Math.ceil(data.length / (threshold / 2));

  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, i + bucketSize);

    if (bucket.length === 0) continue;

    // 找到桶中的最小值和最大值
    let minPoint: T | undefined = bucket[0];
    let maxPoint: T | undefined = bucket[0];

    for (const point of bucket) {
      if (!minPoint || point.y < minPoint.y) minPoint = point;
      if (!maxPoint || point.y > maxPoint.y) maxPoint = point;
    }

    if (!minPoint || !maxPoint) continue;

    // 按原始顺序添加
    if (minPoint.x < maxPoint.x) {
      sampled.push(minPoint);
      if (minPoint !== maxPoint) sampled.push(maxPoint);
    } else {
      sampled.push(maxPoint);
      if (minPoint !== maxPoint) sampled.push(minPoint);
    }
  }

  return sampled;
}

/**
 * 平均值降采样
 * 在每个桶中计算平均值，适合平滑数据
 *
 * @param data 原始数据点数组
 * @param threshold 目标数据点数量
 * @returns 降采样后的数据点数组
 */
export function averageDownsample<T extends DataPoint>(data: T[], threshold: number): T[] {
  if (threshold >= data.length || threshold === 0) {
    return data;
  }

  const sampled: T[] = [];
  const bucketSize = Math.ceil(data.length / threshold);

  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, i + bucketSize);

    if (bucket.length === 0) continue;

    const firstPoint = bucket[0];
    if (!firstPoint) continue;

    // 计算平均值
    let sumX = 0;
    let sumY = 0;

    for (const point of bucket) {
      sumX += point.x;
      sumY += point.y;
    }

    // 创建新的数据点（使用第一个点的其他属性）
    const avgPoint = {
      ...firstPoint,
      x: sumX / bucket.length,
      y: sumY / bucket.length,
    } as T;

    sampled.push(avgPoint);
  }

  return sampled;
}

/**
 * 智能降采样
 * 根据数据特征自动选择最佳降采样算法
 *
 * @param data 原始数据点数组
 * @param threshold 目标数据点数量
 * @returns 降采样后的数据点数组
 */
export function smartDownsample<T extends DataPoint>(data: T[], threshold: number): T[] {
  if (threshold >= data.length || threshold === 0) {
    return data;
  }

  // 根据数据特征选择算法
  const variance = calculateVariance(data.map((d) => d.y));

  // 高方差数据使用 LTTB 保持形状
  if (variance > 1000) {
    return lttbDownsample(data, threshold);
  }

  // 中等方差使用最小-最大
  if (variance > 100) {
    return minMaxDownsample(data, threshold);
  }

  // 低方差使用平均值
  return averageDownsample(data, threshold);
}

/**
 * 计算方差
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 多分辨率降采样
 * 生成多个分辨率级别的数据，用于缩放时切换
 *
 * @param data 原始数据点数组
 * @param levels 分辨率级别数量
 * @returns 各分辨率级别的数据数组
 */
export function multiResolutionDownsample<T extends DataPoint>(data: T[], levels: number): T[][] {
  if (levels <= 0 || data.length === 0) {
    return [data];
  }

  const result: T[][] = [];
  const maxThreshold = Math.min(data.length, 1000);
  const minThreshold = 50;

  for (let i = 0; i < levels; i++) {
    const ratio = i / (levels - 1);
    const threshold = Math.round(maxThreshold - (maxThreshold - minThreshold) * ratio);

    if (threshold >= data.length) {
      result.push(data);
    } else {
      result.push(lttbDownsample(data, threshold));
    }
  }

  return result;
}

/**
 * 获取适合当前视图范围的数据
 *
 * @param multiResData 多分辨率数据
 * @param viewRange 视图范围（像素宽度）
 * @returns 最适合的数据数组
 */
export function getDataForViewport<T extends DataPoint>(
  multiResData: T[][],
  viewRange: number,
): T[] {
  if (multiResData.length === 0) return [];

  // 根据视图范围选择合适的分辨率
  // 假设每个像素最多显示一个数据点
  const targetPoints = Math.max(50, Math.min(viewRange, 1000));

  // 找到最接近目标点数的数据级别
  let bestIndex = 0;
  let bestDiff = Infinity;

  for (let i = 0; i < multiResData.length; i++) {
    const data = multiResData[i];
    if (!data) continue;
    const diff = Math.abs(data.length - targetPoints);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  }

  return multiResData[bestIndex] ?? multiResData[0] ?? [];
}
