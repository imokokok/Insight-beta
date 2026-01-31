import { expect } from 'chai';
import hre from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import type { InsightOracle, MockERC20 } from '../typechain-types';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

const { ethers } = hre;

describe('InsightOracle', function () {
  let oracle: InsightOracle;
  let token: MockERC20;
  let owner: HardhatEthersSigner;
  let asserter: HardhatEthersSigner;
  let disputer: HardhatEthersSigner;
  let voter: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  const DEFAULT_BOND = ethers.parseEther('0.1');
  const DEFAULT_DISPUTE_BOND = ethers.parseEther('0.05');
  const MIN_BOND = ethers.parseEther('0.01');

  beforeEach(async function () {
    [owner, asserter, disputer, voter, other] = await ethers.getSigners();

    // Deploy MockERC20
    const MockERC20Factory = await ethers.getContractFactory('MockERC20');
    token = await MockERC20Factory.deploy('Mock Token', 'MTK');
    await token.waitForDeployment();

    // Deploy InsightOracle
    const InsightOracleFactory = await ethers.getContractFactory('InsightOracle');
    oracle = await InsightOracleFactory.deploy(await token.getAddress());
    await oracle.waitForDeployment();

    // Mint tokens to test accounts
    await token.mint(asserter.address, ethers.parseEther('1000'));
    await token.mint(disputer.address, ethers.parseEther('1000'));
    await token.mint(voter.address, ethers.parseEther('1000'));

    // Approve oracle contract
    await token.connect(asserter).approve(await oracle.getAddress(), ethers.parseEther('1000'));
    await token.connect(disputer).approve(await oracle.getAddress(), ethers.parseEther('1000'));
    await token.connect(voter).approve(await oracle.getAddress(), ethers.parseEther('1000'));
  });

  describe('Deployment', function () {
    it('should set the correct bond token', async function () {
      expect(await oracle.bondToken()).to.equal(await token.getAddress());
    });

    it('should set the correct owner', async function () {
      expect(await oracle.owner()).to.equal(owner.address);
    });

    it('should initialize with default bond amounts', async function () {
      expect(await oracle.getBond()).to.equal(DEFAULT_BOND);
      expect(await oracle.getDisputeBond()).to.equal(DEFAULT_DISPUTE_BOND);
    });

    it('should have correct constants', async function () {
      expect(await oracle.MAX_LIVENESS()).to.equal(30 * 24 * 60 * 60); // 30 days
      expect(await oracle.MIN_BOND_AMOUNT()).to.equal(MIN_BOND);
      expect(await oracle.MIN_DISPUTE_BOND()).to.equal(MIN_BOND);
      expect(await oracle.VERSION()).to.equal('1.0.0');
    });
  });

  describe('createAssertion', function () {
    it('should create an assertion with default bond', async function () {
      const tx = await oracle.connect(asserter).createAssertion(
        'chainlink',
        'ETH/USD',
        'Price is 2000 USD',
        0, // Use default bond
      );

      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;

      // Check nonce increased
      expect(await oracle.nonce()).to.equal(1);
    });

    it('should create an assertion with custom bond', async function () {
      const customBond = ethers.parseEther('0.5');
      await oracle
        .connect(asserter)
        .createAssertion('chainlink', 'ETH/USD', 'Price is 2000 USD', customBond);

      // Verify by checking nonce
      expect(await oracle.nonce()).to.equal(1);
    });

    it('should revert if bond is below minimum', async function () {
      const lowBond = ethers.parseEther('0.005');
      await expect(
        oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', lowBond),
      ).to.be.revertedWith('bond too low');
    });

    it('should revert if protocol is empty', async function () {
      await expect(
        oracle.connect(asserter).createAssertion('', 'ETH/USD', 'Test', 0),
      ).to.be.revertedWith('protocol length');
    });

    it('should revert if protocol is too long', async function () {
      const longProtocol = 'a'.repeat(101);
      await expect(
        oracle.connect(asserter).createAssertion(longProtocol, 'ETH/USD', 'Test', 0),
      ).to.be.revertedWith('protocol length');
    });

    it('should revert if market is empty', async function () {
      await expect(
        oracle.connect(asserter).createAssertion('chainlink', '', 'Test', 0),
      ).to.be.revertedWith('market length');
    });

    it('should revert if assertion text is empty', async function () {
      await expect(
        oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', '', 0),
      ).to.be.revertedWith('assertion length');
    });

    it('should revert if assertion text is too long', async function () {
      const longText = 'a'.repeat(1001);
      await expect(
        oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', longText, 0),
      ).to.be.revertedWith('assertion length');
    });

    it('should track active assertions count', async function () {
      await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test1', 0);
      expect(await oracle.activeAssertions(asserter.address)).to.equal(1);

      await oracle.connect(asserter).createAssertion('chainlink', 'BTC/USD', 'Test2', 0);
      expect(await oracle.activeAssertions(asserter.address)).to.equal(2);
    });

    it('should revert if max active assertions reached', async function () {
      // Create 1000 assertions (MAX_ACTIVE_ASSERTIONS)
      for (let i = 0; i < 1000; i++) {
        await oracle.connect(asserter).createAssertion('chainlink', `PAIR${i}`, `Test${i}`, 0);
      }

      await expect(
        oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0),
      ).to.be.revertedWith('rate limit');
    });

    it('should emit AssertionCreated event', async function () {
      await expect(
        oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0),
      ).to.emit(oracle, 'AssertionCreated');
    });
  });

  describe('disputeAssertion', function () {
    let assertionId: string;

    beforeEach(async function () {
      const tx = await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0);
      const receipt = await tx.wait();

      // Get assertion ID from event
      const event = receipt?.logs.find(
        (log) =>
          log.topics[0] ===
          ethers.id(
            'AssertionCreated(bytes32,address,string,string,string,uint256,uint256,uint256,bytes32)',
          ),
      );
      assertionId = event?.topics[1] || '';
    });

    it('should dispute an assertion', async function () {
      await oracle.connect(disputer).disputeAssertion(assertionId, 'Wrong price', 0);

      const assertion = await oracle.getAssertion(assertionId);
      expect(assertion.disputed).to.be.true;
    });

    it('should transfer dispute bond', async function () {
      const balanceBefore = await token.balanceOf(disputer.address);
      await oracle.connect(disputer).disputeAssertion(assertionId, 'Wrong price', 0);
      const balanceAfter = await token.balanceOf(disputer.address);

      expect(balanceBefore - balanceAfter).to.equal(DEFAULT_DISPUTE_BOND);
    });

    it('should revert if assertion does not exist', async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes('fake'));
      await expect(oracle.connect(disputer).disputeAssertion(fakeId, 'Test', 0)).to.be.revertedWith(
        'missing',
      );
    });

    it('should revert if already disputed', async function () {
      await oracle.connect(disputer).disputeAssertion(assertionId, 'Test', 0);
      await expect(
        oracle.connect(disputer).disputeAssertion(assertionId, 'Test', 0),
      ).to.be.revertedWith('already disputed');
    });

    it('should revert if liveness period ended', async function () {
      await time.increase(86401); // 1 day + 1 second
      await expect(
        oracle.connect(disputer).disputeAssertion(assertionId, 'Test', 0),
      ).to.be.revertedWith('liveness ended');
    });

    it('should revert if asserter tries to dispute own assertion', async function () {
      await expect(
        oracle.connect(asserter).disputeAssertion(assertionId, 'Test', 0),
      ).to.be.revertedWith('asserter cannot dispute');
    });

    it('should revert if dispute bond is too low', async function () {
      const lowBond = ethers.parseEther('0.005');
      await expect(
        oracle.connect(disputer).disputeAssertion(assertionId, 'Test', lowBond),
      ).to.be.revertedWith('dispute bond too low');
    });

    it('should revert if reason is too long', async function () {
      const longReason = 'a'.repeat(501);
      await expect(
        oracle.connect(disputer).disputeAssertion(assertionId, longReason, 0),
      ).to.be.revertedWith('reason too long');
    });

    it('should emit AssertionDisputed event', async function () {
      await expect(oracle.connect(disputer).disputeAssertion(assertionId, 'Test', 0)).to.emit(
        oracle,
        'AssertionDisputed',
      );
    });
  });

  describe('resolveAssertion', function () {
    let assertionId: string;

    beforeEach(async function () {
      const tx = await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log) =>
          log.topics[0] ===
          ethers.id(
            'AssertionCreated(bytes32,address,string,string,string,uint256,uint256,uint256,bytes32)',
          ),
      );
      assertionId = event?.topics[1] || '';
    });

    it('should resolve undisputed assertion', async function () {
      await time.increase(86401); // Wait for liveness to end

      await oracle.connect(other).resolveAssertion(assertionId);

      const assertion = await oracle.getAssertion(assertionId);
      expect(assertion.resolved).to.be.true;
      expect(assertion.outcome).to.be.true;
    });

    it('should transfer bond back to asserter for undisputed assertion', async function () {
      await time.increase(86401);

      await oracle.connect(other).resolveAssertion(assertionId);

      // Check pending rewards
      expect(await oracle.pendingRewards(asserter.address)).to.equal(DEFAULT_BOND);
    });

    it('should revert if liveness period not ended', async function () {
      await expect(oracle.connect(other).resolveAssertion(assertionId)).to.be.revertedWith(
        'still in liveness',
      );
    });

    it('should revert if already resolved', async function () {
      await time.increase(86401);
      await oracle.connect(other).resolveAssertion(assertionId);

      await expect(oracle.connect(other).resolveAssertion(assertionId)).to.be.revertedWith(
        'resolved',
      );
    });

    it('should emit AssertionResolved event', async function () {
      await time.increase(86401);

      await expect(oracle.connect(other).resolveAssertion(assertionId)).to.emit(
        oracle,
        'AssertionResolved',
      );
    });

    it('should decrease active assertions count', async function () {
      await time.increase(86401);
      expect(await oracle.activeAssertions(asserter.address)).to.equal(1);

      await oracle.connect(other).resolveAssertion(assertionId);
      expect(await oracle.activeAssertions(asserter.address)).to.equal(0);
    });
  });

  describe('claimRewards', function () {
    let assertionId: string;

    beforeEach(async function () {
      const tx = await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log) =>
          log.topics[0] ===
          ethers.id(
            'AssertionCreated(bytes32,address,string,string,string,uint256,uint256,uint256,bytes32)',
          ),
      );
      assertionId = event?.topics[1] || '';

      await time.increase(86401);
      await oracle.connect(other).resolveAssertion(assertionId);
    });

    it('should claim rewards', async function () {
      const balanceBefore = await token.balanceOf(asserter.address);

      await oracle.connect(asserter).claimRewards();

      const balanceAfter = await token.balanceOf(asserter.address);
      expect(balanceAfter - balanceBefore).to.equal(DEFAULT_BOND);
      expect(await oracle.pendingRewards(asserter.address)).to.equal(0);
    });

    it('should revert if no rewards to claim', async function () {
      await oracle.connect(asserter).claimRewards();
      await expect(oracle.connect(asserter).claimRewards()).to.be.revertedWith('no rewards');
    });

    it('should emit RewardClaimed event', async function () {
      await expect(oracle.connect(asserter).claimRewards()).to.emit(oracle, 'RewardClaimed');
    });
  });

  describe('Admin functions', function () {
    describe('setDefaultBond', function () {
      it('should allow owner to set default bond', async function () {
        const newBond = ethers.parseEther('0.2');
        await oracle.connect(owner).setDefaultBond(newBond);
        expect(await oracle.getBond()).to.equal(newBond);
      });

      it('should emit BondChanged event', async function () {
        const newBond = ethers.parseEther('0.2');
        await expect(oracle.connect(owner).setDefaultBond(newBond))
          .to.emit(oracle, 'BondChanged')
          .withArgs(DEFAULT_BOND, newBond);
      });

      it('should revert if bond below minimum', async function () {
        await expect(
          oracle.connect(owner).setDefaultBond(ethers.parseEther('0.005')),
        ).to.be.revertedWith('bond below minimum');
      });

      it('should revert if non-owner tries to set bond', async function () {
        await expect(
          oracle.connect(other).setDefaultBond(ethers.parseEther('0.2')),
        ).to.be.revertedWithCustomError(oracle, 'OwnableUnauthorizedAccount');
      });
    });

    describe('setDefaultDisputeBond', function () {
      it('should allow owner to set default dispute bond', async function () {
        const newBond = ethers.parseEther('0.1');
        await oracle.connect(owner).setDefaultDisputeBond(newBond);
        expect(await oracle.getDisputeBond()).to.equal(newBond);
      });

      it('should revert if dispute bond below minimum', async function () {
        await expect(
          oracle.connect(owner).setDefaultDisputeBond(ethers.parseEther('0.005')),
        ).to.be.revertedWith('dispute bond below minimum');
      });
    });

    describe('setBondToken', function () {
      it('should allow owner to set bond token', async function () {
        const MockERC20Factory = await ethers.getContractFactory('MockERC20');
        const newToken = await MockERC20Factory.deploy('New Token', 'NTK');
        await newToken.waitForDeployment();

        await oracle.connect(owner).setBondToken(await newToken.getAddress());
        expect(await oracle.bondToken()).to.equal(await newToken.getAddress());
      });

      it('should revert if token address is zero', async function () {
        await expect(oracle.connect(owner).setBondToken(ethers.ZeroAddress)).to.be.revertedWith(
          'invalid token',
        );
      });
    });

    describe('setGovernorMerkleRoot', function () {
      it('should allow owner to set merkle root', async function () {
        const newRoot = ethers.keccak256(ethers.toUtf8Bytes('new root'));
        await oracle.connect(owner).setGovernorMerkleRoot(newRoot);
        expect(await oracle.governorMerkleRoot()).to.equal(newRoot);
      });
    });

    describe('pause/unpause', function () {
      it('should allow owner to pause', async function () {
        await oracle.connect(owner).pause();
        expect(await oracle.paused()).to.be.true;
      });

      it('should allow owner to unpause', async function () {
        await oracle.connect(owner).pause();
        await oracle.connect(owner).unpause();
        expect(await oracle.paused()).to.be.false;
      });

      it('should revert operations when paused', async function () {
        await oracle.connect(owner).pause();
        await expect(
          oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0),
        ).to.be.revertedWithCustomError(oracle, 'EnforcedPause');
      });

      it('should revert if non-owner tries to pause', async function () {
        await expect(oracle.connect(other).pause()).to.be.revertedWithCustomError(
          oracle,
          'OwnableUnauthorizedAccount',
        );
      });
    });

    describe('extendLiveness', function () {
      let assertionId: string;

      beforeEach(async function () {
        const tx = await oracle
          .connect(asserter)
          .createAssertion('chainlink', 'ETH/USD', 'Test', 0);
        const receipt = await tx.wait();

        const event = receipt?.logs.find(
          (log) =>
            log.topics[0] ===
            ethers.id(
              'AssertionCreated(bytes32,address,string,string,string,uint256,uint256,uint256,bytes32)',
            ),
        );
        assertionId = event?.topics[1] || '';
      });

      it('should allow owner to extend liveness', async function () {
        const originalAssertion = await oracle.getAssertion(assertionId);
        const additionalTime = 86400; // 1 day

        await oracle.connect(owner).extendLiveness(assertionId, additionalTime);

        const updatedAssertion = await oracle.getAssertion(assertionId);
        expect(updatedAssertion.livenessEndsAt).to.be.gt(originalAssertion.livenessEndsAt);
      });

      it('should revert if assertion does not exist', async function () {
        const fakeId = ethers.keccak256(ethers.toUtf8Bytes('fake'));
        await expect(oracle.connect(owner).extendLiveness(fakeId, 86400)).to.be.revertedWith(
          'missing',
        );
      });

      it('should revert if assertion already resolved', async function () {
        await time.increase(86401);
        await oracle.connect(other).resolveAssertion(assertionId);

        await expect(oracle.connect(owner).extendLiveness(assertionId, 86400)).to.be.revertedWith(
          'resolved',
        );
      });

      it('should revert if additional time exceeds max', async function () {
        const maxLiveness = await oracle.MAX_LIVENESS();
        await expect(
          oracle.connect(owner).extendLiveness(assertionId, Number(maxLiveness) + 1),
        ).to.be.revertedWith('additional time exceeds max liveness');
      });
    });
  });

  describe('View functions', function () {
    it('should return correct assertion data', async function () {
      const tx = await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log) =>
          log.topics[0] ===
          ethers.id(
            'AssertionCreated(bytes32,address,string,string,string,uint256,uint256,uint256,bytes32)',
          ),
      );
      const assertionId = event?.topics[1] || '';

      const data = await oracle.getAssertion(assertionId);

      expect(data.asserter).to.equal(asserter.address);
      expect(data.protocol).to.equal('chainlink');
      expect(data.market).to.equal('ETH/USD');
      expect(data.assertion).to.equal('Test');
      expect(data.bondAmount).to.equal(DEFAULT_BOND);
      expect(data.disputed).to.be.false;
      expect(data.resolved).to.be.false;
    });

    it('should return correct vote totals', async function () {
      const tx = await oracle.connect(asserter).createAssertion('chainlink', 'ETH/USD', 'Test', 0);
      const receipt = await tx.wait();

      const event = receipt?.logs.find(
        (log) =>
          log.topics[0] ===
          ethers.id(
            'AssertionCreated(bytes32,address,string,string,string,uint256,uint256,uint256,bytes32)',
          ),
      );
      const assertionId = event?.topics[1] || '';

      const totals = await oracle.getVoteTotals(assertionId);
      expect(totals.forVotes).to.equal(0);
      expect(totals.againstVotes).to.equal(0);
    });
  });
});
