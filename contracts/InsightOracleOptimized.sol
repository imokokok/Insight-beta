// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title InsightOracleOptimized
 * @notice 深度优化版本的乐观预言机合约
 * @dev 包含批量查询、动态费用、自动过期处理等高级功能
 */
contract InsightOracleOptimized is Ownable, Pausable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant MAX_LIVENESS = 30 days;
    uint256 public constant MAX_ACTIVE_ASSERTIONS = 1000;
    uint256 public constant MIN_BOND_AMOUNT = 0.001 ether;
    uint256 public constant MIN_DISPUTE_BOND = 0.001 ether;
    uint256 public constant MIN_ASSERTION_INTERVAL = 1;
    uint256 public constant MAX_VOTE_PERCENTAGE = 25;
    uint256 public constant TIMELOCK_DELAY = 2 days;
    uint256 public constant EMERGENCY_WITHDRAWAL_DELAY = 7 days;
    uint256 public constant AUTO_EXPIRE_GRACE_PERIOD = 3 days;
    uint256 public constant FEE_ADJUSTMENT_COOLDOWN = 1 days;
    uint256 public constant BATCH_QUERY_LIMIT = 100;
    
    string public constant VERSION = "3.1.0";

    // ============ 自定义错误 ============
    error InvalidTokenAddress();
    error BondTooLow(uint256 provided, uint256 minimum);
    error DisputeBondTooLow();
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
    error FlashLoanDetected();
    error AssertionTooFrequent();
    error VotePercentageTooHigh();
    error ContractCallNotAllowed();
    error InsufficientSigners();
    error TimelockNotExpired();
    error OperationNotQueued();
    error OperationAlreadyQueued();
    error EmergencyNotActive();
    error EmergencyAlreadyActive();
    error BlacklistedAddress();
    error InvalidSignature();
    error SignerAlreadyExists();
    error SignerNotFound();
    error AsserterWon();
    error NothingToSlash();
    error InvalidTimeRange();
    error BatchSizeTooLarge();
    error AssertionNotExpired();
    error FeeAdjustmentCooldown();
    error PriceDeviationTooHigh();

    // ============ 优化事件 - 减少indexed参数节省Gas ============
    event AssertionCreated(
        bytes32 indexed assertionId,
        address asserter,
        uint96 bondAmount,
        uint64 assertedAt,
        uint64 livenessEndsAt,
        bytes32 txHash
    );

    event AssertionDisputed(
        bytes32 indexed assertionId,
        address disputer,
        uint96 bondAmount,
        uint64 disputedAt
    );

    event AssertionResolved(
        bytes32 indexed assertionId,
        bool outcome,
        uint64 resolvedAt
    );

    event AssertionExpired(
        bytes32 indexed assertionId,
        uint64 expiredAt
    );

    event VoteCast(
        bytes32 indexed assertionId,
        address voter,
        bool support,
        uint96 weight
    );

    event BondChanged(uint96 oldBond, uint96 newBond);
    event DisputeBondChanged(uint96 oldBond, uint96 newBond);
    event RewardClaimed(address indexed claimer, uint256 amount);
    event SlashingApplied(address indexed slashed, uint256 amount);

    // 监控事件
    event MetricsUpdated(
        uint64 totalAssertions,
        uint64 totalDisputes,
        uint64 totalResolved,
        uint128 totalRewardsDistributed,
        uint64 timestamp
    );
    
    event ProtocolActivity(
        bytes32 indexed protocolHash,
        uint32 assertionCount,
        uint32 disputeCount,
        uint64 timestamp
    );
    
    event UserActivity(
        address indexed user,
        uint32 assertionsCreated,
        uint32 disputesInitiated,
        uint128 totalRewards,
        uint64 timestamp
    );
    
    event AnomalyDetected(
        bytes32 indexed assertionId,
        uint8 anomalyType,
        uint64 timestamp
    );

    event FeeAdjusted(
        uint96 oldBond,
        uint96 newBond,
        uint96 oldDisputeBond,
        uint96 newDisputeBond,
        uint64 timestamp
    );

    event EmergencyModeActivated(uint256 timestamp);
    event EmergencyModeDeactivated(uint256 timestamp);
    event EmergencyWithdrawal(address indexed token, uint256 amount);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event OperationQueued(bytes32 indexed operationId, uint256 executeTime);
    event OperationExecuted(bytes32 indexed operationId);
    event AddressBlacklisted(address indexed account);
    event AddressUnblacklisted(address indexed account);
    event GovernorMerkleRootUpdated(bytes32 oldRoot, bytes32 newRoot);

    // ============ 优化结构体 - 紧凑打包 ============
    struct AssertionData {
        address asserter;           // 20 bytes
        uint64 assertedAt;          // 8 bytes
        uint64 livenessEndsAt;      // 8 bytes
        uint32 creationBlock;       // 4 bytes
        bool disputed;              // 1 byte
        bool resolved;              // 1 byte
        bool outcome;               // 1 byte
        bool expired;               // 1 byte - 新增
        uint96 bondAmount;          // 12 bytes
        uint96 disputeBondAmount;   // 12 bytes
    }

    struct VoterInfo {
        uint96 weight;
        bool support;
        uint32 voteBlock;
    }

    struct TimelockOperation {
        bytes data;
        uint64 executeTime;
        bool executed;
        uint16 signatureCount;
    }

    // 监控数据结构 - 优化存储
    struct ProtocolMetrics {
        uint32 totalAssertions;
        uint32 totalDisputes;
        uint32 totalResolved;
        uint64 lastActivityTimestamp;
    }

    struct UserMetrics {
        uint32 assertionsCreated;
        uint32 disputesInitiated;
        uint32 disputesWon;
        uint128 totalRewards;
        uint64 lastActivityTimestamp;
    }

    struct DailyMetrics {
        uint32 assertionsCreated;
        uint32 disputesInitiated;
        uint32 assertionsResolved;
        uint128 totalBondVolume;
        uint64 timestamp;
    }

    // 批量查询结构
    struct AssertionView {
        bytes32 assertionId;
        address asserter;
        uint96 bondAmount;
        uint64 assertedAt;
        uint64 livenessEndsAt;
        bool disputed;
        bool resolved;
        bool expired;
    }

    struct UserActivityView {
        address user;
        uint32 assertionsCreated;
        uint32 disputesInitiated;
        uint128 totalRewards;
        uint64 lastActivity;
    }

    // ============ 状态变量 - 按访问频率排序 ============
    // 热数据
    mapping(bytes32 => AssertionData) public assertions;
    mapping(bytes32 => mapping(address => VoterInfo)) public voterInfo;
    mapping(bytes32 => uint256) public totalVotesFor;
    mapping(bytes32 => uint256) public totalVotesAgainst;
    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public activeAssertions;
    
    // 监控数据
    mapping(bytes32 => ProtocolMetrics) public protocolMetrics;
    mapping(address => UserMetrics) public userMetrics;
    mapping(uint64 => DailyMetrics) public dailyMetrics;
    
    // 安全数据
    mapping(address => bool) public isBlacklisted;
    mapping(address => bool) public isSigner;
    mapping(bytes32 => TimelockOperation) public timelockOperations;
    mapping(bytes32 => mapping(address => bool)) public operationSignatures;
    mapping(address => uint256) public lastAssertionBlock;
    
    // 断言列表 - 用于批量查询
    bytes32[] public assertionList;
    mapping(bytes32 => uint256) public assertionIndex;
    
    // 全局统计
    uint64 public totalAssertions;
    uint64 public totalDisputes;
    uint64 public totalResolved;
    uint128 public totalRewardsDistributed;
    uint128 public totalBondVolume;

    // 动态费用
    uint96 public defaultBond;
    uint96 public defaultDisputeBond;
    uint64 public lastFeeAdjustment;
    
    // 基础配置
    address[] public signers;
    uint16 public requiredSignatures;
    uint64 public nonce;
    address public immutable bondToken;
    bytes32 public governorMerkleRoot;
    bool public emergencyMode;
    uint64 public emergencyStartTime;

    // ============ 修饰符 ============
    modifier whenNotPausedAndNotResolved(bytes32 assertionId) {
        _checkNotPausedAndNotResolved(assertionId);
        _;
    }

    modifier notBlacklisted() {
        if (isBlacklisted[msg.sender]) revert BlacklistedAddress();
        _;
    }

    modifier noFlashLoan() {
        if (block.number == lastAssertionBlock[msg.sender]) {
            revert FlashLoanDetected();
        }
        _;
    }

    modifier onlySigner() {
        if (!isSigner[msg.sender]) revert InvalidSignature();
        _;
    }

    modifier notContract() {
        if (msg.sender != tx.origin) revert ContractCallNotAllowed();
        _;
    }

    // ============ 内部函数 ============
    function _checkNotPausedAndNotResolved(bytes32 assertionId) internal view {
        if (paused()) revert EnforcedPause();
        if (assertions[assertionId].resolved) revert AssertionAlreadyResolved();
    }

    // ============ 构造函数 ============
    constructor(
        address _bondToken,
        address[] memory _initialSigners,
        uint16 _requiredSignatures
    ) Ownable(msg.sender) {
        if (_bondToken == address(0)) revert InvalidTokenAddress();
        uint256 signersLength = _initialSigners.length;
        if (signersLength < _requiredSignatures || _requiredSignatures == 0) {
            revert InsufficientSigners();
        }

        bondToken = _bondToken;
        defaultBond = 0.1 ether;
        defaultDisputeBond = 0.05 ether;
        requiredSignatures = _requiredSignatures;

        for (uint256 i; i < signersLength; ) {
            address signer = _initialSigners[i];
            if (signer == address(0)) revert ZeroAddress();
            if (isSigner[signer]) revert SignerAlreadyExists();
            isSigner[signer] = true;
            signers.push(signer);
            unchecked { ++i; }
        }
    }

    // ============ 核心功能 ============

    function createAssertion(
        bytes32 protocolHash,
        bytes32 marketHash,
        string calldata assertionText,
        uint96 bondAmount
    ) external 
        whenNotPaused 
        notBlacklisted 
        noFlashLoan 
        notContract 
        returns (bytes32 assertionId) 
    {
        uint256 assertionLen = bytes(assertionText).length;
        if (assertionLen == 0 || assertionLen > 1000) revert AssertionLengthInvalid();

        uint96 actualBond = bondAmount == 0 ? defaultBond : bondAmount;
        if (actualBond < MIN_BOND_AMOUNT) revert BondTooLow(actualBond, MIN_BOND_AMOUNT);

        if (activeAssertions[msg.sender] >= MAX_ACTIVE_ASSERTIONS) revert RateLimitExceeded();
        
        uint256 currentBlock = block.number;
        uint256 lastBlock = lastAssertionBlock[msg.sender];
        if (lastBlock != 0 && currentBlock - lastBlock < MIN_ASSERTION_INTERVAL) {
            revert AssertionTooFrequent();
        }

        unchecked {
            assertionId = keccak256(abi.encodePacked(
                ++nonce,
                msg.sender,
                block.prevrandao,
                block.timestamp,
                currentBlock,
                protocolHash,
                marketHash,
                assertionText
            ));
        }

        if (assertions[assertionId].assertedAt != 0) revert AssertionAlreadyExists();

        _safeTransferFrom(bondToken, msg.sender, address(this), actualBond);

        uint64 currentTime = uint64(block.timestamp);
        assertions[assertionId] = AssertionData({
            asserter: msg.sender,
            assertedAt: currentTime,
            livenessEndsAt: currentTime + 1 days,
            creationBlock: uint32(currentBlock),
            disputed: false,
            resolved: false,
            outcome: false,
            expired: false,
            bondAmount: actualBond,
            disputeBondAmount: 0
        });

        // 添加到列表
        assertionIndex[assertionId] = assertionList.length;
        assertionList.push(assertionId);

        unchecked { activeAssertions[msg.sender]++; }
        lastAssertionBlock[msg.sender] = currentBlock;

        // 更新监控
        _updateMetricsOnAssertion(protocolHash, msg.sender, actualBond, currentTime);

        emit AssertionCreated(
            assertionId,
            msg.sender,
            actualBond,
            currentTime,
            currentTime + 1 days,
            blockhash(currentBlock - 1)
        );
    }

    function disputeAssertion(
        bytes32 assertionId,
        string calldata reason,
        uint96 bondAmount
    ) external 
        whenNotPausedAndNotResolved(assertionId) 
        notBlacklisted 
        notContract 
    {
        if (bytes(reason).length > 500) revert ReasonTooLong();

        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (a.disputed) revert AssertionAlreadyDisputed();
        if (a.expired) revert AssertionAlreadyResolved();
        
        uint64 currentTime = uint64(block.timestamp);
        if (currentTime >= a.livenessEndsAt) revert LivenessPeriodEnded();
        if (msg.sender == a.asserter) revert AsserterCannotDispute();
        if (block.number <= a.creationBlock) revert FlashLoanDetected();

        uint96 actualBond = bondAmount == 0 ? defaultDisputeBond : bondAmount;
        if (actualBond < MIN_DISPUTE_BOND) revert DisputeBondTooLow();

        _safeTransferFrom(bondToken, msg.sender, address(this), actualBond);

        a.disputed = true;
        a.disputeBondAmount = actualBond;

        _updateMetricsOnDispute(msg.sender, currentTime);

        emit AssertionDisputed(assertionId, msg.sender, actualBond, currentTime);
    }

    function castVote(
        bytes32 assertionId,
        bool support,
        uint96 tokenAmount,
        bytes32[] calldata merkleProof
    ) external 
        whenNotPausedAndNotResolved(assertionId) 
        notBlacklisted 
        notContract 
    {
        if (tokenAmount == 0) revert BondTooLow(0, 1);
        
        AssertionData storage a = assertions[assertionId];
        if (!a.disputed) revert NotDisputed();
        if (block.number <= a.creationBlock + 1) revert FlashLoanDetected();

        if (voterInfo[assertionId][msg.sender].weight != 0) revert VoteAlreadyCast();

        uint256 currentTotal = totalVotesFor[assertionId] + totalVotesAgainst[assertionId];
        if (currentTotal != 0) {
            uint256 votePercentage = (uint256(tokenAmount) * 100) / currentTotal;
            if (votePercentage > MAX_VOTE_PERCENTAGE) revert VotePercentageTooHigh();
        }

        _safeTransferFrom(bondToken, msg.sender, address(this), tokenAmount);

        bytes32 leaf = keccak256(abi.encode(msg.sender, tokenAmount));
        if (!MerkleProof.verify(merkleProof, governorMerkleRoot, leaf)) {
            revert InvalidMerkleProof();
        }

        voterInfo[assertionId][msg.sender] = VoterInfo({
            weight: tokenAmount,
            support: support,
            voteBlock: uint32(block.number)
        });

        unchecked {
            if (support) {
                totalVotesFor[assertionId] += tokenAmount;
            } else {
                totalVotesAgainst[assertionId] += tokenAmount;
            }
        }

        emit VoteCast(assertionId, msg.sender, support, tokenAmount);
    }

    function resolveAssertion(bytes32 assertionId) external whenNotPausedAndNotResolved(assertionId) {
        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (block.timestamp < a.livenessEndsAt) revert LivenessPeriodNotEnded();
        if (block.number <= a.creationBlock + 1) revert FlashLoanDetected();

        uint256 rewardAmount = 0;

        if (a.disputed) {
            uint256 votesFor = totalVotesFor[assertionId];
            uint256 votesAgainst = totalVotesAgainst[assertionId];
            
            if (votesFor == 0 && votesAgainst == 0) revert NoVotesCast();

            uint256 totalVotingPower = votesFor + votesAgainst;
            uint256 quorumThreshold = (totalVotingPower * 51) / 100;

            if (votesFor < quorumThreshold) revert QuorumNotReached();

            a.outcome = true;

            uint256 totalPool;
            uint256 winnerReward;
            unchecked {
                totalPool = uint256(a.bondAmount) + uint256(a.disputeBondAmount);
                winnerReward = (totalPool * 80) / 100;
            }

            if (a.asserter != address(0)) {
                pendingRewards[a.asserter] += winnerReward;
                rewardAmount = winnerReward;
            }
            if (msg.sender != address(0)) {
                pendingRewards[msg.sender] += totalPool - winnerReward;
            }
        } else {
            a.outcome = true;
            if (a.asserter != address(0)) {
                pendingRewards[a.asserter] += uint256(a.bondAmount);
                rewardAmount = uint256(a.bondAmount);
            }
        }

        a.resolved = true;

        if (activeAssertions[a.asserter] > 0) {
            unchecked { activeAssertions[a.asserter]--; }
        }

        _updateMetricsOnResolve(a.asserter, rewardAmount);

        emit AssertionResolved(assertionId, a.outcome, uint64(block.timestamp));
    }

    // ============ 新增：自动过期处理 ============
    function expireAssertion(bytes32 assertionId) external {
        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (a.resolved || a.expired) revert AssertionAlreadyResolved();
        if (a.disputed) revert AssertionAlreadyDisputed();
        
        uint64 currentTime = uint64(block.timestamp);
        if (currentTime < a.livenessEndsAt + AUTO_EXPIRE_GRACE_PERIOD) {
            revert AssertionNotExpired();
        }

        a.expired = true;

        if (activeAssertions[a.asserter] > 0) {
            unchecked { activeAssertions[a.asserter]--; }
        }

        // 退还质押
        pendingRewards[a.asserter] += uint256(a.bondAmount);

        emit AssertionExpired(assertionId, currentTime);
    }

    function claimRewards() external nonReentrant notBlacklisted {
        uint256 reward = pendingRewards[msg.sender];
        if (reward == 0) revert NoRewardsToClaim();

        pendingRewards[msg.sender] = 0;
        _safeTransfer(bondToken, msg.sender, reward);

        userMetrics[msg.sender].totalRewards += uint128(reward);

        emit RewardClaimed(msg.sender, reward);
    }

    function slashAsserter(bytes32 assertionId, string calldata reason) external onlyOwner {
        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (!a.resolved) revert AssertionNotFound();
        if (a.outcome) revert AsserterWon();

        uint256 slashAmount = uint256(a.bondAmount);
        if (slashAmount == 0) revert NothingToSlash();

        pendingRewards[owner()] += slashAmount;

        emit SlashingApplied(a.asserter, slashAmount);
    }

    // ============ 新增：动态费用调整 ============
    function adjustFeesDynamically() external {
        if (block.timestamp < lastFeeAdjustment + FEE_ADJUSTMENT_COOLDOWN) {
            revert FeeAdjustmentCooldown();
        }

        uint64 currentTime = uint64(block.timestamp);
        uint64 dayTimestamp = (currentTime / 1 days) * 1 days;
        DailyMetrics storage dm = dailyMetrics[dayTimestamp];
        
        uint96 oldBond = defaultBond;
        uint96 oldDisputeBond = defaultDisputeBond;
        uint96 newBond = oldBond;
        uint96 newDisputeBond = oldDisputeBond;

        // 根据活动量调整费用
        if (dm.assertionsCreated > 100) {
            // 高活动量，增加费用防止垃圾
            newBond = uint96((uint256(oldBond) * 110) / 100);
            newDisputeBond = uint96((uint256(oldDisputeBond) * 110) / 100);
        } else if (dm.assertionsCreated < 10) {
            // 低活动量，降低费用鼓励参与
            newBond = uint96((uint256(oldBond) * 90) / 100);
            newDisputeBond = uint96((uint256(oldDisputeBond) * 90) / 100);
        }

        // 确保不低于最低值
        if (newBond < MIN_BOND_AMOUNT) newBond = uint96(MIN_BOND_AMOUNT);
        if (newDisputeBond < MIN_DISPUTE_BOND) newDisputeBond = uint96(MIN_DISPUTE_BOND);

        defaultBond = newBond;
        defaultDisputeBond = newDisputeBond;
        lastFeeAdjustment = currentTime;

        emit FeeAdjusted(oldBond, newBond, oldDisputeBond, newDisputeBond, currentTime);
    }

    // ============ 新增：批量查询功能 ============
    function getAssertionsBatch(uint256 startIndex, uint256 count) external view returns (AssertionView[] memory) {
        if (count > BATCH_QUERY_LIMIT) revert BatchSizeTooLarge();
        if (startIndex >= assertionList.length) return new AssertionView[](0);

        uint256 endIndex = startIndex + count;
        if (endIndex > assertionList.length) endIndex = assertionList.length;
        
        uint256 resultCount = endIndex - startIndex;
        AssertionView[] memory results = new AssertionView[](resultCount);

        for (uint256 i = 0; i < resultCount; ) {
            bytes32 assertionId = assertionList[startIndex + i];
            AssertionData storage a = assertions[assertionId];
            
            results[i] = AssertionView({
                assertionId: assertionId,
                asserter: a.asserter,
                bondAmount: a.bondAmount,
                assertedAt: a.assertedAt,
                livenessEndsAt: a.livenessEndsAt,
                disputed: a.disputed,
                resolved: a.resolved,
                expired: a.expired
            });
            
            unchecked { ++i; }
        }

        return results;
    }

    function getUserActivitiesBatch(address[] calldata users) external view returns (UserActivityView[] memory) {
        if (users.length > BATCH_QUERY_LIMIT) revert BatchSizeTooLarge();

        UserActivityView[] memory results = new UserActivityView[](users.length);

        for (uint256 i = 0; i < users.length; ) {
            address user = users[i];
            UserMetrics storage um = userMetrics[user];
            
            results[i] = UserActivityView({
                user: user,
                assertionsCreated: um.assertionsCreated,
                disputesInitiated: um.disputesInitiated,
                totalRewards: um.totalRewards,
                lastActivity: um.lastActivityTimestamp
            });
            
            unchecked { ++i; }
        }

        return results;
    }

    function getPendingAssertions() external view returns (bytes32[] memory) {
        uint256 count = 0;
        
        // 先计数
        for (uint256 i = 0; i < assertionList.length; ) {
            AssertionData storage a = assertions[assertionList[i]];
            if (!a.resolved && !a.expired) {
                unchecked { ++count; }
            }
            unchecked { ++i; }
        }

        bytes32[] memory pending = new bytes32[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < assertionList.length; ) {
            AssertionData storage a = assertions[assertionList[i]];
            if (!a.resolved && !a.expired) {
                pending[index] = assertionList[i];
                unchecked { ++index; }
            }
            unchecked { ++i; }
        }

        return pending;
    }

    // ============ 监控内部函数 ============
    
    function _updateMetricsOnAssertion(
        bytes32 protocolHash,
        address sender,
        uint96 bondAmount,
        uint64 timestamp
    ) internal {
        unchecked {
            totalAssertions++;
            totalBondVolume += bondAmount;
        }

        ProtocolMetrics storage pm = protocolMetrics[protocolHash];
        pm.totalAssertions++;
        pm.lastActivityTimestamp = timestamp;

        UserMetrics storage um = userMetrics[sender];
        um.assertionsCreated++;
        um.lastActivityTimestamp = timestamp;

        uint64 dayTimestamp = (timestamp / 1 days) * 1 days;
        DailyMetrics storage dm = dailyMetrics[dayTimestamp];
        dm.assertionsCreated++;
        dm.totalBondVolume += bondAmount;
        dm.timestamp = dayTimestamp;

        emit ProtocolActivity(protocolHash, pm.totalAssertions, pm.totalDisputes, timestamp);
        emit UserActivity(sender, um.assertionsCreated, um.disputesInitiated, um.totalRewards, timestamp);
        
        if (um.assertionsCreated > 100) {
            emit AnomalyDetected(0, 1, timestamp);
        }
    }

    function _updateMetricsOnDispute(address disputer, uint64 timestamp) internal {
        unchecked { totalDisputes++; }

        UserMetrics storage um = userMetrics[disputer];
        um.disputesInitiated++;
        um.lastActivityTimestamp = timestamp;

        uint64 dayTimestamp = (timestamp / 1 days) * 1 days;
        dailyMetrics[dayTimestamp].disputesInitiated++;

        emit UserActivity(disputer, um.assertionsCreated, um.disputesInitiated, um.totalRewards, timestamp);
    }

    function _updateMetricsOnResolve(address asserter, uint256 rewardAmount) internal {
        unchecked { 
            totalResolved++;
            totalRewardsDistributed += uint128(rewardAmount);
        }

        UserMetrics storage um = userMetrics[asserter];
        um.disputesWon++;
        um.totalRewards += uint128(rewardAmount);

        emit MetricsUpdated(totalAssertions, totalDisputes, totalResolved, totalRewardsDistributed, uint64(block.timestamp));
    }

    // ============ 监控查询函数 ============

    function getGlobalMetrics() external view returns (
        uint64 _totalAssertions,
        uint64 _totalDisputes,
        uint64 _totalResolved,
        uint128 _totalRewardsDistributed,
        uint128 _totalBondVolume,
        uint256 _activeAssertionCount
    ) {
        return (
            totalAssertions,
            totalDisputes,
            totalResolved,
            totalRewardsDistributed,
            totalBondVolume,
            assertionList.length
        );
    }

    function getProtocolMetrics(bytes32 protocolHash) external view returns (
        uint32 _totalAssertions,
        uint32 _totalDisputes,
        uint32 _totalResolved,
        uint64 _lastActivityTimestamp
    ) {
        ProtocolMetrics storage pm = protocolMetrics[protocolHash];
        return (pm.totalAssertions, pm.totalDisputes, pm.totalResolved, pm.lastActivityTimestamp);
    }

    function getUserMetrics(address user) external view returns (
        uint32 _assertionsCreated,
        uint32 _disputesInitiated,
        uint32 _disputesWon,
        uint128 _totalRewards,
        uint64 _lastActivityTimestamp
    ) {
        UserMetrics storage um = userMetrics[user];
        return (um.assertionsCreated, um.disputesInitiated, um.disputesWon, um.totalRewards, um.lastActivityTimestamp);
    }

    function getDailyMetrics(uint64 timestamp) external view returns (
        uint32 _assertionsCreated,
        uint32 _disputesInitiated,
        uint32 _assertionsResolved,
        uint128 _totalBondVolume,
        uint64 _timestamp
    ) {
        uint64 dayTimestamp = (timestamp / 1 days) * 1 days;
        DailyMetrics storage dm = dailyMetrics[dayTimestamp];
        return (dm.assertionsCreated, dm.disputesInitiated, dm.assertionsResolved, dm.totalBondVolume, dm.timestamp);
    }

    function getMetricsForTimeRange(uint64 startTime, uint64 endTime) external view returns (
        uint256 totalAssertionsInRange,
        uint256 totalDisputesInRange,
        uint256 totalVolumeInRange
    ) {
        if (startTime >= endTime) revert InvalidTimeRange();
        
        uint64 startDay = (startTime / 1 days) * 1 days;
        uint64 endDay = (endTime / 1 days) * 1 days;

        for (uint64 day = startDay; day <= endDay; day += 1 days) {
            DailyMetrics storage dm = dailyMetrics[day];
            unchecked {
                totalAssertionsInRange += dm.assertionsCreated;
                totalDisputesInRange += dm.disputesInitiated;
                totalVolumeInRange += dm.totalBondVolume;
            }
        }
    }

    function detectAnomalies(bytes32 assertionId) external view returns (
        bool isAnomaly,
        uint8 anomalyType,
        string memory description
    ) {
        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();

        if (!a.resolved && !a.expired && block.timestamp > a.livenessEndsAt + 7 days) {
            return (true, 1, "Unresolved after 7 days grace");
        }

        if (a.bondAmount > defaultBond * 10) {
            return (true, 2, "High bond amount");
        }

        UserMetrics storage um = userMetrics[a.asserter];
        if (um.assertionsCreated > 0 && um.disputesInitiated > um.assertionsCreated / 2) {
            return (true, 3, "High dispute rate");
        }

        return (false, 0, "");
    }

    // ============ 多签时间锁 ============

    function queueOperation(bytes32 operationId, bytes calldata data) external onlySigner {
        if (timelockOperations[operationId].executeTime != 0) {
            revert OperationAlreadyQueued();
        }

        timelockOperations[operationId] = TimelockOperation({
            data: data,
            executeTime: uint64(block.timestamp + TIMELOCK_DELAY),
            executed: false,
            signatureCount: 0
        });
        
        emit OperationQueued(operationId, block.timestamp + TIMELOCK_DELAY);
    }

    function signOperation(bytes32 operationId) external onlySigner {
        TimelockOperation storage op = timelockOperations[operationId];
        if (op.executeTime == 0) revert OperationNotQueued();
        if (op.executed) revert AssertionAlreadyResolved();
        
        if (operationSignatures[operationId][msg.sender]) revert VoteAlreadyCast();

        operationSignatures[operationId][msg.sender] = true;
        op.signatureCount++;

        if (op.signatureCount >= requiredSignatures && block.timestamp >= op.executeTime) {
            _executeOperation(operationId);
        }
    }

    function executeOperation(bytes32 operationId) external {
        TimelockOperation storage op = timelockOperations[operationId];
        if (op.executeTime == 0) revert OperationNotQueued();
        if (block.timestamp < op.executeTime) revert TimelockNotExpired();
        if (op.signatureCount < requiredSignatures) revert InsufficientSigners();
        if (op.executed) revert AssertionAlreadyResolved();

        _executeOperation(operationId);
    }

    function _executeOperation(bytes32 operationId) internal {
        TimelockOperation storage op = timelockOperations[operationId];
        op.executed = true;

        (bool success, ) = address(this).call(op.data);
        if (!success) revert TransferFailed();

        emit OperationExecuted(operationId);
    }

    // ============ 紧急功能 ============

    function activateEmergencyMode() external onlyOwner {
        if (emergencyMode) revert EmergencyAlreadyActive();
        emergencyMode = true;
        emergencyStartTime = uint64(block.timestamp);
        _pause();
        emit EmergencyModeActivated(block.timestamp);
    }

    function deactivateEmergencyMode() external onlyOwner {
        if (!emergencyMode) revert EmergencyNotActive();
        emergencyMode = false;
        emergencyStartTime = 0;
        _unpause();
        emit EmergencyModeDeactivated(block.timestamp);
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (!emergencyMode) revert EmergencyNotActive();
        if (block.timestamp < emergencyStartTime + EMERGENCY_WITHDRAWAL_DELAY) {
            revert TimelockNotExpired();
        }

        _safeTransfer(token, owner(), amount);
        emit EmergencyWithdrawal(token, amount);
    }

    // ============ 黑名单管理 ============

    function blacklistAddress(address account) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        isBlacklisted[account] = true;
    }

    function unblacklistAddress(address account) external onlyOwner {
        isBlacklisted[account] = false;
    }

    // ============ 多签管理 ============

    function addSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        if (isSigner[newSigner]) revert SignerAlreadyExists();
        isSigner[newSigner] = true;
        signers.push(newSigner);
        emit SignerAdded(newSigner);
    }

    function removeSigner(address signer) external onlyOwner {
        if (!isSigner[signer]) revert SignerNotFound();
        if (signers.length - 1 < requiredSignatures) revert InsufficientSigners();
        
        isSigner[signer] = false;
        
        for (uint256 i = 0; i < signers.length; ) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
            unchecked { ++i; }
        }
        
        emit SignerRemoved(signer);
    }

    function updateRequiredSignatures(uint16 newRequired) external onlyOwner {
        if (newRequired == 0 || newRequired > signers.length) revert InsufficientSigners();
        requiredSignatures = newRequired;
    }

    // ============ 管理功能 ============

    function setDefaultBond(uint96 _bond) external onlyOwner {
        if (_bond < MIN_BOND_AMOUNT) revert BondTooLow(_bond, MIN_BOND_AMOUNT);
        uint96 oldBond = defaultBond;
        defaultBond = _bond;
        emit BondChanged(oldBond, _bond);
    }

    function setDefaultDisputeBond(uint96 _bond) external onlyOwner {
        if (_bond < MIN_DISPUTE_BOND) revert DisputeBondTooLow();
        uint96 oldBond = defaultDisputeBond;
        defaultDisputeBond = _bond;
        emit DisputeBondChanged(oldBond, _bond);
    }

    function setGovernorMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        governorMerkleRoot = _merkleRoot;
    }

    function extendLiveness(bytes32 assertionId, uint256 additionalSeconds) external onlyOwner {
        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (a.resolved) revert AssertionAlreadyResolved();
        if (additionalSeconds > MAX_LIVENESS) revert MaxLivenessExceeded();

        a.livenessEndsAt = uint64(block.timestamp + additionalSeconds);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ 安全转账函数 ============

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert TransferFailed();
        }
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert TransferFailed();
        }
    }

    // ============ 查询函数 ============

    function getAssertion(bytes32 assertionId) external view returns (
        address asserter,
        uint96 bondAmount,
        uint64 assertedAt,
        uint64 livenessEndsAt,
        bool disputed,
        bool resolved,
        bool expired,
        bool outcome
    ) {
        AssertionData storage a = assertions[assertionId];
        return (
            a.asserter,
            a.bondAmount,
            a.assertedAt,
            a.livenessEndsAt,
            a.disputed,
            a.resolved,
            a.expired,
            a.outcome
        );
    }

    function getVotingStatus(bytes32 assertionId, address voter) external view returns (
        bool hasVoted,
        bool support,
        uint96 weight
    ) {
        VoterInfo storage v = voterInfo[assertionId][voter];
        return (v.weight > 0, v.support, v.weight);
    }

    function getVoteTotals(bytes32 assertionId) external view returns (uint256 forVotes, uint256 againstVotes) {
        return (totalVotesFor[assertionId], totalVotesAgainst[assertionId]);
    }

    function getActiveAssertions(address user) external view returns (uint256) {
        return activeAssertions[user];
    }

    function getContractBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    function isOperationReady(bytes32 operationId) external view returns (bool) {
        TimelockOperation storage op = timelockOperations[operationId];
        return op.executeTime != 0 && 
               block.timestamp >= op.executeTime && 
               op.signatureCount >= requiredSignatures &&
               !op.executed;
    }

    function getAssertionListLength() external view returns (uint256) {
        return assertionList.length;
    }

    // ============ 接收 ETH ============
    receive() external payable {
        revert("Direct ETH transfers not allowed");
    }

    fallback() external payable {
        revert("Direct ETH transfers not allowed");
    }
}
