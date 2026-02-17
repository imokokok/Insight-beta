# Tasks

- [x] Task 1: 统一重复的常量定义
  - [x] SubTask 1.1: 将 VALID_SYMBOLS 提取到 src/config/constants.ts
  - [x] SubTask 1.2: 更新 cross-chain/comparison/route.ts 导入
  - [x] SubTask 1.3: 更新 cross-chain/history/route.ts 导入

- [x] Task 2: 统一重复的验证函数
  - [x] SubTask 2.1: 创建 src/lib/api/validation/index.ts
  - [x] SubTask 2.2: 将 validateSymbol 函数提取到该文件
  - [x] SubTask 2.3: 更新 cross-chain/comparison/route.ts 导入
  - [x] SubTask 2.4: 更新 cross-chain/history/route.ts 导入

- [x] Task 3: 统一模拟数据生成函数
  - [x] SubTask 3.1: 创建 src/shared/utils/mockData.ts
  - [x] SubTask 3.2: 将 generateMockData 函数提取到该文件
  - [x] SubTask 3.3: 更新 priceDeviationAnalytics.ts 导入
  - [x] SubTask 3.4: 更新 deviation/route.ts 导入

- [x] Task 4: 清理空的 feature 组件目录
  - [x] SubTask 4.1: 删除 src/features/security/components/ 目录
  - [x] SubTask 4.2: 更新相关导入路径

- [x] Task 5: 统一 API 响应格式
  - [x] SubTask 5.1: 更新 comparison/heatmap/route.ts 使用 apiSuccess()
  - [x] SubTask 5.2: 更新 oracle/stats/route.ts 使用 apiSuccess()

- [x] Task 6: 移除未使用的依赖
  - [x] SubTask 6.1: 检查并移除 drizzle-orm（已移除）
  - [x] SubTask 6.2: 保留 @walletconnect/ethereum-provider（实际在使用）
  - [x] SubTask 6.3: 保留 ioredis（实际在使用）

- [x] Task 7: 验证构建和测试
  - [x] SubTask 7.1: 运行 TypeScript 类型检查
  - [x] SubTask 7.2: 运行 ESLint 检查
  - [x] SubTask 7.3: 验证开发服务器正常运行

# Task Dependencies
- [Task 7] depends on [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6]
