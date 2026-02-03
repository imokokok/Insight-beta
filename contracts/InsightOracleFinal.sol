// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title InsightOracleFinal
 * @notice 最终优化版本的乐观预言机合约
 * @dev 修复了审计发现的所有问题
 */
contract InsightOracleFinal is Ownable, Pausable, ReentrancyGuard {
    
    // ============ 常量 ============
    uint256 public constant MAX_LIVENESS = 30 days;
    uint256 public constant MAX_ACTIVE_ASSERTIONS = 1000;
    uint256 public constant MIN_BOND_AMOUNT = 0.01 ether;
    uint256 public constant MIN_DISPUTE_BOND = 0.01 ether;
    uint256 public constant MIN_ASSERTION_INTERVAL = 1;
    uint256 public constant MAX_VOTE_PERCENTAGE = 25;
    uint256 public constant TIMELOCK_DELAY = 2 days;
    uint256 public constant EMERGENCY_WITHDRAWAL_DELAY = 7 days;
    
    // 修复：使用 string 存储版本号，提高可读性
    string public constant VERSION = "2.2.0";

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

    // ============ 事件 ============
    event AssertionCreated(
        bytes32 indexed assertionId,
        bytes32 indexed asserter,
        uint256 bondAmount,
        uint256 assertedAt,
        uint256 livenessEndsAt,
        bytes32 txHash,
        string protocol,
        string market,
        string assertion
    );

    event AssertionDisputed(
        bytes32 indexed assertionId,
        bytes32 indexed disputer,
        uint256 bondAmount,
        uint256 disputedAt,
        bytes32 txHash,
        string reason
    );

    event AssertionResolved(
        bytes32 indexed assertionId,
        bool outcome,
        uint256 resolvedAt
    );

    event VoteCast(
        bytes32 indexed assertionId,
        bytes32 indexed voter,
        bool support,
        uint256 weight,
        uint256 tokenAmount
    );

    event BondChanged(uint256 oldBond, uint256 newBond);
    event DisputeBondChanged(uint256 oldBond, uint256 newBond);
    event RewardClaimed(bytes32 indexed claimer, uint256 amount);
    event SlashingApplied(bytes32 indexed slashed, uint256 amount, string reason);

    // 安全相关事件
    event EmergencyModeActivated(uint256 timestamp);
    event EmergencyModeDeactivated(uint256 timestamp);
    event EmergencyWithdrawal(address indexed token, uint256 amount);
    event SignerAdded(bytes32 indexed signer);
    event SignerRemoved(bytes32 indexed signer);
    event OperationQueued(bytes32 indexed operationId, uint256 executeTime);
    event OperationExecuted(bytes32 indexed operationId);
    event AddressBlacklisted(bytes32 indexed account);
    event AddressUnblacklisted(bytes32 indexed account);
    // 修复：添加 governorMerkleRoot 更新事件
    event GovernorMerkleRootUpdated(bytes32 oldRoot, bytes32 newRoot);

    // ============ 结构体 ============
    struct AssertionData {
        address asserter;
        uint64 assertedAt;
        uint64 livenessEndsAt;
        uint32 creationBlock;
        bool disputed;
        bool resolved;
        bool outcome;
        uint96 bondAmount;
        uint96 disputeBondAmount;
    }

    struct VoterInfo {
        uint96 weight;
        bool support;
        uint32 voteBlock;
        uint96 tokenAmount;
    }

    struct TimelockOperation {
        bytes data;
        uint64 executeTime;
        bool executed;
        uint16 signatureCount;
    }

    // ============ 状态变量 ============
    // 热数据
    mapping(bytes32 => AssertionData) public assertions;
    mapping(bytes32 => mapping(bytes32 => VoterInfo)) public voterInfo;
    mapping(bytes32 => uint256) public totalVotesFor;
    mapping(bytes32 => uint256) public totalVotesAgainst;
    mapping(bytes32 => uint256) public pendingRewards;
    // 修复：添加 activeAssertions 映射
    mapping(bytes32 => uint256) public activeAssertions;
    
    // 冷数据
    mapping(bytes32 => bool) public isBlacklisted;
    mapping(bytes32 => bool) public isSigner;
    mapping(bytes32 => TimelockOperation) public timelockOperations;
    mapping(bytes32 => mapping(bytes32 => bool)) public operationSignatures;
    mapping(bytes32 => uint256) public lastAssertionBlock;
    
    // 数组和基础变量
    bytes32[] public signers;
    uint16 public requiredSignatures;
    uint64 public nonce;
    uint96 public defaultBond;
    uint96 public defaultDisputeBond;
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
        if (isBlacklisted[bytes32(uint256(uint160(msg.sender)))]) revert BlacklistedAddress();
        _;
    }

    modifier noFlashLoan() {
        if (block.number == lastAssertionBlock[bytes32(uint256(uint160(msg.sender)))]) {
            revert FlashLoanDetected();
        }
        _;
    }

    modifier onlySigner() {
        if (!isSigner[bytes32(uint256(uint160(msg.sender)))]) revert InvalidSignature();
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
            bytes32 signerKey = bytes32(uint256(uint160(signer)));
            if (isSigner[signerKey]) revert SignerAlreadyExists();
            isSigner[signerKey] = true;
            signers.push(signerKey);
            emit SignerAdded(signerKey);
            unchecked { ++i; }
        }
    }

    // ============ 核心功能 ============

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

        bytes32 senderKey = bytes32(uint256(uint160(msg.sender)));
        uint256 currentBlock = block.number;
        
        // 修复：检查活跃断言数量限制
        if (activeAssertions[senderKey] >= MAX_ACTIVE_ASSERTIONS) revert RateLimitExceeded();
        
        uint256 lastBlock = lastAssertionBlock[senderKey];
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
                protocol,
                market,
                assertionText,
                blockhash(currentBlock - 1)
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
            bondAmount: uint96(actualBond),
            disputeBondAmount: 0
        });

        // 修复：增加活跃断言计数
        unchecked { activeAssertions[senderKey]++; }
        lastAssertionBlock[senderKey] = currentBlock;

        emit AssertionCreated(
            assertionId,
            senderKey,
            actualBond,
            currentTime,
            currentTime + 1 days,
            blockhash(currentBlock - 1),
            protocol,
            market,
            assertionText
        );
    }

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
        
        uint256 currentTime = block.timestamp;
        if (currentTime >= a.livenessEndsAt) revert LivenessPeriodEnded();
        if (msg.sender == a.asserter) revert AsserterCannotDispute();
        if (block.number <= a.creationBlock) revert FlashLoanDetected();

        uint256 actualBond = bondAmount == 0 ? defaultDisputeBond : bondAmount;
        if (actualBond < MIN_DISPUTE_BOND) revert DisputeBondTooLow();

        _safeTransferFrom(bondToken, msg.sender, address(this), actualBond);

        a.disputed = true;
        a.disputeBondAmount = uint96(actualBond);

        emit AssertionDisputed(
            assertionId,
            bytes32(uint256(uint160(msg.sender))),
            actualBond,
            currentTime,
            blockhash(block.number - 1),
            reason
        );
    }

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
        
        AssertionData storage a = assertions[assertionId];
        if (!a.disputed) revert NotDisputed();
        if (block.number <= a.creationBlock + 1) revert FlashLoanDetected();

        bytes32 senderKey = bytes32(uint256(uint160(msg.sender)));
        if (voterInfo[assertionId][senderKey].tokenAmount != 0) revert VoteAlreadyCast();

        uint256 currentTotal = totalVotesFor[assertionId] + totalVotesAgainst[assertionId];
        if (currentTotal != 0) {
            uint256 votePercentage = (tokenAmount * 100) / currentTotal;
            if (votePercentage > MAX_VOTE_PERCENTAGE) revert VotePercentageTooHigh();
        }

        _safeTransferFrom(bondToken, msg.sender, address(this), tokenAmount);

        bytes32 leaf = keccak256(abi.encode(msg.sender, tokenAmount));
        if (!MerkleProof.verify(merkleProof, governorMerkleRoot, leaf)) {
            revert InvalidMerkleProof();
        }

        voterInfo[assertionId][senderKey] = VoterInfo({
            weight: uint96(tokenAmount),
            support: support,
            voteBlock: uint32(block.number),
            tokenAmount: uint96(tokenAmount)
        });

        unchecked {
            if (support) {
                totalVotesFor[assertionId] += tokenAmount;
            } else {
                totalVotesAgainst[assertionId] += tokenAmount;
            }
        }

        emit VoteCast(assertionId, senderKey, support, tokenAmount, tokenAmount);
    }

    function resolveAssertion(bytes32 assertionId) external whenNotPausedAndNotResolved(assertionId) {
        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (block.timestamp < a.livenessEndsAt) revert LivenessPeriodNotEnded();
        if (block.number <= a.creationBlock + 1) revert FlashLoanDetected();

        bytes32 asserterKey = bytes32(uint256(uint160(a.asserter)));

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
                pendingRewards[asserterKey] += winnerReward;
            }
            bytes32 senderKey = bytes32(uint256(uint160(msg.sender)));
            if (msg.sender != address(0)) {
                pendingRewards[senderKey] += totalPool - winnerReward;
            }
        } else {
            a.outcome = true;
            if (a.asserter != address(0)) {
                pendingRewards[asserterKey] += uint256(a.bondAmount);
            }
        }

        a.resolved = true;

        // 修复：减少活跃断言计数
        if (activeAssertions[asserterKey] > 0) {
            unchecked { activeAssertions[asserterKey]--; }
        }

        emit AssertionResolved(assertionId, a.outcome, block.timestamp);
    }

    function claimRewards() external nonReentrant notBlacklisted {
        bytes32 senderKey = bytes32(uint256(uint160(msg.sender)));
        uint256 reward = pendingRewards[senderKey];
        if (reward == 0) revert NoRewardsToClaim();

        pendingRewards[senderKey] = 0;
        _safeTransfer(bondToken, msg.sender, reward);

        emit RewardClaimed(senderKey, reward);
    }

    // 修复：添加 slashAsserter 惩罚功能
    function slashAsserter(bytes32 assertionId, string calldata reason) external onlyOwner {
        AssertionData storage a = assertions[assertionId];
        if (a.assertedAt == 0) revert AssertionNotFound();
        if (!a.resolved) revert AssertionNotFound();
        if (a.outcome) revert AsserterWon();

        bytes32 asserterKey = bytes32(uint256(uint160(a.asserter)));
        uint256 slashAmount = uint256(a.bondAmount);
        if (slashAmount == 0) revert NothingToSlash();

        // 将惩罚金额转给 owner
        pendingRewards[bytes32(uint256(uint160(owner())))] += slashAmount;

        emit SlashingApplied(asserterKey, slashAmount, reason);
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
        
        bytes32 senderKey = bytes32(uint256(uint160(msg.sender)));
        if (operationSignatures[operationId][senderKey]) revert VoteAlreadyCast();

        operationSignatures[operationId][senderKey] = true;
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
        bytes32 accountKey = bytes32(uint256(uint160(account)));
        isBlacklisted[accountKey] = true;
        emit AddressBlacklisted(accountKey);
    }

    function unblacklistAddress(address account) external onlyOwner {
        bytes32 accountKey = bytes32(uint256(uint160(account)));
        isBlacklisted[accountKey] = false;
        emit AddressUnblacklisted(accountKey);
    }

    // ============ 多签管理 ============

    function addSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        bytes32 signerKey = bytes32(uint256(uint160(newSigner)));
        if (isSigner[signerKey]) revert SignerAlreadyExists();
        isSigner[signerKey] = true;
        signers.push(signerKey);
        emit SignerAdded(signerKey);
    }

    function removeSigner(address signer) external onlyOwner {
        bytes32 signerKey = bytes32(uint256(uint160(signer)));
        if (!isSigner[signerKey]) revert SignerNotFound();
        if (signers.length - 1 < requiredSignatures) revert InsufficientSigners();
        
        isSigner[signerKey] = false;
        
        uint256 signersLength = signers.length;
        for (uint256 i; i < signersLength; ) {
            if (signers[i] == signerKey) {
                signers[i] = signers[signersLength - 1];
                signers.pop();
                break;
            }
            unchecked { ++i; }
        }
        
        emit SignerRemoved(signerKey);
    }

    function updateRequiredSignatures(uint16 newRequired) external onlyOwner {
        if (newRequired == 0 || newRequired > signers.length) revert InsufficientSigners();
        requiredSignatures = newRequired;
    }

    // ============ 管理功能 ============

    function setDefaultBond(uint256 _bond) external onlyOwner {
        if (_bond < MIN_BOND_AMOUNT) revert BondTooLow(_bond, MIN_BOND_AMOUNT);
        uint256 oldBond = defaultBond;
        defaultBond = uint96(_bond);
        emit BondChanged(oldBond, _bond);
    }

    function setDefaultDisputeBond(uint256 _bond) external onlyOwner {
        if (_bond < MIN_DISPUTE_BOND) revert DisputeBondTooLow();
        uint256 oldBond = defaultDisputeBond;
        defaultDisputeBond = uint96(_bond);
        emit DisputeBondChanged(oldBond, _bond);
    }

    // 修复：添加 governorMerkleRoot 更新事件
    function setGovernorMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        bytes32 oldRoot = governorMerkleRoot;
        governorMerkleRoot = _merkleRoot;
        emit GovernorMerkleRootUpdated(oldRoot, _merkleRoot);
    }

    // 修复：删除 setBondToken 函数，因为 bondToken 是 immutable
    // function setBondToken(address _bondToken) external onlyOwner {
    //     revert("Bond token is immutable");
    // }

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

    // ============ 查询函数 - 修复：添加更多查询函数 ============

    function getAssertion(bytes32 assertionId) external view returns (
        address asserter,
        uint256 bondAmount,
        uint256 assertedAt,
        uint256 livenessEndsAt,
        bool disputed,
        bool resolved,
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
            a.outcome
        );
    }

    function getVotingStatus(bytes32 assertionId, address voter) external view returns (
        bool hasVoted,
        bool support,
        uint256 weight,
        uint256 tokenAmount
    ) {
        VoterInfo storage v = voterInfo[assertionId][bytes32(uint256(uint160(voter)))];
        return (v.tokenAmount > 0, v.support, v.weight, v.tokenAmount);
    }

    function getVoteTotals(bytes32 assertionId) external view returns (uint256 forVotes, uint256 againstVotes) {
        return (totalVotesFor[assertionId], totalVotesAgainst[assertionId]);
    }

    // 修复：添加活跃断言查询函数
    function getActiveAssertions(address user) external view returns (uint256) {
        return activeAssertions[bytes32(uint256(uint160(user)))];
    }

    // 修复：添加合约余额查询函数
    function getContractBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function getSigners() external view returns (bytes32[] memory) {
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
