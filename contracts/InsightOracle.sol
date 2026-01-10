pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract InsightOracle is Ownable, Pausable {
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
  event BondChanged(uint256 oldBond, uint256 newBond);

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
  uint256 public defaultBond;

  constructor() Ownable(msg.sender) {}

  function createAssertion(
    string calldata protocol,
    string calldata market,
    string calldata assertionText,
    uint256 bondUsd,
    uint256 livenessSeconds
  ) external whenNotPaused returns (bytes32 assertionId) {
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

  function disputeAssertion(bytes32 assertionId, string calldata reason) external whenNotPaused {
    AssertionData storage a = assertions[assertionId];
    require(a.assertedAt != 0, "missing");
    require(!a.resolved, "resolved");
    a.disputed = true;
    emit AssertionDisputed(assertionId, msg.sender, reason, block.timestamp);
  }

  function resolveAssertion(bytes32 assertionId, bool outcome) external onlyOwner whenNotPaused {
    AssertionData storage a = assertions[assertionId];
    require(a.assertedAt != 0, "missing");
    require(!a.resolved, "resolved");
    a.resolved = true;
    emit AssertionResolved(assertionId, outcome, block.timestamp);
  }

  function getBond() external view returns (uint256) {
    return defaultBond;
  }

  function setDefaultBond(uint256 _bond) external onlyOwner {
    uint256 oldBond = defaultBond;
    defaultBond = _bond;
    emit BondChanged(oldBond, _bond);
  }

  function pause() external onlyOwner {
    _pause();
  }

  function unpause() external onlyOwner {
    _unpause();
  }
}
