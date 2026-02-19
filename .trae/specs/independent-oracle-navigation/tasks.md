# Tasks

## Phase 1: 导航结构调整

- [x] Task 1: 更新导航配置
  - [x] SubTask 1.1: 修改 EnhancedSidebar.tsx，移除预言机协议父导航
  - [x] SubTask 1.2: 添加 API3 独立导航入口
  - [x] SubTask 1.3: 添加 Band Protocol 独立导航入口
  - [x] SubTask 1.4: 更新导航图标和描述

- [x] Task 2: 更新国际化配置
  - [x] SubTask 2.1: 更新 zh/nav.ts 添加新导航翻译
  - [x] SubTask 2.2: 更新 en/nav.ts 添加新导航翻译
  - [x] SubTask 2.3: 添加 API3 页面相关翻译
  - [x] SubTask 2.4: 添加 Band Protocol 页面相关翻译

## Phase 2: API3 页面重构

- [x] Task 3: 创建 API3 统一入口页面
  - [x] SubTask 3.1: 创建 /oracle/api3/page.tsx 主页面
  - [x] SubTask 3.2: 实现协议概览卡片组件
  - [x] SubTask 3.3: 实现 Tab 切换逻辑
  - [x] SubTask 3.4: 整合现有 Airnodes 内容为 Tab

- [x] Task 4: 整合 API3 功能模块
  - [x] SubTask 4.1: 将 Airnodes 页面内容整合为 Tab
  - [x] SubTask 4.2: 将 OEV 页面内容整合为 Tab
  - [x] SubTask 4.3: 创建 dAPIs Tab 组件
  - [x] SubTask 4.4: 创建签名验证 Tab 组件

- [x] Task 5: 清理旧页面
  - [x] SubTask 5.1: 删除 /oracle/api3/airnodes/page.tsx
  - [x] SubTask 5.2: 删除 /oracle/api3/oev/page.tsx

## Phase 3: Band Protocol 页面重构

- [x] Task 6: 创建 Band Protocol 统一入口页面
  - [x] SubTask 6.1: 创建 /oracle/band/page.tsx 主页面
  - [x] SubTask 6.2: 实现协议概览卡片组件
  - [x] SubTask 6.3: 实现 Tab 切换逻辑
  - [x] SubTask 6.4: 整合现有数据桥内容为 Tab

- [x] Task 7: 整合 Band Protocol 功能模块
  - [x] SubTask 7.1: 将数据桥页面内容整合为 Tab
  - [x] SubTask 7.2: 将数据源页面内容整合为 Tab
  - [x] SubTask 7.3: 创建传输历史 Tab 组件
  - [x] SubTask 7.4: 创建 Cosmos 生态 Tab 组件

- [x] Task 8: 清理旧页面
  - [x] SubTask 8.1: 删除 /oracle/band/bridges/page.tsx
  - [x] SubTask 8.2: 删除 /oracle/band/sources/page.tsx

## Phase 4: 测试验证

- [x] Task 9: 功能测试
  - [x] SubTask 9.1: 验证导航跳转正确
  - [x] SubTask 9.2: 验证 API3 页面 Tab 切换正常
  - [x] SubTask 9.3: 验证 Band Protocol 页面 Tab 切换正常
  - [x] SubTask 9.4: 验证国际化文本正确显示

---

# Task Dependencies

- Task 2 依赖 Task 1（导航配置需要国际化支持）
- Task 3 和 Task 6 可以并行执行
- Task 4 依赖 Task 3
- Task 5 依赖 Task 4
- Task 7 依赖 Task 6
- Task 8 依赖 Task 7
- Task 9 依赖所有前置任务完成
