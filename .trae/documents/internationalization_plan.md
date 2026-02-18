# 项目国际化 - 将所有硬编码文本国际化的实施计划

## 项目背景

项目已具备完善的国际化基础设施，包括：

- 自定义 i18n 模块，支持中英文双语
- TypeScript 类型安全的翻译键
- 翻译文件按功能模块组织（common、alerts、oracle、nav 等）
- 翻译验证和覆盖率测试脚本

## 任务概述

识别并将项目中所有硬编码的用户可见文本替换为使用翻译键的国际化实现。

---

## [ ] 任务 1：系统性搜索和识别所有硬编码的用户可见文本

- **Priority**: P0
- **Depends On**: None
- **Description**:
  - 扫描整个 src 目录的 .tsx 和 .ts 文件
  - 识别用户可见的硬编码字符串（标题、描述、按钮文本、占位符等）
  - 排除以下情况：代码注释、测试文件、内部变量名、API 路径、CSS 类名
- **Success Criteria**:
  - 完整识别所有需要国际化的硬编码文本
- **Test Requirements**:
  - `programmatic` TR-1.1: 扫描脚本无错误执行
  - `human-judgement` TR-1.2: 识别结果完整且准确
- **Notes**: 使用 Grep 和代码审查结合的方式

## [ ] 任务 2：处理 EnhancedSidebar.tsx 中的硬编码文本

- **Priority**: P0
- **Depends On**: 任务 1
- **Description**:
  - 处理 Insight 品牌名
  - 处理 Oracle Analytics 副标题
  - 处理 Insight Logo alt 文本
- **Success Criteria**:
  - 所有侧边栏用户可见文本都使用翻译键
- **Test Requirements**:
  - `programmatic` TR-2.1: 组件正常渲染无错误
  - `human-judgement` TR-2.2: 语言切换时侧边栏文本正确翻译
- **Notes**: 品牌名和副标题需添加到 app 翻译命名空间

## [ ] 任务 3：处理 DeviationContent.tsx 中的硬编码默认值

- **Priority**: P0
- **Depends On**: 任务 1
- **Description**:
  - 处理 '关键指标概览' 硬编码默认值
  - 确保所有文本都通过 t() 函数翻译
- **Success Criteria**:
  - 所有用户可见文本都使用翻译键
- **Test Requirements**:
  - `programmatic` TR-3.1: 组件正常渲染无错误
  - `human-judgement` TR-3.2: 语言切换时文本正确翻译
- **Notes**: 将硬编码字符串添加到 analytics 翻译命名空间

## [ ] 任务 4：处理 EmptyState.tsx 中的硬编码协议名称

- **Priority**: P1
- **Depends On**: 任务 1
- **Description**:
  - 处理 Chainlink、Pyth、RedStone、UMA 协议名称
  - 将这些协议名添加到 protocol 或 common 翻译命名空间
- **Success Criteria**:
  - 协议名称可翻译
- **Test Requirements**:
  - `programmatic` TR-4.1: 组件正常渲染无错误
  - `human-judgement` TR-4.2: 协议名称在不同语言下正确显示
- **Notes**: 协议名称可能需要保持英文原样或提供本地化译名

## [ ] 任务 5：处理 EmptyState.tsx 中的硬编码交易对

- **Priority**: P1
- **Depends On**: 任务 1
- **Description**:
  - 处理 ETH/USD、BTC/USD、LINK/USD 交易对
  - 考虑这些是否需要翻译或保持原样
- **Success Criteria**:
  - 交易对可配置或可翻译
- **Test Requirements**:
  - `programmatic` TR-5.1: 组件正常渲染无错误
- **Notes**: 交易对通常保持原样，但仍需检查

## [ ] 任务 6：处理 layout.tsx 中的硬编码 siteName

- **Priority**: P1
- **Depends On**: 任务 1
- **Description**:
  - 处理 'Insight' siteName 硬编码
  - 使用 translations[lang].app.title 或其他翻译键
- **Success Criteria**:
  - 元数据中的 siteName 可翻译
- **Test Requirements**:
  - `programmatic` TR-6.1: 页面元数据正确
  - `human-judgement` TR-6.2: 社交媒体预览显示正确的本地化标题
- **Notes**: 需要检查 translations 是否已经包含该键

## [ ] 任务 7：搜索并处理其他组件中的硬编码文本

- **Priority**: P0
- **Depends On**: 任务 1
- **Description**:
  - 系统扫描所有 .tsx 和 .ts 文件
  - 找出所有硬编码的用户可见文本
  - 逐个文件进行国际化处理
- **Success Criteria**:
  - 所有用户可见文本都已国际化
- **Test Requirements**:
  - `programmatic` TR-7.1: 所有修改的文件无 TypeScript 错误
  - `human-judgement` TR-7.2: 全面的代码审查确保无遗漏
- **Notes**: 此任务范围最大，需要仔细处理每个文件

## [ ] 任务 8：更新翻译文件，为新增的翻译键提供中英文对照

- **Priority**: P0
- **Depends On**: 任务 2-7
- **Description**:
  - 在 en/ 目录添加新的英文翻译键
  - 在 zh/ 目录添加对应的中文翻译
  - 确保所有新增的键在两个语言文件中都存在
- **Success Criteria**:
  - 中英文翻译文件完全同步
  - 新增翻译键类型安全
- **Test Requirements**:
  - `programmatic` TR-8.1: TypeScript 编译无错误
  - `human-judgement` TR-8.2: 翻译质量检查（准确、自然）
- **Notes**: 按功能模块组织翻译键

## [ ] 任务 9：运行翻译验证脚本确保所有翻译键完整

- **Priority**: P0
- **Depends On**: 任务 8
- **Description**:
  - 运行 npm run i18n:validate
  - 运行翻译覆盖率测试
  - 修复发现的任何问题
- **Success Criteria**:
  - 所有翻译验证通过
- **Test Requirements**:
  - `programmatic` TR-9.1: i18n:validate 脚本执行成功无警告
  - `programmatic` TR-9.2: 翻译覆盖率测试全部通过
- **Notes**: 确保无缺失的翻译键

## [ ] 任务 10：运行 TypeScript 类型检查和 lint 确保代码正确

- **Priority**: P0
- **Depends On**: 任务 2-9
- **Description**:
  - 运行 npm run typecheck
  - 运行 npm run lint
  - 修复发现的任何类型错误或 lint 警告
- **Success Criteria**:
  - 所有类型检查和 lint 通过
- **Test Requirements**:
  - `programmatic` TR-10.1: typecheck 无错误
  - `programmatic` TR-10.2: lint 无错误（或在可接受的警告数量内）
- **Notes**: 确保代码质量符合项目标准
