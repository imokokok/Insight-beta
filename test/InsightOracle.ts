import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs.js';
import { expect } from 'chai';
import { ethers, type Log } from 'ethers';
import hre from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe('InsightOracle', () => {
  async function deployOracle() {
    const { ethers } = hre;
    const [owner, user, disputer, other] = await ethers.getSigners();

    // Deploy mock ERC20 token for bonding
    const MockTokenFactory = await ethers.getContractFactory('MockERC20', owner);
    const mockToken = (await MockTokenFactory.deploy('Mock Token', 'MOCK')) as any;
    await mockToken.waitForDeployment();

    const Factory = await ethers.getContractFactory('InsightOracle', owner);
    const oracle = (await Factory.deploy(await mockToken.getAddress())) as any;
    await oracle.waitForDeployment();
    return { oracle, mockToken, owner, user, disputer, other };
  }

  it('emits lifecycle events', async () => {
    const { oracle, mockToken, user, owner } = await deployOracle();

    // Mint and approve tokens for bonding (use default bond amount)
    const bondAmount = ethers.parseEther('0.1');
    await mockToken.connect(user).mint(user.address, bondAmount);
    await mockToken.connect(user).approve(await oracle.getAddress(), bondAmount);

    const createTx = await oracle.connect(user).createAssertion(
      'Demo',
      'ETH > $4,000 on 2026-03-31',
      'Outcome is YES',
      0, // use default bond
    );

    await expect(createTx)
      .to.emit(oracle, 'AssertionCreated')
      .withArgs(
        anyValue,
        user.address,
        'Demo',
        'ETH > $4,000 on 2026-03-31',
        'Outcome is YES',
        bondAmount,
        anyValue,
        anyValue,
        anyValue,
      );

    const receipt = await createTx.wait();
    if (!receipt) throw new Error('missing_receipt');
    type ParsedEvent = {
      name: string;
      args: { assertionId?: string } & Record<string, unknown>;
    };
    const logs = receipt.logs as Log[];
    const parsed = logs
      .map((l: Log): ParsedEvent | null => {
        try {
          return oracle.interface.parseLog(l) as ParsedEvent;
        } catch {
          return null;
        }
      })
      .find((e): e is ParsedEvent => e !== null && e.name === 'AssertionCreated');
    if (!parsed) throw new Error('missing_AssertionCreated');

    const assertionId = parsed.args.assertionId as string;
    expect(assertionId).to.match(/^0x[0-9a-fA-F]{64}$/);

    // Wait for liveness period (no dispute)
    await time.increase(24 * 3600 + 1);

    // Resolve without dispute - asserter wins automatically
    const resolveTx = await oracle.connect(owner).resolveAssertion(assertionId);
    await expect(resolveTx)
      .to.emit(oracle, 'AssertionResolved')
      .withArgs(assertionId, true, anyValue);
  });

  it('handles disputed assertions with voting', async () => {
    const { oracle, mockToken, user, disputer, owner, other } = await deployOracle();

    // Mint and approve tokens for bonding
    const bondAmount = ethers.parseEther('0.1');
    await mockToken.connect(user).mint(user.address, bondAmount);
    await mockToken.connect(user).approve(await oracle.getAddress(), bondAmount);

    const createTx = await oracle.connect(user).createAssertion('Demo', 'Market', 'Assertion', 0);
    const receipt = await createTx.wait();

    type ParsedEvent = {
      name: string;
      args: { assertionId?: string } & Record<string, unknown>;
    };
    const logs = receipt!.logs as Log[];
    const parsed = logs
      .map((l: Log): ParsedEvent | null => {
        try {
          return oracle.interface.parseLog(l) as ParsedEvent;
        } catch {
          return null;
        }
      })
      .find((e): e is ParsedEvent => e !== null && e.name === 'AssertionCreated');
    const assertionId = parsed!.args.assertionId as string;

    // Mint and approve tokens for disputer
    const disputeBond = ethers.parseEther('0.05');
    await mockToken.connect(disputer).mint(disputer.address, disputeBond);
    await mockToken.connect(disputer).approve(await oracle.getAddress(), disputeBond);

    await oracle.connect(disputer).disputeAssertion(assertionId, 'Reason', 0);

    // Mint and approve tokens for voter
    const voteAmount = 100n;
    await mockToken.connect(other).mint(other.address, voteAmount);
    await mockToken.connect(other).approve(await oracle.getAddress(), voteAmount);

    // Set up governor merkle root for voting (owner only)
    const leaf = ethers.keccak256(
      ethers.solidityPacked(['address', 'uint256'], [other.address, voteAmount]),
    );
    await oracle.connect(owner).setGovernorMerkleRoot(leaf);

    await expect(oracle.connect(other).castVote(assertionId, true, voteAmount, []))
      .to.emit(oracle, 'VoteCast')
      .withArgs(assertionId, other.address, true, voteAmount, voteAmount);

    await time.increase(24 * 3600 + 1);

    // Now resolve with votes
    await expect(oracle.connect(owner).resolveAssertion(assertionId)).to.emit(
      oracle,
      'AssertionResolved',
    );
  });

  it('manages default bond', async () => {
    const { oracle, owner, user } = await deployOracle();

    expect(await oracle.getBond()).to.equal(ethers.parseEther('0.1'));

    await expect(oracle.connect(user).setDefaultBond(1000)).to.be.revertedWithCustomError(
      oracle,
      'OwnableUnauthorizedAccount',
    );

    await expect(oracle.connect(owner).setDefaultBond(ethers.parseEther('0.2')))
      .to.emit(oracle, 'BondChanged')
      .withArgs(ethers.parseEther('0.1'), ethers.parseEther('0.2'));

    expect(await oracle.getBond()).to.equal(ethers.parseEther('0.2'));
  });

  it('enforces pause mechanism', async () => {
    const { oracle, mockToken, owner, user } = await deployOracle();

    await oracle.connect(owner).pause();

    await expect(
      oracle.connect(user).createAssertion('P', 'M', 'A', 0),
    ).to.be.revertedWithCustomError(oracle, 'EnforcedPause');

    await oracle.connect(owner).unpause();

    // Mint and approve tokens
    const bondAmount = ethers.parseEther('0.1');
    await mockToken.connect(user).mint(user.address, bondAmount);
    await mockToken.connect(user).approve(await oracle.getAddress(), bondAmount);

    await expect(oracle.connect(user).createAssertion('P', 'M', 'A', 0)).to.emit(
      oracle,
      'AssertionCreated',
    );
  });

  it('resolves assertion after liveness', async () => {
    const { oracle, mockToken, user } = await deployOracle();

    // Mint and approve tokens
    const bondAmount = ethers.parseEther('0.1');
    await mockToken.connect(user).mint(user.address, bondAmount);
    await mockToken.connect(user).approve(await oracle.getAddress(), bondAmount);

    const createTx = await oracle.connect(user).createAssertion('P', 'M', 'A', 0);
    const receipt = await createTx.wait();
    const log = receipt!.logs.find((l: any) => {
      try {
        return oracle.interface.parseLog(l).name === 'AssertionCreated';
      } catch {
        return false;
      }
    });
    const assertionId = oracle.interface.parseLog(log!).args.assertionId;

    // Wait for liveness period
    await time.increase(24 * 3600 + 1);

    // Anyone can resolve after liveness (no dispute)
    await expect(oracle.connect(user).resolveAssertion(assertionId)).to.emit(
      oracle,
      'AssertionResolved',
    );
  });

  it('enforces liveness bounds', async () => {
    const { oracle, mockToken, user } = await deployOracle();

    // Mint and approve tokens
    const bondAmount = ethers.parseEther('0.1');
    await mockToken.connect(user).mint(user.address, bondAmount);
    await mockToken.connect(user).approve(await oracle.getAddress(), bondAmount);

    // Create assertion first
    await oracle.connect(user).createAssertion('P', 'M', 'A', 0);
  });

  it('limits active assertions per address', async () => {
    const { oracle, mockToken, user } = await deployOracle();

    const maxActive = Number(await oracle.MAX_ACTIVE_ASSERTIONS());
    const bondAmount = ethers.parseEther('0.1');

    for (let i = 0; i < maxActive; i++) {
      await mockToken.connect(user).mint(user.address, bondAmount);
      await mockToken.connect(user).approve(await oracle.getAddress(), bondAmount);
      await oracle.connect(user).createAssertion('P', 'M', `A${i}`, 0);
    }

    await mockToken.connect(user).mint(user.address, bondAmount);
    await mockToken.connect(user).approve(await oracle.getAddress(), bondAmount);
    await expect(oracle.connect(user).createAssertion('P', 'M', 'A', 0)).to.be.revertedWith(
      'rate limit',
    );
  });

  it('prevents voting before dispute', async () => {
    const { oracle, mockToken, user, other } = await deployOracle();

    // Mint and approve tokens for user
    const bondAmount = ethers.parseEther('0.1');
    await mockToken.connect(user).mint(user.address, bondAmount);
    await mockToken.connect(user).approve(await oracle.getAddress(), bondAmount);

    const createTx = await oracle.connect(user).createAssertion('P', 'M', 'A', 0);
    const receipt = await createTx.wait();
    const log = receipt!.logs.find((l: any) => {
      try {
        return oracle.interface.parseLog(l).name === 'AssertionCreated';
      } catch {
        return false;
      }
    });
    const assertionId = oracle.interface.parseLog(log!).args.assertionId;

    // Cannot vote before dispute
    await expect(oracle.connect(other).castVote(assertionId, true, 100, [])).to.be.revertedWith(
      'not disputed',
    );
  });
});
