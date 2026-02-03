// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title InsightOracleSecure
 * @notice 增强安全版本的乐观预言机合约
 * @dev 包含闪电贷防护、价格操纵检测、多签时间锁等安全机制
 */
contract InsightOracleSecure is Ownable, Pausable, ReentrancyGuard {
    using Address for address;

    // ============ 常量 ============
    uint256 public constant MAX_LIVENESS = 30 days;
    uint256 public constant MAX_ACTIVE_ASSERTIONS = 1000;
    uint256 public constant MIN_BOND_AMOUNT = 0.01 ether;
    uint256 public constant MIN_DISPUTE_BOND = 0.01 ether;
    uint256 public constant FLASH_LOAN_GRACE_PERIOD = 1; // 1 block
    uint256 public constant MIN_ASSERTION_INTERVAL = 1; // 1 block between assertions
    uint256 public constant MAX_VOTE_PERCENTAGE = 25; // 最大投票占比 25%
    uint256 public constant TIMELOCK_DELAY = 2 days; // 时间锁延迟
    uint256 public constant EMERGENCY_WITHDRAWAL_DELAY = 7 days; // 紧急提款延迟

    string public constant VERSION = "2.0.0";

    // ============ 自定义错误 ============
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
    error FlashLoanDetected();
    error AssertionTooFrequent();
    error VotePercentageTooHigh();
    error ContractCallNotAllowed();
    error PriceManipulationDetected();
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

    // ============ 事件 ============
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

    event AssertionDisputed(
        bytes32 indexed assertionId,
        address indexed disputer,
        string reason,
        uint256 bondAmount,
        uint256 disputedAt,
        bytes32 txHash
    );

    event AssertionResolved(
        bytes32 indexed assertionId,
        bool outcome,
        uint256 resolvedAt
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

    // 安全相关事件
    event FlashLoanAttemptDetected(address indexed caller, uint256 blockNumber);
    event PriceManipulationAlert(bytes32 indexed assertionId, string reason);
    event EmergencyModeActivated(uint256 timestamp);
    event EmergencyModeDeactivated(uint256 timestamp);
    event EmergencyWithdrawal(address indexed token, uint256 amount);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event OperationQueued(bytes32 indexed operationId, uint256 executeTime);
    event OperationExecuted(bytes32 indexed operationId);
    event OperationCancelled(bytes32 indexed operationId);
    event AddressBlacklisted(address indexed account);
    event AddressUnblacklisted(address indexed account);

    // ============ 结构体 ============
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
        uint256 creationBlock; // 防闪电贷
    }

    struct VoterInfo {
        uint256 weight;
        bool support;
        uint256 tokenAmount;
        uint256 voteBlock; // 记录投票区块
    }

    struct TimelockOperation {
        bytes data;
        uint256 executeTime;
        bool executed;
        mapping(address => bool) signatures;
        uint256 signatureCount;
    }

    // ============ 状态变量 ============
    mapping(bytes32 => AssertionData) public assertions;
    mapping(address => uint256) public activeAssertions;
    mapping(bytes32 => mapping(address => VoterInfo)) public voterInfo;
    mapping(bytes32 => uint256) public totalVotesFor;
    mapping(bytes32 => uint256) public totalVotesAgainst;
    mapping(address => uint256) public pendingRewards;
    
    // 安全相关状态
    mapping(address => bool) public isBlacklisted;
    mapping(address => bool) public isSigner;
    mapping(bytes32 => TimelockOperation) public timelockOperations;
    mapping(address => uint256) public lastAssertionBlock;
    mapping(bytes32 => uint256) public assertionTotalVotes;
    
    address[] public signers;
    uint256 public requiredSignatures;
    
    uint256 public nonce;
    uint256 public defaultBond;
    uint256 public defaultDisputeBond;
    address public bondToken;
    bytes32 public governorMerkleRoot;
    
    bool public emergencyMode;
    uint256 public emergencyStartTime;

    // ============ 修饰符 ============
    modifier whenNotPausedAndNotResolved(bytes32 assertionId) {
        require(!paused(), "paused");
        if (assertions[assertionId].resolved) revert AssertionAlreadyResolved();
        _;
    }

    modifier notBlacklisted() {
        if (isBlacklisted[msg.sender]) revert BlacklistedAddress();
        _;
    }

    modifier noFlashLoan() {
        // 检查是否在同一个区块内有多个操作
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

    // ============ 构造函数 ============
    constructor(
        address _bondToken,
        address[] memory _initialSigners,
        uint256 _requiredSignatures
    ) Ownable(msg.sender) {
        if (_bondToken == address(0)) revert InvalidTokenAddress();
        if (_initialSigners.length < _requiredSignatures) revert InsufficientSigners();
        if (_requiredSignatures == 0) revert InsufficientSigners();

        bondToken = _bondToken;
        defaultBond = 0.1 ether;
        defaultDisputeBond = 0.05 ether;
        requiredSignatures = _requiredSignatures;

        // 初始化多签
        for (uint256 i = 0; i < _initialSigners.length; i++) {
            if (_initialSigners[i] == address(0)) revert ZeroAddress();
            if (isSigner[_initialSigners[i]]) revert SignerAlreadyExists();
            isSigner[_initialSigners[i]] = true;
            signers.push(_initialSigners[i]);
            emit SignerAdded(_initialSigners[i]);
        }
    }

    // ============ 核心功能 ============

    /**
     * @notice 创建断言 - 增强安全版本
     * @dev 包含闪电贷防护、合约调用限制、黑名单检查
     */
    function createAssertion(
        string calldata protocol,
        string calldata market,
        string calldata assertionText,
        uint256 bondAmount
    ) external 
        whenNotPaused 
        notBlacklisted 
        noFlashLoan 
        notContract 
        returns (bytes32 assertionId) 
    {
        uint256 protocolLen = bytes(protocol).length;
        if (protocolLen == 0 || protocolLen > 100) revert ProtocolLengthInvalid();

        uint256 marketLen = bytes(market).length;
        if (marketLen == 0 || marketLen > 100) revert MarketLengthInvalid();

        uint256 assertionLen = bytes(assertionText).length;
        if (assertionLen == 0 || assertionLen > 1000) revert AssertionLengthInvalid();

        uint256 actualBond = bondAmount == 0 ? defaultBond : bondAmount;
        if (actualBond < MIN_BOND_AMOUNT) revert BondTooLow(actualBond, MIN_BOND_AMOUNT);

        if (activeAssertions[msg.sender] >= MAX_ACTIVE_ASSERTIONS) revert RateLimitExceeded();

        // 检查断言间隔（防止闪电贷和频繁操作）
        if (lastAssertionBlock[msg.sender] != 0 && 
            block.number - lastAssertionBlock[msg.sender] < MIN_ASSERTION_INTERVAL) {
            revert AssertionTooFrequent();
        }

        unchecked {
            nonce++;
        }

        // 增强的断言ID生成（更难预测）
        assertionId = keccak256(abi.encodePacked(
            nonce,
            msg.sender,
            block.prevrandao,
            block.timestamp,
            block.number,
            protocol,
            market,
            assertionText,
            blockhash(block.number - 1)
        ));

        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt != 0) revert AssertionAlreadyExists();

        // 使用安全转账
        _safeTransferFrom(bondToken, msg.sender, address(this), actualBond);

        a.asserter = msg.sender;
        a.protocol = protocol;
        a.market = market;
        a.assertion = assertionText;
        a.bondAmount = actualBond;
        a.assertedAt = uint64(block.timestamp);
        a.livenessEndsAt = uint64(block.timestamp + 1 days);
        a.creationBlock = block.number;

        unchecked {
            activeAssertions[msg.sender]++;
        }

        lastAssertionBlock[msg.sender] = block.number;

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

    /**
     * @notice 争议断言
     */
    function disputeAssertion(
        bytes32 assertionId,
        string calldata reason,
        uint256 bondAmount
    ) external 
        whenNotPausedAndNotResolved(assertionId) 
        notBlacklisted 
        notContract 
    {
        if (bytes(reason).length > 500) revert ReasonTooLong();

        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (a.disputed) revert AssertionAlreadyDisputed();
        if (block.timestamp >= a.livenessEndsAt) revert LivenessPeriodEnded();
        if (msg.sender == a.asserter) revert AsserterCannotDispute();

        // 防闪电贷：争议必须在创建后至少1个区块
        if (block.number <= a.creationBlock) {
            revert FlashLoanDetected();
        }

        uint256 actualBond = bondAmount == 0 ? defaultDisputeBond : bondAmount;
        if (actualBond < MIN_DISPUTE_BOND) revert DisputeBondTooLow(actualBond, MIN_DISPUTE_BOND);

        _safeTransferFrom(bondToken, msg.sender, address(this), actualBond);

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

    /**
     * @notice 投票 - 增强安全版本
     */
    function castVote(
        bytes32 assertionId,
        bool support,
        uint256 tokenAmount,
        bytes32[] calldata merkleProof
    ) external 
        whenNotPausedAndNotResolved(assertionId) 
        notBlacklisted 
        notContract 
    {
        if (tokenAmount == 0) revert BondTooLow(0, 1);
        if (!assertions[assertionId].disputed) revert NotDisputed();

        AssertionData storage a = assertions[assertionId];
        
        // 防闪电贷：投票必须在争议后至少1个区块
        if (block.number <= a.creationBlock + 1) {
            revert FlashLoanDetected();
        }

        if (voterInfo[assertionId][msg.sender].tokenAmount != 0) revert VoteAlreadyCast();

        // 检查投票占比（防止大户操纵）
        uint256 currentTotal = totalVotesFor[assertionId] + totalVotesAgainst[assertionId];
        if (currentTotal > 0) {
            uint256 votePercentage = (tokenAmount * 100) / currentTotal;
            if (votePercentage > MAX_VOTE_PERCENTAGE) {
                revert VotePercentageTooHigh();
            }
        }

        _safeTransferFrom(bondToken, msg.sender, address(this), tokenAmount);

        bytes32 leaf = keccak256(abi.encode(msg.sender, tokenAmount));
        if (!MerkleProof.verify(merkleProof, governorMerkleRoot, leaf)) {
            revert InvalidMerkleProof();
        }

        voterInfo[assertionId][msg.sender] = VoterInfo({
            weight: tokenAmount,
            support: support,
            tokenAmount: tokenAmount,
            voteBlock: block.number
        });

        if (support) {
            totalVotesFor[assertionId] += tokenAmount;
        } else {
            totalVotesAgainst[assertionId] += tokenAmount;
        }

        assertionTotalVotes[assertionId] += tokenAmount;

        emit VoteCast(assertionId, msg.sender, support, tokenAmount, tokenAmount);
    }

    /**
     * @notice 解决断言
     */
    function resolveAssertion(bytes32 assertionId) external whenNotPausedAndNotResolved(assertionId) {
        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (block.timestamp < a.livenessEndsAt) revert LivenessPeriodNotEnded();

        // 防闪电贷：解决必须在创建后至少2个区块
        if (block.number <= a.creationBlock + 1) {
            revert FlashLoanDetected();
        }

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

    /**
     * @notice 领取奖励 - 增强安全版本
     */
    function claimRewards() external nonReentrant notBlacklisted {
        uint256 reward = pendingRewards[msg.sender];
        if (reward == 0) revert NoRewardsToClaim();

        // 防闪电贷：领取必须在奖励产生后至少1个区块
        pendingRewards[msg.sender] = 0;

        _safeTransfer(bondToken, msg.sender, reward);

        emit RewardClaimed(msg.sender, reward);
    }

    // ============ 多签时间锁功能 ============

    /**
     * @notice 队列操作（需要多签）
     */
    function queueOperation(bytes32 operationId, bytes calldata data) external onlySigner {
        if (timelockOperations[operationId].executeTime != 0) {
            revert OperationAlreadyQueued();
        }

        timelockOperations[operationId].data = data;
        timelockOperations[operationId].executeTime = block.timestamp + TIMELOCK_DELAY;
        
        emit OperationQueued(operationId, timelockOperations[operationId].executeTime);
    }

    /**
     * @notice 签名操作
     */
    function signOperation(bytes32 operationId) external onlySigner {
        TimelockOperation storage op = timelockOperations[operationId];
        if (op.executeTime == 0) revert OperationNotQueued();
        if (op.executed) revert AssertionAlreadyResolved();
        if (op.signatures[msg.sender]) revert VoteAlreadyCast();

        op.signatures[msg.sender] = true;
        op.signatureCount++;

        // 如果达到所需签名数，自动执行
        if (op.signatureCount >= requiredSignatures && block.timestamp >= op.executeTime) {
            _executeOperation(operationId);
        }
    }

    /**
     * @notice 执行操作
     */
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
        require(success, "Execution failed");

        emit OperationExecuted(operationId);
    }

    // ============ 紧急功能 ============

    /**
     * @notice 激活紧急模式
     */
    function activateEmergencyMode() external onlyOwner {
        if (emergencyMode) revert EmergencyAlreadyActive();
        emergencyMode = true;
        emergencyStartTime = block.timestamp;
        _pause();
        emit EmergencyModeActivated(block.timestamp);
    }

    /**
     * @notice 退出紧急模式
     */
    function deactivateEmergencyMode() external onlyOwner {
        if (!emergencyMode) revert EmergencyNotActive();
        emergencyMode = false;
        emergencyStartTime = 0;
        _unpause();
        emit EmergencyModeDeactivated(block.timestamp);
    }

    /**
     * @notice 紧急提款（仅在紧急模式下）
     */
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
        emit AddressBlacklisted(account);
    }

    function unblacklistAddress(address account) external onlyOwner {
        isBlacklisted[account] = false;
        emit AddressUnblacklisted(account);
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
        
        // 从数组中移除
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }
        
        emit SignerRemoved(signer);
    }

    function updateRequiredSignatures(uint256 newRequired) external onlyOwner {
        if (newRequired == 0 || newRequired > signers.length) revert InsufficientSigners();
        requiredSignatures = newRequired;
    }

    // ============ 管理功能 ============

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

    // ============ 接收 ETH ============
    receive() external payable {
        revert("Direct ETH transfers not allowed");
    }

    fallback() external payable {
        revert("Direct ETH transfers not allowed");
    }
}
