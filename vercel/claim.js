const BASE_RPC_URL = "https://mainnet.base.org";
const BASE_CHAIN_ID_HEX = "0x2105";

const DISTRIBUTOR_ABI = [
  "function isClaimed(uint256 index) view returns (bool)",
  "function claim(uint256 index, address account, uint256 amount, bytes32[] proof)",
  "function token() view returns (address)",
  "function expiry() view returns (uint256)",
];

const TOKEN_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
];

let provider = null;
let signer = null;
let signerAddress = null;
let airdrop = null;
const readProvider = new ethers.JsonRpcProvider(BASE_RPC_URL);

const $ = (id) => document.getElementById(id);

function setStatus(text, cls = "") {
  const el = $("status");
  el.textContent = (text || "").toUpperCase();
  el.className = "tag";
  if (cls) el.classList.add(cls);
}

function setStatusLine(id, text, cls = "") {
  const el = $(id);
  el.textContent = text || "";
  el.className = "status-line";
  if (cls) el.classList.add(cls);
  // re-apply text-align: center if needed
  if (id === "claimStatusText") el.style.textAlign = "center";
}
function setAirdropStatus(text, cls = "") { setStatusLine("airdropStatus", text, cls); }
function setClaimText(text, cls = "") { setStatusLine("claimStatusText", text, cls); }

function setClaimTag(text, cls = "") {
  const el = $("yourClaimStatus");
  el.textContent = (text || "—").toUpperCase();
  el.className = "tag";
  if (cls) el.classList.add(cls);
}

function fillReadout(id, text) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  if (text && text !== "—" && text !== "-") el.classList.remove("dim");
  else el.classList.add("dim");
}

function shortAddress(a) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "-";
}

async function connectWallet() {
  if (!window.ethereum) {
    setStatus("No wallet detected — install MetaMask, Uniswap Wallet, Rabby, or Coinbase Wallet", "warn");
    return;
  }
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    signerAddress = await signer.getAddress();
    fillReadout("account", signerAddress);
    const network = await provider.getNetwork();
    fillReadout("network", `${network.name} (0x${network.chainId.toString(16)})`);
    setStatus("Connected", "ok");
    if (airdrop) renderUserAllocation();
  } catch (error) {
    setStatus("Failed", "err");
    setAirdropStatus(error.message || "Connect failed", "err");
  }
}

async function ensureBase() {
  if (!window.ethereum) return false;
  const network = await (provider || readProvider).getNetwork();
  if (Number(network.chainId) === 8453) return true;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_CHAIN_ID_HEX }],
    });
    return true;
  } catch (error) {
    if (error?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: BASE_CHAIN_ID_HEX,
          chainName: "Base Mainnet",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [BASE_RPC_URL],
          blockExplorerUrls: ["https://basescan.org"],
        }],
      });
      return true;
    }
    return false;
  }
}

async function loadAirdrop(tokenAddress) {
  airdrop = null;
  $("airdropDetailsCard").style.display = "none";
  $("yourClaimCard").style.display = "none";
  setAirdropStatus(`Loading airdrop for ${shortAddress(tokenAddress)}...`);

  let normalized;
  try {
    normalized = ethers.getAddress(tokenAddress).toLowerCase();
  } catch {
    setAirdropStatus("Invalid token address.", "warn");
    return;
  }

  try {
    const response = await fetch(`/airdrops/${normalized}.json`, { cache: "no-store" });
    if (!response.ok) {
      setAirdropStatus(`No airdrop found for that token (${response.status}).`, "warn");
      return;
    }
    airdrop = await response.json();
  } catch (error) {
    setAirdropStatus(error.message || "Failed to load airdrop.", "warn");
    return;
  }

  fillReadout("airdropTokenName", `${airdrop.tokenName || "?"} (${airdrop.tokenSymbol || "?"})`);
  fillReadout("airdropDistributor", airdrop.distributorAddress);
  fillReadout("airdropExpiry", airdrop.expiry > 0 ? new Date(airdrop.expiry * 1000).toLocaleString() : "No expiry");
  fillReadout("airdropCreated", airdrop.createdAt ? new Date(airdrop.createdAt).toLocaleString() : "—");
  $("airdropDetailsCard").style.display = "";
  setAirdropStatus("Airdrop loaded. Connect wallet to see your allocation.", "ok");

  renderUserAllocation();
}

