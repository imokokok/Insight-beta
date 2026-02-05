/**
 * Machine Learning Anomaly Detector
 * 机器学习异常检测器 (孤立森林, 聚类)
 */

export class MLDetector {
  /**
   * 简化版孤立森林检测
   * 使用随机分割来识别异常点
   */
  detectAnomaliesWithIsolationForest(
    data: number[],
    contamination: number = 0.1,
  ): Array<{ index: number; score: number; isAnomaly: boolean }> {
    const results: Array<{ index: number; score: number; isAnomaly: boolean }> = [];
    const numTrees = 10;
    const subSampleSize = Math.min(256, data.length);

    // 为每个数据点计算异常分数
    data.forEach((value, index) => {
      let totalPathLength = 0;

      for (let tree = 0; tree < numTrees; tree++) {
        totalPathLength += this.calculatePathLength(data, value, subSampleSize);
      }

      const avgPathLength = totalPathLength / numTrees;
      const score = Math.pow(2, -avgPathLength / this.averagePathLength(subSampleSize));
      const isAnomaly = score > 1 - contamination;

      results.push({ index, score, isAnomaly });
    });

    return results;
  }

  /**
   * 计算路径长度
   */
  private calculatePathLength(data: number[], value: number, subSampleSize: number): number {
    let pathLength = 0;
    let currentData = data.slice(0, subSampleSize);

    while (currentData.length > 1) {
      const min = Math.min(...currentData);
      const max = Math.max(...currentData);

      if (min === max) break;

      const splitValue = min + Math.random() * (max - min);

      if (value < splitValue) {
        currentData = currentData.filter((v) => v < splitValue);
      } else {
        currentData = currentData.filter((v) => v >= splitValue);
      }

      pathLength++;
    }

    return pathLength;
  }

  /**
   * 计算平均路径长度
   */
  private averagePathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
  }

  /**
   * K-Means 聚类检测
   */
  detectClusters(
    data: number[],
    k: number = 3,
  ): Array<{ index: number; cluster: number; distance: number }> {
    // 简化版 K-Means
    const centroids = this.initializeCentroids(data, k);
    const assignments = new Array(data.length).fill(0);

    // 迭代分配
    for (let iteration = 0; iteration < 10; iteration++) {
      // 分配点到最近的质心
      data.forEach((value, index) => {
        let minDistance = Infinity;
        let closestCluster = 0;

        centroids.forEach((centroid, clusterIndex) => {
          const distance = Math.abs(value - centroid);
          if (distance < minDistance) {
            minDistance = distance;
            closestCluster = clusterIndex;
          }
        });

        assignments[index] = closestCluster;
      });

      // 更新质心
      for (let i = 0; i < k; i++) {
        const clusterPoints = data.filter((_, index) => assignments[index] === i);
        if (clusterPoints.length > 0) {
          centroids[i] = clusterPoints.reduce((a, b) => a + b, 0) / clusterPoints.length;
        }
      }
    }

    // 计算每个点到其质心的距离
    return data.map((value, index) => {
      const clusterIndex = assignments[index] ?? 0;
      const centroid = centroids[clusterIndex] ?? 0;
      return {
        index,
        cluster: clusterIndex,
        distance: Math.abs(value - centroid),
      };
    });
  }

  /**
   * 初始化质心
   */
  private initializeCentroids(data: number[], k: number): number[] {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const step = (max - min) / (k + 1);
    return Array.from({ length: k }, (_, i) => min + step * (i + 1));
  }
}
