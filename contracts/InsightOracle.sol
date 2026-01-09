pragma solidity ^0.8.24;

contract InsightOracle {
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

  event AssertionResolved(bytes32 indexed assertionId, bool outcome, uint256 resolvedAt);

  struct AssertionData {
    address asserter;
    string protocol;
    string market;
    string assertion;
    uint256 bondUsd;
    uint256 assertedAt;
    uint256 livenessEndsAt;
    bool disputed;
    bool resolved;
  }

  mapping(bytes32 => AssertionData) public assertions;
  uint256 public nonce;

  function createAssertion(
    string calldata protocol,
    string calldata market,
    string calldata assertionText,
    uint256 bondUsd,
    uint256 livenessSeconds
  ) external returns (bytes32 assertionId) {
    nonce += 1;
    assertionId = keccak256(abi.encodePacked(address(this), msg.sender, nonce, block.chainid, market, assertionText));

    AssertionData storage a = assertions[assertionId];
    require(a.assertedAt == 0, "exists");

    a.asserter = msg.sender;
    a.protocol = protocol;
    a.market = market;
    a.assertion = assertionText;
    a.bondUsd = bondUsd;
    a.assertedAt = block.timestamp;
    a.livenessEndsAt = block.timestamp + livenessSeconds;

    emit AssertionCreated(
      assertionId,
      msg.sender,
      protocol,
      market,
      assertionText,
      bondUsd,
      a.assertedAt,
      a.livenessEndsAt,
      bytes32(0)
    );
  }

  function disputeAssertion(bytes32 assertionId, string calldata reason) external {
    AssertionData storage a = assertions[assertionId];
    require(a.assertedAt != 0, "missing");
    require(!a.resolved, "resolved");
    a.disputed = true;
    emit AssertionDisputed(assertionId, msg.sender, reason, block.timestamp);
  }

  function resolveAssertion(bytes32 assertionId, bool outcome) external {
    AssertionData storage a = assertions[assertionId];
    require(a.assertedAt != 0, "missing");
    require(!a.resolved, "resolved");
    a.resolved = true;
    emit AssertionResolved(assertionId, outcome, block.timestamp);
  }
}
