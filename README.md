# marev

> **⚠️ Experimental, unaudited, Base mainnet: use only funds you can afford to lose; not financial advice.**
> The contracts have not been audited and are not verified on Basescan yet. Treat everything here as a work in progress.

marev is an open-source crypto project on [Base](https://base.org): a live web app with a token DEX, a meme coin factory, airdrops with Merkle claims, ATTN attention rewards and builder tools, plus a small Rust blockchain demo. It's maintained by [@fitzyracing1](https://github.com/fitzyracing1) and is looking for more maintainers. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [roadmap](ROADMAP.md).

## Live links

- Home: https://marev-bay.vercel.app/
- DEX: https://marev-bay.vercel.app/dex.html
- Meme Coin Factory: https://marev-bay.vercel.app/factory.html
- Attention Claims: https://marev-bay.vercel.app/attention.html
- AI Builders Page: https://marev-bay.vercel.app/ai.html
- Web CLI: https://marev-bay.vercel.app/cli.html
- Public Editor: https://marev-bay.vercel.app/editor.html
- Project page (GitHub Pages): https://fitzyracing1.github.io/marev/

## Repo map

| Path | What it is |
| --- | --- |
| `src/` | **Rust blockchain demo**: proof-of-work blocks, transactions and wallets. A learning demo only; it is not connected to Base or the live app. |
| `dex/` | **Solidity contracts + Hardhat**: `MAREVToken`, `MAREVDex`, `MerkleDistributor`, `MerkleDistributorFactory`, tests in `dex/test/`, deploy scripts in `dex/scripts/`. |
| `vercel/` | **Live web app** deployed on Vercel: static HTML/JS pages plus serverless functions in `vercel/api/` (0x quotes, Coinbase onramp, public editor, airdrop saver). |
| `index.html` | GitHub Pages landing page. |
| `.github/` | CI, Dependabot, issue and PR templates, funding. |

## Local setup

Requirements: [Rust](https://rustup.rs) (stable, edition 2024 needs 1.85+), Node.js 20+ and npm.

```bash
git clone https://github.com/fitzyracing1/marev.git
cd marev

# Rust demo
cargo run

# Contracts
cd dex
npm ci
npx hardhat compile
```

The web app in `vercel/` is plain static files. Serve it locally with any static server, for example `npx serve vercel`. The `/api` functions need `vercel dev` and their own env vars; you don't need them for most frontend work.

**Develop against Base Sepolia (testnet) only.** Never put a mainnet private key in `.env` or anywhere in this repo. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Running tests

```bash
# Rust
cargo test

# Contracts (Hardhat in-memory network, no keys or RPC needed)
cd dex && npm ci && npx hardhat test
```

CI runs both on every pull request.

## Contributing

- [CONTRIBUTING.md](CONTRIBUTING.md): how to set up, testnet-only rules, PR flow
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md): report vulnerabilities privately, not in public issues
- [ROADMAP.md](ROADMAP.md)
- Good first issues: https://github.com/fitzyracing1/marev/labels/good%20first%20issue

## Plans

This project is free and open source under the [MIT License](LICENSE). Support it through [GitHub Sponsors](https://github.com/sponsors/fitzyracing1):

- **Free**: use the code, community support.
- **Pro ($49/month)**: priority issues and support.
- **Team ($199/month)**: priority support for your team plus early access.
