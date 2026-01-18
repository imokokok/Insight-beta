async function main() {
  const hreImport = await import("hardhat");
  const hre = hreImport.default ?? hreImport;
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const networkName = hre.network?.name || "unknown";
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
  const deployTx = insightOracle.deploymentTransaction();

  await insightOracle.waitForDeployment();

  const address = await insightOracle.getAddress();
  let explorerBase = "";
  if (networkName.toLowerCase().includes("amoy") || chainId === 80002) {
    explorerBase = "https://amoy.polygonscan.com";
  } else if (networkName.toLowerCase().includes("polygon") || chainId === 137) {
    explorerBase = "https://polygonscan.com";
  }
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Network: ${networkName} (${chainId})`);
  if (deployTx?.hash) {
    console.log(`Deploy tx: ${deployTx.hash}`);
    if (explorerBase) {
      console.log(`Explorer tx: ${explorerBase}/tx/${deployTx.hash}`);
    }
  }
  console.log(`InsightOracle deployed to: ${address}`);
  if (explorerBase) {
    console.log(`Explorer address: ${explorerBase}/address/${address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
