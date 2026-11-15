# Security Policy

marev includes smart contracts and a web app that run on **Base mainnet**. The code is experimental and unaudited.

## Reporting a vulnerability

**Please do not open a public issue for security problems.** Report privately instead:

1. **GitHub private vulnerability reporting (preferred):** go to the [Security tab](https://github.com/fitzyracing1/marev/security) and click **Report a vulnerability** (or open https://github.com/fitzyracing1/marev/security/advisories/new).
2. **Email:** [Fitzyracing1@gmail.com](mailto:Fitzyracing1@gmail.com) with "marev security" in the subject.

Please include what's affected (contract, page or API route), steps to reproduce, and the impact. Never include private keys or seed phrases. If you need to show an exploit, use Base Sepolia or a local Hardhat fork, not mainnet funds.

You can expect an acknowledgement within a few days. Please give us reasonable time to fix the issue before disclosing it publicly.

## Scope

- Contracts in `dex/contracts/` and their deployed instances listed in `vercel/deployments-*.json`
- Serverless functions in `vercel/api/`
- The live site at https://marev-bay.vercel.app

## Supported versions

Only the latest `main` is supported.
