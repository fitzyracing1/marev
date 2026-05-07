const BASE_CHAIN_ID = "0x2105";
const BASE_RPC_URL = "https://mainnet.base.org";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const FACTORY_ABI = [
  "function createToken(string name, string symbol, uint8 decimals, uint256 initialSupply) payable returns (address)",
  "function launchFee() view returns (uint256)",
  "function getTotalTokens() view returns (uint256)",
  "function allTokens(uint256 index) view returns (address)",
  "function getTokenInfo(address token) view returns (string, string, address, uint256, uint256, bool)",
  "function getListingInfo(address token) view returns (bool, address, address)",
  "event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed creator, uint256 initialSupply, uint256 timestamp)",
];

const TOKEN_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
];

const DISTRIBUTOR_FACTORY_ABI = [
  "function totalDistributors() view returns (uint256)",
  "function allDistributors(uint256) view returns (address)",
  "function getCreatorDistributors(address) view returns (address[])",
  "function getTokenDistributors(address) view returns (address[])",
];

const DISTRIBUTOR_ABI = [
  "function token() view returns (address)",
  "function isClaimed(uint256) view returns (bool)",
  "function claim(uint256 index, address account, uint256 amount, bytes32[] proof) external",
];

const LISTING_MANAGER_ABI = [
  "function launchToken(address token, uint256 tokenAmountDesired, uint256 baseAmountDesired, uint256 amountTokenMin, uint256 amountBaseMin, uint256 deadline) returns (address pair, uint256 amountToken, uint256 amountBase, uint256 liquidity)",
];

const REWARDS_ABI = [
  "function currentDay() view returns (uint256)",
  "function previewRewards(uint256 day, address account) view returns (uint256 score, uint256 amount, bool alreadyClaimed)",
  "function claim(uint256 day)",
];

let provider;
let signer;
let signerAddress;
let activeAccount;
let factoryDeployment = {
  factory: ZERO_ADDRESS,
  listingManager: ZERO_ADDRESS,
  attentionRewardsHook: ZERO_ADDRESS,
};

const connectButton = document.getElementById("connectButton");
const switchBaseButton = document.getElementById("switchBaseButton");
const runCommandButton = document.getElementById("runCommand");
const commandInput = document.getElementById("commandInput");
const outputEl = document.getElementById("cliOutput");
const statusEl = document.getElementById("status");
const accountEl = document.getElementById("account");
const signerAccountEl = document.getElementById("signerAccount");
const networkEl = document.getElementById("network");
const factoryAddressEl = document.getElementById("factoryAddress");
const manualAccountInput = document.getElementById("manualAccountInput");
const useManualAccountButton = document.getElementById("useManualAccount");
const clearManualAccountButton = document.getElementById("clearManualAccount");

function appendOutput(text) {
  outputEl.textContent += `\n${text}`;
  outputEl.scrollTop = outputEl.scrollHeight;
}

function resetOutput(text) {
  outputEl.textContent = text;
}

function setStatus(text, cls = "") {
  statusEl.textContent = text;
  statusEl.className = "status";
  if (cls) statusEl.classList.add(cls);
}

function parseArgs(input) {
  const matches = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return matches.map((part) => part.replace(/^"|"$/g, ""));
}

function parseFlags(parts) {
  const result = { _: [] };
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part.startsWith("--")) {
      result[part.slice(2)] = parts[i + 1];
      i += 1;
    } else {
      result._.push(part);
    }
  }
  return result;
}

async function ensureAllowance(contract, spender, amount, label) {
  const allowance = await contract.allowance(signerAddress, spender);
  if (allowance >= amount) {
    appendOutput(`${label} allowance already set.`);
    return;
  }

  appendOutput(`Approving ${label}...`);
  const tx = await contract.approve(spender, ethers.MaxUint256);
  appendOutput(`Approval tx: ${tx.hash}`);
  await tx.wait();
  appendOutput(`${label} approved.`);
}

