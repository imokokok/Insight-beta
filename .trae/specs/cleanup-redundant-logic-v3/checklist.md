# Checklist

## 常量定义统一
- [x] `VALID_SYMBOLS` 已提取到 `src/config/constants.ts`
- [x] cross-chain 路由已更新导入

## 验证函数统一
- [x] `validateSymbol` 已提取到 `src/lib/api/validation/index.ts`
- [x] cross-chain 路由已更新导入

## 模拟数据函数统一
- [x] `generateMockData` 已提取到 `src/shared/utils/mockData.ts`
- [x] 相关文件已更新导入

## 空目录清理
- [x] `src/features/security/components/` 空目录已删除
- [x] 相关导入已更新

## API 响应格式统一
- [x] `comparison/heatmap/route.ts` 已使用 apiSuccess()
- [x] `oracle/stats/route.ts` 已使用 apiSuccess()

## 未使用依赖清理
- [x] `drizzle-orm` 已从 package.json 移除
- [x] `@walletconnect/ethereum-provider` 保留（实际在使用）
- [x] `ioredis` 保留（实际在使用）

## 验证
- [x] TypeScript 类型检查通过（预先存在的错误与本次修改无关）
- [x] ESLint 检查通过（只有 warnings，无 errors）
- [x] 开发服务器正常运行
