# 预言机平台核心能力补足 - 任务列表

## [x] 任务 1: 创建数据库表结构

- **优先级**: P0
- **依赖**: 无
- **描述**:
  - 创建 `price_history` 表存储历史价格数据
  - 创建 `oracle_reliability_scores` 表存储可靠性评分
  - 添加必要的索引
- **验收标准**:
  - 数据库迁移成功执行
  - 表结构符合规格设计
- **子任务**:
  - [ ] 1.1 在 `src/lib/database/` 创建 `priceHistoryTables.ts`
  - [ ] 1.2 在 `src/lib/database/` 创建 `reliabilityTables.ts`
  - [ ] 1.3 更新 `schema.ts` 导入新表

## [x] 任务 2: 实现历史价格数据采集服务

- **优先级**: P0
- **依赖**: 任务 1
- **描述**:
  - 创建定时采集服务，每5分钟采集各预言机价格
  - 复用现有的 `priceFetcher.ts` 获取价格
  - 将价格数据存储到 `price_history` 表
- **验收标准**:
  - 采集服务正常运行
  - 价格数据正确存储
- **子任务**:
  - [ ] 2.1 创建 `src/features/oracle/services/priceHistoryCollector.ts`
  - [ ] 2.2 创建 API 端点 `/api/oracle/history/collect` 触发采集
  - [ ] 2.3 添加采集日志和错误处理

## [x] 任务 3: 实现可靠性评分计算服务

- **优先级**: P0
- **依赖**: 任务 1, 任务 2
- **描述**:
  - 创建评分计算服务
  - 基于历史偏差数据计算准确度、延迟、可用性评分
  - 计算综合评分并存储
- **验收标准**:
  - 评分算法正确实现
  - 评分数据正确存储
- **子任务**:
  - [ ] 3.1 创建 `src/features/oracle/services/reliabilityScorer.ts`
  - [ ] 3.2 实现评分计算算法
  - [ ] 3.3 创建 API 端点 `/api/oracle/reliability/calculate` 触发计算

## [x] 任务 4: 创建可靠性评分页面

- **优先级**: P1
- **依赖**: 任务 3
- **描述**:
  - 创建 `/oracle/reliability` 页面
  - 展示各协议可靠性评分卡片
  - 展示详细指标对比表格
  - 展示历史评分趋势图
- **验收标准**:
  - 页面正常渲染
  - 数据正确展示
- **子任务**:
  - [ ] 4.1 创建页面 `src/app/oracle/reliability/page.tsx`
  - [ ] 4.2 创建 API 端点 `/api/oracle/reliability` 获取评分数据
  - [ ] 4.3 创建组件 `ReliabilityScoreCard.tsx` 展示评分卡片
  - [ ] 4.4 创建组件 `ReliabilityComparisonTable.tsx` 展示对比表格
  - [ ] 4.5 创建组件 `ReliabilityTrendChart.tsx` 展示趋势图
  - [ ] 4.6 创建 Hook `useReliabilityScores.ts`

## [x] 任务 5: 增强偏差分析页面 - 添加历史趋势

- **优先级**: P1
- **依赖**: 任务 2
- **描述**:
  - 在偏差分析页面添加"历史趋势"Tab
  - 创建历史价格折线图组件
  - 创建历史偏差分布图组件
- **验收标准**:
  - 新Tab正常显示
  - 历史数据正确加载
- **子任务**:
  - [ ] 5.1 创建 API 端点 `/api/oracle/history/prices` 获取历史价格
  - [ ] 5.2 创建组件 `HistoricalPriceChart.tsx`
  - [ ] 5.3 创建组件 `HistoricalDeviationChart.tsx`
  - [ ] 5.4 更新 `DeviationContent.tsx` 添加新Tab
  - [ ] 5.5 创建 Hook `usePriceHistory.ts`

## [x] 任务 6: 添加导航和国际化

- **优先级**: P2
- **依赖**: 任务 4, 任务 5
- **描述**:
  - 在侧边栏导航添加"可靠性评分"入口
  - 添加中英文翻译
- **验收标准**:
  - 导航正确显示
  - 语言切换正常
- **子任务**:
  - [ ] 6.1 更新 `src/i18n/locales/zh/oracle.ts` 添加翻译
  - [ ] 6.2 更新 `src/i18n/locales/en/oracle.ts` 添加翻译
  - [ ] 6.3 更新侧边栏导航配置

## [x] 任务 7: 测试和验证

- **优先级**: P0
- **依赖**: 任务 1-6
- **描述**:
  - 编写单元测试
  - 运行 lint 和 typecheck
  - 验证功能完整性
- **验收标准**:
  - 测试通过
  - 无 lint 和类型错误
- **子任务**:
  - [ ] 7.1 运行 `npm run lint`
  - [ ] 7.2 运行 `npm run typecheck`
  - [ ] 7.3 运行 `npm run test`
  - [ ] 7.4 手动验证页面功能

---

# 任务依赖关系

```
任务 1 (数据库表)
    ├── 任务 2 (价格采集服务)
    │       └── 任务 5 (偏差分析增强)
    └── 任务 3 (评分计算服务)
            └── 任务 4 (可靠性页面)
                    └── 任务 6 (导航和国际化)
                            └── 任务 7 (测试验证)
```

# 可并行执行的任务

- 任务 2 和 任务 3 可以在任务 1 完成后并行执行
- 任务 4 和 任务 5 可以在各自依赖完成后并行执行
