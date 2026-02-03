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

  console.log(`Deployer: ${deployer.address}`);
  console.log(`Network: ${networkName} (${chainId})`);

  // Deploy MockERC20 first to use as bond token
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20", deployer);
  const mockToken = await MockERC20.deploy("Bond Token", "BOND");
  await mockToken.waitForDeployment();
  const tokenAddress = await mockToken.getAddress();
  console.log(`MockERC20 (Bond Token) deployed to: ${tokenAddress}`);

  // Setup multisig signers
  const initialSigners = [
    deployer.address,
    signers[1]?.address || deployer.address,
    signers[2]?.address || deployer.address
  ].filter((addr, index, self) => self.indexOf(addr) === index);
  
  const requiredSignatures = Math.min(2, initialSigners.length);
  
  console.log(`\nMultisig Configuration:`);
  console.log(`Signers: ${initialSigners.join(", ")}`);
  console.log(`Required Signatures: ${requiredSignatures}`);

  // Deploy InsightOracleGasOptimized with multisig
  const InsightOracleGasOptimized = await hre.ethers.getContractFactory(
    "InsightOracleGasOptimized",
    deployer,
  );
  
  const insightOracle = await InsightOracleGasOptimized.deploy(
    tokenAddress,
    initialSigners,
    requiredSignatures
  );
  
  const deployTx = insightOracle.deploymentTransaction();
  await insightOracle.waitForDeployment();

  const address = await insightOracle.getAddress();
  
  let explorerBase = "";
  if (networkName.toLowerCase().includes("amoy") || chainId === 80002) {
    explorerBase = "https://amoy.polygonscan.com";
  } else if (networkName.toLowerCase().includes("polygon") || chainId === 137) {
    explorerBase = "https://polygonscan.com";
  } else if (networkName.toLowerCase().includes("arbitrum") || chainId === 42161) {
    explorerBase = "https://arbiscan.io";
  }

  console.log(`\n=== Deployment Summary ===`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Network: ${networkName} (${chainId})`);
  if (deployTx?.hash) {
    console.log(`Deploy tx: ${deployTx.hash}`);
    if (explorerBase) {
      console.log(`Explorer tx: ${explorerBase}/tx/${deployTx.hash}`);
    }
  }
  console.log(`Bond Token: ${tokenAddress}`);
  console.log(`InsightOracleGasOptimized deployed to: ${address}`);
  if (explorerBase) {
    console.log(`Explorer address: ${explorerBase}/address/${address}`);
  }

  // Verification
  console.log(`\n=== Verification ===`);
  const oracleBondToken = await insightOracle.bondToken();
  const oracleOwner = await insightOracle.owner();
  const oracleVersion = await insightOracle.VERSION();
  const signersList = await insightOracle.getSigners();
  const requiredSigs = await insightOracle.requiredSignatures();
  
  console.log(`Oracle bond token matches: ${oracleBondToken === tokenAddress}`);
  console.log(`Oracle owner: ${oracleOwner}`);
  console.log(`Oracle version: ${oracleVersion}`);
  console.log(`Signers count: ${signersList.length}`);
  console.log(`Required signatures: ${requiredSigs}`);
  console.log(`Emergency mode: ${await insightOracle.emergencyMode()}`);

  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: chainId,
    deployer: deployer.address,
    bondToken: tokenAddress,
    oracle: address,
    version: oracleVersion,
    signers: initialSigners,
    requiredSignatures: Number(requiredSigs),
    deploymentTx: deployTx?.hash || "",
    timestamp: new Date().toISOString(),
    type: "gas-optimized"
  };

  const fs = require('fs');
  const path = require('path');
  const deploymentPath = path.join(__dirname, '..', 'deployments');
  
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  const fileName = `${networkName}-gas-optimized-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentPath, fileName),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`\nDeployment info saved to: deployments/${fileName}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
