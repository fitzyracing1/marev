const hre = require("hardhat");

async function main() {
  console.log("Deploying MAREV DEX contracts to Base mainnet...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy MAREV Token
  console.log("\n1. Deploying MAREV Token...");
  const MAREVToken = await hre.ethers.getContractFactory("MAREVToken");
  const marevToken = await MAREVToken.deploy();
  await marevToken.waitForDeployment();
  const marevAddress = await marevToken.getAddress();
  console.log("MAREV Token deployed to:", marevAddress);

  // For testing on Base, we use USDC address (0x833589fCD6eDb6E08f4c7C32D4f71b1566469c3d)
  // You can also deploy a mock USDC for testing
  const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b1566469c3d"; // Base USDC

  // Deploy DEX
  console.log("\n2. Deploying MAREV DEX...");
  const MAREVDex = await hre.ethers.getContractFactory("MAREVDex");
  const dex = await MAREVDex.deploy(marevAddress, usdcAddress, deployer.address);
  await dex.waitForDeployment();
  const dexAddress = await dex.getAddress();
  console.log("MAREV DEX deployed to:", dexAddress);

  // Save addresses
  const addresses = {
    network: hre.network.name,
    marevToken: marevAddress,
    dex: dexAddress,
    usdc: usdcAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
  };

  console.log("\n=== Deployment Complete ===");
  console.log(JSON.stringify(addresses, null, 2));

  // Save to file
  const fs = require("fs");
  fs.writeFileSync(
    `./deployments-${hre.network.name}.json`,
    JSON.stringify(addresses, null, 2)
  );
  console.log(`\nAddresses saved to deployments-${hre.network.name}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
