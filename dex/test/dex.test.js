const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MAREV DEX", function () {
  let marevToken;
  let mockUsdc;
  let dex;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MAREV Token
    const MAREVToken = await ethers.getContractFactory("MAREVToken");
    marevToken = await MAREVToken.deploy();
    const marevAddress = await marevToken.getAddress();

    // Deploy Mock USDC
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    mockUsdc = await ERC20Mock.deploy("USDC", "USDC", 6);
    const mockUsdcAddress = await mockUsdc.getAddress();

    // Deploy DEX
    const MAREVDex = await ethers.getContractFactory("MAREVDex");
    dex = await MAREVDex.deploy(marevAddress, mockUsdcAddress, owner.address);

    // Mint tokens to users
    await marevToken.mint(user1.address, ethers.parseEther("1000"));
    await mockUsdc.mint(user2.address, ethers.parseUnits("1000", 6));

    // Approve DEX
    await marevToken.connect(user1).approve(await dex.getAddress(), ethers.MaxUint256);
    await mockUsdc.connect(user2).approve(await dex.getAddress(), ethers.MaxUint256);
  });

  describe("Token Deployment", function () {
    it("Should have correct initial supply", async function () {
      const balance = await marevToken.balanceOf(owner.address);
      expect(balance).to.equal(ethers.parseEther("1000000"));
    });

    it("Should have correct name and symbol", async function () {
      expect(await marevToken.name()).to.equal("MAREV");
      expect(await marevToken.symbol()).to.equal("MAREV");
    });
  });

  describe("DEX Initialization", function () {
    it("Should initialize with correct token addresses", async function () {
      const dexMarev = await dex.marevToken();
      const dexUsdc = await dex.usdcToken();
      expect(dexMarev).to.equal(await marevToken.getAddress());
    });
  });

  describe("Liquidity Management", function () {
    it("Should add liquidity", async function () {
      const marevAmount = ethers.parseEther("100");
      const usdcAmount = ethers.parseUnits("100", 6);

      await marevToken.connect(owner).approve(await dex.getAddress(), marevAmount);
      await mockUsdc.connect(owner).approve(await dex.getAddress(), usdcAmount);

      await expect(dex.addLiquidity(marevAmount, usdcAmount))
        .to.emit(dex, "LiquidityAdded");

      const [marevReserve, usdcReserve] = await dex.getReserves();
      expect(marevReserve).to.equal(marevAmount);
      expect(usdcReserve).to.equal(usdcAmount);
    });
  });

  describe("Swapping", function () {
    beforeEach(async function () {
      // Add liquidity first
      const marevAmount = ethers.parseEther("1000");
      const usdcAmount = ethers.parseUnits("1000", 6);

      await marevToken.connect(owner).approve(await dex.getAddress(), marevAmount);
      await mockUsdc.connect(owner).approve(await dex.getAddress(), usdcAmount);
      await dex.addLiquidity(marevAmount, usdcAmount);
    });

    it("Should swap MAREV for USDC", async function () {
      const swapAmount = ethers.parseEther("10");
      const expectedOut = await dex.getPrice(
        await marevToken.getAddress(),
        await mockUsdc.getAddress(),
        swapAmount
      );

      await expect(
        dex.connect(user1).swapMARtoUSDC(swapAmount, 0)
      ).to.emit(dex, "Swap");

      const userBalance = await mockUsdc.balanceOf(user1.address);
      expect(userBalance).to.be.gt(0);
    });
  });
});

// Simple ERC20 Mock for testing
async function deployERC20Mock(name, symbol, decimals) {
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  return await ERC20Mock.deploy(name, symbol, decimals);
}
