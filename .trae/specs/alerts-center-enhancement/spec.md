# 告警中心页面增强 Spec

## Why
告警中心作为预言机数据分析平台的核心监控模块，当前仅具备基础的告警展示功能，缺乏告警生命周期管理、通知配置、规则管理等关键能力，无法满足专业运维和监控需求。

## What Changes
- 新增告警规则管理功能（创建、编辑、启用/禁用、删除规则）
- 新增告警确认和处理操作（确认、解决、静默）
- 新增通知渠道配置功能（Webhook、Email、Telegram）
- 新增告警历史趋势分析图表
- 新增批量操作功能
- 新增告警分组和聚合视图
- 新增告警优先级智能排序
- 新增告警响应时间统计
- 新增告警静默（Snooze）功能
- **BREAKING** 重构告警数据结构，统一 `AlertStatus` 类型定义

## Impact
- Affected specs: alerts, notifications, rules
- Affected code: 
  - `src/app/alerts/page.tsx`
  - `src/features/alerts/**`
  - `src/app/api/alerts/**`
  - `src/types/oracle/alert.ts`

## ADDED Requirements

### Requirement: 告警规则管理
系统应提供完整的告警规则管理功能，允许用户创建、编辑、启用/禁用和删除告警规则。

#### Scenario: 创建告警规则
- **WHEN** 用户点击"创建规则"按钮
- **THEN** 系统显示规则配置表单，包含事件类型、严重程度、协议/链筛选、阈值配置、通知渠道等选项
- **AND** 用户填写完成后点击保存，规则生效并开始监控

#### Scenario: 编辑告警规则
- **WHEN** 用户选择一个现有规则并点击编辑
- **THEN** 系统显示预填充的规则配置表单
- **AND** 用户修改后保存，规则更新生效

#### Scenario: 启用/禁用告警规则
- **WHEN** 用户切换规则的启用状态
- **THEN** 系统立即应用新状态，禁用的规则不再触发告警

### Requirement: 告警确认和处理
系统应允许用户对告警进行确认、解决和静默操作，并记录操作历史。

#### Scenario: 确认告警
- **WHEN** 用户点击告警的"确认"按钮
- **THEN** 告警状态变为"investigating"，记录确认人和确认时间

#### Scenario: 解决告警
- **WHEN** 用户点击告警的"解决"按钮并填写解决说明
- **THEN** 告警状态变为"resolved"，记录解决人、解决时间和说明

#### Scenario: 静默告警
- **WHEN** 用户选择静默告警并指定静默时长
- **THEN** 该告警在指定时间内不再触发通知，但保持可见

### Requirement: 通知渠道配置
系统应支持多种通知渠道配置，包括Webhook、Email、Telegram等。

#### Scenario: 配置Webhook通知
- **WHEN** 用户添加Webhook通知渠道
- **THEN** 系统验证URL有效性并保存配置
- **AND** 后续告警通过该Webhook发送通知

#### Scenario: 配置Email通知
- **WHEN** 用户添加Email通知渠道
- **THEN** 系统验证邮箱格式并保存配置
- **AND** 后续告警通过邮件发送通知

### Requirement: 告警历史趋势分析
系统应提供告警历史趋势的可视化分析，帮助用户识别告警模式。

#### Scenario: 查看告警趋势
- **WHEN** 用户查看告警趋势图表
- **THEN** 系统展示按时间分布的告警数量趋势线
- **AND** 支持按严重程度、来源分组查看

#### Scenario: 告警热力图
- **WHEN** 用户切换到热力图视图
- **THEN** 系统展示告警在时间维度和来源维度的分布热力图

### Requirement: 批量操作
系统应支持对多个告警进行批量操作。

#### Scenario: 批量确认告警
- **WHEN** 用户选择多个告警并点击批量确认
- **THEN** 所有选中的告警状态变为"investigating"

#### Scenario: 批量解决告警
- **WHEN** 用户选择多个告警并点击批量解决
- **THEN** 所有选中的告警状态变为"resolved"

### Requirement: 告警分组和聚合
系统应支持告警的分组和聚合展示，减少告警噪音。

#### Scenario: 按规则分组
- **WHEN** 用户选择按规则分组
- **THEN** 相同规则触发的告警聚合显示，展示告警数量

#### Scenario: 按符号分组
- **WHEN** 用户选择按符号分组
- **THEN** 相同交易对的告警聚合显示

### Requirement: 告警优先级智能排序
系统应根据告警严重程度、新鲜度、影响范围等因素智能排序告警。

#### Scenario: 智能排序
- **WHEN** 用户选择智能排序模式
- **THEN** 系统按综合评分排序告警，critical且新鲜的告警优先展示

### Requirement: 告警响应时间统计
系统应统计和展示告警的响应时间指标。

#### Scenario: 查看响应时间统计
- **WHEN** 用户查看响应时间面板
- **THEN** 系统展示平均确认时间、平均解决时间、MTTR等指标

### Requirement: 告警静默规则
系统应支持创建静默规则，在特定条件下自动静默告警。

#### Scenario: 创建静默规则
- **WHEN** 用户创建静默规则，指定匹配条件和静默时长
- **THEN** 匹配的告警在指定时间内不触发通知

## MODIFIED Requirements

### Requirement: 告警状态类型统一
原有的 `AlertStatus` 类型定义存在不一致（部分为小写，部分为大小写混合），需统一为小写格式。

```typescript
export type AlertStatus = 'active' | 'investigating' | 'resolved' | 'silenced';
```

## REMOVED Requirements
无移除的需求。
