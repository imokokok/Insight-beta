// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract InsightOracle is Ownable, Pausable {
    uint256 public constant MAX_LIVENESS = 30 days;
    uint256 public constant MAX_ACTIVE_ASSERTIONS = 1000;
    uint256 public constant MIN_BOND_AMOUNT = 0.01 ether;
    uint256 public constant MIN_DISPUTE_BOND = 0.01 ether;

    string public constant VERSION = "1.0.0";

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
        require(_bondToken != address(0), "invalid token");
        bondToken = _bondToken;
        defaultBond = 0.1 ether;
        defaultDisputeBond = 0.05 ether;
    }

    modifier whenNotPausedAndNotResolved(bytes32 assertionId) {
        require(!paused(), "paused");
        require(!assertions[assertionId].resolved, "resolved");
        _;
    }

    function createAssertion(
        string calldata protocol,
        string calldata market,
        string calldata assertionText,
        uint256 bondAmount
    ) external whenNotPaused returns (bytes32 assertionId) {
        require(bytes(protocol).length > 0 && bytes(protocol).length <= 100, "protocol length");
        require(bytes(market).length > 0 && bytes(market).length <= 100, "market length");
        require(bytes(assertionText).length > 0 && bytes(assertionText).length <= 1000, "assertion length");

        uint256 actualBond = bondAmount == 0 ? defaultBond : bondAmount;
        require(actualBond >= MIN_BOND_AMOUNT, "bond too low");
        require(activeAssertions[msg.sender] < MAX_ACTIVE_ASSERTIONS, "rate limit");

        nonce++;

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
        require(a.assertedAt == 0, "exists");

        require(IERC20(bondToken).transferFrom(msg.sender, address(this), actualBond), "bond transfer failed");

        a.asserter = msg.sender;
        a.protocol = protocol;
        a.market = market;
        a.assertion = assertionText;
        a.bondAmount = actualBond;
        a.assertedAt = uint64(block.timestamp);
        a.livenessEndsAt = uint64(block.timestamp + 1 days);

        activeAssertions[msg.sender] += 1;

        emit AssertionCreated(
            assertionId,
            msg.sender,
            protocol,
            market,
            assertionText,
            actualBond,
            a.assertedAt,
            a.livenessEndsAt,
            bytes32(0)
        );
    }

    function disputeAssertion(
        bytes32 assertionId,
        string calldata reason,
        uint256 bondAmount
    ) external whenNotPausedAndNotResolved(assertionId) payable {
        require(bytes(reason).length <= 500, "reason too long");

        AssertionData storage a = assertions[assertionId];
        require(a.assertedAt != 0, "missing");
        require(!a.disputed, "already disputed");
        require(block.timestamp < a.livenessEndsAt, "liveness ended");
        require(msg.sender != a.asserter, "asserter cannot dispute");

        uint256 actualBond = bondAmount == 0 ? defaultDisputeBond : bondAmount;
        require(actualBond >= MIN_DISPUTE_BOND, "dispute bond too low");
        require(IERC20(bondToken).transferFrom(msg.sender, address(this), actualBond), "dispute bond transfer failed");

        a.disputed = true;

        emit AssertionDisputed(
            assertionId,
            msg.sender,
            reason,
            actualBond,
            block.timestamp,
            bytes32(0)
        );
    }

    function castVote(
        bytes32 assertionId,
        bool support,
        uint256 tokenAmount,
        bytes32[] calldata merkleProof
    ) external whenNotPausedAndNotResolved(assertionId) {
        require(tokenAmount > 0, "zero vote weight");
        require(assertions[assertionId].disputed, "not disputed");

        require(!voterInfo[assertionId][msg.sender].support && voterInfo[assertionId][msg.sender].tokenAmount == 0, "already voted");

        require(IERC20(bondToken).transferFrom(msg.sender, address(this), tokenAmount), "vote stake transfer failed");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, tokenAmount));
        require(MerkleProof.verify(merkleProof, governorMerkleRoot, leaf), "invalid merkle proof");

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
        require(a.assertedAt != 0, "missing");
        require(block.timestamp >= a.livenessEndsAt, "still in liveness");

        if (a.disputed) {
            require(totalVotesFor[assertionId] > 0 || totalVotesAgainst[assertionId] > 0, "no votes cast");
            uint256 totalVotingPower = totalVotesFor[assertionId] + totalVotesAgainst[assertionId];
            uint256 quorumThreshold = (totalVotingPower * 51) / 100;

            require(totalVotesFor[assertionId] >= quorumThreshold, "quorum not reached");

            a.outcome = true;

            uint256 totalDisputeBonds = a.bondAmount;
            uint256 winnerReward = (totalDisputeBonds * 80) / 100;

            pendingRewards[a.asserter] += winnerReward;
            pendingRewards[msg.sender] += totalDisputeBonds - winnerReward;
        } else {
            a.outcome = true;
            pendingRewards[a.asserter] += a.bondAmount;
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

    function claimRewards() external {
        uint256 reward = pendingRewards[msg.sender];
        require(reward > 0, "no rewards");

        pendingRewards[msg.sender] = 0;
        require(IERC20(bondToken).transfer(msg.sender, reward), "reward transfer failed");

        emit RewardClaimed(msg.sender, reward);
    }

    function slashAsserter(bytes32 assertionId, string calldata reason) external onlyOwner {
        AssertionData storage a = assertions[assertionId];
        require(a.resolved, "not resolved");
        require(!a.outcome, "asserter won");

        uint256 slashAmount = (a.bondAmount * 50) / 100;
        pendingRewards[msg.sender] += slashAmount;

        emit SlashingApplied(a.asserter, slashAmount, reason);
    }

    function getBond() external view returns (uint256) {
        return defaultBond;
    }

    function getDisputeBond() external view returns (uint256) {
        return defaultDisputeBond;
    }

    function setDefaultBond(uint256 _bond) external onlyOwner {
        require(_bond >= MIN_BOND_AMOUNT, "bond below minimum");
        uint256 oldBond = defaultBond;
        defaultBond = _bond;
        emit BondChanged(oldBond, _bond);
    }

    function setDefaultDisputeBond(uint256 _bond) external onlyOwner {
        require(_bond >= MIN_DISPUTE_BOND, "dispute bond below minimum");
        uint256 oldBond = defaultDisputeBond;
        defaultDisputeBond = _bond;
        emit DisputeBondChanged(oldBond, _bond);
    }

    function setGovernorMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        governorMerkleRoot = _merkleRoot;
    }

    function setBondToken(address _bondToken) external onlyOwner {
        require(_bondToken != address(0), "invalid token");
        bondToken = _bondToken;
    }

    function extendLiveness(bytes32 assertionId, uint256 additionalSeconds) external onlyOwner {
        AssertionData storage a = assertions[assertionId];
        require(a.assertedAt != 0, "missing");
        require(!a.resolved, "resolved");
        require(a.livenessEndsAt < block.timestamp + MAX_LIVENESS, "max liveness reached");

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