async function loadConfig() {
  const response = await fetch("./deployments-factory-base.json");
  if (response.ok) {
    factoryDeployment = { ...factoryDeployment, ...(await response.json()) };
    factoryAddressEl.textContent = factoryDeployment.factory;
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    setStatus("MetaMask not installed", "warn");
    appendOutput("MetaMask not found.");
    return;
  }

  await window.ethereum.request({ method: "eth_requestAccounts" });
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  signerAddress = await signer.getAddress();
  signerAccountEl.textContent = signerAddress;
  if (!activeAccount) {
    activeAccount = signerAddress;
  }
  accountEl.textContent = activeAccount;
  await refreshNetwork();
  setStatus("Connected", "ok");
  appendOutput(`Connected signer: ${signerAddress}`);
  appendOutput(`Active account: ${activeAccount}`);
}

async function switchToBase() {
  if (!window.ethereum) return;
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: BASE_CHAIN_ID }],
  });
  await refreshNetwork();
}

async function refreshNetwork() {
  if (!provider) return;
  const network = await provider.getNetwork();
  networkEl.textContent = `${network.name} (0x${network.chainId.toString(16)})`;
}

async function showCoins() {
  const readProvider = provider || new ethers.JsonRpcProvider(BASE_RPC_URL);
  const factory = new ethers.Contract(factoryDeployment.factory, FACTORY_ABI, readProvider);
  const total = Number(await factory.getTotalTokens());
  appendOutput(`Factory coins: ${total}`);

  const start = Math.max(0, total - 5);
  for (let i = total - 1; i >= start; i -= 1) {
    const tokenAddress = await factory.allTokens(i);
    const [info, listing] = await Promise.all([
      factory.getTokenInfo(tokenAddress),
      factory.getListingInfo(tokenAddress),
    ]);
    appendOutput(`- ${info[0]} (${info[1]}) ${tokenAddress} listed=${listing[0]}`);
  }
}

function setActiveAccount(address) {
  activeAccount = ethers.getAddress(address);
  accountEl.textContent = activeAccount;
  appendOutput(`Active account set to ${activeAccount}`);
}

