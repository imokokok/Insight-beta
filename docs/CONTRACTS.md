# 智能合约文档

## 1. 合约概览

**InsightOracle** 是系统的核心合约，负责管理断言的生命周期、争议解决以及保证金管理。

- **合约名称**: `InsightOracle`
- **继承**: `Ownable`, `Pausable`
- **Solidity 版本**: `^0.8.24`

## 2. 核心机制

### 2.1 断言生命周期

1. **创建 (Creation)**: 用户提交断言，质押保证金。断言进入 `Liveness` 期。
2. **挑战 (Dispute)**: 在 `Liveness` 期内，任何人支付争议金即可发起挑战。
3. **解决 (Resolution)**:
   - 若无挑战：`Liveness` 期结束后，断言被视为真实。
   - 若有挑战：进入仲裁/投票流程（由外部治理合约或 Owner 处理），最终调用 `resolveAssertion` 裁决结果。

### 2.2 关键参数

- `MAX_LIVENESS`: 最大挑战期时长 (30天)
- `MAX_ACTIVE_ASSERTIONS`: 单用户最大活跃断言数 (1000)
- `defaultBond`: 默认保证金金额

## 3. 接口说明

### 3.1 写操作 (Write)

#### `createAssertion`

创建新的断言。

```solidity
function createAssertion(
    string calldata protocol,
    string calldata market,
    string calldata assertionText,
    uint256 bondUsd,
    uint256 livenessSeconds
) external returns (bytes32 assertionId)
```

- **Events**: 触发 `AssertionCreated`

#### `disputeAssertion`

对处于活跃期的断言发起挑战。

```solidity
function disputeAssertion(bytes32 assertionId, string calldata reason) external
```

- **Requirements**: 断言未过期、未解决、未被争议。
- **Events**: 触发 `AssertionDisputed`

#### `resolveAssertion` (Admin/Governance)

裁决断言结果。

```solidity
function resolveAssertion(bytes32 assertionId, bool outcome) external onlyOwner
```

- **Events**: 触发 `AssertionResolved`

### 3.2 读操作 (Read)

- `assertions(bytes32 id)`: 获取断言详情结构体。
- `getBond()`: 获取当前默认保证金设置。

## 4. 事件 (Events)

索引器监听以下事件以同步数据：

```solidity
event AssertionCreated(
    bytes32 indexed assertionId,
    address indexed asserter,
    string protocol,
    string market,
    string assertion,
    uint256 bondUsd,
    uint256 assertedAt,
    uint256 livenessEndsAt,
    bytes32 txHash
);

event AssertionDisputed(
    bytes32 indexed assertionId,
    address indexed disputer,
    string reason,
    uint256 disputedAt
);

event AssertionResolved(
    bytes32 indexed assertionId,
    bool outcome,
    uint256 resolvedAt
);
```

## 5. 权限控制

- **Owner**: 拥有 `resolveAssertion`、`pause`、`unpause`、`setDefaultBond` 权限。
- **Pausable**: 当合约暂停时，禁止创建和争议断言，但允许解决断言。
