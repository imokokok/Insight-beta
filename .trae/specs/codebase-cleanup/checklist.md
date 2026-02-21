# 项目代码整理检查清单

## 阶段一：代码质量检查

- [x] 已执行 `npm run lint` 并记录所有警告
- [x] 已执行 `npm run typecheck` 并记录所有错误
- [x] 已清理未使用的导入
- [x] 已清理未使用的变量
- [x] 已清理未使用的类型定义
- [x] 已清理未使用的函数和组件

## 阶段二：导入规范统一

- [x] `src/components/` 目录下的导入已统一
- [x] `src/features/` 目录下的导入已统一
- [x] `src/app/` 目录下的导入已统一
- [x] `src/lib/` 目录下的导入已统一
- [x] UI 组件从 `@/components/ui` 导入
- [x] 通用组件从 `@/components/common` 导入
- [x] 值导入和类型导入已分离

## 阶段三：类型定义整理

- [x] `src/types/` 目录下的类型已审查
- [x] `src/features/*/types/` 下的类型已审查
- [x] 重复或相似的类型定义已识别
- [x] 共享类型已移至 `src/types/`
- [x] 关键类型已添加 JSDoc 注释
- [x] 类型导出规范已统一

## 阶段四：组件结构标准化

- [x] `src/components/ui/` 目录结构已检查
- [x] `src/components/common/` 目录结构已检查
- [x] `src/features/*/components/` 目录结构已检查
- [x] 每个组件目录都有 index.ts
- [x] 组件导出方式已统一
- [x] 组件 Props 类型定义已检查

## 阶段五：API 路由审查

- [x] 所有 API 路由已列出
- [x] 路由使用情况已检查
- [x] 冗余或废弃的路由已识别
- [x] API 错误处理已统一
- [x] API 响应格式已统一
- [x] Swagger 文档已检查完整性

## 阶段六：国际化文件整理

- [x] 中英文翻译对应关系已检查
- [x] 未使用的翻译键已清理
- [x] 翻译键命名规范已检查

## 阶段七：测试覆盖检查

- [x] 已运行 `npm run test:coverage`
- [x] 覆盖率报告已分析
- [x] 缺少测试的关键模块已识别

## 阶段八：最终验证

- [x] `npm run lint` 无警告
- [x] `npm run typecheck` 无错误
- [x] `npm run build` 构建成功
- [x] `npm run test:ci` 测试通过

## 文档完整性

- [x] spec.md 已创建
- [x] tasks.md 已创建
- [x] checklist.md 已创建
