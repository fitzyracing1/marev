console.log("dex.js loaded");

const BASE_CHAIN_ID = "0x2105";
const USDC_DECIMALS = 6;
const MAREV_DECIMALS = 18;

// Contract ABIs
const MAREV_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const DEX_ABI = [
  "function getPrice(address tokenIn, address tokenOut, uint256 amountIn) view returns (uint256)",
  "function swapMARtoUSDC(uint256 amountMAREV, uint256 minUSDC) returns (uint256)",
  "function swapUSDCtoMAR(uint256 amountUSDC, uint256 minMAREV) returns (uint256)",
  "function getReserves() view returns (uint256 marevReserve, uint256 usdcReserve)",
];

// UI Elements
const connectButton = document.getElementById("connectButton");
const statusEl = document.getElementById("status");
const accountEl = document.getElementById("account");
const networkEl = document.getElementById("network");
const tokenFromSelect = document.getElementById("tokenFrom");
const tokenToSelect = document.getElementById("tokenTo");
const amountFromInput = document.getElementById("amountFrom");
const amountToInput = document.getElementById("amountTo");
const swapButton = document.getElementById("swapButton");
const priceEl = document.getElementById("price");
const feeEl = document.getElementById("fee");
const minReceiveEl = document.getElementById("minReceive");
const marevReserveEl = document.getElementById("marevReserve");
const usdcReserveEl = document.getElementById("usdcReserve");
const poolValueEl = document.getElementById("poolValue");
const balanceFromEl = document.getElementById("balanceFrom");
const balanceToEl = document.getElementById("balanceTo");
const refreshButton = document.getElementById("refreshButton");
const switchButton = document.getElementById("switchMainnet");
const contractStatusEl = document.getElementById("contractStatus");
const downloadButton = document.getElementById("downloadButton");

// State
let provider;
let signer;
let userAddress;
let contracts = {
  marev: null,
  usdc: null,
  dex: null,
};

let contractAddresses = {
  marev: "0x0000000000000000000000000000000000000000",
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b1566469c3d",
  dex: "0x0000000000000000000000000000000000000000",
};

function setStatus(text, state) {
  statusEl.textContent = text;
  statusEl.classList.remove("ok", "warn");
  if (state) {
    statusEl.classList.add(state);
  }
  console.log(`Status: ${text} (${state})`);
}

async function getProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

async function loadDeploymentAddresses() {
  try {
    const response = await fetch("./deployments-base.json");
    if (response.ok) {
      const data = await response.json();
      contractAddresses.marev = data.marevToken;
      contractAddresses.dex = data.dex;
      contractAddresses.usdc = data.usdc;
      console.log("Loaded contract addresses:", contractAddresses);
      updateContractStatus();
    }
  } catch (error) {
    console.log("Using default contract addresses (not deployed yet)");
    updateContractStatus();
  }
}

function updateContractStatus() {
  const isDeployed =
    contractAddresses.marev !== "0x0000000000000000000000000000000000000000";

  if (isDeployed) {
    contractStatusEl.innerHTML = `
      <strong>✓ DEX Deployed on Base</strong>
      <br>MAREV Token: <code>${contractAddresses.marev.slice(0, 6)}...${contractAddresses.marev.slice(-4)}</code>
      <br>DEX Contract: <code>${contractAddresses.dex.slice(0, 6)}...${contractAddresses.dex.slice(-4)}</code>
      <br>USDC: <code>${contractAddresses.usdc.slice(0, 6)}...${contractAddresses.usdc.slice(-4)}</code>
    `;
  } else {
    contractStatusEl.innerHTML = `
      <strong>⚠ DEX Not Yet Deployed</strong>
      <br>Run <code>npm run deploy</code> in the /dex directory to deploy contracts.
    `;
  }
}

