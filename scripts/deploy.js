async function main() {
  const hreImport = await import("hardhat");
  const hre = hreImport.default ?? hreImport;
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  if (!deployer) {
    throw new Error("missing_deployer_private_key");
  }

  const InsightOracle = await hre.ethers.getContractFactory(
    "InsightOracle",
    deployer,
  );
  const insightOracle = await InsightOracle.deploy();

  await insightOracle.waitForDeployment();

  const address = await insightOracle.getAddress();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`InsightOracle deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
