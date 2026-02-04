console.log("app.js loaded");

// Wait for DOM to be fully loaded
function initApp() {
  console.log("Initializing app...");

  const connectButton = document.getElementById("connectButton");
  const statusEl = document.getElementById("status");
  const accountEl = document.getElementById("account");
  const networkEl = document.getElementById("network");
  const balanceEl = document.getElementById("balance");
  const switchButton = document.getElementById("switchMainnet");
  const refreshButton = document.getElementById("refreshBalance");

  console.log("Elements found:", {
    connectButton: !!connectButton,
    statusEl: !!statusEl,
    accountEl: !!accountEl,
    networkEl: !!networkEl,
    balanceEl: !!balanceEl,
    switchButton: !!switchButton,
    refreshButton: !!refreshButton,
  });

  if (!connectButton) {
    console.error("connectButton not found!");
    return;
  }

  const MAINNET_CHAIN_ID = "0x2105";

  function setStatus(text, state) {
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.classList.remove("ok", "warn");
      if (state) {
        statusEl.classList.add(state);
      }
    }
    console.log(`Status: ${text} (${state})`);
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
      if (accountEl) accountEl.textContent = address;

      const network = await provider.getNetwork();
      const chainIdHex = "0x" + network.chainId.toString(16);
      if (networkEl) networkEl.textContent = `${network.name} (${chainIdHex})`;

      if (chainIdHex !== MAINNET_CHAIN_ID) {
        setStatus("Wrong network", "warn");
      } else {
        setStatus("Connected", "ok");
      }

      const balance = await provider.getBalance(address);
      if (balanceEl) balanceEl.textContent = `${ethers.formatEther(balance)} ETH`;
    } catch (error) {
      console.error("refreshAccount error:", error);
      setStatus(error.message || "Connection error", "warn");
    }
  }

  async function connectWallet() {
    try {
      console.log("connectWallet called");
      if (!window.ethereum) {
        setStatus("MetaMask not installed", "warn");
        console.error("MetaMask not found");
        return;
      }
      console.log("Requesting accounts...");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      console.log("Accounts requested, refreshing...");
      await refreshAccount();
    } catch (error) {
      console.error("Connection error:", error);
      setStatus(error.message || "Connection failed", "warn");
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

  // Attach event listeners
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

  // Listen for MetaMask account/chain changes
  if (window.ethereum) {
    console.log("MetaMask detected, attaching event listeners");
    window.ethereum.on("accountsChanged", refreshAccount);
    window.ethereum.on("chainChanged", refreshAccount);
  } else {
    console.warn("MetaMask not detected");
    setStatus("MetaMask not installed", "warn");
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  console.log("DOM still loading, waiting...");
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  console.log("DOM already loaded, initializing...");
  initApp();
}