async function connectWallet() {
  try {
    console.log("connectWallet called");
    if (!window.ethereum) {
      setStatus("MetaMask not installed", "warn");
      return;
    }

    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = await getProvider();
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    accountEl.textContent = userAddress;
    await refreshData();
    setStatus("Connected", "ok");
  } catch (error) {
    console.error("Connection error:", error);
    setStatus(error.message || "Connection failed", "warn");
  }
}

async function refreshData() {
  try {
    provider = await getProvider();
    const network = await provider.getNetwork();
    const chainIdHex = "0x" + network.chainId.toString(16);
    networkEl.textContent = `${network.name} (${chainIdHex})`;

    if (chainIdHex !== BASE_CHAIN_ID) {
      setStatus("Wrong network", "warn");
      return;
    }

    if (userAddress) {
      await updateBalances();
      await updatePoolInfo();
      await updatePriceQuote();
    }
  } catch (error) {
    console.error("Refresh error:", error);
    setStatus(error.message || "Refresh failed", "warn");
  }
}

async function updateBalances() {
  try {
    if (!userAddress) return;

    // MAREV balance
    const marevContract = new ethers.Contract(
      contractAddresses.marev,
      MAREV_ABI,
      provider
    );
    const marevBalance = await marevContract.balanceOf(userAddress);
    balanceFromEl.textContent =
      ethers.formatUnits(marevBalance, MAREV_DECIMALS) + " MAREV";

    // USDC balance
    const usdcContract = new ethers.Contract(
      contractAddresses.usdc,
      MAREV_ABI,
      provider
    );
    const usdcBalance = await usdcContract.balanceOf(userAddress);
    balanceToEl.textContent =
      ethers.formatUnits(usdcBalance, USDC_DECIMALS) + " USDC";
  } catch (error) {
    console.error("Balance update error:", error);
  }
}

async function updatePoolInfo() {
  try {
    const dexContract = new ethers.Contract(
      contractAddresses.dex,
      DEX_ABI,
      provider
    );
    const [marevReserve, usdcReserve] = await dexContract.getReserves();

    const marevAmount = ethers.formatUnits(marevReserve, MAREV_DECIMALS);
    const usdcAmount = ethers.formatUnits(usdcReserve, USDC_DECIMALS);

    marevReserveEl.textContent = `${parseFloat(marevAmount).toFixed(2)} MAREV`;
    usdcReserveEl.textContent = `${parseFloat(usdcAmount).toFixed(2)} USDC`;

    // Pool value in USDC
    const poolValue = parseFloat(marevAmount) + parseFloat(usdcAmount);
    poolValueEl.textContent = `$${poolValue.toFixed(2)} USDC`;
  } catch (error) {
    console.error("Pool info error:", error);
  }
}

async function updatePriceQuote() {
  try {
    const amountFrom = parseFloat(amountFromInput.value) || 0;
    if (amountFrom <= 0) {
      amountToInput.value = "";
      priceEl.textContent = "—";
      feeEl.textContent = "—";
      minReceiveEl.textContent = "—";
      return;
    }

    const tokenFrom = tokenFromSelect.value;
    const tokenTo = tokenToSelect.value;

    if (tokenFrom === tokenTo) {
      setStatus("Select different tokens", "warn");
      return;
    }

    const tokenFromAddr = tokenFrom === "MAREV" ? contractAddresses.marev : contractAddresses.usdc;
    const tokenToAddr = tokenTo === "MAREV" ? contractAddresses.marev : contractAddresses.usdc;
    const decimalsFrom = tokenFrom === "MAREV" ? MAREV_DECIMALS : USDC_DECIMALS;

    const amountInWei = ethers.parseUnits(amountFrom.toString(), decimalsFrom);

    const dexContract = new ethers.Contract(
      contractAddresses.dex,
      DEX_ABI,
      provider
    );
    const amountOut = await dexContract.getPrice(
      tokenFromAddr,
      tokenToAddr,
      amountInWei
    );

    const decimalsTo = tokenTo === "MAREV" ? MAREV_DECIMALS : USDC_DECIMALS;
    const amountOutFormatted = ethers.formatUnits(amountOut, decimalsTo);

    amountToInput.value = parseFloat(amountOutFormatted).toFixed(4);

    // Calculate price and fee
    const price = (parseFloat(amountOutFormatted) / amountFrom).toFixed(6);
    const fee = (amountFrom * 0.0025).toFixed(6);
    const minReceive = (parseFloat(amountOutFormatted) * 0.995).toFixed(4); // 0.5% slippage

    priceEl.textContent = `1 ${tokenFrom} = ${price} ${tokenTo}`;
    feeEl.textContent = `${fee} ${tokenFrom}`;
    minReceiveEl.textContent = `${minReceive} ${tokenTo}`;
  } catch (error) {
    console.error("Price quote error:", error);
    priceEl.textContent = "Error";
  }
}

