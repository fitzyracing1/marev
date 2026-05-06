const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const networkName = hre.network.name;
  console.log(`Deploying MerkleDistributorFactory to ${networkName.toUpperCase()}...`);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

  const Factory = await hre.ethers.getContractFactory("MerkleDistributorFactory");
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ? (feeData.gasPrice * 120n) / 100n : undefined;

  const factory = await Factory.deploy(gasPrice ? { gasPrice } : {});
  await factory.waitForDeployment();
  const address = await factory.getAddress();

  console.log("\n✓ MerkleDistributorFactory deployed to:", address);

  const out = {
    network: networkName,
    chainId: hre.network.config.chainId,
    merkleDistributorFactory: address,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
  };

  const filename = `deployments-airdrop-${networkName}.json`;
  fs.writeFileSync(filename, JSON.stringify(out, null, 2));
  console.log(`📝 Saved to ${filename}`);

  // Also patch the vercel deployment file so the frontend picks it up
  const vercelDeploymentsPath = path.resolve(
    __dirname,
    "..",
    "..",
    "vercel",
    "deployments-factory-base.json"
  );
  if (fs.existsSync(vercelDeploymentsPath)) {
    const data = JSON.parse(fs.readFileSync(vercelDeploymentsPath, "utf8"));
    data.merkleDistributorFactory = address;
    fs.writeFileSync(vercelDeploymentsPath, JSON.stringify(data, null, 2));
    console.log(`📝 Updated ${vercelDeploymentsPath} with merkleDistributorFactory.`);
  } else {
    console.log("⚠️  vercel/deployments-factory-base.json not found; update it manually.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
