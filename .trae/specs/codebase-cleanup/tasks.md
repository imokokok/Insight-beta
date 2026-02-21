# Tasks

## 阶段一：代码质量检查

- [x] Task 1: 运行代码检查工具并分析问题
  - [x] SubTask 1.1: 执行 `npm run lint` 并记录所有警告
  - [x] SubTask 1.2: 执行 `npm run typecheck` 并记录所有错误
  - [x] SubTask 1.3: 分析问题并分类（严重/中等/轻微）

- [x] Task 2: 清理未使用的代码
  - [x] SubTask 2.1: 清理未使用的导入（ESLint 自动修复）
  - [x] SubTask 2.2: 检查并移除未使用的变量
  - [x] SubTask 2.3: 检查并移除未使用的类型定义
  - [x] SubTask 2.4: 检查并移除未使用的函数和组件

## 阶段二：导入规范统一

- [x] Task 3: 统一导入顺序
  - [x] SubTask 3.1: 检查 `src/components/` 目录下的导入
  - [x] SubTask 3.2: 检查 `src/features/` 目录下的导入
  - [x] SubTask 3.3: 检查 `src/app/` 目录下的导入
  - [x] SubTask 3.4: 检查 `src/lib/` 目录下的导入

- [x] Task 4: 统一导入方式
  - [x] SubTask 4.1: 确保 UI 组件从 `@/components/ui` 导入
  - [x] SubTask 4.2: 确保通用组件从 `@/components/common` 导入
  - [x] SubTask 4.3: 将值导入和类型导入分离

## 阶段三：类型定义整理

- [x] Task 5: 审查类型定义
  - [x] SubTask 5.1: 审查 `src/types/` 目录下的类型
  - [x] SubTask 5.2: 审查 `src/features/*/types/` 下的类型
  - [x] SubTask 5.3: 识别重复或相似的类型定义

- [x] Task 6: 优化类型组织
  - [x] SubTask 6.1: 将共享类型移至 `src/types/`
  - [x] SubTask 6.2: 为关键类型添加 JSDoc 注释
  - [x] SubTask 6.3: 确保类型导出规范

## 阶段四：组件结构标准化

- [x] Task 7: 审查组件目录结构
  - [x] SubTask 7.1: 检查 `src/components/ui/` 目录结构
  - [x] SubTask 7.2: 检查 `src/components/common/` 目录结构
  - [x] SubTask 7.3: 检查 `src/features/*/components/` 目录结构

- [x] Task 8: 标准化组件导出
  - [x] SubTask 8.1: 确保每个组件目录都有 index.ts
  - [x] SubTask 8.2: 统一组件导出方式
  - [x] SubTask 8.3: 检查组件 Props 类型定义

## 阶段五：API 路由审查

- [x] Task 9: 审查 API 路由
  - [x] SubTask 9.1: 列出所有 API 路由
  - [x] SubTask 9.2: 检查路由使用情况
  - [x] SubTask 9.3: 识别冗余或废弃的路由

- [x] Task 10: 完善 API 规范
  - [x] SubTask 10.1: 检查 API 错误处理统一性
  - [x] SubTask 10.2: 检查 API 响应格式统一性
  - [x] SubTask 10.3: 检查 Swagger 文档完整性

## 阶段六：国际化文件整理

- [x] Task 11: 审查国际化文件
  - [x] SubTask 11.1: 检查中英文翻译对应关系
  - [x] SubTask 11.2: 清理未使用的翻译键
  - [x] SubTask 11.3: 检查翻译键命名规范

## 阶段七：测试覆盖检查

- [x] Task 12: 检查测试覆盖
  - [x] SubTask 12.1: 运行 `npm run test:coverage`
  - [x] SubTask 12.2: 分析覆盖率报告
  - [x] SubTask 12.3: 识别缺少测试的关键模块

## 阶段八：最终验证

- [x] Task 13: 运行完整检查
  - [x] SubTask 13.1: 执行 `npm run lint` 确保无警告
  - [x] SubTask 13.2: 执行 `npm run typecheck` 确保无错误
  - [x] SubTask 13.3: 执行 `npm run build` 确保构建成功
  - [x] SubTask 13.4: 执行 `npm run test:ci` 确保测试通过

# Task Dependencies

- Task 2 depends on Task 1
- Task 3-4 depend on Task 2
- Task 5-6 depend on Task 2
- Task 7-8 depend on Task 2
- Task 9-10 depend on Task 2
- Task 11 depends on Task 2
- Task 12 depends on Task 2
- Task 13 depends on Task 3-12
