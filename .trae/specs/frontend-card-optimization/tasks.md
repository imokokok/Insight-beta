# 前端卡片样式优化 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 优化 Card 组件

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 为 Card 组件添加变体支持（默认、简洁、无边框）
  - 优化默认卡片样式，减少阴影和边框的视觉强度
  - 保持向后兼容性
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-1.1: Card 组件支持 variant 属性（default, subtle, borderless）
  - `programmatic` TR-1.2: 默认样式使用更柔和的阴影和边框
  - `human-judgement` TR-1.3: 视觉上比之前更简洁、更高级
- **Notes**: 确保所有现有使用 Card 的地方继续正常工作

## [x] Task 2: 创建无卡片容器组件

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 创建新的 Section/Group 组件
  - 提供分组内容但不使用卡片样式
  - 只提供间距和分组功能
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `programmatic` TR-2.1: 新组件可以正常渲染内容
  - `programmatic` TR-2.2: 组件提供适当的间距和分组
  - `human-judgement` TR-2.3: 视觉上比卡片更简洁
- **Notes**: 命名可以是 ContentGroup 或 SectionContainer

## [x] Task 3: 优化 StatCard 组件

- **Priority**: P0
- **Depends On**: Task 2
- **Description**:
  - 优化 EnhancedStatCard 组件，提供更紧凑的变体
  - 创建一体化的统计数据展示组件
  - 减少独立卡片的视觉分割
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `programmatic` TR-3.1: StatCard 支持更紧凑的变体
  - `programmatic` TR-3.2: 新的一体化统计组件可用
  - `human-judgement` TR-3.3: 统计数据区域看起来更一体化
- **Notes**: 参考现代金融/分析平台的统计展示方式

## [x] Task 4: 优化 Dashboard 页面

- **Priority**: P1
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - 使用优化后的组件重构 DashboardStats 组件
  - 统计数据区域使用更一体化的布局
  - 保持所有现有功能
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `programmatic` TR-4.1: Dashboard 页面正常加载和渲染
  - `programmatic` TR-4.2: 所有数据正确显示
  - `human-judgement` TR-4.3: 视觉上比之前更简洁高级
- **Notes**: 确保响应式布局正常工作

## [x] Task 5: 优化 Alerts 页面

- **Priority**: P1
- **Depends On**: Task 1, Task 2
- **Description**:
  - 优化 AlertCard 组件，提供更简洁的列表样式
  - 告警列表区域减少不必要的卡片包装
  - 保持所有现有功能和交互
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `programmatic` TR-5.1: Alerts 页面正常加载和渲染
  - `programmatic` TR-5.2: 所有功能正常工作（选择、筛选等）
  - `human-judgement` TR-5.3: 告警列表看起来更简洁
- **Notes**: 确保可访问性不受影响
