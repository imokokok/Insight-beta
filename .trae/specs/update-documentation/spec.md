# 文档同步更新规格

## Why

项目经过长期开发和多次更新，代码库已经发生了显著变化，但文档未能同步更新，导致文档与实际代码不一致。需要进行系统性的文档更新以确保：

- 文档准确反映当前代码实现
- 技术栈版本信息正确
- 功能描述与实际功能一致
- API文档完整
- 架构描述准确

## What Changes

- 更新 README.md 中的技术栈版本和功能描述
- 更新 docs/README.md 文档中心索引
- 更新 docs/architecture/ 下的架构文档
- 更新 docs/user-guide/ 下的用户文档
- 完善 docs/developer/api.md API文档
- 更新 CHANGELOG.md 变更记录
- 同步更新 .trae/specs/ 下的规格文档状态

## Impact

- Affected specs: 所有现有规格文档
- Affected code: 所有文档文件（非代码文件）

---

## 当前代码实际状态分析

### 一、技术栈版本（实际）

| 技术         | 版本   | 文档中版本 | 需更新 |
| ------------ | ------ | ---------- | ------ |
| Next.js      | 16.1.6 | 16         | ✅     |
| React        | 19.0.0 | 19         | ✅     |
| TypeScript   | 5.7.3  | 5.7        | ✅     |
| Tailwind CSS | 3.4.17 | 3.4        | ✅     |
| PostgreSQL   | 16+    | 16         | ✅     |
| Node.js      | 20+    | 20+        | -      |

### 二、预言机协议支持（实际）

根据代码分析，实际支持的协议：

| 协议      | API路由                   | 组件                              | 文档提及 | 状态     |
| --------- | ------------------------- | --------------------------------- | -------- | -------- |
| Chainlink | `/api/oracle/chainlink/*` | `src/features/oracle/chainlink/`  | ✅       | 完整支持 |
| Pyth      | `/api/oracle/pyth/*`      | `src/features/oracle/pyth/`       | ✅       | 完整支持 |
| API3      | `/api/oracle/api3/*`      | `src/features/oracle/api3/`       | ❌       | 文档缺失 |
| Band      | `/api/oracle/band/*`      | `src/features/oracle/band/`       | ❌       | 文档缺失 |
| UMA       | `/api/oracle/uma/*`       | `src/features/oracle/components/` | ✅       | 部分支持 |

**注意**: README.md 提到 RedStone，但代码中未发现相关实现。

### 三、功能模块（实际）

#### API 路由统计

| 模块        | 路由数量 | 主要端点             |
| ----------- | -------- | -------------------- |
| alerts      | 7        | `/api/alerts/*`      |
| comparison  | 6        | `/api/comparison/*`  |
| cross-chain | 6        | `/api/cross-chain/*` |
| oracle      | 40+      | `/api/oracle/*`      |
| explore     | 4        | `/api/explore/*`     |
| health      | 1        | `/api/health`        |
| metrics     | 1        | `/api/metrics`       |
| cron        | 2        | `/api/cron/*`        |
| sse         | 1        | `/api/sse/price`     |

#### Features 模块结构

```
src/features/
├── alerts/          # 告警系统 (完整)
├── comparison/      # 价格比较 (完整)
├── cross-chain/     # 跨链分析 (完整)
├── dashboard/       # 仪表板 (完整)
├── explore/         # 数据探索 (完整)
├── oracle/          # 预言机分析 (完整)
│   ├── analytics/   # 偏差分析、争议分析
│   ├── api3/        # API3 协议分析
│   ├── band/        # Band Protocol 分析
│   ├── chainlink/   # Chainlink 分析
│   ├── pyth/        # Pyth 分析
│   ├── reliability/ # 可靠性评分
│   └── services/    # 核心服务
├── security/        # 安全模块
└── wallet/          # 钱包连接
```

### 四、需要更新的文档

#### 1. README.md

**需要更新**:

- 预言机协议列表：添加 API3、Band，移除或标注 RedStone 为计划中
- 技术栈版本：精确版本号
- 功能描述：与实际功能对齐

#### 2. docs/README.md

**需要更新**:

- 技术栈版本
- 预言机协议列表
- 核心功能描述

#### 3. docs/architecture/overview.md

**需要更新**:

- 预言机协议列表（添加 API3、Band）
- 技术栈版本
- 外部服务列表

#### 4. docs/architecture/modules.md

**需要更新**:

- 模块列表（添加 security、wallet）
- 组件列表更新
- 移除 Charts 模块（已合并到其他模块）

#### 5. docs/user-guide/features.md

**需要更新**:

- 跨链分析功能：移除"套利机会"描述，改为"价格一致性监控"
- 添加 API3 和 Band 协议分析功能描述
- 更新功能描述与实际一致

#### 6. docs/developer/api.md

**需要完善**:

- API 端点完整列表
- 认证方式说明
- 请求/响应示例

#### 7. CHANGELOG.md

**需要更新**:

- 添加详细的版本变更记录
- 记录功能更新

---

## 文档更新标准

### 版本信息格式

```markdown
- **Next.js**: 16.1.6
- **React**: 19.0.0
- **TypeScript**: 5.7.3
```

### 协议列表格式

```markdown
### 多协议支持

- **Chainlink** - 行业标准价格源和数据预言机
- **Pyth** - 来自机构来源的低延迟金融数据
- **API3** - 去中心化 API 服务，提供 dAPIs
- **Band Protocol** - 跨链数据预言机平台
- **UMA** - 具有断言和争议机制的乐观预言机
```

### 功能描述格式

```markdown
### 功能名称

**功能概述**: 简短描述

**主要功能**:

- 功能点1
- 功能点2

**使用场景**:

- 场景1
- 场景2
```

---

## 预期成果

1. **文档准确性**
   - 所有文档与代码实际状态一致
   - 技术栈版本信息准确
   - 功能描述准确

2. **文档完整性**
   - API 文档完整
   - 所有协议都有文档说明
   - 架构描述完整

3. **文档一致性**
   - 各文档间信息一致
   - 术语使用统一
   - 格式规范统一
