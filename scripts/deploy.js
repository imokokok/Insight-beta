const hre = require("hardhat");

async function main() {
  const InsightOracle = await hre.ethers.getContractFactory("InsightOracle");
  const insightOracle = await InsightOracle.deploy();

  await insightOracle.waitForDeployment();

  const address = await insightOracle.getAddress();
  console.log(`InsightOracle deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
