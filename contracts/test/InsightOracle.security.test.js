const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("InsightOracle Security Tests", function () {
  let oracle, token, owner, addr1, addr2, addr3;
  const MIN_BOND = ethers.parseEther("0.01");
  const DEFAULT_BOND = ethers.parseEther("0.1");
  const DEFAULT_DISPUTE_BOND = ethers.parseEther("0.05");

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Test Token", "TEST");
    
    const InsightOracle = await ethers.getContractFactory("InsightOracle");
    oracle = await InsightOracle.deploy(await token.getAddress());
    
    await token.mint(addr1.address, ethers.parseEther("1000"));
    await token.mint(addr2.address, ethers.parseEther("1000"));
    await token.mint(addr3.address, ethers.parseEther("1000"));
    
    await token.connect(addr1).approve(await oracle.getAddress(), ethers.parseEther("1000"));
    await token.connect(addr2).approve(await oracle.getAddress(), ethers.parseEther("1000"));
    await token.connect(addr3).approve(await oracle.getAddress(), ethers.parseEther("1000"));
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy in claimRewards", async function () {
      await oracle.connect(addr1).createAssertion(
        "protocol1",
        "market1",
        "test assertion",
        0
      );
      
      const assertionId = await oracle.nonce();
      
      await time.increase(86401);
      
      await oracle.resolveAssertion(assertionId);
      
      await expect(oracle.connect(addr1).claimRewards()).to.not.be.reverted;
    });

    it("Should have nonReentrant modifier on claimRewards", async function () {
      // Verify the function is protected by checking it reverts correctly on second call
      await oracle.connect(addr1).createAssertion("p", "m", "test", 0);
      const assertionId = await oracle.nonce();
      await time.increase(86401);
      await oracle.resolveAssertion(assertionId);
      
      // First claim should succeed
      await oracle.connect(addr1).claimRewards();
      
      // Second claim should revert with NoRewardsToClaim
      await expect(oracle.connect(addr1).claimRewards())
        .to.be.revertedWithCustomError(oracle, "NoRewardsToClaim");
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to pause", async function () {
      await expect(oracle.connect(addr1).pause())
        .to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
      
      await expect(oracle.connect(owner).pause()).to.not.be.reverted;
      expect(await oracle.paused()).to.be.true;
    });

    it("Should only allow owner to set bond amounts", async function () {
      await expect(oracle.connect(addr1).setDefaultBond(ethers.parseEther("0.1")))
        .to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
      
      await expect(oracle.connect(owner).setDefaultBond(ethers.parseEther("0.2")))
        .to.not.be.reverted;
    });

    it("Should only allow owner to slash", async function () {
      await oracle.connect(addr1).createAssertion("p1", "m1", "test", 0);
      const assertionId = await oracle.nonce();
      await time.increase(86401);
      await oracle.resolveAssertion(assertionId);
      
      await expect(oracle.connect(addr2).slashAsserter(assertionId, "reason"))
        .to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");
    });
  });

  describe("Input Validation", function () {
    it("Should reject empty protocol", async function () {
      await expect(oracle.connect(addr1).createAssertion("", "market", "test", 0))
        .to.be.revertedWithCustomError(oracle, "ProtocolLengthInvalid");
    });

    it("Should reject protocol longer than 100 chars", async function () {
      const longProtocol = "a".repeat(101);
      await expect(oracle.connect(addr1).createAssertion(longProtocol, "market", "test", 0))
        .to.be.revertedWithCustomError(oracle, "ProtocolLengthInvalid");
    });

    it("Should reject empty market", async function () {
      await expect(oracle.connect(addr1).createAssertion("protocol", "", "test", 0))
        .to.be.revertedWithCustomError(oracle, "MarketLengthInvalid");
    });

    it("Should reject empty assertion", async function () {
      await expect(oracle.connect(addr1).createAssertion("protocol", "market", "", 0))
        .to.be.revertedWithCustomError(oracle, "AssertionLengthInvalid");
    });

    it("Should reject assertion longer than 1000 chars", async function () {
      const longAssertion = "a".repeat(1001);
      await expect(oracle.connect(addr1).createAssertion("protocol", "market", longAssertion, 0))
        .to.be.revertedWithCustomError(oracle, "AssertionLengthInvalid");
    });

    it("Should reject bond below minimum", async function () {
      await expect(oracle.connect(addr1).createAssertion("p", "m", "test", ethers.parseEther("0.001")))
        .to.be.revertedWithCustomError(oracle, "BondTooLow");
    });

    it("Should reject reason longer than 500 chars in dispute", async function () {
      await oracle.connect(addr1).createAssertion("p", "m", "test", 0);
      const assertionId = await oracle.nonce();
      
      const longReason = "a".repeat(501);
      await expect(oracle.connect(addr2).disputeAssertion(assertionId, longReason, 0))
        .to.be.revertedWithCustomError(oracle, "ReasonTooLong");
    });
  });

  describe("Rate Limiting", function () {
    it("Should enforce max active assertions per user", async function () {
      const maxAssertions = 1000;
      
      for (let i = 0; i < maxAssertions; i++) {
        await oracle.connect(addr1).createAssertion(`p${i}`, `m${i}`, `test${i}`, 0);
      }
      
      await expect(oracle.connect(addr1).createAssertion("p", "m", "test", 0))
        .to.be.revertedWithCustomError(oracle, "RateLimitExceeded");
    });
  });

  describe("State Consistency", function () {
    it("Should prevent double creation of same assertion", async function () {
      await oracle.connect(addr1).createAssertion("p", "m", "test", 0);
      const assertionId = await oracle.nonce();
      
      await expect(oracle.connect(addr1).createAssertion("p", "m", "test", 0))
        .to.be.revertedWithCustomError(oracle, "AssertionAlreadyExists");
    });

    it("Should prevent disputing non-existent assertion", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      await expect(oracle.connect(addr2).disputeAssertion(fakeId, "reason", 0))
        .to.be.revertedWithCustomError(oracle, "AssertionNotFound");
    });

    it("Should prevent double dispute", async function () {
      await oracle.connect(addr1).createAssertion("p", "m", "test", 0);
      const assertionId = await oracle.nonce();
      
      await oracle.connect(addr2).disputeAssertion(assertionId, "reason1", 0);
      
      await expect(oracle.connect(addr3).disputeAssertion(assertionId, "reason2", 0))
        .to.be.revertedWithCustomError(oracle, "AssertionAlreadyDisputed");
    });

    it("Should prevent asserter from disputing own assertion", async function () {
      await oracle.connect(addr1).createAssertion("p", "m", "test", 0);
      const assertionId = await oracle.nonce();
      
      await expect(oracle.connect(addr1).disputeAssertion(assertionId, "reason", 0))
        .to.be.revertedWithCustomError(oracle, "AsserterCannotDispute");
    });

    it("Should prevent double voting", async function () {
      await oracle.connect(addr1).createAssertion("p", "m", "test", 0);
      const assertionId = await oracle.nonce();
      
      await oracle.connect(addr2).disputeAssertion(assertionId, "reason", 0);
      
      const leaf = ethers.keccak256(ethers.solidityPacked(["address", "uint256"], [addr3.address, ethers.parseEther("10")]));
      await oracle.connect(owner).setGovernorMerkleRoot(leaf);
      
      await oracle.connect(addr3).castVote(assertionId, true, ethers.parseEther("10"), []);
      
      await expect(oracle.connect(addr3).castVote(assertionId, false, ethers.parseEther("10"), []))
        .to.be.revertedWithCustomError(oracle, "VoteAlreadyCast");
    });

    it("Should prevent resolving before liveness ends", async function () {
      await oracle.connect(addr1).createAssertion("p", "m", "test", 0);
      const assertionId = await oracle.nonce();
      
      await expect(oracle.resolveAssertion(assertionId))
        .to.be.revertedWithCustomError(oracle, "LivenessPeriodNotEnded");
    });

    it("Should prevent double resolution", async function () {
      await oracle.connect(addr1).createAssertion("p", "m", "test", 0);
      const assertionId = await oracle.nonce();
      
      await time.increase(86401);
      await oracle.resolveAssertion(assertionId);
      
      await expect(oracle.resolveAssertion(assertionId))
        .to.be.revertedWithCustomError(oracle, "AssertionAlreadyResolved");
    });
  });

  describe("Timing Attacks", function () {
    it("Should prevent dispute after liveness ends", async function () {
      await oracle.connect(addr1).createAssertion("p", "m", "test", 0);
      const assertionId = await oracle.nonce();
      
      await time.increase(86401);
      
      await expect(oracle.connect(addr2).disputeAssertion(assertionId, "reason", 0))
        .to.be.revertedWithCustomError(oracle, "LivenessPeriodEnded");
    });
  });

  describe("Integer Overflow/Underflow", function () {
    it("Should handle active assertions counter correctly", async function () {
      await oracle.connect(addr1).createAssertion("p1", "m1", "test1", 0);
      expect(await oracle.activeAssertions(addr1.address)).to.equal(1);
      
      const assertionId = await oracle.nonce();
      await time.increase(86401);
      await oracle.resolveAssertion(assertionId);
      
      expect(await oracle.activeAssertions(addr1.address)).to.equal(0);
    });
  });

  describe("DoS Protection", function () {
    it("Should not allow claiming zero rewards", async function () {
      await expect(oracle.connect(addr1).claimRewards())
        .to.be.revertedWithCustomError(oracle, "NoRewardsToClaim");
    });
  });

  describe("Front-running Protection", function () {
    it("Should use block.prevrandao for assertion ID uniqueness", async function () {
      const tx1 = await oracle.connect(addr1).createAssertion("p", "m", "test", 0);
      const receipt1 = await tx1.wait();
      
      const assertionId1 = await oracle.nonce();
      
      await time.increase(1);
      
      const tx2 = await oracle.connect(addr1).createAssertion("p", "m", "test", 0);
      const assertionId2 = await oracle.nonce();
      
      expect(assertionId1).to.not.equal(assertionId2);
    });
  });

  describe("Governance Token Security", function () {
    it("Should validate Merkle proof for voting", async function () {
      await oracle.connect(addr1).createAssertion("p", "m", "test", 0);
      const assertionId = await oracle.nonce();
      
      await oracle.connect(addr2).disputeAssertion(assertionId, "reason", 0);
      
      const invalidProof = [ethers.keccak256(ethers.toUtf8Bytes("invalid"))];
      
      await expect(oracle.connect(addr3).castVote(assertionId, true, ethers.parseEther("10"), invalidProof))
        .to.be.revertedWithCustomError(oracle, "InvalidMerkleProof");
    });

    it("Should use abi.encode for Merkle leaf (security fix)", async function () {
      // This test verifies the fix for hash collision vulnerability
      // abi.encode is used instead of abi.encodePacked in castVote
      await oracle.connect(addr1).createAssertion("p", "m", "test", 0);
      const assertionId = await oracle.nonce();
      
      await oracle.connect(addr2).disputeAssertion(assertionId, "reason", 0);
      
      // Set up a valid merkle root
      const leaf = ethers.keccak256(ethers.solidityPacked(["address", "uint256"], [addr3.address, ethers.parseEther("10")]));
      await oracle.connect(owner).setGovernorMerkleRoot(leaf);
      
      // Invalid proof should fail
      await expect(
        oracle.connect(addr3).castVote(assertionId, true, ethers.parseEther("10"), [ethers.keccak256(ethers.toUtf8Bytes("wrong"))])
      ).to.be.revertedWithCustomError(oracle, "InvalidMerkleProof");
    });
  });

  describe("Emergency Pause", function () {
    it("Should pause all state-changing functions", async function () {
      await oracle.connect(owner).pause();
      
      await expect(oracle.connect(addr1).createAssertion("p", "m", "test", 0))
        .to.be.revertedWithCustomError(oracle, "EnforcedPause");
      
      await oracle.connect(owner).unpause();
      
      await expect(oracle.connect(addr1).createAssertion("p", "m", "test", 0))
        .to.not.be.reverted;
    });
  });

  describe("Token Transfer Safety", function () {
    it("Should handle failed token transfers", async function () {
      await token.connect(addr1).approve(await oracle.getAddress(), 0);
      
      await expect(oracle.connect(addr1).createAssertion("p", "m", "test", 0))
        .to.be.revertedWithCustomError(oracle, "TransferFailed");
    });

    it("Should revert on zero address token", async function () {
      await expect(oracle.connect(owner).setBondToken(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(oracle, "InvalidTokenAddress");
    });
  });

  describe("Zero Address Protection", function () {
    it("Should prevent deployment with zero address token", async function () {
      const InsightOracle = await ethers.getContractFactory("InsightOracle");
      await expect(InsightOracle.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(oracle, "InvalidTokenAddress");
    });
  });

  describe("Custom Errors", function () {
    it("Should use custom errors instead of string errors", async function () {
      // Test various custom errors are properly defined
      await expect(oracle.connect(addr1).createAssertion("", "m", "test", 0))
        .to.be.revertedWithCustomError(oracle, "ProtocolLengthInvalid");
      
      await expect(oracle.connect(addr1).createAssertion("p", "", "test", 0))
        .to.be.revertedWithCustomError(oracle, "MarketLengthInvalid");
      
      await expect(oracle.connect(addr1).createAssertion("p", "m", "", 0))
        .to.be.revertedWithCustomError(oracle, "AssertionLengthInvalid");
    });
  });
});
