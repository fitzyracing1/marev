# Contributing to marev

Thanks for helping! marev is a public project looking for maintainers. Small, focused pull requests are the easiest to review.

## Ground rules

1. **Testnet only.** Do all contract development and testing on the Hardhat in-memory network or **Base Sepolia** (chain id `84532`). Do not deploy to Base mainnet from a PR; mainnet deployments are done only by the maintainer.
2. **Never paste or commit a mainnet private key.** Use a fresh throwaway wallet that holds only testnet ETH. `dex/.env` is git-ignored; keep it that way. Never put keys in issues, PRs, screenshots or logs.
3. **No direct pushes to `main`.** `main` is protected; every change goes through a pull request.
4. Be kind. See the [Code of Conduct](CODE_OF_CONDUCT.md).
5. Found a vulnerability? Don't open a public issue. Follow [SECURITY.md](SECURITY.md).

## Setup

```bash
git clone https://github.com/<you>/marev.git   # your fork
cd marev
cargo test                                    # Rust demo
cd dex && npm ci && npx hardhat test          # contracts
```

For Base Sepolia, create `dex/.env` (git-ignored):

```bash
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=0x<throwaway testnet-only key>
```

Get test ETH from a Base Sepolia faucet (see https://docs.base.org/tools/network-faucets). Then:

```bash
npm run deploy:base-sepolia
```

Do **not** run `npm run deploy` (that targets Base mainnet).

## Where things live

- `src/`: Rust blockchain demo (not connected to the live app)
- `dex/`: Solidity contracts, Hardhat tests and scripts
- `vercel/`: live web app and `/api` serverless functions

## Pull requests

1. Fork, then branch from `main` (`fix/...`, `feat/...`, `docs/...`).
2. Keep the change focused; add or update tests when you touch contracts or Rust code.
3. Run `cargo test` and `npx hardhat test` locally.
4. Open the PR and fill in the template. Link the issue (`Fixes #123`).
5. CI must pass. The maintainer reviews and merges.

Look for issues labeled [`good first issue`](https://github.com/fitzyracing1/marev/labels/good%20first%20issue) or [`help wanted`](https://github.com/fitzyracing1/marev/labels/help%20wanted).

## License

By contributing, you agree your contributions are licensed under the [MIT License](LICENSE).
