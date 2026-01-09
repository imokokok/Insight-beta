import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs.js";
import { expect } from "chai";
import type { Log } from "ethers";
import hre from "hardhat";

describe("InsightOracle", () => {
  it("emits lifecycle events", async () => {
    const { ethers } = hre;
    const [owner, user, disputer] = await ethers.getSigners();
    void owner;

    const Factory = await ethers.getContractFactory("InsightOracle", user);
    const oracle = (await Factory.deploy()) as any;
    await oracle.waitForDeployment();

    const createTx = await oracle
      .createAssertion("Demo", "ETH > $4,000 on 2026-03-31", "Outcome is YES", 1500, 24 * 3600);

    await expect(createTx)
      .to.emit(oracle, "AssertionCreated")
      .withArgs(anyValue, user.address, "Demo", "ETH > $4,000 on 2026-03-31", "Outcome is YES", 1500, anyValue, anyValue, anyValue);

    const receipt = await createTx.wait();
    if (!receipt) throw new Error("missing_receipt");
    type ParsedEvent = { name: string; args: { assertionId?: string } & Record<string, unknown> };
    const logs = receipt.logs as Log[];
    const parsed = logs
      .map((l: Log): ParsedEvent | null => {
        try {
          return oracle.interface.parseLog(l) as ParsedEvent;
        } catch {
          return null;
        }
      })
      .find((e): e is ParsedEvent => e !== null && e.name === "AssertionCreated");
    if (!parsed) throw new Error("missing_AssertionCreated");

    const assertionId = parsed.args.assertionId as string;
    expect(assertionId).to.match(/^0x[0-9a-fA-F]{64}$/);

    const disputeTx = await oracle.connect(disputer).disputeAssertion(assertionId, "Reason");
    await expect(disputeTx).to.emit(oracle, "AssertionDisputed").withArgs(assertionId, disputer.address, "Reason", anyValue);

    const resolveTx = await oracle.connect(owner).resolveAssertion(assertionId, true);
    await expect(resolveTx).to.emit(oracle, "AssertionResolved").withArgs(assertionId, true, anyValue);
  });
});
