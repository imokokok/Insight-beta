# Tasks

- [ ] Task 1: 优化侧边栏导航分组和活跃状态
  - [ ] SubTask 1.1: 为导航项添加分组标题（主要功能、分析工具等）
  - [ ] SubTask 1.2: 增强活跃状态视觉反馈（左侧边框、背景高亮）
  - [ ] SubTask 1.3: 为导航项添加 hover 描述提示

- [ ] Task 2: 添加移动端汉堡菜单
  - [ ] SubTask 2.1: 在 PageHeader 中添加汉堡菜单按钮（仅移动端显示）
  - [ ] SubTask 2.2: 实现移动端侧边栏抽屉组件
  - [ ] SubTask 2.3: 添加打开/关闭动画效果

- [ ] Task 3: 统一页面标题处理
  - [ ] SubTask 3.1: 移除各页面内部重复的标题定义
  - [ ] SubTask 3.2: 确保 DynamicPageHeader 正确显示所有路由标题
  - [ ] SubTask 3.3: 添加页面描述支持（可选显示）

- [ ] Task 4: 添加键盘快捷键支持
  - [ ] SubTask 4.1: 实现 Cmd/Ctrl + K 快速搜索对话框
  - [ ] SubTask 4.2: 添加快捷键提示到导航项

# Task Dependencies

- [Task 2] depends on [Task 1] (移动端菜单需要先有优化后的导航结构)
- [Task 3] 可与 [Task 1] 并行执行
- [Task 4] 可独立执行
