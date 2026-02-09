console.log("app.js loaded");

// Check if ethers is loaded
if (typeof ethers === "undefined") {
  console.error("ethers.js not loaded!");
}

// Global state
let provider = null;
let signer = null;
let userAddress = null;

// Elements
let connectButton, statusEl, accountEl, networkEl, balanceEl, switchButton, refreshButton;

const MAINNET_CHAIN_ID = "0x2105";

function getElements() {
  connectButton = document.getElementById("connectButton");
  statusEl = document.getElementById("status");
  accountEl = document.getElementById("account");
  networkEl = document.getElementById("network");
  balanceEl = document.getElementById("balance");
  switchButton = document.getElementById("switchMainnet");
  refreshButton = document.getElementById("refreshBalance");

  console.log("Elements found:", {
    connectButton: !!connectButton,
    statusEl: !!statusEl,
    accountEl: !!accountEl,
    networkEl: !!networkEl,
    balanceEl: !!balanceEl,
    switchButton: !!switchButton,
    refreshButton: !!refreshButton,
  });

  return !!connectButton;
}

function setStatus(text, state = null) {
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.className = "status";
    if (state) {
      statusEl.classList.add(state);
    }
  }
  console.log(`Status: ${text} (${state || "neutral"})`);
}

async function getProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

async function connectWallet() {
  try {
    console.log("connectWallet called");
    if (!window.ethereum) {
      setStatus("MetaMask not installed", "warn");
      return;
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    console.log("Accounts:", accounts);

    provider = await getProvider();
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    console.log("Connected address:", userAddress);
    if (accountEl) accountEl.textContent = userAddress;

    await refreshAccount();
  } catch (error) {
    console.error("Connection error:", error);
    setStatus(error.message || "Connection failed", "warn");
  }
}

async function refreshAccount() {
  try {
    if (!provider) {
      provider = await getProvider();
    }

    const network = await provider.getNetwork();
    const chainIdHex = "0x" + network.chainId.toString(16);

    if (networkEl) networkEl.textContent = `${network.name} (${chainIdHex})`;

    if (chainIdHex !== MAINNET_CHAIN_ID) {
      setStatus("Wrong network - switch to Base", "warn");
    } else {
      setStatus("Connected", "ok");
    }

    if (userAddress) {
      const balance = await provider.getBalance(userAddress);
      const ethBalance = ethers.formatEther(balance);
      if (balanceEl) balanceEl.textContent = `${parseFloat(ethBalance).toFixed(4)} ETH`;
    }
  } catch (error) {
    console.error("refreshAccount error:", error);
    setStatus(error.message || "Refresh failed", "warn");
  }
}

async function switchToMainnet() {
  try {
    console.log("switchToMainnet called");
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
    console.error("Switch error:", error);
    setStatus(error.message || "Switch failed", "warn");
  }
}

function attachEventListeners() {
  if (connectButton) {
    connectButton.addEventListener("click", connectWallet);
    console.log("connectButton listener attached");
  }
  if (switchButton) {
    switchButton.addEventListener("click", switchToMainnet);
    console.log("switchButton listener attached");
  }
  if (refreshButton) {
    refreshButton.addEventListener("click", refreshAccount);
    console.log("refreshButton listener attached");
  }
}

function initializeMetaMaskListeners() {
  if (window.ethereum) {
    console.log("MetaMask detected");
    window.ethereum.on("accountsChanged", () => {
      console.log("Accounts changed");
      connectWallet();
    });
    window.ethereum.on("chainChanged", () => {
      console.log("Chain changed");
      refreshAccount();
    });
  } else {
    console.warn("MetaMask not detected");
    setStatus("MetaMask not installed", "warn");
  }
}

function initApp() {
  console.log("initApp started");

  if (!getElements()) {
    console.error("Failed to get DOM elements!");
    return;
  }

  attachEventListeners();
  initializeMetaMaskListeners();

  setStatus("Ready to connect", "ok");
  console.log("initApp completed");
}

// Wait for DOM to be ready
function waitForReady() {
  if (document.readyState !== "loading") {
    console.log("DOM ready, initializing...");
    initApp();
  } else {
    document.addEventListener("DOMContentLoaded", initApp);
  }
}

waitForReady();
console.log("app.js setup complete");
