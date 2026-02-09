# MAREV DEX Deployment Guide

## Prerequisites
1. **MetaMask installed** with Base mainnet configured
2. **Base mainnet ETH** in your wallet (~0.05 ETH for gas)
3. **Private Key** from MetaMask

## Get Your Private Key
1. Open MetaMask
2. Click **Settings** (⚙️)
3. Go to **Security & Privacy**
4. Click **Show Private Key**
5. Enter your password
6. Copy the private key

## Setup Deployment

### Step 1: Update .env file
Edit `/dex/.env` and replace:
```
PRIVATE_KEY=0x<YOUR_PRIVATE_KEY_HERE>
```

### Step 2: Ensure you have Base mainnet ETH
Check your MetaMask wallet has:
- Chain: Base Mainnet
- Balance: At least 0.05 ETH (for gas)

### Step 3: Deploy Contracts
Run:
```bash
cd c:\Users\EC\marev1\rust\dex
npm run deploy
```

### Step 4: Save Contract Addresses
After deployment, you'll see:
- ✓ MAREV Token address
- ✓ MAREV DEX address

These will be saved to `deployments-base.json`

### Step 5: Update Vercel dApp
Copy the addresses from `deployments-base.json` to `vercel/deployments-base.json`

### Step 6: Test on Vercel
Visit https://marev-bay.vercel.app/dex.html
- Connect MetaMask
- View contract info
- Add liquidity
- Start swapping!

## Important Notes
⚠️ NEVER share your private key
⚠️ NEVER commit .env to GitHub
⚠️ Keep private key safe!

## Troubleshooting
- **"Transaction failed"**: Insufficient gas (need 0.05+ ETH)
- **"Network error"**: Make sure MetaMask is on Base mainnet
- **"Contract error"**: Check contract code in Basescan

## Next Steps After Deployment
1. Add initial liquidity (100 MAREV + 100 USDC)
2. Test swaps on the Vercel dApp
3. Verify contract on Basescan
4. Share deployment link with users
