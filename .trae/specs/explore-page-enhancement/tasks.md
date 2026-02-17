# Tasks

## 阶段一：基础架构和组件重构（P0）

- [x] Task 1: 创建探索页面功能模块目录结构
  - [x] SubTask 1.1: 创建 `src/features/explore/` 目录
  - [x] SubTask 1.2: 创建 `components/`、`hooks/`、`types/`、`utils/` 子目录
  - [x] SubTask 1.3: 创建 `index.ts` 导出文件

- [x] Task 2: 重构探索页面主组件
  - [x] SubTask 2.1: 更新 `src/app/explore/page.tsx` 支持多Tab布局
  - [x] SubTask 2.2: 添加全局搜索组件到页面顶部
  - [x] SubTask 2.3: 创建快捷入口区域组件
  - [x] SubTask 2.4: 优化页面响应式布局

## 阶段二：市场概览功能（P0）

- [x] Task 3: 实现市场概览组件
  - [x] SubTask 3.1: 创建 `MarketOverview.tsx` 组件
  - [x] SubTask 3.2: 创建 `MarketHealthScore.tsx` 聚合健康评分组件
  - [x] SubTask 3.3: 创建 `MarketStats.tsx` 市场统计卡片组件
  - [x] SubTask 3.4: 创建 `RecentAnomalies.tsx` 最近异常摘要组件
  - [x] SubTask 3.5: 创建 `useMarketOverview.ts` hook 获取市场数据

## 阶段三：热门交易对功能（P1）

- [x] Task 4: 实现热门交易对组件
  - [x] SubTask 4.1: 创建 `TrendingFeeds.tsx` 主组件
  - [x] SubTask 4.2: 创建 `TrendingFeedCard.tsx` 交易对卡片组件
  - [x] SubTask 4.3: 创建 `SortSelector.tsx` 排序选择器组件
  - [x] SubTask 4.4: 创建 `useTrendingFeeds.ts` hook 获取排序数据
  - [x] SubTask 4.5: 实现排序逻辑（交易量、波动性、更新频率、关注度）

## 阶段四：数据发现功能（P1）

- [x] Task 5: 实现数据发现组件
  - [x] SubTask 5.1: 创建 `DataDiscovery.tsx` 主组件
  - [x] SubTask 5.2: 创建 `AnomalyPattern.tsx` 异常模式检测组件
  - [x] SubTask 5.3: 创建 `TrendInsight.tsx` 趋势洞察组件
  - [x] SubTask 5.4: 创建 `NewFeedAlert.tsx` 新Feed提醒组件
  - [x] SubTask 5.5: 创建 `useDataDiscovery.ts` hook 获取发现数据

## 阶段五：增强协议探索（P1）

- [x] Task 6: 增强协议探索组件
  - [x] SubTask 6.1: 为 `ProtocolExplorer.tsx` 添加协议类型筛选器
  - [x] SubTask 6.2: 添加价格范围筛选器
  - [x] SubTask 6.3: 添加24h涨跌幅筛选器
  - [x] SubTask 6.4: 添加健康状态筛选器
  - [x] SubTask 6.5: 添加搜索功能
  - [x] SubTask 6.6: 实现收藏功能（本地存储）

## 阶段六：增强地址探索（P1）

- [x] Task 7: 增强地址探索组件
  - [x] SubTask 7.1: 为 `AddressExplorer.tsx` 添加搜索历史功能
  - [x] SubTask 7.2: 优化热门地址快捷入口展示
  - [x] SubTask 7.3: 添加地址类型智能提示（合约/EOA）
  - [x] SubTask 7.4: 实现历史记录本地存储

## 阶段七：全局搜索功能（P1）

- [x] Task 8: 实现全局搜索组件
  - [x] SubTask 8.1: 创建 `GlobalSearch.tsx` 搜索组件
  - [x] SubTask 8.2: 创建 `SearchResults.tsx` 搜索结果下拉组件
  - [x] SubTask 8.3: 创建 `useGlobalSearch.ts` hook 处理搜索逻辑
  - [x] SubTask 8.4: 实现跨维度搜索（交易对、协议、地址、链）

## 阶段八：个性化功能（P2）

- [x] Task 9: 实现个性化功能
  - [x] SubTask 9.1: 创建 `useFavorites.ts` hook 管理收藏
  - [x] SubTask 9.2: 创建 `useHistory.ts` hook 管理浏览历史
  - [x] SubTask 9.3: 创建 `usePreferences.ts` hook 管理用户偏好
  - [x] SubTask 9.4: 创建 `FavoritesList.tsx` 收藏列表组件
  - [x] SubTask 9.5: 创建 `QuickAccess.tsx` 快捷入口组件

## 阶段九：移动端优化（P2）

- [x] Task 10: 优化移动端体验
  - [x] SubTask 10.1: 优化Tab为可滑动横向列表
  - [x] SubTask 10.2: 优化卡片为单列布局
  - [x] SubTask 10.3: 创建 `MobileFilterSheet.tsx` 移动端筛选面板
  - [x] SubTask 10.4: 优化搜索框固定在顶部

## 阶段十：API 支持（P1）

- [x] Task 11: 创建探索页面API端点
  - [x] SubTask 11.1: 创建 `/api/explore/market-overview` API
  - [x] SubTask 11.2: 创建 `/api/explore/trending` API 支持排序参数
  - [x] SubTask 11.3: 创建 `/api/explore/discovery` API
  - [x] SubTask 11.4: 创建 `/api/explore/search` API 支持全局搜索

## 阶段十一：验证和测试

- [x] Task 12: 验证功能完整性
  - [x] SubTask 12.1: 运行完整的测试套件
  - [x] SubTask 12.2: 运行类型检查
  - [x] SubTask 12.3: 运行 ESLint 检查
  - [x] SubTask 12.4: 验证构建成功
  - [x] SubTask 12.5: 进行跨浏览器兼容性测试
  - [x] SubTask 12.6: 进行移动端响应式测试

# Task Dependencies
- [Task 2] depends on [Task 1] (页面重构依赖目录结构)
- [Task 3] depends on [Task 1] (市场概览依赖目录结构)
- [Task 4] depends on [Task 1] (热门交易对依赖目录结构)
- [Task 5] depends on [Task 1] (数据发现依赖目录结构)
- [Task 6] depends on [Task 1] (协议探索增强依赖目录结构)
- [Task 7] depends on [Task 1] (地址探索增强依赖目录结构)
- [Task 8] depends on [Task 2] (全局搜索依赖页面结构)
- [Task 9] depends on [Task 6, Task 7] (个性化功能依赖探索组件)
- [Task 10] depends on [Task 2-9] (移动端优化在功能完成后)
- [Task 11] depends on [Task 1] (API可并行开发)
- [Task 12] depends on [Task 1-11] (最终验证)
