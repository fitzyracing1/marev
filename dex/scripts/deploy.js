const hre = require("hardhat");

async function main() {
  const networkName = hre.network.name;
  const isTestnet = networkName.includes("sepolia");
  
  console.log(`Deploying MAREV DEX contracts to ${networkName.toUpperCase()}...`);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Get current nonce and gas price
  const nonce = await hre.ethers.provider.getTransactionCount(deployer.address);
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ? feeData.gasPrice * 120n / 100n : null; // 20% higher
  
  console.log("Nonce:", nonce);
  console.log("Gas Price (gwei):", gasPrice ? hre.ethers.formatUnits(gasPrice, "gwei") : "auto");

  // Deploy MAREV Token
  console.log("\n1. Deploying MAREV Token...");
  const MAREVToken = await hre.ethers.getContractFactory("MAREVToken");
  const deployOptions = gasPrice ? { gasPrice, nonce } : { nonce };
  const marevToken = await MAREVToken.deploy(deployOptions);
  await marevToken.waitForDeployment();
  const marevAddress = await marevToken.getAddress();
  console.log("✓ MAREV Token deployed to:", marevAddress);

  // USDC address varies by network
  let usdcAddress;
  if (isTestnet) {
    // Deploy mock USDC on testnet
    console.log("\n2. Deploying Mock USDC (testnet)...");
    const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    const usdcNonce = nonce + 1;
    const mockUsdc = await ERC20Mock.deploy("USD Coin", "USDC", 6, {
      ...(gasPrice ? { gasPrice } : {}),
      nonce: usdcNonce
    });
    await mockUsdc.waitForDeployment();
    usdcAddress = await mockUsdc.getAddress();
    console.log("✓ Mock USDC deployed to:", usdcAddress);
  } else {
    // Use actual USDC on Base mainnet
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b1566469c3d";
    console.log("2. Using Base mainnet USDC:", usdcAddress);
  }

  // Deploy DEX
  const dexLabel = isTestnet ? "3" : "2";
  console.log(`\n${dexLabel}. Deploying MAREV DEX...`);
  const MAREVDex = await hre.ethers.getContractFactory("MAREVDex");
  const dexNonce = isTestnet ? nonce + 2 : nonce + 1;
  const dex = await MAREVDex.deploy(marevAddress, usdcAddress, deployer.address, {
    ...(gasPrice ? { gasPrice } : {}),
    nonce: dexNonce
  });
  await dex.waitForDeployment();
  const dexAddress = await dex.getAddress();
  console.log("✓ MAREV DEX deployed to:", dexAddress);

  // Save addresses
  const addresses = {
    network: networkName,
    chainId: hre.network.config.chainId,
    marevToken: marevAddress,
    dex: dexAddress,
    usdc: usdcAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    isTestnet: isTestnet,
  };

  console.log("\n" + "=".repeat(50));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("=".repeat(50));
  console.log(JSON.stringify(addresses, null, 2));

  // Save to file
  const fs = require("fs");
  const filename = isTestnet ? `deployments-${networkName}.json` : `deployments-${networkName}.json`;
  fs.writeFileSync(
    filename,
    JSON.stringify(addresses, null, 2)
  );
  console.log(`\n📝 Addresses saved to ${filename}`);
  console.log("\nNext steps:");
  console.log("1. Copy contract addresses to vercel/deployments-base.json");
  console.log("2. Visit https://marev-bay.vercel.app to test the dApp");
  console.log("3. Add liquidity and start swapping!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