async function createToken(flags) {
  if (!signer || !signerAddress) {
    appendOutput("Connect wallet first.");
    return;
  }

  const name = flags.name;
  const symbol = flags.symbol;
  const supply = flags.supply || "1000000";
  const decimals = Number(flags.decimals || "18");

  if (!name || !symbol) {
    appendOutput('Usage: create-token --name "Joshua" --symbol JOSH --supply 1000000');
    return;
  }

  const factory = new ethers.Contract(factoryDeployment.factory, FACTORY_ABI, signer);
  const launchFee = await factory.launchFee();
  appendOutput(`Creating token ${name} (${symbol}) with supply ${supply}...`);

  const tx = await factory.createToken(
    name,
    symbol,
    decimals,
    ethers.parseUnits(supply, decimals),
    { value: launchFee }
  );
  appendOutput(`Transaction sent: ${tx.hash}`);
  const receipt = await tx.wait();
  const event = receipt.logs
    .map((log) => {
      try {
        return factory.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((entry) => entry && entry.name === "TokenCreated");

  appendOutput(`Created token: ${event?.args?.tokenAddress || "unknown"}`);
  appendOutput("Next step: list-token --address <token> --token-amount 50 --usdc 0.05");
}

async function listToken(flags) {
  if (!signer || !signerAddress) {
    appendOutput("Connect wallet first.");
    return;
  }

  const tokenAddress = flags.address;
  const tokenAmountRaw = flags["token-amount"] || "50";
  const usdcRaw = flags.usdc || "0.05";

  if (!tokenAddress) {
    appendOutput("Usage: list-token --address 0x... --token-amount 50 --usdc 0.05");
    return;
  }

  const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
  const usdc = new ethers.Contract(factoryDeployment.baseToken, TOKEN_ABI, signer);
  const listingManager = new ethers.Contract(factoryDeployment.listingManager, LISTING_MANAGER_ABI, signer);
  const decimals = Number(await token.decimals());
  const symbol = await token.symbol();
  const tokenAmount = ethers.parseUnits(tokenAmountRaw, decimals);
  const usdcAmount = ethers.parseUnits(usdcRaw, 6);
  const deadline = Math.floor(Date.now() / 1000) + (20 * 60);
  const minTokenAmount = (tokenAmount * 95n) / 100n;
  const minUsdcAmount = (usdcAmount * 95n) / 100n;

  await ensureAllowance(token, factoryDeployment.listingManager, tokenAmount, symbol);
  await ensureAllowance(usdc, factoryDeployment.listingManager, usdcAmount, "USDC");

  appendOutput(`Launching token ${tokenAddress} with ${tokenAmountRaw} ${symbol} and ${usdcRaw} USDC...`);
  const tx = await listingManager.launchToken(
    tokenAddress,
    tokenAmount,
    usdcAmount,
    minTokenAmount,
    minUsdcAmount,
    deadline
  );
  appendOutput(`Launch tx: ${tx.hash}`);
  await tx.wait();
  appendOutput("Token listed and liquidity added.");
}

async function previewAttn() {
  if (!activeAccount) {
    appendOutput("Set an active account first with connect or use-account.");
    return;
  }
  if (!factoryDeployment.attentionRewardsHook || factoryDeployment.attentionRewardsHook === ZERO_ADDRESS) {
    appendOutput("No attention rewards hook configured in the deployment file.");
    return;
  }

  const readProvider = provider || new ethers.JsonRpcProvider(BASE_RPC_URL);
  const rewards = new ethers.Contract(factoryDeployment.attentionRewardsHook, REWARDS_ABI, readProvider);
  const day = await rewards.currentDay();
  const [score, amount, alreadyClaimed] = await rewards.previewRewards(day, activeAccount);
  appendOutput(`ATTN day ${day} for ${activeAccount}: score=${score} amount=${ethers.formatEther(amount)} claimed=${alreadyClaimed}`);
  if (!alreadyClaimed && amount > 0n) {
    appendOutput(`Claim is available now. Run: claim-attn`);
  }
}

async function claimAttn() {
  if (!signer || !signerAddress) {
    appendOutput("Connect wallet first.");
    return;
  }
  if (!factoryDeployment.attentionRewardsHook || factoryDeployment.attentionRewardsHook === ZERO_ADDRESS) {
    appendOutput("No attention rewards hook configured in the deployment file.");
    return;
  }

  const rewards = new ethers.Contract(factoryDeployment.attentionRewardsHook, REWARDS_ABI, signer);
  const day = await rewards.currentDay();
  const [score, amount, alreadyClaimed] = await rewards.previewRewards(day, signerAddress);
  if (alreadyClaimed) {
    appendOutput(`ATTN for day ${day} already claimed.`);
    return;
  }
  if (amount <= 0n) {
    appendOutput(`No claimable ATTN for day ${day}.`);
    return;
  }

  appendOutput(`Claiming ${ethers.formatEther(amount)} ATTN for day ${day}...`);
  const tx = await rewards.claim(day);
  appendOutput(`Claim tx: ${tx.hash}`);
  await tx.wait();
  appendOutput("ATTN claim complete.");
}

async function attnDailyStatus() {
  if (!activeAccount) {
    appendOutput("Set an active account first with connect or use-account.");
    return;
  }
  if (!factoryDeployment.attentionRewardsHook || factoryDeployment.attentionRewardsHook === ZERO_ADDRESS) {
    appendOutput("No attention rewards hook configured in the deployment file.");
    return;
  }

  const readProvider = provider || new ethers.JsonRpcProvider(BASE_RPC_URL);
  const rewards = new ethers.Contract(factoryDeployment.attentionRewardsHook, REWARDS_ABI, readProvider);
  const day = await rewards.currentDay();
  const [score, amount, alreadyClaimed] = await rewards.previewRewards(day, activeAccount);

  appendOutput(`Daily ATTN status for ${activeAccount}`);
  appendOutput(`- day: ${day}`);
  appendOutput(`- score: ${score}`);
  appendOutput(`- amount: ${ethers.formatEther(amount)} ATTN`);
  appendOutput(`- claimed: ${alreadyClaimed}`);

  if (alreadyClaimed) {
    appendOutput("This wallet has already claimed today's ATTN.");
  } else if (amount > 0n) {
    appendOutput("This wallet can claim now. Use: claim-attn");
  } else {
    appendOutput("No ATTN is claimable yet for this wallet today.");
  }
}

async function showBalances(flags) {
  const wallet = (flags._[0] || flags.wallet || activeAccount);
  if (!wallet) {
    appendOutput("Usage: balances [<wallet-address>] (or 'connect' first)");
    return;
  }
  const readProvider = provider || new ethers.JsonRpcProvider(BASE_RPC_URL);
  appendOutput(`Balances for ${wallet}:`);
  const eth = await readProvider.getBalance(wallet);
  appendOutput(`  ETH:                 ${ethers.formatEther(eth)}`);

  const factory = new ethers.Contract(factoryDeployment.factory, FACTORY_ABI, readProvider);
  const total = Number(await factory.getTotalTokens());
  if (total === 0) {
    appendOutput("  (no factory tokens to scan)");
    return;
  }
  appendOutput(`  scanning ${total} factory tokens...`);
  let nonzero = 0;
  for (let i = total - 1; i >= 0; i -= 1) {
    const tokenAddress = await factory.allTokens(i);
    const t = new ethers.Contract(tokenAddress, TOKEN_ABI, readProvider);
    try {
      const [sym, dec, bal] = await Promise.all([
        t.symbol().catch(() => "?"),
        t.decimals().catch(() => 18),
        t.balanceOf(wallet).catch(() => 0n),
      ]);
      if (bal > 0n) {
        appendOutput(`  ${sym.padEnd(8)} ${ethers.formatUnits(bal, Number(dec))}    (${tokenAddress})`);
        nonzero++;
      }
    } catch {}
  }
  if (nonzero === 0) appendOutput("  no factory token balances found");
}

async function findClaims(flags) {
  const wallet = (flags.wallet || flags._[0] || activeAccount);
  if (!wallet) {
    appendOutput("Usage: find-claims [<wallet-address>]");
    return;
  }
  if (!factoryDeployment.merkleDistributorFactory || factoryDeployment.merkleDistributorFactory === ZERO_ADDRESS) {
    appendOutput("MerkleDistributorFactory address is missing from deployment config.");
    return;
  }
  const readProvider = provider || new ethers.JsonRpcProvider(BASE_RPC_URL);
  const distFactory = new ethers.Contract(factoryDeployment.merkleDistributorFactory, DISTRIBUTOR_FACTORY_ABI, readProvider);
  const total = Number(await distFactory.totalDistributors());
  appendOutput(`Scanning ${total} airdrop distributors for claims to ${wallet}...`);
  const lower = wallet.toLowerCase();
  let found = 0;
  for (let i = 0; i < total; i++) {
    try {
      const distAddr = await distFactory.allDistributors(i);
      const dist = new ethers.Contract(distAddr, DISTRIBUTOR_ABI, readProvider);
      const tokenAddr = (await dist.token()).toLowerCase();
      const resp = await fetch(`/airdrops/${tokenAddr}.json`, { cache: "no-store" });
      if (!resp.ok) continue;
      const data = await resp.json();
      const claim = data.claims?.[lower];
      if (!claim) continue;
      const claimed = await dist.isClaimed(claim.index);
      const decimals = data.tokenDecimals || 18;
      const sym = data.tokenSymbol || "?";
      const amount = ethers.formatUnits(claim.amountWei, decimals);
      appendOutput(`  ${claimed ? "[CLAIMED]   " : "[CLAIMABLE] "} ${amount} ${sym}  token=${tokenAddr}`);
      found++;
    } catch {}
  }
  appendOutput(found === 0 ? "No claims found for that wallet." : `Found ${found} claim(s).`);
}

async function claimFromAirdrop(flags) {
  if (!signer || !signerAddress) {
    appendOutput("Connect wallet first.");
    return;
  }
  const tokenAddr = flags.token || flags._[0];
  if (!tokenAddr) {
    appendOutput("Usage: claim --token 0x...");
    return;
  }
  const lower = tokenAddr.toLowerCase();
  const resp = await fetch(`/airdrops/${lower}.json`, { cache: "no-store" });
  if (!resp.ok) {
    appendOutput(`No airdrop found for token ${tokenAddr}`);
    return;
  }
  const data = await resp.json();
  const myClaim = data.claims?.[signerAddress.toLowerCase()];
  if (!myClaim) {
    appendOutput(`Wallet ${signerAddress} is not in this airdrop.`);
    return;
  }
  const dist = new ethers.Contract(data.distributorAddress, DISTRIBUTOR_ABI, signer);
  const claimed = await dist.isClaimed(myClaim.index);
  if (claimed) {
    appendOutput(`Already claimed for this wallet.`);
    return;
  }
  appendOutput(`Claiming ${ethers.formatUnits(myClaim.amountWei, data.tokenDecimals || 18)} ${data.tokenSymbol || "tokens"}...`);
  const tx = await dist.claim(myClaim.index, signerAddress, myClaim.amountWei, myClaim.proof);
  appendOutput(`Tx: ${tx.hash}`);
  await tx.wait();
  appendOutput(`Done. Tokens delivered to ${signerAddress}.`);
}

async function addTokenToWallet(flags) {
  const addr = flags.address || flags._[0];
  if (!addr) {
    appendOutput("Usage: add-token <token-address>");
    return;
  }
  if (!window.ethereum) {
    appendOutput("No wallet detected.");
    return;
  }
  const readProvider = provider || new ethers.JsonRpcProvider(BASE_RPC_URL);
  const t = new ethers.Contract(addr, TOKEN_ABI, readProvider);
  const [symbol, decimals] = await Promise.all([
    t.symbol().catch(() => null),
    t.decimals().catch(() => 18),
  ]);
  if (!symbol) {
    appendOutput(`Could not read symbol from ${addr}. Is this an ERC-20 contract?`);
    return;
  }
  appendOutput(`Asking your wallet to track ${symbol} (${addr})...`);
  try {
    const wasAdded = await window.ethereum.request({
      method: "wallet_watchAsset",
      params: { type: "ERC20", options: { address: addr, symbol, decimals: Number(decimals) } },
    });
    appendOutput(wasAdded ? `${symbol} added to wallet. Check your assets list.` : `Wallet declined adding ${symbol}.`);
  } catch (e) {
    appendOutput(`Failed: ${e.message || e}`);
  }
}

function showHelp() {
  resetOutput(`MAREV CLI ready.

WALLET
  connect                              connect your browser wallet (any: MetaMask / Uniswap / Rabby / Coinbase)
  switch-base                          switch wallet to Base mainnet
  use-account 0x...                    set an active account for read-only previews
  clear-account-override               reset to your connected signer
  show account                         show signer + active account
  balances [<wallet>]                  show ETH + every factory-token balance for a wallet
  add-token <address>                  prompt your wallet to add a token to the assets list

AIRDROPS
  find-claims [<wallet>]               scan all distributors and list claims for a wallet
  claim --token 0x...                  claim your allocation from a token's airdrop

TOKENS
  show coins                           list factory-launched tokens
  create-token --name "Name" --symbol SYM --supply 1000000 --decimals 18
  list-token --address 0x... --token-amount 50 --usdc 0.05

ATTN REWARDS
  preview-attn
  attn-daily
  claim-attn

NAVIGATION
  open dex | factory | attention | launch | claim
`);
}

async function runCommand() {
  const raw = commandInput.value.trim();
  if (!raw) return;

  appendOutput(`> ${raw}`);
  const parts = parseArgs(raw);
  const command = (parts[0] || "").toLowerCase();
  const flags = parseFlags(parts.slice(1));

  try {
    if (command === "help") {
      showHelp();
    } else if (command === "connect") {
      await connectWallet();
    } else if (command === "switch-base") {
      await switchToBase();
      appendOutput("Switched to Base.");
    } else if (command === "use-account") {
      const nextAccount = flags._[0] || flags.address;
      if (!nextAccount) {
        appendOutput("Usage: use-account 0x...");
        return;
      }
      setActiveAccount(nextAccount);
      manualAccountInput.value = activeAccount;
    } else if (command === "clear-account-override") {
      if (signerAddress) {
        activeAccount = signerAddress;
        accountEl.textContent = activeAccount;
        manualAccountInput.value = "";
        appendOutput(`Active account reset to signer ${signerAddress}`);
      } else {
        activeAccount = null;
        accountEl.textContent = "-";
        manualAccountInput.value = "";
        appendOutput("Active account cleared.");
      }
    } else if (command === "show" && flags._[0] === "account") {
      appendOutput(`Signer: ${signerAddress || "-"}`);
      appendOutput(`Active account: ${activeAccount || "-"}`);
    } else if (command === "show" && flags._[0] === "coins") {
      await showCoins();
    } else if (command === "balances" || command === "balance") {
      await showBalances(flags);
    } else if (command === "find-claims" || command === "claims") {
      await findClaims(flags);
    } else if (command === "claim") {
      await claimFromAirdrop(flags);
    } else if (command === "add-token") {
      await addTokenToWallet(flags);
    } else if (command === "create-token") {
      await createToken(flags);
    } else if (command === "list-token") {
      await listToken(flags);
    } else if (command === "preview-attn") {
      await previewAttn();
    } else if (command === "attn-daily") {
      await attnDailyStatus();
    } else if (command === "claim-attn") {
      await claimAttn();
    } else if (command === "open" && flags._[0] === "dex") {
      window.location.href = "/dex";
    } else if (command === "open" && flags._[0] === "factory") {
      window.location.href = "/factory";
    } else if (command === "open" && flags._[0] === "attention") {
      window.location.href = "/attention";
    } else if (command === "open" && flags._[0] === "launch") {
      window.location.href = "/launch";
    } else if (command === "open" && flags._[0] === "claim") {
      window.location.href = "/claim";
    } else {
      appendOutput('Unknown command. Type "help".');
    }
  } catch (error) {
    console.error(error);
    appendOutput(`Error: ${error.message || error}`);
    setStatus("Command failed", "warn");
    return;
  }

  setStatus("Command complete", "ok");
  commandInput.value = "";
}

async function init() {
  await loadConfig();
  showHelp();
  connectButton.addEventListener("click", connectWallet);
  switchBaseButton.addEventListener("click", switchToBase);
  runCommandButton.addEventListener("click", runCommand);
  useManualAccountButton.addEventListener("click", () => {
    if (!manualAccountInput.value.trim()) return;
    setActiveAccount(manualAccountInput.value.trim());
  });
  clearManualAccountButton.addEventListener("click", () => {
    if (signerAddress) {
      activeAccount = signerAddress;
      accountEl.textContent = activeAccount;
    } else {
      activeAccount = null;
      accountEl.textContent = "-";
    }
    manualAccountInput.value = "";
    appendOutput("Manual account override cleared.");
  });
  commandInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runCommand();
    }
  });

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", connectWallet);
    window.ethereum.on("chainChanged", refreshNetwork);
  }

  accountEl.textContent = "-";
  signerAccountEl.textContent = "-";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
