# Marev1 Base Mainnet (Vercel)

Static Vercel site that connects MetaMask and verifies Base mainnet.

## Deploy to Vercel

- Set the project root to `vercel/`.
- Framework preset: **Other** (static).
- Build command: **none**
- Output directory: **/**

## Local Preview

Open `index.html` in a browser with MetaMask installed.

## Features

- Connect MetaMask
- Switch to Base Mainnet
- Display ETH balance

## Fire Coin Shares Stack

This frontend is now set up for:

- `thirdweb SwapWidget` for Base USDC -> Fire Coin swaps
- `Coinbase-hosted Onramp` for funding Base USDC
- A share-based Fire Coin purchase UI where `1 share = 1 USDC`

### Public Frontend Config

Edit `integrations.js`:

- Set `thirdwebClientId` to your public thirdweb client ID
- Leave `coinbaseOnrampEnabled` as `true` unless you want to hide the onramp action

### Vercel Environment Variables

Add these in your Vercel project settings:

- `CDP_API_KEY_ID`
- `CDP_API_KEY_SECRET`
- `COINBASE_ONRAMP_REDIRECT_URL` (optional)
- `GITHUB_EDITOR_OWNER`
- `GITHUB_EDITOR_REPO`
- `GITHUB_EDITOR_BRANCH`
- `GITHUB_EDITOR_TOKEN`

### Notes

- The Coinbase onramp endpoint lives at `/api/coinbase-onramp-session`
- The embedded swap widget is mounted by `thirdweb-swap.js`
- Fire Coin is hardcoded as `0x1c78664aed3c83db40bfe1319e7461c3f5b6398d`

## Public Editor

The site now includes a public editor at `/editor`.

- `editor.html` is the public browser editor UI
- `editor.js` handles file loading, publishing, rollback, and audit display
- `editor-allowed-files.json` defines which repo files the public editor can touch
- `/api/editor-config` loads the curated editable file list
- `/api/editor-file` reads a selected allowed file from GitHub
- `/api/editor-save` commits a file update to GitHub
- `/api/editor-rollback` restores one allowed file to a selected earlier commit
- `/api/editor-audit` shows recent public-editor commits

This model is intentionally limited to approved frontend files. It does not expose secrets, deployment config, or arbitrary repository write access.
