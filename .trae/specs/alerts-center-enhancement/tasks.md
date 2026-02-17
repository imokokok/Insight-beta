# Tasks

## 阶段一：告警操作功能（P0）

- [x] Task 1: 实现告警确认和解决操作
  - [x] SubTask 1.1: 创建 `AlertActionButtons.tsx` 组件，包含确认、解决、静默按钮
  - [x] SubTask 1.2: 创建 `useAlertActions.ts` hook 处理告警操作逻辑
  - [x] SubTask 1.3: 实现 `PATCH /api/alerts/[id]` 接口支持状态更新
  - [x] SubTask 1.4: 在 `AlertDetailPanel` 中集成操作按钮
  - [x] SubTask 1.5: 添加操作确认弹窗和操作说明输入

- [x] Task 2: 实现告警静默功能
  - [x] SubTask 2.1: 创建 `SilenceDialog.tsx` 组件，支持选择静默时长
  - [x] SubTask 2.2: 更新 `UnifiedAlert` 类型添加 `silencedUntil` 字段
  - [x] SubTask 2.3: 实现静默状态在列表和详情中的展示

## 阶段二：批量操作功能（P0）

- [x] Task 3: 实现告警批量选择和操作
  - [x] SubTask 3.1: 为 `AlertCard` 添加复选框选择功能
  - [x] SubTask 3.2: 创建 `AlertBatchActions.tsx` 批量操作工具栏组件
  - [x] SubTask 3.3: 创建 `useAlertSelection.ts` hook 管理选中状态
  - [x] SubTask 3.4: 实现 `POST /api/alerts/batch` 批量操作接口
  - [x] SubTask 3.5: 添加全选和反选功能

## 阶段三：告警规则管理（P1）

- [x] Task 4: 创建告警规则管理模块
  - [x] SubTask 4.1: 创建 `AlertRulesList.tsx` 规则列表组件
  - [x] SubTask 4.2: 创建 `AlertRuleForm.tsx` 规则配置表单组件
  - [x] SubTask 4.3: 创建 `useAlertRules.ts` hook 管理规则状态
  - [x] SubTask 4.4: 实现 `GET/POST/PATCH/DELETE /api/alerts/rules` 接口
  - [x] SubTask 4.5: 在页面添加规则管理 Tab

- [x] Task 5: 实现规则配置功能
  - [x] SubTask 5.1: 实现事件类型选择器
  - [x] SubTask 5.2: 实现阈值配置输入
  - [x] SubTask 5.3: 实现协议/链筛选配置
  - [x] SubTask 5.4: 实现通知渠道选择

## 阶段四：通知渠道配置（P1）

- [x] Task 6: 实现通知渠道管理
  - [x] SubTask 6.1: 创建 `NotificationChannels.tsx` 渠道列表组件
  - [x] SubTask 6.2: 创建 `WebhookConfig.tsx` Webhook配置表单
  - [x] SubTask 6.3: 创建 `EmailConfig.tsx` Email配置表单
  - [x] SubTask 6.4: 创建 `TelegramConfig.tsx` Telegram配置表单
  - [x] SubTask 6.5: 实现 `GET/POST/DELETE /api/alerts/channels` 接口
  - [x] SubTask 6.6: 实现渠道测试功能（发送测试通知）

## 阶段五：告警历史分析（P1）

- [x] Task 7: 实现告警趋势图表
  - [x] SubTask 7.1: 创建 `AlertTrendChart.tsx` 趋势图组件
  - [x] SubTask 7.2: 创建 `AlertHeatmap.tsx` 热力图组件
  - [x] SubTask 7.3: 创建 `useAlertHistory.ts` hook 获取历史数据
  - [x] SubTask 7.4: 实现 `GET /api/alerts/history` 接口
  - [x] SubTask 7.5: 在页面添加分析 Tab

- [x] Task 8: 实现响应时间统计
  - [x] SubTask 8.1: 创建 `ResponseTimeStats.tsx` 响应时间统计卡片
  - [x] SubTask 8.2: 计算并展示 MTTR、平均确认时间等指标
  - [x] SubTask 8.3: 添加响应时间趋势图

## 阶段六：告警分组和智能排序（P2）

- [x] Task 9: 实现告警分组功能
  - [x] SubTask 9.1: 创建 `AlertGroupSelector.tsx` 分组选择器组件
  - [x] SubTask 9.2: 实现按规则分组视图
  - [x] SubTask 9.3: 实现按符号分组视图
  - [x] SubTask 9.4: 创建 `AlertGroup.tsx` 分组展示组件

- [x] Task 10: 实现智能排序
  - [x] SubTask 10.1: 创建 `alertScoring.ts` 告警评分算法
  - [x] SubTask 10.2: 实现排序模式切换（时间/智能/严重程度）
  - [x] SubTask 10.3: 在筛选栏添加排序选择器

## 阶段七：UI增强和优化（P2）

- [ ] Task 11: UI视觉优化
  - [ ] SubTask 11.1: 优化告警卡片视觉设计（严重程度颜色渐变）
  - [ ] SubTask 11.2: 添加告警声音提示选项
  - [ ] SubTask 11.3: 实现告警详情面板动画效果
  - [ ] SubTask 11.4: 添加快捷键支持（确认: A, 解决: R, 静默: S）

- [ ] Task 12: 移动端适配优化
  - [ ] SubTask 12.1: 优化移动端告警列表布局
  - [ ] SubTask 12.2: 优化移动端操作按钮布局
  - [ ] SubTask 12.3: 实现移动端滑动操作

## 阶段八：验证和测试

- [x] Task 13: 验证功能完整性
  - [x] SubTask 13.1: 运行类型检查 `npm run typecheck`
  - [x] SubTask 13.2: 运行 ESLint 检查 `npm run lint`
  - [x] SubTask 13.3: 验证构建成功 `npm run build`
  - [x] SubTask 13.4: 手动测试所有新增功能

# Task Dependencies
- [Task 2] depends on [Task 1] (静默功能依赖基础操作)
- [Task 3] depends on [Task 1] (批量操作依赖单条操作)
- [Task 5] depends on [Task 4] (规则配置依赖规则管理基础)
- [Task 6] depends on [Task 4] (通知渠道配置依赖规则管理)
- [Task 7] depends on [Task 1] (历史分析依赖基础功能)
- [Task 8] depends on [Task 7] (响应时间统计依赖历史数据)
- [Task 9] depends on [Task 1-3] (分组功能依赖基础操作)
- [Task 10] depends on [Task 9] (智能排序依赖分组基础)
- [Task 11] depends on [Task 1-10] (UI优化在功能完成后)
- [Task 12] depends on [Task 11] (移动端优化在UI优化后)
- [Task 13] depends on [Task 1-12] (最终验证)
