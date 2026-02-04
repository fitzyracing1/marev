const connectButton = document.getElementById("connectButton");
const statusEl = document.getElementById("status");
const accountEl = document.getElementById("account");
const networkEl = document.getElementById("network");
const balanceEl = document.getElementById("balance");
const switchButton = document.getElementById("switchMainnet");
const refreshButton = document.getElementById("refreshBalance");

const MAINNET_CHAIN_ID = "0x2105";

function setStatus(text, state) {
  statusEl.textContent = text;
  statusEl.classList.remove("ok", "warn");
  if (state) {
    statusEl.classList.add(state);
  }
}

async function getProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

async function refreshAccount() {
  try {
    const provider = await getProvider();
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    accountEl.textContent = address;

    const network = await provider.getNetwork();
    const chainIdHex = "0x" + network.chainId.toString(16);
    networkEl.textContent = `${network.name} (${chainIdHex})`;

    if (chainIdHex !== MAINNET_CHAIN_ID) {
      setStatus("Wrong network", "warn");
    } else {
      setStatus("Connected", "ok");
    }

    const balance = await provider.getBalance(address);
    balanceEl.textContent = `${ethers.formatEther(balance)} ETH`;
  } catch (error) {
    setStatus(error.message || "Connection error", "warn");
  }
}

async function connectWallet() {
  try {
    if (!window.ethereum) {
      setStatus("MetaMask not installed", "warn");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await refreshAccount();
  } catch (error) {
    setStatus(error.message || "Connection failed", "warn");
  }
}

async function switchToMainnet() {
  try {
    if (!window.ethereum) {
      setStatus("MetaMask not installed", "warn");
      return;
    }
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MAINNET_CHAIN_ID }],
    });
    await refreshAccount();
  } catch (error) {
    setStatus(error.message || "Switch failed", "warn");
  }
}

connectButton.addEventListener("click", connectWallet);
switchButton.addEventListener("click", switchToMainnet);
refreshButton.addEventListener("click", refreshAccount);

if (window.ethereum) {
  window.ethereum.on("accountsChanged", refreshAccount);
  window.ethereum.on("chainChanged", refreshAccount);
}
