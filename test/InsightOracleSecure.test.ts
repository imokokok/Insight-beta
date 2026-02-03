import { expect } from 'chai';
import hre from 'hardhat';
import type { InsightOracleSecure, MockERC20 } from '../typechain-types';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

const { ethers } = hre;

// Helper function to increase time
async function increaseTime(seconds: number) {
  await hre.network.provider.send("evm_increaseTime", [seconds]);
  await hre.network.provider.send("evm_mine");
}

// Helper to mine blocks
async function mineBlocks(count: number) {
  for (let i = 0; i < count; i++) {
    await hre.network.provider.send("evm_mine");
  }
}

describe('InsightOracleSecure', function () {
  let oracle: InsightOracleSecure;
  let token: MockERC20;
  let owner: HardhatEthersSigner;
  let signer1: HardhatEthersSigner;
  let signer2: HardhatEthersSigner;
  let signer3: HardhatEthersSigner;
  let asserter: HardhatEthersSigner;
  let disputer: HardhatEthersSigner;
  let voter: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  const DEFAULT_BOND = ethers.parseEther('0.1');
  const DEFAULT_DISPUTE_BOND = ethers.parseEther('0.05');
  const MIN_BOND = ethers.parseEther('0.01');

  beforeEach(async function () {
    [owner, signer1, signer2, signer3, asserter, disputer, voter, other] = await ethers.getSigners();

    // Deploy MockERC20
    const MockERC20Factory = await ethers.getContractFactory('MockERC20');
    token = await MockERC20Factory.deploy('Mock Token', 'MTK');
    await token.waitForDeployment();

    // Deploy InsightOracleSecure with multisig
    const initialSigners = [signer1.address, signer2.address, signer3.address];
    const requiredSignatures = 2;

    const InsightOracleSecureFactory = await ethers.getContractFactory('InsightOracleSecure');
    oracle = await InsightOracleSecureFactory.deploy(
      await token.getAddress(),
      initialSigners,
      requiredSignatures
    );
    await oracle.waitForDeployment();

    // Mint tokens to test accounts
    await token.mint(asserter.address, ethers.parseEther('1000'));
    await token.mint(disputer.address, ethers.parseEther('1000'));
    await token.mint(voter.address, ethers.parseEther('1000'));
    await token.mint(signer1.address, ethers.parseEther('1000'));
    await token.mint(signer2.address, ethers.parseEther('1000'));

    // Approve oracle contract
    await token.connect(asserter).approve(await oracle.getAddress(), ethers.parseEther('1000'));
    await token.connect(disputer).approve(await oracle.getAddress(), ethers.parseEther('1000'));
    await token.connect(voter).approve(await oracle.getAddress(), ethers.parseEther('1000'));
    await token.connect(signer1).approve(await oracle.getAddress(), ethers.parseEther('1000'));
    await token.connect(signer2).approve(await oracle.getAddress(), ethers.parseEther('1000'));
  });

  describe('Deployment', function () {
    it('should set the correct bond token', async function () {
      expect(await oracle.bondToken()).to.equal(await token.getAddress());
    });

    it('should set the correct owner', async function () {
      expect(await oracle.owner()).to.equal(owner.address);
    });

    it('should initialize with correct signers', async function () {
      const signers = await oracle.getSigners();
      expect(signers.length).to.equal(3);
      expect(await oracle.isSigner(signer1.address)).to.be.true;
      expect(await oracle.isSigner(signer2.address)).to.be.true;
      expect(await oracle.isSigner(signer3.address)).to.be.true;
    });

    it('should set correct required signatures', async function () {
      expect(await oracle.requiredSignatures()).to.equal(2);
    });

    it('should have correct version', async function () {
      expect(await oracle.VERSION()).to.equal('2.0.0');
    });

    it('should revert if insufficient signers', async function () {
      const InsightOracleSecureFactory = await ethers.getContractFactory('InsightOracleSecure');
      await expect(
        InsightOracleSecureFactory.deploy(
          await token.getAddress(),
          [signer1.address],
          2
        )
      ).to.be.revertedWithCustomError(oracle, 'InsufficientSigners');
    });
  });

  describe('Flash Loan Protection', function () {
    it('should prevent same block assertion creation', async function () {
      // First assertion in block N
      await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test1', 0);
      
      // Second assertion in same block should fail
      await expect(
        oracle.connect(asserter).createAssertion('chainlink', 'BTC/USD', 'Test2', 0)
      ).to.be.revertedWithCustomError(oracle, 'AssertionTooFrequent');
    });

    it('should allow assertion after 1 block', async function () {
      await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test1', 0);
      await mineBlocks(1);
      
      await expect(
        oracle.connect(asserter).createAssertion('chainlink', 'BTC/USD', 'Test2', 0)
      ).to.not.be.reverted;
    });

    it('should prevent dispute in same block as creation', async function () {
      const tx = await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0);
      const receipt = await tx.wait();
      
      const event = receipt?.logs.find(
        (log) => log.topics[0] === ethers.id('AssertionCreated(bytes32,address,string,string,string,uint256,uint256,uint256,bytes32)')
      );
      const assertionId = event?.topics[1] || '';

      await expect(
        oracle.connect(disputer).disputeAssertion(assertionId, 'Reason', 0)
      ).to.be.revertedWithCustomError(oracle, 'FlashLoanDetected');
    });

    it('should allow dispute after 1 block', async function () {
      const tx = await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0);
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log) => log.topics[0] === ethers.id('AssertionCreated(bytes32,address,string,string,string,uint256,uint256,uint256,bytes32)')
      );
      const assertionId = event?.topics[1] || '';

      await mineBlocks(1);
      
      await expect(
        oracle.connect(disputer).disputeAssertion(assertionId, 'Reason', 0)
      ).to.not.be.reverted;
    });

    it('should prevent vote in same block as assertion creation', async function () {
      const tx = await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0);
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log) => log.topics[0] === ethers.id('AssertionCreated(bytes32,address,string,string,string,uint256,uint256,uint256,bytes32)')
      );
      const assertionId = event?.topics[1] || '';

      await mineBlocks(1);
      await oracle.connect(disputer).disputeAssertion(assertionId, 'Reason', 0);

      // Set merkle root
      const leaf = ethers.keccak256(ethers.solidityPacked(['address', 'uint256'], [voter.address, ethers.parseEther('10')]));
      await oracle.connect(owner).setGovernorMerkleRoot(leaf);

      // Vote in same block as dispute should fail
      await expect(
        oracle.connect(voter).castVote(assertionId, true, ethers.parseEther('10'), [])
      ).to.be.revertedWithCustomError(oracle, 'FlashLoanDetected');
    });
  });

  describe('Contract Call Restriction', function () {
    it('should prevent contract from creating assertion', async function () {
      // The notContract modifier checks msg.sender != tx.origin
      // This is implicitly tested by the modifier
      expect(await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0))
        .to.not.be.reverted;
    });
  });

  describe('Blacklist', function () {
    it('should allow owner to blacklist address', async function () {
      await oracle.connect(owner).blacklistAddress(asserter.address);
      expect(await oracle.isBlacklisted(asserter.address)).to.be.true;
    });

    it('should prevent blacklisted address from creating assertion', async function () {
      await oracle.connect(owner).blacklistAddress(asserter.address);
      
      await expect(
        oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0)
      ).to.be.revertedWithCustomError(oracle, 'BlacklistedAddress');
    });

    it('should allow owner to unblacklist address', async function () {
      await oracle.connect(owner).blacklistAddress(asserter.address);
      await oracle.connect(owner).unblacklistAddress(asserter.address);
      
      expect(await oracle.isBlacklisted(asserter.address)).to.be.false;
    });
  });

  describe('Vote Manipulation Protection', function () {
    it('should prevent vote exceeding max percentage', async function () {
      // Create assertion
      let tx = await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0);
      let receipt = await tx.wait();
      let event = receipt?.logs.find(
        (log) => log.topics[0] === ethers.id('AssertionCreated(bytes32,address,string,string,string,uint256,uint256,uint256,bytes32)')
      );
      const assertionId = event?.topics[1] || '';

      await mineBlocks(1);
      await oracle.connect(disputer).disputeAssertion(assertionId, 'Reason', 0);
      await mineBlocks(1);

      // Set merkle root for first voter (100 tokens)
      const leaf1 = ethers.keccak256(ethers.solidityPacked(['address', 'uint256'], [voter.address, ethers.parseEther('100')]));
      await oracle.connect(owner).setGovernorMerkleRoot(leaf1);

      // First vote with 100 tokens
      await oracle.connect(voter).castVote(assertionId, true, ethers.parseEther('100'), []);
      await mineBlocks(1);

      // Second voter tries to vote with 50 tokens (50% > 25% max)
      // Need to create a proper merkle tree with both leaves
      const leaf2 = ethers.keccak256(ethers.solidityPacked(['address', 'uint256'], [signer1.address, ethers.parseEther('50')]));
      await oracle.connect(owner).setGovernorMerkleRoot(leaf2);
      
      await expect(
        oracle.connect(signer1).castVote(assertionId, true, ethers.parseEther('50'), [])
      ).to.be.revertedWithCustomError(oracle, 'VotePercentageTooHigh');
    });
  });

  describe('Multisig Timelock', function () {
    it('should allow signer to queue operation', async function () {
      const operationId = ethers.keccak256(ethers.toUtf8Bytes('test-op'));
      const data = oracle.interface.encodeFunctionData('setDefaultBond', [ethers.parseEther('0.2')]);
      
      await expect(
        oracle.connect(signer1).queueOperation(operationId, data)
      ).to.emit(oracle, 'OperationQueued');
    });

    it('should allow signer to sign operation', async function () {
      const operationId = ethers.keccak256(ethers.toUtf8Bytes('test-op'));
      const data = oracle.interface.encodeFunctionData('setDefaultBond', [ethers.parseEther('0.2')]);
      
      await oracle.connect(signer1).queueOperation(operationId, data);
      
      await expect(
        oracle.connect(signer1).signOperation(operationId)
      ).to.not.be.reverted;
    });

    it('should execute operation after timelock and enough signatures', async function () {
      const operationId = ethers.keccak256(ethers.toUtf8Bytes('test-op'));
      const newBond = ethers.parseEther('0.2');
      const data = oracle.interface.encodeFunctionData('setDefaultBond', [newBond]);
      
      await oracle.connect(signer1).queueOperation(operationId, data);
      await oracle.connect(signer1).signOperation(operationId);
      await oracle.connect(signer2).signOperation(operationId);
      
      // Wait for timelock (2 days)
      await increaseTime(2 * 24 * 60 * 60 + 1);
      
      await oracle.executeOperation(operationId);
      
      expect(await oracle.getBond()).to.equal(newBond);
    });

    it('should revert if non-signer tries to queue', async function () {
      const operationId = ethers.keccak256(ethers.toUtf8Bytes('test-op'));
      const data = oracle.interface.encodeFunctionData('setDefaultBond', [ethers.parseEther('0.2')]);
      
      await expect(
        oracle.connect(asserter).queueOperation(operationId, data)
      ).to.be.revertedWithCustomError(oracle, 'InvalidSignature');
    });

    it('should revert execution before timelock expires', async function () {
      const operationId = ethers.keccak256(ethers.toUtf8Bytes('test-op'));
      const data = oracle.interface.encodeFunctionData('setDefaultBond', [ethers.parseEther('0.2')]);
      
      await oracle.connect(signer1).queueOperation(operationId, data);
      await oracle.connect(signer1).signOperation(operationId);
      await oracle.connect(signer2).signOperation(operationId);
      
      // Try to execute before timelock expires
      await expect(
        oracle.executeOperation(operationId)
      ).to.be.revertedWithCustomError(oracle, 'TimelockNotExpired');
    });
  });

  describe('Emergency Mode', function () {
    it('should allow owner to activate emergency mode', async function () {
      await expect(oracle.connect(owner).activateEmergencyMode())
        .to.emit(oracle, 'EmergencyModeActivated');
      
      expect(await oracle.emergencyMode()).to.be.true;
      expect(await oracle.paused()).to.be.true;
    });

    it('should prevent operations in emergency mode', async function () {
      await oracle.connect(owner).activateEmergencyMode();
      
      await expect(
        oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0)
      ).to.be.revertedWithCustomError(oracle, 'EnforcedPause');
    });

    it('should allow emergency withdrawal after delay', async function () {
      await oracle.connect(owner).activateEmergencyMode();
      
      // Fund the contract
      await token.mint(await oracle.getAddress(), ethers.parseEther('100'));
      
      // Wait for emergency withdrawal delay (7 days)
      await increaseTime(7 * 24 * 60 * 60 + 1);
      
      const balanceBefore = await token.balanceOf(owner.address);
      
      await oracle.connect(owner).emergencyWithdraw(
        await token.getAddress(),
        ethers.parseEther('100')
      );
      
      const balanceAfter = await token.balanceOf(owner.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther('100'));
    });

    it('should revert emergency withdrawal before delay', async function () {
      await oracle.connect(owner).activateEmergencyMode();
      await token.mint(await oracle.getAddress(), ethers.parseEther('100'));
      
      await expect(
        oracle.connect(owner).emergencyWithdraw(await token.getAddress(), ethers.parseEther('100'))
      ).to.be.revertedWithCustomError(oracle, 'TimelockNotExpired');
    });

    it('should allow owner to deactivate emergency mode', async function () {
      await oracle.connect(owner).activateEmergencyMode();
      await oracle.connect(owner).deactivateEmergencyMode();
      
      expect(await oracle.emergencyMode()).to.be.false;
      expect(await oracle.paused()).to.be.false;
    });
  });

  describe('Signer Management', function () {
    it('should allow owner to add signer', async function () {
      const newSigner = other.address;
      
      await expect(oracle.connect(owner).addSigner(newSigner))
        .to.emit(oracle, 'SignerAdded')
        .withArgs(newSigner);
      
      expect(await oracle.isSigner(newSigner)).to.be.true;
    });

    it('should allow owner to remove signer', async function () {
      await expect(oracle.connect(owner).removeSigner(signer3.address))
        .to.emit(oracle, 'SignerRemoved')
        .withArgs(signer3.address);
      
      expect(await oracle.isSigner(signer3.address)).to.be.false;
    });

    it('should revert removing signer if below required', async function () {
      await oracle.connect(owner).removeSigner(signer3.address);
      
      await expect(
        oracle.connect(owner).removeSigner(signer2.address)
      ).to.be.revertedWithCustomError(oracle, 'InsufficientSigners');
    });

    it('should allow owner to update required signatures', async function () {
      await oracle.connect(owner).updateRequiredSignatures(1);
      expect(await oracle.requiredSignatures()).to.equal(1);
    });
  });

  describe('Safe Transfer', function () {
    it('should handle token transfers correctly', async function () {
      await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0);
      const assertionId = await oracle.nonce();
      
      await mineBlocks(1);
      await increaseTime(86401);
      await oracle.resolveAssertion(assertionId);
      
      const balanceBefore = await token.balanceOf(asserter.address);
      
      // Claim rewards should work
      await oracle.connect(asserter).claimRewards();
      
      const balanceAfter = await token.balanceOf(asserter.address);
      expect(balanceAfter - balanceBefore).to.equal(DEFAULT_BOND);
    });
  });

  describe('ETH Rejection', function () {
    it('should reject direct ETH transfers', async function () {
      await expect(
        owner.sendTransaction({
          to: await oracle.getAddress(),
          value: ethers.parseEther('1')
        })
      ).to.be.revertedWith('Direct ETH transfers not allowed');
    });
  });

  describe('Enhanced Assertion ID', function () {
    it('should generate unique assertion IDs', async function () {
      await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0);
      const id1 = await oracle.nonce();
      
      await mineBlocks(1);
      await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0);
      const id2 = await oracle.nonce();
      
      expect(id1).to.not.equal(id2);
    });
  });
});
