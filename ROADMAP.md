# Roadmap

A rough plan, in priority order. Each item should become one or more issues; pick one up and say so in the issue.

## Now: make it safe to contribute
- [x] Protect `main` (PRs only)
- [ ] Public editor and airdrop saver open pull requests instead of committing to `main`
- [ ] MIT `LICENSE` file
- [ ] CI for Rust and Hardhat tests; Dependabot
- [ ] Fix the Base USDC address in the deploy script
- [ ] Risk warning on every page and in the README
- [ ] Contributor docs: README, CONTRIBUTING, Code of Conduct, SECURITY, templates

## Next: trust and correctness
- [ ] Fix the failing Hardhat liquidity/swap tests
- [ ] Base Sepolia config and a testnet deploy guide
- [ ] Tests for `MerkleDistributor` and `MerkleDistributorFactory`
- [ ] Verify all deployed contracts on Basescan
- [ ] Commit the missing contract sources (factory / listing contracts referenced by the site)
- [ ] Triage Dependabot alerts (start with the critical ones)

## Later: product
- [ ] Link the live app from the GitHub Pages landing page
- [ ] Better token discovery and safety signals on the DEX (holder concentration, liquidity, age)
- [ ] ATTN attention rewards: clear, spam-resistant rules
- [ ] An independent security review before growing the mainnet pool

Have an idea? Open a feature request.
