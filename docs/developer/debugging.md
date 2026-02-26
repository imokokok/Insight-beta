# 调试指南

本文档将帮助你调试 Insight 应用中的常见问题。

## 概述

Insight 项目提供了多种调试工具和方法，帮助开发者快速定位和解决问题。

## 目录

- [日志查看方法](#日志查看方法)
- [浏览器开发者工具](#浏览器开发者工具)
- [React DevTools](#react-devtools)
- [API 调试](#api-调试)
- [数据库调试](#数据库调试)
- [性能分析工具](#性能分析工具)
- [常见错误及解决方法](#常见错误及解决方法)
- [调试技巧](#调试技巧)

---

## 日志查看方法

### 应用日志

应用使用结构化日志记录系统行为。日志级别可以通过环境变量配置：

```env
LOG_LEVEL="debug"  # 可选值: debug, info, warn, error
```

### 客户端日志

在浏览器控制台中查看客户端日志：

1. 打开 Chrome DevTools (F12 或 Cmd+Option+I)
2. 切换到 "Console" 标签
3. 使用过滤器查看不同级别的日志

### 服务端日志

开发服务器的日志会输出到终端：

```bash
npm run dev
```

日志格式示例：

```
[info] 应用启动成功
[debug] 连接到 Supabase
[error] RPC 请求失败: timeout
```

### Sentry 错误追踪

如果配置了 Sentry，可以在 Sentry 仪表板中查看错误详情：

- 访问 [sentry.io](https://sentry.io)
- 选择你的项目
- 查看 Issues 和 Performance 标签

---

## 浏览器开发者工具

### Network 面板

Network 面板用于监控网络请求：

1. 打开 DevTools → Network
2. 勾选 "Preserve log" 保留页面跳转日志
3. 使用过滤器筛选请求类型（XHR/Fetch）
4. 查看请求详情：
   - Headers: 请求头和响应头
   - Payload: 请求参数
   - Response: 响应内容
   - Timing: 请求耗时

**常用技巧**:

- 右键请求 → "Copy" → "Copy as cURL" 复制为 curl 命令
- 使用 "Block request URL" 模拟网络错误
- 使用 "Throttling" 模拟慢速网络

### Console 面板

Console 面板用于执行 JavaScript 和查看日志：

**常用命令**:

```javascript
// 查看组件状态（React DevTools 集成）
$r; // 选中组件的实例

// 清空控制台
clear();

// 计时
console.time('fetch');
// ... 代码
console.timeEnd('fetch');

// 表格输出
console.table(data);

// 分组日志
console.group('API 请求');
console.log('请求1');
console.log('请求2');
console.groupEnd();
```

### Application 面板

Application 面板用于查看本地存储、Cookie 等：

- **Local Storage**: 查看应用缓存的数据
- **Session Storage**: 查看会话数据
- **Cookies**: 查看和编辑 Cookie
- **IndexedDB**: 查看 IndexedDB 数据

---

## React DevTools

### 安装

React DevTools 是调试 React 应用的必备工具：

- Chrome: [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- Firefox: [React DevTools](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

### 使用方法

1. 打开 DevTools → Components
2. 选择组件查看 Props 和 State
3. 使用搜索框快速定位组件
4. 双击 Props/State 进行编辑（热更新）
5. 使用 "Highlight updates" 查看重渲染

### Profiler

Profiler 用于分析组件性能：

1. 切换到 "Profiler" 标签
2. 点击录制按钮开始录制
3. 执行需要分析的操作
4. 停止录制查看性能报告

**分析指标**:

- 渲染耗时
- 重渲染次数
- 组件渲染顺序

---

## API 调试

### Swagger UI

Insight 提供交互式 API 文档：

```
http://localhost:3000/api/docs/swagger
```

功能：

- 查看所有 API 端点
- 在线测试 API
- 查看请求/响应示例
- 导出 OpenAPI 规范

### curl 命令

使用 curl 测试 API：

```bash
# 健康检查
curl http://localhost:3000/api/health

# 获取告警列表
curl http://localhost:3000/api/alerts

# 创建告警规则（带认证）
curl -X POST http://localhost:3000/api/alerts/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "测试告警", "symbol": "ETH/USD"}'
```

### Postman/Thunder Client

推荐使用 API 测试工具：

- **Postman**: 功能强大的 API 测试工具
- **Thunder Client**: VS Code 轻量级扩展

**配置步骤**:

1. 设置 Base URL: `http://localhost:3000/api`
2. 添加认证 Header（如需要）
3. 保存常用请求为 Collection

---

## 数据库调试

### Drizzle Studio

Drizzle Studio 提供可视化数据库管理：

```bash
npm run db:studio
```

访问 `http://localhost:4983` 可以：

- 查看所有表和数据
- 执行 SQL 查询
- 编辑数据
- 查看 schema

### 直接执行 SQL

使用 `psql` 连接数据库：

```bash
# 连接数据库
psql $DATABASE_URL

# 常用 SQL 命令
\dt                    # 列出所有表
\d table_name          # 查看表结构
SELECT * FROM table_name LIMIT 10;  # 查询数据
```

### 数据库日志

启用数据库查询日志：

在 `src/lib/database/db.ts` 中添加日志配置，或使用环境变量：

```env
LOG_LEVEL="debug"
```

---

## 性能分析工具

### Chrome Performance

Chrome Performance 面板用于分析页面性能：

1. 打开 DevTools → Performance
2. 点击录制按钮
3. 执行用户操作
4. 停止录制查看性能火焰图

**分析要点**:

- Long Tasks（超过 50ms 的任务）
- 重排重绘
- JavaScript 执行时间

### Lighthouse

Lighthouse 用于审计网页质量：

```bash
# 命令行运行
npm run analyze:bundle

# 或在 Chrome DevTools 中使用
# DevTools → Lighthouse → Generate report
```

审计指标：

- Performance
- Accessibility
- Best Practices
- SEO
- PWA

### Bundle Analyzer

分析打包体积：

```bash
npm run analyze:bundle
```

这会打开一个可视化界面，显示各模块的体积占比。

---

## 常见错误及解决方法

### 数据库连接错误

**错误信息**:

```
Error: Connection terminated unexpectedly
```

**解决方案**:

1. 检查 `DATABASE_URL` 配置是否正确
2. 确认 Supabase 项目是否正常运行
3. 检查网络连接
4. 尝试重启开发服务器

### API 500 错误

**错误信息**:

```
Internal Server Error
```

**解决方案**:

1. 查看服务端日志获取详细错误
2. 检查 Sentry 错误追踪
3. 验证请求参数是否正确
4. 检查数据库权限

### 类型错误

**错误信息**:

```
TypeError: Cannot read property 'x' of undefined
```

**解决方案**:

1. 运行 `npm run typecheck` 检查类型
2. 使用可选链操作符 `?.`
3. 添加数据验证
4. 检查 API 响应数据结构

### 组件重渲染过多

**现象**: 页面卡顿，性能差

**解决方案**:

1. 使用 React DevTools Profiler 分析
2. 使用 `React.memo` 优化组件
3. 使用 `useMemo` 和 `useCallback`
4. 检查依赖数组是否正确

### 测试失败

**错误信息**: 测试用例失败

**解决方案**:

1. 查看测试输出的详细错误
2. 使用 `--reporter=verbose` 获取更多信息
3. 单独运行失败的测试: `npm run test -- path/to/test.tsx`
4. 使用 `--run --no-watch` 避免监视模式干扰

---

## 调试技巧

### 1. 二分法调试

当不确定问题所在时，使用二分法：

1. 注释掉一半代码
2. 测试问题是否还存在
3. 重复直到定位到问题代码

### 2. 快照对比

使用 Git 对比工作版本：

```bash
# 查看当前变更
git diff

# 暂存当前变更，测试干净版本
git stash
# 测试...
git stash pop
```

### 3. 条件断点

在 Chrome DevTools 中使用条件断点：

1. 在 Sources 面板找到代码
2. 点击行号设置断点
3. 右键断点 → "Edit breakpoint"
4. 输入条件，例如：`user.id === '123'`

### 4. 日志点

不修改代码添加日志：

1. 在 Sources 面板右键行号
2. 选择 "Add log point"
3. 输入日志消息，例如：`"User ID: {user.id}"`

### 5. 模拟数据

使用演示模式快速测试 UI：

```env
INSIGHT_DEMO_MODE="true"
```

### 6. 环境变量调试

打印所有环境变量：

```javascript
console.log('Environment:', process.env);
```

### 7. 网络代理

使用 Charles 或 Fiddler 抓包：

1. 配置代理
2. 拦截和修改请求
3. 模拟网络错误

### 8. 时间旅行调试

使用 Playwright Trace Viewer 进行 E2E 调试：

```bash
# 运行测试并生成 trace
npm run test:e2e -- --trace on

# 查看 trace
npx playwright show-trace trace.zip
```

---

## 其他调试工具

### VS Code 调试

配置 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Next.js",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

### 移动端调试

使用 Chrome DevTools 调试移动端：

1. Android: Chrome → 更多工具 → 远程设备
2. iOS: Safari → 开发 → 模拟器

---

**返回 [文档总索引](../README.md)**
