// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract InsightOracle is Ownable, Pausable, ReentrancyGuard {
    uint256 public constant MAX_LIVENESS = 30 days;
    uint256 public constant MAX_ACTIVE_ASSERTIONS = 1000;
    uint256 public constant MIN_BOND_AMOUNT = 0.01 ether;
    uint256 public constant MIN_DISPUTE_BOND = 0.01 ether;

    string public constant VERSION = "1.1.0";

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

    /**
     * @notice 断言创建事件
     * @param assertionId 断言唯一标识（索引）
     * @param asserter 断言者地址（索引）
     * @param protocol 协议名称
     * @param market 市场标识
     * @param assertion 断言内容
     * @param bondAmount 质押金额
     * @param assertedAt 创建时间戳
     * @param livenessEndsAt 活跃期结束时间
     * @param txHash 交易哈希
     */
    event AssertionCreated(
        bytes32 indexed assertionId,
        address indexed asserter,
        string protocol,
        string market,
        string assertion,
        uint256 bondAmount,
        uint256 assertedAt,
        uint256 livenessEndsAt,
        bytes32 txHash
    );

    /**
     * @notice 断言争议事件
     * @param assertionId 断言唯一标识（索引）
     * @param disputer 争议者地址（索引）
     * @param reason 争议理由
     * @param bondAmount 争议质押金额
     * @param disputedAt 争议时间戳
     * @param txHash 交易哈希
     */
    event AssertionDisputed(
        bytes32 indexed assertionId,
        address indexed disputer,
        string reason,
        uint256 bondAmount,
        uint256 disputedAt,
        bytes32 txHash
    );

    /**
     * @notice 断言解决事件
     * @param assertionId 断言唯一标识（索引）
     * @param outcome 解决结果（true=断言有效）
     * @param resolvedAt 解决时间戳
     */
    event AssertionResolved(
        bytes32 indexed assertionId,
        bool outcome,
        uint256 resolvedAt
    );

    /**
     * @notice 投票事件
     * @param assertionId 断言唯一标识（索引）
     * @param voter 投票者地址（索引）
     * @param support 是否支持断言
     * @param weight 投票权重
     * @param tokenAmount 代币数量
     */
    event VoteCast(
        bytes32 indexed assertionId,
        address indexed voter,
        bool support,
        uint256 weight,
        uint256 tokenAmount
    );

    /**
     * @notice 质押金额变更事件
     * @param oldBond 旧质押金额
     * @param newBond 新质押金额
     */
    event BondChanged(uint256 oldBond, uint256 newBond);

    /**
     * @notice 争议质押金额变更事件
     * @param oldBond 旧质押金额
     * @param newBond 新质押金额
     */
    event DisputeBondChanged(uint256 oldBond, uint256 newBond);

    /**
     * @notice 奖励领取事件
     * @param claimer 领取者地址（索引）
     * @param amount 领取金额
     */
    event RewardClaimed(address indexed claimer, uint256 amount);

    /**
     * @notice 惩罚应用事件
     * @param slashed 被惩罚者地址（索引）
     * @param amount 惩罚金额
     * @param reason 惩罚理由
     */
    event SlashingApplied(address indexed slashed, uint256 amount, string reason);

    struct AssertionData {
        address asserter;
        string protocol;
        string market;
        string assertion;
        uint256 bondAmount;
        uint64 assertedAt;
        uint64 livenessEndsAt;
        bool disputed;
        bool resolved;
        bool outcome;
        uint256 disputeBondAmount;
    }

    struct VoterInfo {
        uint256 weight;
        bool support;
        uint256 tokenAmount;
    }

    mapping(bytes32 => AssertionData) public assertions;
    mapping(address => uint256) public activeAssertions;
    mapping(bytes32 => mapping(address => VoterInfo)) public voterInfo;
    mapping(bytes32 => uint256) public totalVotesFor;
    mapping(bytes32 => uint256) public totalVotesAgainst;
    mapping(address => uint256) public pendingRewards;

    uint256 public nonce;
    uint256 public defaultBond;
    uint256 public defaultDisputeBond;
    address public bondToken;
    bytes32 public governorMerkleRoot;

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

    function createAssertion(
        string calldata protocol,
        string calldata market,
        string calldata assertionText,
        uint256 bondAmount
    ) external whenNotPaused returns (bytes32 assertionId) {
        uint256 protocolLen = bytes(protocol).length;
        if (protocolLen == 0 || protocolLen > 100) revert ProtocolLengthInvalid();

        uint256 marketLen = bytes(market).length;
        if (marketLen == 0 || marketLen > 100) revert MarketLengthInvalid();

        uint256 assertionLen = bytes(assertionText).length;
        if (assertionLen == 0 || assertionLen > 1000) revert AssertionLengthInvalid();

        uint256 actualBond = bondAmount == 0 ? defaultBond : bondAmount;
        if (actualBond < MIN_BOND_AMOUNT) revert BondTooLow(actualBond, MIN_BOND_AMOUNT);

        if (activeAssertions[msg.sender] >= MAX_ACTIVE_ASSERTIONS) revert RateLimitExceeded();

        unchecked {
            nonce++;
        }

        assertionId = keccak256(abi.encodePacked(
            nonce,
            msg.sender,
            block.prevrandao,
            block.timestamp,
            protocol,
            market,
            assertionText
        ));

        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt != 0) revert AssertionAlreadyExists();

        if (!IERC20(bondToken).transferFrom(msg.sender, address(this), actualBond)) {
            revert TransferFailed();
        }

        a.asserter = msg.sender;
        a.protocol = protocol;
        a.market = market;
        a.assertion = assertionText;
        a.bondAmount = actualBond;
        a.assertedAt = uint64(block.timestamp);
        a.livenessEndsAt = uint64(block.timestamp + 1 days);

        unchecked {
            activeAssertions[msg.sender]++;
        }

        emit AssertionCreated(
            assertionId,
            msg.sender,
            protocol,
            market,
            assertionText,
            actualBond,
            a.assertedAt,
            a.livenessEndsAt,
            blockhash(block.number - 1)
        );
    }

    function disputeAssertion(
        bytes32 assertionId,
        string calldata reason,
        uint256 bondAmount
    ) external whenNotPausedAndNotResolved(assertionId) {
        if (bytes(reason).length > 500) revert ReasonTooLong();

        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (a.disputed) revert AssertionAlreadyDisputed();
        if (block.timestamp >= a.livenessEndsAt) revert LivenessPeriodEnded();
        if (msg.sender == a.asserter) revert AsserterCannotDispute();

        uint256 actualBond = bondAmount == 0 ? defaultDisputeBond : bondAmount;
        if (actualBond < MIN_DISPUTE_BOND) revert DisputeBondTooLow(actualBond, MIN_DISPUTE_BOND);

        if (!IERC20(bondToken).transferFrom(msg.sender, address(this), actualBond)) {
            revert TransferFailed();
        }

        a.disputed = true;
        a.disputeBondAmount = actualBond;

        emit AssertionDisputed(
            assertionId,
            msg.sender,
            reason,
            actualBond,
            block.timestamp,
            blockhash(block.number - 1)
        );
    }

    function castVote(
        bytes32 assertionId,
        bool support,
        uint256 tokenAmount,
        bytes32[] calldata merkleProof
    ) external whenNotPausedAndNotResolved(assertionId) {
        if (tokenAmount == 0) revert BondTooLow(0, 1);
        if (!assertions[assertionId].disputed) revert NotDisputed();

        if (voterInfo[assertionId][msg.sender].tokenAmount != 0) revert VoteAlreadyCast();

        if (!IERC20(bondToken).transferFrom(msg.sender, address(this), tokenAmount)) {
            revert TransferFailed();
        }

        // Use abi.encode instead of abi.encodePacked to prevent hash collisions
        bytes32 leaf = keccak256(abi.encode(msg.sender, tokenAmount));
        if (!MerkleProof.verify(merkleProof, governorMerkleRoot, leaf)) {
            revert InvalidMerkleProof();
        }

        voterInfo[assertionId][msg.sender] = VoterInfo({
            weight: tokenAmount,
            support: support,
            tokenAmount: tokenAmount
        });

        if (support) {
            totalVotesFor[assertionId] += tokenAmount;
        } else {
            totalVotesAgainst[assertionId] += tokenAmount;
        }

        emit VoteCast(assertionId, msg.sender, support, tokenAmount, tokenAmount);
    }

    function resolveAssertion(bytes32 assertionId) external whenNotPausedAndNotResolved(assertionId) {
        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (block.timestamp < a.livenessEndsAt) revert LivenessPeriodNotEnded();

        if (a.disputed) {
            if (totalVotesFor[assertionId] == 0 && totalVotesAgainst[assertionId] == 0) {
                revert NoVotesCast();
            }

            uint256 totalVotingPower = totalVotesFor[assertionId] + totalVotesAgainst[assertionId];
            uint256 quorumThreshold = (totalVotingPower * 51) / 100;

            if (totalVotesFor[assertionId] < quorumThreshold) revert QuorumNotReached();

            a.outcome = true;

            uint256 totalPool = a.bondAmount + a.disputeBondAmount;
            uint256 winnerReward = (totalPool * 80) / 100;

            // Prevent zero address reward
            if (a.asserter != address(0)) {
                pendingRewards[a.asserter] += winnerReward;
            }
            if (msg.sender != address(0)) {
                pendingRewards[msg.sender] += totalPool - winnerReward;
            }
        } else {
            a.outcome = true;
            if (a.asserter != address(0)) {
                pendingRewards[a.asserter] += a.bondAmount;
            }
        }

        a.resolved = true;

        uint256 currentActive = activeAssertions[a.asserter];
        if (currentActive != 0) {
            unchecked {
                activeAssertions[a.asserter] = currentActive - 1;
            }
        }

        emit AssertionResolved(assertionId, a.outcome, block.timestamp);
    }

    function claimRewards() external nonReentrant {
        uint256 reward = pendingRewards[msg.sender];
        if (reward == 0) revert NoRewardsToClaim();

        pendingRewards[msg.sender] = 0;

        if (!IERC20(bondToken).transfer(msg.sender, reward)) {
            // Restore state if transfer fails
            pendingRewards[msg.sender] = reward;
            revert TransferFailed();
        }

        emit RewardClaimed(msg.sender, reward);
    }

    function slashAsserter(bytes32 assertionId, string calldata reason) external onlyOwner {
        AssertionData storage a = assertions[assertionId];
        if (!a.resolved) revert AssertionNotFound();
        if (a.outcome) revert("asserter won");

        uint256 slashAmount = (a.bondAmount * 50) / 100;
        uint256 burnAmount = a.bondAmount - slashAmount;

        if (msg.sender != address(0)) {
            pendingRewards[msg.sender] += slashAmount;
        }

        emit SlashingApplied(a.asserter, slashAmount, reason);
        if (burnAmount > 0) {
            emit SlashingApplied(address(0), burnAmount, "burned");
        }
    }

    function getBond() external view returns (uint256) {
        return defaultBond;
    }

    function getDisputeBond() external view returns (uint256) {
        return defaultDisputeBond;
    }

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
        bondToken = _bondToken;
    }

    function extendLiveness(bytes32 assertionId, uint256 additionalSeconds) external onlyOwner {
        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (a.resolved) revert AssertionAlreadyResolved();
        if (additionalSeconds > MAX_LIVENESS) revert MaxLivenessExceeded();
        if (block.timestamp + additionalSeconds > block.timestamp + MAX_LIVENESS) {
            revert MaxLivenessExceeded();
        }

        a.livenessEndsAt = uint64(block.timestamp + additionalSeconds);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

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
}
