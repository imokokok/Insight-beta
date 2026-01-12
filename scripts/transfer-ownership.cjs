const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const contractAddress = process.env.ORACLE_ADDRESS;
  const newOwner = process.env.NEW_OWNER;

  if (!contractAddress || !newOwner) {
    throw new Error("ORACLE_ADDRESS and NEW_OWNER env vars are required");
  }

  console.log("Transferring ownership of InsightOracle");
  console.log("From:", deployer.address);
  console.log("Contract:", contractAddress);
  console.log("To (multisig):", newOwner);

  const Oracle = await hre.ethers.getContractFactory("InsightOracle", deployer);
  const oracle = Oracle.attach(contractAddress);

  const currentOwner = await oracle.owner();
  if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Deployer is not current owner. Current owner: ${currentOwner}`);
  }

  const tx = await oracle.transferOwnership(newOwner);
  console.log("transferOwnership tx:", tx.hash);
  await tx.wait();
  console.log("Ownership transferred");

  const finalOwner = await oracle.owner();
  console.log("New owner:", finalOwner);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

