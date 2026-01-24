[English](./CONTRACTS.md)

# 智能合约文档

## 1. 合约概览

**InsightOracle** is the core contract of the system, responsible for managing assertion lifecycle, dispute resolution, and bond management.

- **Contract Name**: `InsightOracle`
- **Inheritance**: `Ownable`, `Pausable`
- **Solidity Version**: `^0.8.24`

## 2. Core Mechanisms

### 2.1 Assertion Lifecycle

1. **Creation**: User submits assertion, stakes bond. Assertion enters `Liveness` period.
2. **Dispute**: During `Liveness` period, anyone can initiate challenge by paying dispute bond.
3. **Resolution**:
   - If no challenge: After `Liveness` period, assertion is considered true.
   - If challenged: Enters arbitration/voting process (handled by external governance contract or Owner), finally calls `resolveAssertion` to decide outcome.

### 2.2 Key Parameters

- `MAX_LIVENESS`: Max challenge period duration (30 days)
- `MAX_ACTIVE_ASSERTIONS`: Max active assertions per user (1000)
- `defaultBond`: Default bond amount

## 3. Interface Description

### 3.1 Write Operations

#### `createAssertion`

Create new assertion.

```solidity
function createAssertion(
    string calldata protocol,
    string calldata market,
    string calldata assertionText,
    uint256 bondUsd,
    uint256 livenessSeconds
) external returns (bytes32 assertionId)
```

- **Events**: Triggers `AssertionCreated`

#### `disputeAssertion`

Initiate challenge against assertion in active period.

```solidity
function disputeAssertion(bytes32 assertionId, string calldata reason) external
```

- **Requirements**: Assertion not expired, not resolved, not disputed.
- **Events**: Triggers `AssertionDisputed`

#### `resolveAssertion` (Admin/Governance)

Decide assertion result.

```solidity
function resolveAssertion(bytes32 assertionId, bool outcome) external onlyOwner
```

- **Events**: Triggers `AssertionResolved`

### 3.2 Read Operations

- `assertions(bytes32 id)`: Get assertion details struct.
- `getBond()`: Get current default bond setting.

## 4. Events

Indexer listens to the following events to sync data:

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

## 5. Access Control

- **Owner**: Has `resolveAssertion`, `pause`, `unpause`, `setDefaultBond` permissions.
- **Pausable**: When contract is paused, creating and disputing assertions are prohibited, but resolving assertions is allowed.
