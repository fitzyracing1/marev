const BASE_CHAIN_ID_HEX = "0x2105";
const BASE_RPC_URL = "https://mainnet.base.org";
const CLAIMS_DATA_URL = "./attention-claims.json";

const DISTRIBUTOR_ABI = [
  "function claim(uint256 day, uint256 score, uint256 amount, bytes32[] proof)",
  "function claimed(uint256 day, address account) view returns (bool)",
];

let provider = null;
let signer = null;
let signerAccount = null;
let activeAccount = null;
let claimsCatalog = null;

const connectButton = document.getElementById("connectButton");
const switchButton = document.getElementById("switchMainnet");
const claimButton = document.getElementById("claimButton");
const statusEl = document.getElementById("status");
const accountEl = document.getElementById("account");
const signerAccountEl = document.getElementById("signerAccount");
const networkEl = document.getElementById("network");
const distributorAddressEl = document.getElementById("distributorAddress");
const manualAccountInput = document.getElementById("manualAccountInput");
const useManualAccountButton = document.getElementById("useManualAccount");
const clearManualAccountButton = document.getElementById("clearManualAccount");

claimButton.disabled = true;

function setStatus(text, cls = "") {
  statusEl.textContent = text;
  statusEl.className = "status";
  if (cls) statusEl.classList.add(cls);
}

function setClaimButtonState({ disabled, text }) {
  claimButton.disabled = disabled;
  claimButton.textContent = text || "Claim Rewards";
}

function normalizeChainId(chainId) {
  if (typeof chainId === "number") return chainId;
  if (typeof chainId === "bigint") return Number(chainId);
  if (typeof chainId === "string") {
    if (chainId.startsWith("0x")) return parseInt(chainId, 16);
    return parseInt(chainId, 10);
  }
  return NaN;
}

async function switchToBase() {
  if (!window.ethereum) return false;

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
          rpcUrls: ["https://mainnet.base.org"],
          blockExplorerUrls: ["https://basescan.org"],
        }],
      });
      return true;
    }
    return false;
  }
}

function getReadProvider() {
  if (provider) return provider;
  if (window.ethereum) return new ethers.BrowserProvider(window.ethereum);
  return new ethers.JsonRpcProvider(BASE_RPC_URL);
}

async function refreshNetwork() {
  if (!provider) return;
  const network = await provider.getNetwork();
  const chainId = normalizeChainId(network.chainId);
  networkEl.textContent = `${network.name} (${chainId})`;
  if (chainId !== 8453) {
    setStatus(`Wrong network (${chainId})`, "warn");
  }
}