async function renderUserAllocation() {
  if (!airdrop) return;
  $("yourClaimCard").style.display = "";

  const allocEl = $("yourAllocation");

  if (!signerAddress) {
    allocEl.textContent = "—";
    allocEl.className = "amount greyed";
    setClaimTag("Connect wallet");
    $("claimButton").disabled = true;
    setClaimText("Connect your wallet to check eligibility.", "");
    return;
  }

  const claim = airdrop.claims[signerAddress.toLowerCase()];
  if (!claim) {
    allocEl.textContent = "0";
    allocEl.className = "amount greyed";
    setClaimTag("Not on list", "warn");
    $("claimButton").disabled = true;
    setClaimText("This wallet is not in the airdrop. Try a different account.", "warn");
    return;
  }

  const decimals = airdrop.tokenDecimals || 18;
  const amount = ethers.formatUnits(claim.amountWei, decimals);
  allocEl.innerHTML = `${amount} <span class="symbol">${airdrop.tokenSymbol || ""}</span>`;
  allocEl.className = "amount";

  try {
    const distributor = new ethers.Contract(airdrop.distributorAddress, DISTRIBUTOR_ABI, readProvider);
    const claimed = await distributor.isClaimed(claim.index);
    if (claimed) {
      setClaimTag("Already claimed", "ok");
      $("claimButton").disabled = true;
      setClaimText("This allocation has already been claimed.", "ok");
      return;
    }
  } catch (error) {
    console.error("isClaimed error", error);
  }

  if (airdrop.expiry > 0 && Date.now() / 1000 >= airdrop.expiry) {
    setClaimTag("Expired", "err");
    $("claimButton").disabled = true;
    setClaimText("Claim window has expired. Contact the project creator.", "err");
    return;
  }

  setClaimTag("Claimable", "ok");
  $("claimButton").disabled = false;
  setClaimText("Click Claim to receive your tokens.", "ok");
}

async function executeClaim() {
  if (!signer || !signerAddress || !airdrop) return;
  const claim = airdrop.claims[signerAddress.toLowerCase()];
  if (!claim) return;

  const onBase = await ensureBase();
  if (!onBase) {
    setClaimText("Switch to Base mainnet first.", "warn");
    return;
  }

  $("claimButton").disabled = true;
  try {
    setClaimText("Confirm claim in your wallet...", "");
    const distributor = new ethers.Contract(airdrop.distributorAddress, DISTRIBUTOR_ABI, signer);
    const tx = await distributor.claim(claim.index, signerAddress, claim.amountWei, claim.proof);
    setClaimText(`Submitted ${tx.hash}. Waiting...`, "");
    await tx.wait();
    setClaimText(`Claim confirmed in tx ${tx.hash}.`, "ok");
    setClaimTag("Already claimed", "ok");
  } catch (error) {
    console.error("claim error", error);
    if (error?.code === 4001 || error?.code === "ACTION_REJECTED") {
      setClaimText("Claim rejected in your wallet.", "warn");
    } else {
      setClaimText(error.shortMessage || error.message || "Claim failed", "err");
    }
    $("claimButton").disabled = false;
  }
}

function init() {
  $("connectButton").addEventListener("click", connectWallet);
  $("loadAirdropButton").addEventListener("click", () => {
    loadAirdrop($("tokenAddressInput").value.trim());
  });
  $("tokenAddressInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loadAirdrop($("tokenAddressInput").value.trim());
    }
  });
  $("claimButton").addEventListener("click", executeClaim);

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());
  }

  const params = new URLSearchParams(window.location.search);
  const preset = params.get("token");
  if (preset) {
    $("tokenAddressInput").value = preset;
    loadAirdrop(preset);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
