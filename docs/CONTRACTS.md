# Smart Contract Documentation

## Overview

This document describes the smart contract integrations supported by Insight. The platform currently focuses on **UMA Optimistic Oracle** for assertion and dispute mechanisms.

## Supported Protocols

### UMA Optimistic Oracle

**UMA** (Universal Market Access) is an optimistic oracle that allows any verifiable truth to be recorded on-chain. It uses an optimistic mechanism where assertions are assumed true unless disputed.

#### Key Contracts

- **OptimisticOracleV2** - Main contract for assertions and disputes
- **OptimisticOracleV3** - Enhanced version with improved features
- **Voting Contract** - Handles dispute resolution through UMA's DVM (Data Verification Mechanism)

#### Assertion Lifecycle

1. **Creation**: Asserter submits assertion with bond
2. **Liveness Period**: Challenge window (default 2 hours)
3. **Dispute**: Challenger can dispute by posting bond
4. **Resolution**:
   - If no dispute: Assertion is settled as true
   - If disputed: UMA's DVM votes on the outcome

#### Integration Details

```typescript
// Example: Creating an assertion via UMA
const assertion = {
  claim: string, // The claim being asserted
  asserter: address, // Address making the assertion
  callbackRecipient: address,
  escalationManager: address,
  caller: address,
  expirationTime: timestamp,
  currency: address, // Bond token (usually WETH or USDC)
  bond: uint256, // Bond amount
  identifier: bytes32, // Price identifier
  domainId: bytes32,
  // ... other fields
};
```

#### Events

The indexer listens to these events:

```solidity
event AssertionMade(
    bytes32 indexed assertionId,
    bytes32 indexed domainId,
    bytes claim,
    address indexed asserter,
    address callbackRecipient,
    address escalationManager,
    address caller,
    uint64 expirationTime,
    IERC20 currency,
    uint256 bond,
    bytes32 indexed identifier
);

event AssertionDisputed(
    bytes32 indexed assertionId,
    address indexed caller,
    address indexed disputer
);

event AssertionSettled(
    bytes32 indexed assertionId,
    address indexed bondRecipient,
    bool disputed,
    bool settlementResolution,
    address settleCaller
);
```

### Other Oracle Protocols

Insight also supports analysis of the following protocols (read-only):

- **Chainlink** - Price feed contracts
- **Pyth** - Low-latency price updates
- **Band** - Cross-chain data oracle
- **API3** - First-party oracle network
- **RedStone** - Modular oracle design
- **Switchboard** - Permissionless oracle network
- **Flux** - Decentralized oracle aggregator
- **DIA** - Transparent data feeds

## Configuration

### UMA Contract Addresses

| Network          | OptimisticOracleV2 | OptimisticOracleV3 |
| ---------------- | ------------------ | ------------------ |
| Ethereum Mainnet | 0xC5...            | 0xfb...            |
| Polygon          | 0xee...            | 0x595...           |
| Arbitrum         | 0xe2...            | 0x2a...            |
| Optimism         | 0xee...            | 0x2a...            |
| Base             | 0xee...            | 0x2a...            |

See [UMA Documentation](https://docs.umaproject.org/) for the latest contract addresses.

## Security Considerations

1. **Bond Management**: Ensure sufficient bond amounts to prevent spam
2. **Liveness Period**: Configure appropriate challenge windows
3. **Dispute Resolution**: Understand UMA's DVM voting process
4. **Contract Upgrades**: Monitor for contract upgrades and migrations

## Resources

- [UMA Documentation](https://docs.umaproject.org/)
- [UMA GitHub](https://github.com/UMAprotocol)
- [Optimistic Oracle Tutorial](https://docs.umaproject.org/developers/optimistic-oracle)

---

**Note**: This platform previously supported a custom InsightOracle contract. That functionality has been deprecated in favor of industry-standard protocols like UMA.