async function loadClaimsCatalog() {
  if (claimsCatalog) return claimsCatalog;

  const response = await fetch(CLAIMS_DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load claim data (${response.status})`);
  }

  claimsCatalog = await response.json();
  if (claimsCatalog?.distributor && !distributorAddressEl.value.trim()) {
    distributorAddressEl.value = claimsCatalog.distributor;
  }
  return claimsCatalog;
}

function getClaimsForAccount(catalog, walletAddress) {
  if (!catalog?.days || !walletAddress) return [];

  const wallet = walletAddress.toLowerCase();
  return catalog.days
    .map((dayEntry) => {
      const matchingWallet = Object.keys(dayEntry.claims || {}).find(
        (candidate) => candidate.toLowerCase() === wallet
      );
      if (!matchingWallet) return null;

      return {
        day: dayEntry.day,
        ...dayEntry.claims[matchingWallet],
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.day) - Number(a.day));
}

function fillClaimForm(claimData) {
  document.getElementById("day").value = claimData.day;
  document.getElementById("score").value = claimData.score;
  document.getElementById("amountWei").value = claimData.amountWei;
  document.getElementById("proof").value = JSON.stringify(claimData.proof, null, 2);
}

async function autoSelectClaim() {
  if (!activeAccount) {
    setClaimButtonState({ disabled: true, text: "Claim Rewards" });
    return;
  }

  try {
    const catalog = await loadClaimsCatalog();
    const claims = getClaimsForAccount(catalog, activeAccount);

    if (!claims.length) {
      setClaimButtonState({ disabled: true, text: "No Claim Found" });
      setStatus("No packaged ATTN claim found for this wallet", "warn");
      return;
    }

    const selectedClaim = claims[0];
    fillClaimForm(selectedClaim);

    const readProvider = getReadProvider();
    const network = await readProvider.getNetwork();
    const chainId = normalizeChainId(network.chainId);
    if (chainId !== 8453) {
      setClaimButtonState({ disabled: true, text: "Switch to Base" });
      setStatus(`Loaded claim for day ${selectedClaim.day}. Switch to Base to claim.`, "warn");
      return;
    }

    const distributorAddress = distributorAddressEl.value.trim();
    if (!distributorAddress) {
      setClaimButtonState({ disabled: false, text: "Claim Rewards" });
      setStatus(`Loaded claim for day ${selectedClaim.day}`, "ok");
      return;
    }

    const distributor = new ethers.Contract(distributorAddress, DISTRIBUTOR_ABI, readProvider);
    const alreadyClaimed = await distributor.claimed(BigInt(selectedClaim.day), activeAccount);

    if (alreadyClaimed) {
      setClaimButtonState({ disabled: true, text: "Already Claimed" });
      setStatus(`Day ${selectedClaim.day} already claimed for this wallet`, "warn");
      return;
    }

    setClaimButtonState({ disabled: false, text: "Claim Rewards" });
    setStatus(`Loaded claim for day ${selectedClaim.day}`, "ok");
  } catch (error) {
    setClaimButtonState({ disabled: false, text: "Claim Rewards" });
    setStatus(error.message || "Failed to load claim data", "warn");
  }
}

async function connectWallet() {
  if (!window.ethereum || typeof ethers === "undefined") {
    setStatus("MetaMask or ethers missing", "warn");
    return;
  }

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    signerAccount = await signer.getAddress();
    signerAccountEl.textContent = signerAccount;
    if (!activeAccount) activeAccount = signerAccount;
    accountEl.textContent = activeAccount;

    await refreshNetwork();
    await autoSelectClaim();
  } catch (error) {
    setStatus(error.message || "Connect failed", "warn");
  }
}

function parseProof(input) {
  const value = JSON.parse(input);
  if (!Array.isArray(value)) throw new Error("Proof must be a JSON array");
  return value;
}

async function claim() {
  try {
    if (!signer || !signerAccount) throw new Error("Connect wallet first");

    const network = await provider.getNetwork();
    const chainId = normalizeChainId(network.chainId);
    if (chainId !== 8453) throw new Error(`Switch to Base Mainnet (current ${chainId})`);

    const distributorAddress = distributorAddressEl.value.trim();
    if (!distributorAddress) throw new Error("Distributor address required");

    const distributor = new ethers.Contract(distributorAddress, DISTRIBUTOR_ABI, signer);
    const day = BigInt(document.getElementById("day").value);
    const score = BigInt(document.getElementById("score").value);
    const amount = BigInt(document.getElementById("amountWei").value);
    const proof = parseProof(document.getElementById("proof").value.trim());

    setStatus("Submitting claim...", "ok");
    const tx = await distributor.claim(day, score, amount, proof);
    setStatus("Transaction sent, waiting confirmation...", "ok");
    await tx.wait();
    setClaimButtonState({ disabled: true, text: "Already Claimed" });
    setStatus(`Claim successful: ${tx.hash}`, "ok");
  } catch (error) {
    setStatus(error.message || "Claim failed", "warn");
  }
}

connectButton.addEventListener("click", connectWallet);
useManualAccountButton.addEventListener("click", async () => {
  if (!manualAccountInput.value.trim()) return;
  activeAccount = ethers.getAddress(manualAccountInput.value.trim());
  accountEl.textContent = activeAccount;
  await autoSelectClaim();
});
clearManualAccountButton.addEventListener("click", async () => {
  activeAccount = signerAccount || null;
  accountEl.textContent = activeAccount || "-";
  manualAccountInput.value = "";
  await autoSelectClaim();
});
switchButton.addEventListener("click", async () => {
  const ok = await switchToBase();
  if (!ok) {
    setStatus("Failed to switch to Base", "warn");
    return;
  }
  provider = new ethers.BrowserProvider(window.ethereum);
  await refreshNetwork();
  await autoSelectClaim();
});
claimButton.addEventListener("click", claim);

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}