async function executeSwap() {
  try {
    console.log("Executing swap...");
    if (!userAddress) {
      setStatus("Connect wallet first", "warn");
      return;
    }

    const amountFrom = parseFloat(amountFromInput.value);
    if (amountFrom <= 0) {
      setStatus("Enter amount to swap", "warn");
      return;
    }

    const tokenFrom = tokenFromSelect.value;
    const tokenTo = tokenToSelect.value;

    if (tokenFrom === tokenTo) {
      setStatus("Select different tokens", "warn");
      return;
    }

    setStatus("Swapping...", "ok");

    const dexContract = new ethers.Contract(
      contractAddresses.dex,
      DEX_ABI,
      signer
    );

    const decimalsFrom = tokenFrom === "MAREV" ? MAREV_DECIMALS : USDC_DECIMALS;
    const amountInWei = ethers.parseUnits(amountFrom.toString(), decimalsFrom);
    const minAmountOut = ethers.parseUnits(
      (parseFloat(amountToInput.value) * 0.995).toString(),
      tokenTo === "MAREV" ? MAREV_DECIMALS : USDC_DECIMALS
    );

    let tx;
    if (tokenFrom === "MAREV" && tokenTo === "USDC") {
      tx = await dexContract.swapMARtoUSDC(amountInWei, minAmountOut);
    } else {
      tx = await dexContract.swapUSDCtoMAR(amountInWei, minAmountOut);
    }

    await tx.wait();
    setStatus("Swap complete!", "ok");
    amountFromInput.value = "";
    amountToInput.value = "";
    await refreshData();
  } catch (error) {
    console.error("Swap error:", error);
    setStatus(error.message || "Swap failed", "warn");
  }
}

async function switchToMainnet() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_CHAIN_ID }],
    });
    await refreshData();
  } catch (error) {
    console.error("Switch error:", error);
    setStatus(error.message || "Switch failed", "warn");
  }
}

function downloadDeploymentInfo() {
  try {
    const data = {
      network: "base",
      marevToken: contractAddresses.marev,
      dex: contractAddresses.dex,
      usdc: contractAddresses.usdc,
      deploymentTime: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "marev-deployment-base.json";
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download error:", error);
    setStatus("Download failed", "warn");
  }
}

function initApp() {
  console.log("Initializing DEX app...");

  // Load contract addresses
  loadDeploymentAddresses();

  // Event listeners
  connectButton.addEventListener("click", connectWallet);
  swapButton.addEventListener("click", executeSwap);
  refreshButton.addEventListener("click", refreshData);
  switchButton.addEventListener("click", switchToMainnet);
  downloadButton.addEventListener("click", downloadDeploymentInfo);

  // Price update listeners
  amountFromInput.addEventListener("input", updatePriceQuote);
  tokenFromSelect.addEventListener("change", updatePriceQuote);
  tokenToSelect.addEventListener("change", updatePriceQuote);

  // MetaMask listeners
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", connectWallet);
    window.ethereum.on("chainChanged", refreshData);
  }

  setStatus("Ready to connect", "ok");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
