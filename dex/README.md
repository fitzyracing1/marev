# MAREV DEX

A Decentralized Exchange (DEX) smart contract deployed on Base mainnet.

## Features

- **MAREV Token**: ERC20 token with 1M initial supply
- **Automated Market Maker (AMM)**: Constant product formula (x * y = k)
- **Swap**: Trade MAREV ↔ USDC with 0.25% fee
- **Liquidity Pool**: Provide liquidity and earn fees
- **Fee Collection**: Owner can collect trading fees

## Contracts

### MAREVToken.sol
- ERC20 token implementation
- Initial supply: 1,000,000 MAREV
- Owner can mint additional tokens

### MAREVDex.sol
- DEX with AMM pricing
- Supports MAREV/USDC pair
- 0.25% trading fee
- Liquidity pool management

## Deployment

### Prerequisites
```bash
npm install
```

### Setup Environment
Create `.env` file with:
```
BASE_RPC_URL=https://mainnet.base.org
PRIVATE_KEY=0x...your_private_key...
BASESCAN_API_KEY=...optional...
```

### Deploy to Base Mainnet
```bash
npm run deploy
```

### Deploy to Sepolia Testnet
```bash
npm run deploy:sepolia
```

## Contract Addresses (Base Mainnet)

After deployment, contract addresses will be saved to `deployments-base.json`

- **MAREV Token**: `0x...`
- **MAREV DEX**: `0x...`
- **USDC (Base)**: `0x833589fCD6eDb6E08f4c7C32D4f71b1566469c3d`

## Usage

### Swap MAREV to USDC
```solidity
uint256 amountOut = dex.swapMARtoUSDC(
  ethers.parseEther("100"),  // 100 MAREV
  0                           // minUSDC (slippage tolerance)
);
```

### Swap USDC to MAREV
```solidity
uint256 amountOut = dex.swapUSDCtoMAR(
  ethers.parseUnits("100", 6),  // 100 USDC
  0                              // minMAREV
);
```

### Add Liquidity
```solidity
dex.addLiquidity(
  ethers.parseEther("100"),        // MAREV amount
  ethers.parseUnits("100", 6)      // USDC amount
);
```

### Get Price Quote
```solidity
uint256 priceOut = dex.getPrice(
  marevAddress,
  usdcAddress,
  ethers.parseEther("1")  // 1 MAREV in USDC
);
```

## Testing

```bash
npm run test
```

## License

MIT
