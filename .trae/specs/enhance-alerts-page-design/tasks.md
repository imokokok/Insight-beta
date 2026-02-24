# Tasks

- [x] Task 1: 添加顶部状态栏组件
  - [x] SubTask 1.1: 在告警中心页面导入 TopStatusBar 组件
  - [x] SubTask 1.2: 配置 TopStatusBar 的健康状态计算逻辑（基于告警数据）
  - [x] SubTask 1.3: 集成自动刷新控制功能
  - [x] SubTask 1.4: 添加导出功能到状态栏

- [x] Task 2: 升级统计展示为 KPI 卡片网格
  - [x] SubTask 2.1: 导入 KpiOverview 和 KpiCard 组件
  - [x] SubTask 2.2: 将 StatsBar 数据转换为 KPI 卡片数据格式
  - [x] SubTask 2.3: 配置各指标的严重程度状态颜色
  - [x] SubTask 2.4: 添加加载状态骨架屏

- [x] Task 3: 应用深色背景主题
  - [x] SubTask 3.1: 为页面容器添加 `bg-[#0A0F1C]` 背景色
  - [x] SubTask 3.2: 为卡片组件应用半透明深色背景样式
  - [x] SubTask 3.3: 确保边框样式与专项分析页面一致

- [x] Task 4: 优化布局间距
  - [x] SubTask 4.1: 将页面级间距从 `space-y-6` 调整为 `space-y-3` 或 `space-y-4`
  - [x] SubTask 4.2: 调整卡片内边距为更紧凑的值
  - [x] SubTask 4.3: 优化筛选区域的布局

- [x] Task 5: 优化 Tab 导航和内容区域样式
  - [x] SubTask 5.1: 调整 Tab 列表的样式使其更紧凑
  - [x] SubTask 5.2: 优化 Tab 内容区域的卡片样式
  - [x] SubTask 5.3: 确保响应式布局正常工作

# Task Dependencies

- Task 2 依赖于 Task 1（需要先了解整体布局结构）
- Task 3、Task 4、Task 5 可以并行进行
