// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title InsightOracleUltraOptimized
 * @notice Gas-optimized version of InsightOracle with significant storage and execution optimizations
 * @dev Optimizations applied:
 * - Use calldata for external function parameters
 * - Use immutable for constant addresses
 * - Pack storage variables efficiently
 * - Use unchecked arithmetic where safe
 * - Cache storage variables in memory
 * - Optimize event emission
 */
contract InsightOracleUltraOptimized is Ownable, Pausable, ReentrancyGuard {
    // Constants - using immutable for addresses saves gas
    uint256 public constant MAX_LIVENESS = 30 days;
    uint256 public constant MAX_ACTIVE_ASSERTIONS = 1000;
    uint256 public constant MIN_BOND_AMOUNT = 0.01 ether;
    uint256 public constant MIN_DISPUTE_BOND = 0.01 ether;
    string public constant VERSION = "2.0.0-optimized";

    // Custom errors
    error InvalidTokenAddress();
    error BondTooLow(uint256 provided, uint256 minimum);
    error DisputeBondTooLow(uint256 provided, uint256 minimum);
    error ProtocolLengthInvalid();
    error MarketLengthInvalid();
    error AssertionLengthInvalid();
    error ReasonTooLong();
    error RateLimitExceeded();
    error AssertionAlreadyExists();
    error AssertionNotFound();
    error AssertionAlreadyDisputed();
    error AssertionAlreadyResolved();
    error LivenessPeriodEnded();
    error LivenessPeriodNotEnded();
    error AsserterCannotDispute();
    error NoRewardsToClaim();
    error TransferFailed();
    error VoteAlreadyCast();
    error NotDisputed();
    error NoVotesCast();
    error QuorumNotReached();
    error InvalidMerkleProof();
    error MaxLivenessExceeded();
    error ZeroAddress();

    // Events - indexed parameters save gas on filtering
    event AssertionCreated(
        bytes32 indexed assertionId,
        address indexed asserter,
        string protocol,
        string market,
        string assertion,
        uint256 bondAmount,
        uint64 assertedAt,
        uint64 livenessEndsAt,
        bytes32 txHash
    );

    event AssertionDisputed(
        bytes32 indexed assertionId,
        address indexed disputer,
        string reason,
        uint256 bondAmount,
        uint64 disputedAt,
        bytes32 txHash
    );

    event AssertionResolved(
        bytes32 indexed assertionId,
        bool outcome,
        uint64 resolvedAt
    );

    event VoteCast(
        bytes32 indexed assertionId,
        address indexed voter,
        bool support,
        uint256 weight,
        uint256 tokenAmount
    );

    event BondChanged(uint256 oldBond, uint256 newBond);
    event DisputeBondChanged(uint256 oldBond, uint256 newBond);
    event RewardClaimed(address indexed claimer, uint256 amount);
    event SlashingApplied(address indexed slashed, uint256 amount, string reason);

    // Storage optimization: Pack variables to minimize slots
    // Slot 1: 160 (address) + 64 (timestamp) + 32 (bool flags) = 256 bits
    struct AssertionData {
        address asserter;           // 160 bits
        uint64 assertedAt;          // 64 bits
        uint64 livenessEndsAt;      // 64 bits (separate slot due to string fields)
        uint256 bondAmount;         // 256 bits - separate slot
        uint256 disputeBondAmount;  // 256 bits - separate slot
        string protocol;            // dynamic - separate slot
        string market;              // dynamic - separate slot
        string assertion;           // dynamic - separate slot
        bool disputed;              // 8 bits
        bool resolved;              // 8 bits
        bool outcome;               // 8 bits
    }

    struct VoterInfo {
        uint256 weight;
        bool support;
        uint256 tokenAmount;
    }

    // State variables - pack related variables
    mapping(bytes32 => AssertionData) public assertions;
    mapping(address => uint256) public activeAssertions;
    mapping(bytes32 => mapping(address => VoterInfo)) public voterInfo;
    mapping(bytes32 => uint256) public totalVotesFor;
    mapping(bytes32 => uint256) public totalVotesAgainst;
    mapping(address => uint256) public pendingRewards;

    uint256 public nonce;
    uint256 public defaultBond;
    uint256 public defaultDisputeBond;
    address public immutable bondToken;  // immutable saves gas
    bytes32 public governorMerkleRoot;

    // Cache frequently accessed storage variables
    constructor(address _bondToken) Ownable(msg.sender) {
        if (_bondToken == address(0)) revert InvalidTokenAddress();
        bondToken = _bondToken;
        defaultBond = 0.1 ether;
        defaultDisputeBond = 0.05 ether;
    }

    modifier whenNotPausedAndNotResolved(bytes32 assertionId) {
        require(!paused(), "paused");
        if (assertions[assertionId].resolved) revert AssertionAlreadyResolved();
        _;
    }

    /**
     * @notice Create a new assertion with optimized gas usage
     * @param protocol Protocol name (calldata saves gas)
     * @param market Market identifier (calldata saves gas)
     * @param assertionText Assertion content (calldata saves gas)
     * @param bondAmount Bond amount (0 for default)
     */
    function createAssertion(
        string calldata protocol,
        string calldata market,
        string calldata assertionText,
        uint256 bondAmount
    ) external whenNotPaused returns (bytes32 assertionId) {
        // Cache lengths to avoid multiple storage reads
        uint256 protocolLen = bytes(protocol).length;
        if (protocolLen == 0 || protocolLen > 100) revert ProtocolLengthInvalid();

        uint256 marketLen = bytes(market).length;
        if (marketLen == 0 || marketLen > 100) revert MarketLengthInvalid();

        uint256 assertionLen = bytes(assertionText).length;
        if (assertionLen == 0 || assertionLen > 1000) revert AssertionLengthInvalid();

        // Use memory variable for gas optimization
        uint256 actualBond = bondAmount == 0 ? defaultBond : bondAmount;
        if (actualBond < MIN_BOND_AMOUNT) revert BondTooLow(actualBond, MIN_BOND_AMOUNT);

        // Cache sender address
        address sender = msg.sender;
        if (activeAssertions[sender] >= MAX_ACTIVE_ASSERTIONS) revert RateLimitExceeded();

        // Unchecked for gas savings - nonce overflow is practically impossible
        unchecked {
            nonce++;
        }

        // Generate assertion ID
        assertionId = keccak256(abi.encodePacked(
            nonce,
            sender,
            block.prevrandao,
            block.timestamp,
            protocol,
            market,
            assertionText
        ));

        // Use storage pointer for gas optimization
        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt != 0) revert AssertionAlreadyExists();

        // Cache token address in memory
        address token = bondToken;
        if (!IERC20(token).transferFrom(sender, address(this), actualBond)) {
            revert TransferFailed();
        }

        // Pack storage writes efficiently
        a.asserter = sender;
        a.protocol = protocol;
        a.market = market;
        a.assertion = assertionText;
        a.bondAmount = actualBond;
        
        uint64 currentTime = uint64(block.timestamp);
        a.assertedAt = currentTime;
        a.livenessEndsAt = currentTime + 1 days;

        // Unchecked increment
        unchecked {
            activeAssertions[sender]++;
        }

        emit AssertionCreated(
            assertionId,
            sender,
            protocol,
            market,
            assertionText,
            actualBond,
            currentTime,
            a.livenessEndsAt,
            blockhash(block.number - 1)
        );
    }

    /**
     * @notice Dispute an assertion with gas optimizations
     * @param assertionId Assertion ID to dispute
     * @param reason Dispute reason (calldata)
     * @param bondAmount Dispute bond amount
     */
    function disputeAssertion(
        bytes32 assertionId,
        string calldata reason,
        uint256 bondAmount
    ) external whenNotPausedAndNotResolved(assertionId) {
        if (bytes(reason).length > 500) revert ReasonTooLong();

        // Cache storage reads
        AssertionData storage a = assertions[assertionId];
        uint64 assertedAt = a.assertedAt;
        if (assertedAt == 0) revert AssertionNotFound();
        if (a.disputed) revert AssertionAlreadyDisputed();
        
        uint64 livenessEnds = a.livenessEndsAt;
        if (block.timestamp >= livenessEnds) revert LivenessPeriodEnded();
        
        address asserter = a.asserter;
        if (msg.sender == asserter) revert AsserterCannotDispute();

        uint256 actualBond = bondAmount == 0 ? defaultDisputeBond : bondAmount;
        if (actualBond < MIN_DISPUTE_BOND) revert DisputeBondTooLow(actualBond, MIN_DISPUTE_BOND);

        // Cache token address
        address token = bondToken;
        if (!IERC20(token).transferFrom(msg.sender, address(this), actualBond)) {
            revert TransferFailed();
        }

        a.disputed = true;
        a.disputeBondAmount = actualBond;

        emit AssertionDisputed(
            assertionId,
            msg.sender,
            reason,
            actualBond,
            uint64(block.timestamp),
            blockhash(block.number - 1)
        );
    }

    /**
     * @notice Cast vote on disputed assertion
     * @param assertionId Assertion ID
     * @param support True to support assertion
     * @param tokenAmount Amount of tokens to stake
     * @param merkleProof Merkle proof for governance
     */
    function castVote(
        bytes32 assertionId,
        bool support,
        uint256 tokenAmount,
        bytes32[] calldata merkleProof
    ) external whenNotPausedAndNotResolved(assertionId) {
        if (tokenAmount == 0) revert BondTooLow(0, 1);
        
        // Cache storage read
        AssertionData storage a = assertions[assertionId];
        if (!a.disputed) revert NotDisputed();

        // Cache voter info
        VoterInfo storage v = voterInfo[assertionId][msg.sender];
        if (v.tokenAmount != 0) revert VoteAlreadyCast();

        // Cache token address
        address token = bondToken;
        if (!IERC20(token).transferFrom(msg.sender, address(this), tokenAmount)) {
            revert TransferFailed();
        }

        // Use abi.encode for security (prevents hash collisions)
        bytes32 leaf = keccak256(abi.encode(msg.sender, tokenAmount));
        bytes32 merkleRoot = governorMerkleRoot; // Cache storage read
        if (!MerkleProof.verify(merkleProof, merkleRoot, leaf)) {
            revert InvalidMerkleProof();
        }

        // Pack storage writes
        v.weight = tokenAmount;
        v.support = support;
        v.tokenAmount = tokenAmount;

        // Unchecked arithmetic - overflow unlikely with reasonable token amounts
        unchecked {
            if (support) {
                totalVotesFor[assertionId] += tokenAmount;
            } else {
                totalVotesAgainst[assertionId] += tokenAmount;
            }
        }

        emit VoteCast(assertionId, msg.sender, support, tokenAmount, tokenAmount);
    }

    /**
     * @notice Resolve an assertion after liveness period
     * @param assertionId Assertion ID to resolve
     */
    function resolveAssertion(bytes32 assertionId) external whenNotPausedAndNotResolved(assertionId) {
        // Cache storage pointer and reads
        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (block.timestamp < a.livenessEndsAt) revert LivenessPeriodNotEnded();

        address asserter = a.asserter;
        bool disputed = a.disputed;

        if (disputed) {
            // Cache vote totals
            uint256 votesFor = totalVotesFor[assertionId];
            uint256 votesAgainst = totalVotesAgainst[assertionId];
            
            if (votesFor == 0 && votesAgainst == 0) revert NoVotesCast();

            // Unchecked arithmetic
            uint256 totalVotingPower;
            unchecked {
                totalVotingPower = votesFor + votesAgainst;
            }
            
            uint256 quorumThreshold = (totalVotingPower * 51) / 100;
            if (votesFor < quorumThreshold) revert QuorumNotReached();

            a.outcome = true;

            // Calculate rewards
            uint256 totalPool;
            uint256 bondAmt = a.bondAmount;
            uint256 disputeBond = a.disputeBondAmount;
            
            unchecked {
                totalPool = bondAmt + disputeBond;
            }
            
            uint256 winnerReward = (totalPool * 80) / 100;

            // Safe address check
            if (asserter != address(0)) {
                pendingRewards[asserter] += winnerReward;
            }
            
            address resolver = msg.sender;
            if (resolver != address(0)) {
                unchecked {
                    pendingRewards[resolver] += totalPool - winnerReward;
                }
            }
        } else {
            a.outcome = true;
            if (asserter != address(0)) {
                pendingRewards[asserter] += a.bondAmount;
            }
        }

        a.resolved = true;

        // Decrement active assertions
        uint256 currentActive = activeAssertions[asserter];
        if (currentActive != 0) {
            unchecked {
                activeAssertions[asserter] = currentActive - 1;
            }
        }

        emit AssertionResolved(assertionId, a.outcome, uint64(block.timestamp));
    }

    /**
     * @notice Claim pending rewards with reentrancy protection
     */
    function claimRewards() external nonReentrant {
        address sender = msg.sender;
        uint256 reward = pendingRewards[sender];
        if (reward == 0) revert NoRewardsToClaim();

        // Effects before interactions (checks-effects-interactions pattern)
        pendingRewards[sender] = 0;

        address token = bondToken;
        if (!IERC20(token).transfer(sender, reward)) {
            // Restore state on failure
            pendingRewards[sender] = reward;
            revert TransferFailed();
        }

        emit RewardClaimed(sender, reward);
    }

    /**
     * @notice Slash an asserter who lost
     * @param assertionId Assertion ID
     * @param reason Slashing reason (calldata for gas savings)
     */
    function slashAsserter(bytes32 assertionId, string calldata reason) external onlyOwner {
        AssertionData storage a = assertions[assertionId];
        if (!a.resolved) revert AssertionNotFound();
        if (a.outcome) revert("asserter won");

        uint256 bondAmt = a.bondAmount;
        uint256 slashAmount = (bondAmt * 50) / 100;
        
        unchecked {
            uint256 burnAmount = bondAmt - slashAmount;
            
            address sender = msg.sender;
            if (sender != address(0)) {
                pendingRewards[sender] += slashAmount;
            }

            emit SlashingApplied(a.asserter, slashAmount, reason);
            if (burnAmount > 0) {
                emit SlashingApplied(address(0), burnAmount, "burned");
            }
        }
    }

    // View functions - pure/view for gas-free calls
    function getBond() external view returns (uint256) {
        return defaultBond;
    }

    function getDisputeBond() external view returns (uint256) {
        return defaultDisputeBond;
    }

    // Admin functions
    function setDefaultBond(uint256 _bond) external onlyOwner {
        if (_bond < MIN_BOND_AMOUNT) revert BondTooLow(_bond, MIN_BOND_AMOUNT);
        uint256 oldBond = defaultBond;
        defaultBond = _bond;
        emit BondChanged(oldBond, _bond);
    }

    function setDefaultDisputeBond(uint256 _bond) external onlyOwner {
        if (_bond < MIN_DISPUTE_BOND) revert DisputeBondTooLow(_bond, MIN_DISPUTE_BOND);
        uint256 oldBond = defaultDisputeBond;
        defaultDisputeBond = _bond;
        emit DisputeBondChanged(oldBond, _bond);
    }

    function setGovernorMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        governorMerkleRoot = _merkleRoot;
    }

    function setBondToken(address _bondToken) external onlyOwner {
        if (_bondToken == address(0)) revert InvalidTokenAddress();
        // Note: bondToken is immutable, so this would require contract upgrade
        // This function is kept for interface compatibility
        revert("bond token is immutable");
    }

    function extendLiveness(bytes32 assertionId, uint256 additionalSeconds) external onlyOwner {
        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (a.resolved) revert AssertionAlreadyResolved();
        if (additionalSeconds > MAX_LIVENESS) revert MaxLivenessExceeded();
        
        uint64 currentTime = uint64(block.timestamp);
        if (currentTime + additionalSeconds > currentTime + MAX_LIVENESS) {
            revert MaxLivenessExceeded();
        }

        a.livenessEndsAt = currentTime + uint64(additionalSeconds);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Optimized view functions returning multiple values
    function getAssertion(bytes32 assertionId) external view returns (
        address asserter,
        string memory protocol,
        string memory market,
        string memory assertion,
        uint256 bondAmount,
        uint64 assertedAt,
        uint64 livenessEndsAt,
        bool disputed,
        bool resolved,
        bool outcome
    ) {
        AssertionData storage a = assertions[assertionId];
        return (
            a.asserter,
            a.protocol,
            a.market,
            a.assertion,
            a.bondAmount,
            a.assertedAt,
            a.livenessEndsAt,
            a.disputed,
            a.resolved,
            a.outcome
        );
    }

    function getVotingStatus(bytes32 assertionId, address voter) external view returns (
        bool hasVoted,
        bool support,
        uint256 weight,
        uint256 tokenAmount
    ) {
        VoterInfo storage v = voterInfo[assertionId][voter];
        return (v.tokenAmount > 0, v.support, v.weight, v.tokenAmount);
    }

    function getVoteTotals(bytes32 assertionId) external view returns (uint256 forVotes, uint256 againstVotes) {
        return (totalVotesFor[assertionId], totalVotesAgainst[assertionId]);
    }

    // Batch query functions for gas efficiency
    function getMultipleAssertions(bytes32[] calldata assertionIds) external view returns (
        AssertionData[] memory
    ) {
        uint256 length = assertionIds.length;
        AssertionData[] memory results = new AssertionData[](length);
        
        for (uint256 i = 0; i < length; ) {
            results[i] = assertions[assertionIds[i]];
            unchecked {
                ++i;
            }
        }
        
        return results;
    }

    function getPendingRewards(address[] calldata claimers) external view returns (
        uint256[] memory rewards
    ) {
        uint256 length = claimers.length;
        rewards = new uint256[](length);
        
        for (uint256 i = 0; i < length; ) {
            rewards[i] = pendingRewards[claimers[i]];
            unchecked {
                ++i;
            }
        }
        
        return rewards;
    }
}
