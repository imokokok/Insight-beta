import { handleApi, rateLimit } from '@/server/apiResponse';

interface PlatformStats {
  totalProtocols: number;
  totalPriceFeeds: number;
  supportedChains: number;
  avgUpdateLatency: number;
}

/**
 * @swagger
 * /api/oracle/unified/stats:
 *   get:
 *     summary: 获取统一预言机平台统计
 *     description: 获取跨协议预言机平台的统计数据
 *     tags:
 *       - Oracle
 *     responses:
 *       200:
 *         description: 成功获取平台统计数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalProtocols:
 *                       type: number
 *                       description: 支持的协议总数
 *                     totalPriceFeeds:
 *                       type: number
 *                       description: 价格喂价总数
 *                     supportedChains:
 *                       type: number
 *                       description: 支持的链数量
 *                     avgUpdateLatency:
 *                       type: number
 *                       description: 平均更新延迟（毫秒）
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器错误
 */

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'oracle_unified_stats_get',
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    // 返回平台统计数据
    // 注意：这些数据可以从数据库或外部服务获取，这里使用示例数据
    const stats: PlatformStats = {
      totalProtocols: 10,
      totalPriceFeeds: 150,
      supportedChains: 15,
      avgUpdateLatency: 500,
    };

    return {
      success: true,
      data: stats,
    };
  });
}
