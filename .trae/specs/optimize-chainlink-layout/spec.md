# Chainlink 页面布局优化 - 解决页面过长问题

## Why

当前重构后的页面虽然采用了折叠面板，但所有功能模块都在一个页面上，导致：

1. **页面过长** - 用户需要大量滚动才能看到所有内容
2. **信息过载** - 首屏后太多内容，用户容易疲劳
3. **焦点分散** - 没有明确的内容层次，用户不知道从哪里开始看

## What Changes

采用 **"核心仪表盘 + Tab切换详细分析"** 的混合模式：

- 首屏保留核心仪表盘内容（KPI、价格图表、实时状态）
- 详细分析区域使用Tab切换，按功能分组
- 保持专业数据分析风格

## Impact

- Affected specs: refactor-chainlink-dashboard
- Affected code:
  - `src/app/oracle/chainlink/page.tsx` - 添加Tab切换逻辑
  - `src/features/oracle/chainlink/components/dashboard/` - 新增Tab组件

---

## ADDED Requirements

### Requirement: 混合布局模式

系统 SHALL 采用"核心仪表盘 + Tab切换"的混合布局模式。

#### Scenario: 首屏展示

- **WHEN** 用户访问Chainlink分析页面
- **THEN** 首屏应展示以下内容（一屏内可见）：
  1. 顶部状态栏（网络健康、连接状态、操作按钮）
  2. KPI概览区（4个核心指标卡片）
  3. 价格趋势图表（主图表）
  4. Tab导航栏（切换详细分析区域）
  5. 当前Tab的内容区域

#### Scenario: Tab导航

- **WHEN** 用户点击Tab导航
- **THEN** 切换到对应的详细分析区域
- **AND** 保持首屏内容不变
- **AND** URL更新以支持书签和分享

### Requirement: Tab分组策略

系统 SHALL 将详细分析功能按逻辑分组到Tab中。

#### Scenario: Tab分组

详细分析功能按以下方式分组：

| Tab名称      | 包含功能                     | 默认展开 |
| ------------ | ---------------------------- | -------- |
| **概览**     | 协议介绍、核心特性、支持的链 | ✅       |
| **喂价数据** | Feed聚合、OCR轮次监控        | ✅       |
| **节点监控** | 节点运营商、Heartbeat监控    | ✅       |
| **成本分析** | Gas成本分析、偏差触发统计    | ❌       |
| **高级分析** | 数据质量分析、多链价格对比   | ❌       |

#### Scenario: Tab内容加载

- **WHEN** 用户切换到某个Tab
- **THEN** 延迟加载该Tab的数据
- **AND** 显示加载状态
- **AND** 缓存已加载的数据

### Requirement: 快速导航

系统 SHALL 提供快速导航功能。

#### Scenario: 侧边快速导航

- **WHEN** 页面宽度 >= 1440px
- **THEN** 左侧显示快速导航栏
- **AND** 显示KPI摘要
- **AND** 显示告警摘要

#### Scenario: 移动端导航

- **WHEN** 页面宽度 < 1024px
- **THEN** 使用底部Tab导航
- **AND** 支持滑动切换Tab

### Requirement: URL状态同步

系统 SHALL 将Tab状态同步到URL。

#### Scenario: URL参数

- **WHEN** 用户切换Tab
- **THEN** URL更新为 `/oracle/chainlink?tab=feeds`
- **AND** 支持浏览器前进/后退
- **AND** 支持书签和分享

---

## MODIFIED Requirements

### Requirement: 页面布局结构

**原结构**（单页面滚动模式）：

```
<TopStatusBar />
<KpiOverview />
<协议介绍>
<核心特性>
<支持的链>
<价格趋势图表>
<Feed聚合面板>      <!-- 可折叠 -->
<OCR轮次面板>       <!-- 可折叠 -->
<节点运营商面板>    <!-- 可折叠 -->
<Heartbeat面板>     <!-- 可折叠 -->
<Gas成本面板>       <!-- 可折叠 -->
<偏差统计面板>      <!-- 可折叠 -->
<数据质量面板>      <!-- 可折叠 -->
<多链对比面板>      <!-- 可折叠 -->
```

**新结构**（混合模式）：

```
<TopStatusBar />
<KpiOverview />
<TabNavigation>     <!-- Tab导航栏 -->
  <Tab id="overview">概览</Tab>
  <Tab id="feeds">喂价数据</Tab>
  <Tab id="nodes">节点监控</Tab>
  <Tab id="costs">成本分析</Tab>
  <Tab id="advanced">高级分析</Tab>
</TabNavigation>

<TabContent>        <!-- Tab内容区域 -->
  {activeTab === 'overview' && (
    <>
      <协议介绍 />
      <核心特性 />
      <支持的链 />
      <价格趋势图表 />
    </>
  )}

  {activeTab === 'feeds' && (
    <>
      <Feed聚合面板 />
      <OCR轮次面板 />
    </>
  )}

  {activeTab === 'nodes' && (
    <>
      <节点运营商面板 />
      <Heartbeat面板 />
    </>
  )}

  {activeTab === 'costs' && (
    <>
      <Gas成本面板 />
      <偏差统计面板 />
    </>
  )}

  {activeTab === 'advanced' && (
    <>
      <数据质量面板 />
      <多链对比面板 />
    </>
  )}
</TabContent>
```

### Requirement: 首屏高度控制

首屏内容应控制在一屏内可见（约100vh）。

- 顶部状态栏：约60px
- KPI概览：约120px
- Tab导航：约48px
- 内容区域：剩余高度（约calc(100vh - 228px)）

---

## 组件详细规格

### 1. TabNavigation 组件

```typescript
interface TabNavigationProps {
  tabs: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number | string;
  }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}
```

### 2. TabContent 组件

```typescript
interface TabContentProps {
  activeTab: string;
  children: React.ReactNode;
  loading?: boolean;
}
```

---

## 用户体验优化

### 1. 首屏加载

- 首屏只加载当前Tab的数据
- 其他Tab延迟加载
- 已加载的Tab数据缓存

### 2. 切换动画

- Tab切换使用淡入淡出动画
- 内容区域平滑过渡

### 3. 滚动位置

- 切换Tab时重置滚动位置到顶部
- 返回已访问Tab时恢复滚动位置

### 4. 键盘导航

- 支持左右箭头键切换Tab
- 支持 Tab 键聚焦
- 支持 Enter 键选择
