import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs.js";
import { expect } from "chai";
import type { Log } from "ethers";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("InsightOracle", () => {
  async function deployOracle() {
    const { ethers } = hre;
    const [owner, user, disputer, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("InsightOracle", owner);
    const oracle = (await Factory.deploy()) as any;
    await oracle.waitForDeployment();
    return { oracle, owner, user, disputer, other };
  }

  it("emits lifecycle events", async () => {
    const { oracle, user, disputer, owner } = await deployOracle();

    const createTx = await oracle
      .connect(user)
      .createAssertion(
        "Demo",
        "ETH > $4,000 on 2026-03-31",
        "Outcome is YES",
        1500,
        24 * 3600
      );

    await expect(createTx)
      .to.emit(oracle, "AssertionCreated")
      .withArgs(
        anyValue,
        user.address,
        "Demo",
        "ETH > $4,000 on 2026-03-31",
        "Outcome is YES",
        1500,
        anyValue,
        anyValue,
        anyValue
      );

    const receipt = await createTx.wait();
    if (!receipt) throw new Error("missing_receipt");
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
      .find(
        (e): e is ParsedEvent => e !== null && e.name === "AssertionCreated"
      );
    if (!parsed) throw new Error("missing_AssertionCreated");

    const assertionId = parsed.args.assertionId as string;
    expect(assertionId).to.match(/^0x[0-9a-fA-F]{64}$/);

    const disputeTx = await oracle
      .connect(disputer)
      .disputeAssertion(assertionId, "Reason");
    await expect(disputeTx)
      .to.emit(oracle, "AssertionDisputed")
      .withArgs(assertionId, disputer.address, "Reason", anyValue);

    await time.increase(24 * 3600 + 1);

    const resolveTx = await oracle
      .connect(owner)
      .resolveAssertion(assertionId, true);
    await expect(resolveTx)
      .to.emit(oracle, "AssertionResolved")
      .withArgs(assertionId, true, anyValue);
  });

  it("manages default bond", async () => {
    const { oracle, owner, user } = await deployOracle();

    expect(await oracle.getBond()).to.equal(0);

    await expect(
      oracle.connect(user).setDefaultBond(1000)
    ).to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");

    await expect(oracle.connect(owner).setDefaultBond(1000))
      .to.emit(oracle, "BondChanged")
      .withArgs(0, 1000);

    expect(await oracle.getBond()).to.equal(1000);
  });

  it("enforces pause mechanism", async () => {
    const { oracle, owner, user } = await deployOracle();

    await oracle.connect(owner).pause();

    await expect(
      oracle.connect(user).createAssertion("P", "M", "A", 100, 100)
    ).to.be.revertedWithCustomError(oracle, "EnforcedPause");

    await oracle.connect(owner).unpause();

    await expect(
      oracle.connect(user).createAssertion("P", "M", "A", 100, 100)
    ).to.emit(oracle, "AssertionCreated");
  });

  it("restricts resolveAssertion to owner", async () => {
    const { oracle, owner, user, disputer } = await deployOracle();

    const createTx = await oracle
      .connect(user)
      .createAssertion("P", "M", "A", 100, 100);
    const receipt = await createTx.wait();
    const log = receipt.logs.find((l: any) => {
      try {
        return oracle.interface.parseLog(l).name === "AssertionCreated";
      } catch {
        return false;
      }
    });
    const assertionId = oracle.interface.parseLog(log).args.assertionId;

    await oracle.connect(disputer).disputeAssertion(assertionId, "Reason");

    await time.increase(100 + 1);

    await expect(
      oracle.connect(user).resolveAssertion(assertionId, true)
    ).to.be.revertedWithCustomError(oracle, "OwnableUnauthorizedAccount");

    await expect(
      oracle.connect(owner).resolveAssertion(assertionId, true)
    ).to.emit(oracle, "AssertionResolved");
  });

  it("enforces liveness bounds", async () => {
    const { oracle, user } = await deployOracle();

    await expect(
      oracle.connect(user).createAssertion("P", "M", "A", 100, 0)
    ).to.be.revertedWith("liveness");

    const maxLiveness = await oracle.MAX_LIVENESS();

    await expect(
      oracle.connect(user).createAssertion("P", "M", "A", 100, maxLiveness + 1n)
    ).to.be.revertedWith("liveness");
  });

  it("limits active assertions per address", async () => {
    const { oracle, user } = await deployOracle();

    const maxActive = Number(await oracle.MAX_ACTIVE_ASSERTIONS());

    for (let i = 0; i < maxActive; i++) {
      await oracle.connect(user).createAssertion("P", "M", "A", 100, 100);
    }

    await expect(
      oracle.connect(user).createAssertion("P", "M", "A", 100, 100)
    ).to.be.revertedWith("rate");
  });
});
