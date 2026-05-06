const BASE_CHAIN_ID = "0x2105";
const BASE_RPC_URL = "https://mainnet.base.org";
const DEXSCREENER_PROFILES_URL = "https://api.dexscreener.com/token-profiles/latest/v1";
const DEXSCREENER_SEARCH_URL = "https://api.dexscreener.com/latest/dex/search/?q=";
const DEXSCREENER_TOKEN_URL = "https://api.dexscreener.com/latest/dex/tokens/";
const GECKOTERMINAL_TOKEN_URL = "https://api.geckoterminal.com/api/v2/networks/base/tokens/";
const USDC_DECIMALS = 6;
const MAREV_DECIMALS = 18;
const IMPORT_STORAGE_KEY = "marev-base-token-imports";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const FIRE_COIN_ADDRESS = "0x1c78664aed3c83db40bfe1319e7461c3f5b6398d";
const FIRE_COIN_FALLBACK_NAME = "Fire Coin";
const ZEROEX_NATIVE_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const ZEROEX_QUOTE_ENDPOINT = "/api/0x-quote";

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
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

const FACTORY_ABI = [
  "function getTotalTokens() view returns (uint256)",
  "function allTokens(uint256 index) view returns (address)",
  "function getTokenInfo(address tokenAddress) view returns (string, string, address, uint256, uint256, bool)",
  "function getListingInfo(address tokenAddress) view returns (bool, address, address)",
];

const V2_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) view returns (address pair)",
];

const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
];

const connectButton = document.getElementById("connectButton");
const statusEl = document.getElementById("status");
const accountEl = document.getElementById("account");
const signerAccountEl = document.getElementById("signerAccount");
const networkEl = document.getElementById("network");
const tokenFromSelect = document.getElementById("tokenFrom");
const tokenToSelect = document.getElementById("tokenTo");
const amountFromInput = document.getElementById("amountFrom");
const amountToInput = document.getElementById("amountTo");
const approveButton = document.getElementById("approveButton");
const swapButton = document.getElementById("swapButton");
const priceEl = document.getElementById("price");
const feeEl = document.getElementById("fee");
const minReceiveEl = document.getElementById("minReceive");
const allowanceStatusEl = document.getElementById("allowanceStatus");
const marevReserveEl = document.getElementById("marevReserve");
const usdcReserveEl = document.getElementById("usdcReserve");
const poolValueEl = document.getElementById("poolValue");
const balanceFromEl = document.getElementById("balanceFrom");
const balanceToEl = document.getElementById("balanceTo");
const refreshButton = document.getElementById("refreshButton");
const switchButton = document.getElementById("switchMainnet");
const contractStatusEl = document.getElementById("contractStatus");
const downloadButton = document.getElementById("downloadButton");
const factoryTokensEl = document.getElementById("factoryTokens");
const refreshFactoryTokensButton = document.getElementById("refreshFactoryTokens");
const importBaseTokenButton = document.getElementById("importBaseToken");
const baseTokenAddressInput = document.getElementById("baseTokenAddress");
const baseTokenStatusEl = document.getElementById("baseTokenStatus");
const baseTokenListEl = document.getElementById("baseTokenList");
const refreshMarketFeedButton = document.getElementById("refreshMarketFeed");
const searchBaseMarketButton = document.getElementById("searchBaseMarket");
const baseMarketQueryInput = document.getElementById("baseMarketQuery");
const baseMarketStatusEl = document.getElementById("baseMarketStatus");
const baseMarketFeedEl = document.getElementById("baseMarketFeed");
const manualAccountInput = document.getElementById("manualAccountInput");
const useManualAccountButton = document.getElementById("useManualAccount");
const clearManualAccountButton = document.getElementById("clearManualAccount");
const importFireCoinButton = document.getElementById("importFireCoin");
const copyFireCoinAddressButton = document.getElementById("copyFireCoinAddress");
const fundFireCoinWithCoinbaseButton = document.getElementById("fundFireCoinWithCoinbase");
const buyFireCoinNowButton = document.getElementById("buyFireCoinNow");
const fireCoinTitleEl = document.getElementById("fireCoinTitle");
const fireCoinAddressEl = document.getElementById("fireCoinAddress");
const fireCoinShareCountInput = document.getElementById("fireCoinShareCount");
const fireCoinSharePriceEl = document.getElementById("fireCoinSharePrice");
const fireCoinTotalCostEl = document.getElementById("fireCoinTotalCost");
const fireCoinEstimatedOutEl = document.getElementById("fireCoinEstimatedOut");
const fireCoinUsdcLiquidityEl = document.getElementById("fireCoinUsdcLiquidity");
const fireCoinTokenLiquidityEl = document.getElementById("fireCoinTokenLiquidity");
const fireCoinStatusEl = document.getElementById("fireCoinStatus");
const thirdwebWidgetStatusEl = document.getElementById("thirdwebWidgetStatus");

const uniSellSelect = document.getElementById("uniSellSelect");
const uniSellCustom = document.getElementById("uniSellCustom");
const uniSellAmount = document.getElementById("uniSellAmount");
const uniSellBalance = document.getElementById("uniSellBalance");
const uniBuySelect = document.getElementById("uniBuySelect");
const uniBuyCustom = document.getElementById("uniBuyCustom");
const uniBuyAmount = document.getElementById("uniBuyAmount");
const uniBuyBalance = document.getElementById("uniBuyBalance");
const uniRouteEl = document.getElementById("uniRoute");
const uniGasEl = document.getElementById("uniGas");
const uniSlippageInput = document.getElementById("uniSlippage");
const uniMinReceiveEl = document.getElementById("uniMinReceive");
const uniAllowanceEl = document.getElementById("uniAllowance");
const uniApproveBtn = document.getElementById("uniApproveBtn");
const uniSwapBtn = document.getElementById("uniSwapBtn");
const uniStatusEl = document.getElementById("uniStatus");
const uniFlipBtn = document.getElementById("uniFlipBtn");

let provider;
let signer;
let signerAddress;
let activeAccount;
const readProvider = new ethers.JsonRpcProvider(BASE_RPC_URL);
let fireCoinMarket = null;
const FIRE_COIN_SHARE_PRICE_USDC = 1;
const BASE_CHAIN_NUMERIC_ID = 8453;
const appIntegrations = window.APP_INTEGRATIONS || {};

let contractAddresses = {
  marev: ZERO_ADDRESS,
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  dex: ZERO_ADDRESS,
};

let factoryDeployment = {
  factory: ZERO_ADDRESS,
  listingManager: ZERO_ADDRESS,
  dexRouter: ZERO_ADDRESS,
  dexFactory: ZERO_ADDRESS,
  baseToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

function setStatus(text, state) {
  statusEl.textContent = text;
  statusEl.classList.remove("ok", "warn");
  if (state) statusEl.classList.add(state);
}

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "-";
}

function decimalInputToString(value, decimals) {
  if (!Number.isFinite(value) || value <= 0) return null;
  const text = value.toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: decimals,
  });
  return text.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");
}

function formatDisplayAmount(value, decimals = 6) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const precision = Math.min(decimals, value < 0.0001 ? decimals : 6);
  const text = value.toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: precision,
  });
  return text.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");
}

function formatUsdLike(amount) {
  if (!Number.isFinite(amount)) return "-";
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
}

function formatUnitsSafe(value, decimals) {
  try {
    return parseFloat(ethers.formatUnits(value, decimals));
  } catch {
    return 0;
  }
}

function getTokenMeta(symbol) {
  return symbol === "MAREV"
    ? { address: contractAddresses.marev, decimals: MAREV_DECIMALS }
    : { address: contractAddresses.usdc, decimals: USDC_DECIMALS };
}

function getReadTokenContract(address) {
  return new ethers.Contract(address, ERC20_ABI, readProvider);
}

function getRunnerTokenContract(address, runner) {
  return new ethers.Contract(address, ERC20_ABI, runner);
}

function copyAddress(address) {
  navigator.clipboard.writeText(address);
}

function openTrade(address) {
  copyAddress(address);
  window.open("https://pancakeswap.finance/swap?chain=base", "_blank", "noopener,noreferrer");
}

function estimateConstantProductOut(amountIn, reserveIn, reserveOut, feeBps = 30) {
  if (!(amountIn > 0) || !(reserveIn > 0) || !(reserveOut > 0)) return 0;
  const amountInWithFee = amountIn * (10000 - feeBps);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 10000 + amountInWithFee;
  return denominator > 0 ? numerator / denominator : 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emitFireCoinShareUpdate(payload = {}) {
  window.dispatchEvent(
    new CustomEvent("firecoin-share-update", {
      detail: payload,
    })
  );
}

async function getProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

async function loadDeploymentAddresses() {
  try {
    const [dexResponse, factoryResponse] = await Promise.all([
      fetch("./deployments-base.json"),
      fetch("./deployments-factory-base.json"),
    ]);

    if (dexResponse.ok) {
      const dexData = await dexResponse.json();
      contractAddresses = {
        marev: dexData.marevToken,
        usdc: dexData.usdc,
        dex: dexData.dex,
      };
    }

    if (factoryResponse.ok) {
      factoryDeployment = {
        ...factoryDeployment,
        ...(await factoryResponse.json()),
      };
    }
  } catch (error) {
    console.error("Failed to load deployment metadata", error);
  }
  updateContractStatus();
}

function updateContractStatus() {
  contractStatusEl.innerHTML = `
    <strong>Custom MAREV Pool</strong>
    <br>MAREV Token: <code>${shortAddress(contractAddresses.marev)}</code>
    <br>Custom DEX: <code>${shortAddress(contractAddresses.dex)}</code>
    <br>USDC: <code>${shortAddress(contractAddresses.usdc)}</code>
    <br><br>
    <strong>Factory Stack</strong>
    <br>Factory: <code>${shortAddress(factoryDeployment.factory)}</code>
    <br>Listing Manager: <code>${shortAddress(factoryDeployment.listingManager)}</code>
    <br>Base AMM Router: <code>${shortAddress(factoryDeployment.dexRouter)}</code>
    <br>Base AMM Factory: <code>${shortAddress(factoryDeployment.dexFactory)}</code>
  `;
}

async function connectWallet() {
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = await getProvider();
    signer = await provider.getSigner();
    signerAddress = await signer.getAddress();
    signerAccountEl.textContent = signerAddress;
    if (!activeAccount) activeAccount = signerAddress;
    accountEl.textContent = activeAccount;
    await refreshData();
    await refreshUniBalances();
    if (uniSellAmount.value) scheduleUniQuote();
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
    const chainIdHex = `0x${network.chainId.toString(16)}`;
    networkEl.textContent = `${network.name} (${chainIdHex})`;

    if (chainIdHex !== BASE_CHAIN_ID) {
      setStatus("Wrong network", "warn");
      await updatePoolInfo();
      return;
    }

    if (activeAccount) {
      await Promise.all([
        updateBalances(),
        updatePoolInfo(),
        updatePriceQuote(),
        updateAllowanceStatus(),
      ]);
    } else {
      await updatePoolInfo();
    }
  } catch (error) {
    if (error.message === "MetaMask not found") {
      await updatePoolInfo();
      return;
    }
    console.error("Refresh error:", error);
    setStatus(error.message || "Refresh failed", "warn");
  }
}

async function updateBalances() {
  if (!activeAccount) return;

  try {
    const marevContract = getReadTokenContract(contractAddresses.marev);
    const usdcContract = getReadTokenContract(contractAddresses.usdc);
    const [marevBalance, usdcBalance] = await Promise.all([
      marevContract.balanceOf(activeAccount),
      usdcContract.balanceOf(activeAccount),
    ]);

    balanceFromEl.textContent = `${formatDisplayAmount(formatUnitsSafe(marevBalance, MAREV_DECIMALS), MAREV_DECIMALS)} MAREV`;
    balanceToEl.textContent = `${formatDisplayAmount(formatUnitsSafe(usdcBalance, USDC_DECIMALS), USDC_DECIMALS)} USDC`;
  } catch (error) {
    console.error("Balance update error:", error);
  }
}

async function updatePoolInfo() {
  try {
    const dexContract = new ethers.Contract(contractAddresses.dex, DEX_ABI, readProvider);
    const [marevReserve, usdcReserve] = await dexContract.getReserves();

    const marevAmount = formatUnitsSafe(marevReserve, MAREV_DECIMALS);
    const usdcAmount = formatUnitsSafe(usdcReserve, USDC_DECIMALS);

    marevReserveEl.textContent = `${formatDisplayAmount(marevAmount, MAREV_DECIMALS)} MAREV`;
    usdcReserveEl.textContent = `${formatDisplayAmount(usdcAmount, USDC_DECIMALS)} USDC`;
    poolValueEl.textContent = formatUsdLike(marevAmount + usdcAmount);
  } catch (error) {
    console.error("Pool info error:", error);
  }
}

async function updatePriceQuote() {
  try {
    const amountFrom = parseFloat(amountFromInput.value) || 0;
    if (amountFrom <= 0) {
      amountToInput.value = "";
      priceEl.textContent = "-";
      feeEl.textContent = "-";
      minReceiveEl.textContent = "-";
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
    const decimalsTo = tokenTo === "MAREV" ? MAREV_DECIMALS : USDC_DECIMALS;
    const normalizedAmountFrom = decimalInputToString(amountFrom, decimalsFrom);

    if (!normalizedAmountFrom) {
      setStatus("Enter a valid swap amount", "warn");
      return;
    }

    const amountInWei = ethers.parseUnits(normalizedAmountFrom, decimalsFrom);
    const dexContract = new ethers.Contract(contractAddresses.dex, DEX_ABI, readProvider);
    const amountOut = await dexContract.getPrice(tokenFromAddr, tokenToAddr, amountInWei);
    const amountOutFormatted = formatUnitsSafe(amountOut, decimalsTo);

    amountToInput.value = formatDisplayAmount(amountOutFormatted, decimalsTo);
    priceEl.textContent = `1 ${tokenFrom} = ${formatDisplayAmount(amountOutFormatted / amountFrom, 8)} ${tokenTo}`;
    feeEl.textContent = `${formatDisplayAmount(amountFrom * 0.0025, decimalsFrom)} ${tokenFrom}`;
    minReceiveEl.textContent = `${formatDisplayAmount(amountOutFormatted * 0.995, decimalsTo)} ${tokenTo}`;
  } catch (error) {
    console.error("Price quote error:", error);
    priceEl.textContent = "Error";
  }
}

async function updateAllowanceStatus() {
  try {
    if (!signerAddress || !provider) {
      allowanceStatusEl.textContent = "-";
      approveButton.disabled = true;
      return;
    }

    const tokenFrom = tokenFromSelect.value;
    const amountFrom = parseFloat(amountFromInput.value) || 0;
    const { address, decimals } = getTokenMeta(tokenFrom);
    const tokenContract = getReadTokenContract(address);
    const allowance = await tokenContract.allowance(signerAddress, contractAddresses.dex);

    allowanceStatusEl.textContent = `${formatDisplayAmount(formatUnitsSafe(allowance, decimals), decimals)} ${tokenFrom}`;

    if (amountFrom <= 0) {
      approveButton.disabled = false;
      approveButton.textContent = `Approve ${tokenFrom}`;
      return;
    }

    const normalizedAmountFrom = decimalInputToString(amountFrom, decimals);
    if (!normalizedAmountFrom) {
      approveButton.disabled = true;
      return;
    }

    const amountInWei = ethers.parseUnits(normalizedAmountFrom, decimals);
    const hasEnoughAllowance = allowance >= amountInWei;
    approveButton.disabled = hasEnoughAllowance;
    approveButton.textContent = hasEnoughAllowance ? `${tokenFrom} Approved` : `Approve ${tokenFrom}`;
  } catch (error) {
    console.error("Allowance update error:", error);
    allowanceStatusEl.textContent = "Error";
    approveButton.disabled = true;
  }
}

async function approveCurrentToken() {
  try {
    if (!signer || !signerAddress) {
      setStatus("Connect wallet first", "warn");
      return;
    }

    const tokenFrom = tokenFromSelect.value;
    const amountFrom = parseFloat(amountFromInput.value) || 0;
    const { address, decimals } = getTokenMeta(tokenFrom);
    const normalizedAmountFrom = decimalInputToString(amountFrom, decimals);

    if (!normalizedAmountFrom) {
      setStatus(`Enter a valid ${tokenFrom} amount before approving`, "warn");
      return;
    }

    const amountInWei = ethers.parseUnits(normalizedAmountFrom, decimals);
    const tokenContract = getRunnerTokenContract(address, signer);

    setStatus(`Approving ${tokenFrom}...`, "ok");
    const tx = await tokenContract.approve(contractAddresses.dex, amountInWei);
    await tx.wait();
    setStatus(`${tokenFrom} approval confirmed`, "ok");
    await updateAllowanceStatus();
  } catch (error) {
    console.error("Approve error:", error);
    setStatus(error.message || "Approval failed", "warn");
  }
}

async function executeSwap() {
  try {
    if (!signerAddress) {
      setStatus("Connect wallet first", "warn");
      return;
    }

    const amountFrom = parseFloat(amountFromInput.value);
    if (!(amountFrom > 0)) {
      setStatus("Enter amount to swap", "warn");
      return;
    }

    const tokenFrom = tokenFromSelect.value;
    const tokenTo = tokenToSelect.value;
    if (tokenFrom === tokenTo) {
      setStatus("Select different tokens", "warn");
      return;
    }

    const decimalsFrom = tokenFrom === "MAREV" ? MAREV_DECIMALS : USDC_DECIMALS;
    const normalizedAmountFrom = decimalInputToString(amountFrom, decimalsFrom);
    if (!normalizedAmountFrom) {
      setStatus("Invalid amount", "warn");
      return;
    }

    const amountInWei = ethers.parseUnits(normalizedAmountFrom, decimalsFrom);
    const quotedAmountOut = parseFloat(amountToInput.value);
    if (!Number.isFinite(quotedAmountOut) || quotedAmountOut <= 0) {
      setStatus("No valid quote yet. Refresh the quote before swapping.", "warn");
      return;
    }

    const tokenContract = getReadTokenContract(getTokenMeta(tokenFrom).address);
    const allowance = await tokenContract.allowance(signerAddress, contractAddresses.dex);
    if (allowance < amountInWei) {
      setStatus(`Approve ${tokenFrom} before swapping`, "warn");
      await updateAllowanceStatus();
      return;
    }

    const minAmountOutText = decimalInputToString(
      quotedAmountOut * 0.995,
      tokenTo === "MAREV" ? MAREV_DECIMALS : USDC_DECIMALS
    );
    if (!minAmountOutText) {
      setStatus("Quote is too small to swap with current liquidity.", "warn");
      return;
    }

    const minAmountOut = ethers.parseUnits(
      minAmountOutText,
      tokenTo === "MAREV" ? MAREV_DECIMALS : USDC_DECIMALS
    );

    const dexContract = new ethers.Contract(contractAddresses.dex, DEX_ABI, signer);
    setStatus("Confirm in MetaMask...", "ok");
    const tx =
      tokenFrom === "MAREV"
        ? await dexContract.swapMARtoUSDC(amountInWei, minAmountOut)
        : await dexContract.swapUSDCtoMAR(amountInWei, minAmountOut);

    setStatus("Transaction sent. Waiting for confirmation...", "ok");
    await tx.wait();
    setStatus("Swap complete!", "ok");
    amountFromInput.value = "";
    amountToInput.value = "";
    await refreshData();
  } catch (error) {
    console.error("Swap error:", error);
    if (error?.code === 4001) {
      setStatus("Transaction rejected in MetaMask", "warn");
      return;
    }
    if (error?.code === -32002) {
      setStatus("MetaMask already has a pending request open", "warn");
      return;
    }
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
  const data = {
    network: "base",
    marevToken: contractAddresses.marev,
    dex: contractAddresses.dex,
    usdc: contractAddresses.usdc,
    factory: factoryDeployment.factory,
    listingManager: factoryDeployment.listingManager,
    dexRouter: factoryDeployment.dexRouter,
    dexFactory: factoryDeployment.dexFactory,
    deploymentTime: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "marev-base-token-hub.json";
  link.click();
  URL.revokeObjectURL(url);
}

function setActiveAccount(address) {
  activeAccount = ethers.getAddress(address);
  accountEl.textContent = activeAccount;
  manualAccountInput.value = activeAccount;
}

function getImportedTokens() {
  try {
    const raw = localStorage.getItem(IMPORT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveImportedTokens(tokens) {
  localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(tokens));
}

function rememberImportedToken(address) {
  const normalized = ethers.getAddress(address);
  const next = [normalized, ...getImportedTokens().filter((item) => item !== normalized)].slice(0, 12);
  saveImportedTokens(next);
}

async function getPairSummary(tokenAddress, tokenDecimals) {
  try {
    const pairFactory = new ethers.Contract(factoryDeployment.dexFactory, V2_FACTORY_ABI, readProvider);
    const pairAddress = await pairFactory.getPair(tokenAddress, factoryDeployment.baseToken);
    if (!pairAddress || pairAddress === ZERO_ADDRESS) {
      return { pairAddress: ZERO_ADDRESS, reserveToken: 0, reserveBase: 0, reserveTokenRaw: 0n, reserveBaseRaw: 0n };
    }

    const pair = new ethers.Contract(pairAddress, PAIR_ABI, readProvider);
    const [reserves, token0] = await Promise.all([pair.getReserves(), pair.token0()]);
    const tokenIs0 = token0.toLowerCase() === tokenAddress.toLowerCase();

    return {
      pairAddress,
      reserveToken: tokenIs0
        ? formatUnitsSafe(reserves[0], tokenDecimals)
        : formatUnitsSafe(reserves[1], tokenDecimals),
      reserveBase: tokenIs0 ? formatUnitsSafe(reserves[1], USDC_DECIMALS) : formatUnitsSafe(reserves[0], USDC_DECIMALS),
      reserveTokenRaw: tokenIs0 ? reserves[0] : reserves[1],
      reserveBaseRaw: tokenIs0 ? reserves[1] : reserves[0],
    };
  } catch (error) {
    console.error("Pair summary error", tokenAddress, error);
    return { pairAddress: ZERO_ADDRESS, reserveToken: 0, reserveBase: 0, reserveTokenRaw: 0n, reserveBaseRaw: 0n };
  }
}

async function loadFeaturedFireCoin() {
  try {
    fireCoinAddressEl.textContent = FIRE_COIN_ADDRESS;
    const token = getReadTokenContract(FIRE_COIN_ADDRESS);
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      token.name().catch(() => FIRE_COIN_FALLBACK_NAME),
      token.symbol().catch(() => "FIRE"),
      token.decimals().catch(() => 18),
      token.totalSupply().catch(() => 0n),
    ]);

    const tokenDecimals = Number(decimals);
    const pairSummary = await getPairSummary(FIRE_COIN_ADDRESS, tokenDecimals);
    fireCoinMarket = {
      address: FIRE_COIN_ADDRESS,
      name,
      symbol,
      decimals: tokenDecimals,
      totalSupply,
      pairSummary,
    };

    fireCoinTitleEl.textContent = `${name} (${symbol})`;
    fireCoinUsdcLiquidityEl.textContent =
      pairSummary.pairAddress !== ZERO_ADDRESS
        ? `${formatDisplayAmount(pairSummary.reserveBase, USDC_DECIMALS)} USDC`
        : "No USDC pair found";
    fireCoinTokenLiquidityEl.textContent =
      pairSummary.pairAddress !== ZERO_ADDRESS
        ? `${formatDisplayAmount(pairSummary.reserveToken, tokenDecimals)} ${symbol}`
        : "-";

    if (pairSummary.pairAddress === ZERO_ADDRESS) {
      fireCoinStatusEl.textContent = "Fire Coin is loaded, but no USDC pair was found in the configured Base AMM yet.";
    } else {
      fireCoinStatusEl.textContent = `Share mode is active. 1 share = ${formatDisplayAmount(FIRE_COIN_SHARE_PRICE_USDC, USDC_DECIMALS)} USDC of ${symbol} at the live market price.`;
    }

    thirdwebWidgetStatusEl.textContent = "thirdweb swap widget will default to Base USDC -> Fire Coin and follow the current share estimate.";

    updateFeaturedFireCoinEstimate();
  } catch (error) {
    console.error("Fire Coin load error", error);
    fireCoinTitleEl.textContent = FIRE_COIN_FALLBACK_NAME;
    fireCoinStatusEl.textContent = "Could not load Fire Coin market data right now.";
  }
}

function updateFeaturedFireCoinEstimate() {
  const shareCount = Math.floor(parseFloat(fireCoinShareCountInput?.value || ""));
  fireCoinSharePriceEl.textContent = `${formatDisplayAmount(FIRE_COIN_SHARE_PRICE_USDC, USDC_DECIMALS)} USDC`;

  if (!fireCoinMarket || !Number.isFinite(shareCount) || shareCount <= 0) {
    fireCoinTotalCostEl.textContent = "-";
    fireCoinEstimatedOutEl.textContent = "-";
    emitFireCoinShareUpdate({
      shareCount: 0,
      totalUsdc: 0,
      estimatedFireAmount: "",
      symbol: fireCoinMarket?.symbol || "FIRE",
    });
    return;
  }

  const pairSummary = fireCoinMarket.pairSummary;
  if (!pairSummary || pairSummary.pairAddress === ZERO_ADDRESS) {
    fireCoinTotalCostEl.textContent = `${formatDisplayAmount(shareCount * FIRE_COIN_SHARE_PRICE_USDC, USDC_DECIMALS)} USDC`;
    fireCoinEstimatedOutEl.textContent = "No pool";
    emitFireCoinShareUpdate({
      shareCount,
      totalUsdc: shareCount * FIRE_COIN_SHARE_PRICE_USDC,
      estimatedFireAmount: "",
      symbol: fireCoinMarket.symbol,
    });
    return;
  }

  const totalUsdc = shareCount * FIRE_COIN_SHARE_PRICE_USDC;
  const estimatedOut = estimateConstantProductOut(totalUsdc, pairSummary.reserveBase, pairSummary.reserveToken);
  const estimatedOutText = formatDisplayAmount(estimatedOut, fireCoinMarket.decimals);
  fireCoinTotalCostEl.textContent = `${formatDisplayAmount(totalUsdc, USDC_DECIMALS)} USDC`;
  fireCoinEstimatedOutEl.textContent = `${estimatedOutText} ${fireCoinMarket.symbol}`;
  emitFireCoinShareUpdate({
    shareCount,
    totalUsdc,
    estimatedFireAmount: estimatedOut > 0 ? estimatedOutText : "",
    symbol: fireCoinMarket.symbol,
  });
}

async function importFeaturedFireCoin() {
  await importBaseToken(FIRE_COIN_ADDRESS);
  fireCoinStatusEl.textContent = "Fire Coin was added to the Base token browser below.";
}

function buyFeaturedFireCoin() {
  const shareCount = Math.floor(parseFloat(fireCoinShareCountInput?.value || ""));
  const totalUsdc = Number.isFinite(shareCount) && shareCount > 0 ? shareCount * FIRE_COIN_SHARE_PRICE_USDC : null;
  const amountText = totalUsdc ? `${formatDisplayAmount(totalUsdc, USDC_DECIMALS)} USDC` : "the share value you selected";
  copyAddress(FIRE_COIN_ADDRESS);
  openTrade(FIRE_COIN_ADDRESS);
  fireCoinStatusEl.textContent = `Copied the Fire Coin contract address. ${Number.isFinite(shareCount) && shareCount > 0 ? `${shareCount} share${shareCount === 1 ? "" : "s"} = ${amountText}.` : "Share value is ready."} Buyers can now use that amount in the Base swap to receive the matching Fire Coin quantity.`;
}

async function startCoinbaseOnramp() {
  try {
    if (appIntegrations.coinbaseOnrampEnabled === false) {
      fireCoinStatusEl.textContent = "Coinbase Onramp is disabled in integrations.js.";
      return;
    }

    const destinationAddress = activeAccount || signerAddress;
    if (!destinationAddress) {
      fireCoinStatusEl.textContent = "Connect a wallet first so Coinbase knows where to send your Base USDC.";
      return;
    }

    const shareCount = Math.floor(parseFloat(fireCoinShareCountInput?.value || ""));
    if (!Number.isFinite(shareCount) || shareCount <= 0) {
      fireCoinStatusEl.textContent = "Enter a share count first.";
      return;
    }

    const totalUsdc = shareCount * FIRE_COIN_SHARE_PRICE_USDC;
    fireCoinStatusEl.textContent = "Creating Coinbase onramp session...";

    const response = await fetch("/api/coinbase-onramp-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        destinationAddress,
        paymentAmount: totalUsdc.toFixed(2),
        shareCount,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.onrampUrl) {
      throw new Error(payload.error || "Could not create Coinbase onramp session");
    }

    fireCoinStatusEl.textContent = `Coinbase Onramp ready. ${shareCount} share${shareCount === 1 ? "" : "s"} = ${formatDisplayAmount(totalUsdc, USDC_DECIMALS)} USDC on Base.`;
    window.open(payload.onrampUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error("Coinbase onramp error", error);
    fireCoinStatusEl.textContent = error.message || "Coinbase onramp is unavailable right now.";
  }
}

function renderTokenCard(options) {
  const {
    title,
    subtitle,
    badgeText,
    badgeClass,
    lines,
    tokenAddress,
    pairAddress,
    browseLabel = "Trade on Base",
  } = options;

  const card = document.createElement("div");
  card.className = "token-card";
  const linesHtml = lines.map((line) => `<p>${line}</p>`).join("");
  card.innerHTML = `
    <h3>${title}</h3>
    <p>${subtitle}</p>
    <span class="token-badge ${badgeClass}">${badgeText}</span>
    ${linesHtml}
    <div class="token-card-actions">
      <button class="btn-secondary" data-copy>Copy Address</button>
      <a class="btn-secondary" href="https://basescan.org/address/${tokenAddress}" target="_blank" rel="noopener noreferrer">BaseScan</a>
      <button class="btn-secondary" data-trade>${browseLabel}</button>
      ${pairAddress && pairAddress !== ZERO_ADDRESS ? `<a class="btn-secondary" href="https://basescan.org/address/${pairAddress}" target="_blank" rel="noopener noreferrer">Pair</a>` : ""}
    </div>
  `;

  card.querySelector("[data-copy]").addEventListener("click", () => copyAddress(tokenAddress));
  card.querySelector("[data-trade]").addEventListener("click", () => openTrade(tokenAddress));
  return card;
}

function renderMarketCard(pair) {
  const baseToken = pair.baseToken || {};
  const quoteToken = pair.quoteToken || {};
  const liquidityUsd = Number(pair.liquidity?.usd || 0);
  const priceUsd = pair.priceUsd ? Number(pair.priceUsd) : null;
  const priceText = priceUsd && Number.isFinite(priceUsd)
    ? `$${priceUsd.toLocaleString("en-US", { maximumFractionDigits: 8 })}`
    : "-";

  const card = document.createElement("div");
  card.className = "token-card";
  card.innerHTML = `
    <h3>${escapeHtml(baseToken.name || baseToken.symbol || "Base Token")} (${escapeHtml(baseToken.symbol || "?")})</h3>
    <p>Live Base market pair on ${escapeHtml(pair.dexId || "dex")}.</p>
    <span class="token-badge external">Base Market Feed</span>
    <p>Pair: ${escapeHtml(baseToken.symbol || "?")} / ${escapeHtml(quoteToken.symbol || "?")}</p>
    <p>Price: ${priceText}</p>
    <p>Liquidity: ${formatUsdLike(liquidityUsd)}</p>
    <p>Pair Address: ${shortAddress(pair.pairAddress || ZERO_ADDRESS)}</p>
    <div class="token-card-actions">
      <button class="btn-secondary" data-copy>Copy Token</button>
      <button class="btn-secondary" data-import>Import Token</button>
      <a class="btn-secondary" href="${pair.url}" target="_blank" rel="noopener noreferrer">Open Market</a>
      <a class="btn-secondary" href="https://basescan.org/address/${baseToken.address}" target="_blank" rel="noopener noreferrer">BaseScan</a>
    </div>
  `;

  card.querySelector("[data-copy]").addEventListener("click", () => copyAddress(baseToken.address));
  card.querySelector("[data-import]").addEventListener("click", async () => {
    rememberImportedToken(baseToken.address);
    await renderImportedBaseTokens();
    baseTokenStatusEl.textContent = `Imported ${escapeHtml(baseToken.symbol || shortAddress(baseToken.address))} into the Base token browser.`;
  });
  return card;
}

async function loadFactoryTokens() {
  try {
    const factory = new ethers.Contract(factoryDeployment.factory, FACTORY_ABI, readProvider);
    const total = Number(await factory.getTotalTokens());
    if (!total) {
      factoryTokensEl.innerHTML = `<div class="empty-state">No factory tokens found yet.</div>`;
      return;
    }

    factoryTokensEl.innerHTML = "";
    const start = Math.max(0, total - 12);
    for (let i = total - 1; i >= start; i -= 1) {
      const tokenAddress = await factory.allTokens(i);
      const [tokenInfo, listingInfo, tokenContract] = await Promise.all([
        factory.getTokenInfo(tokenAddress),
        factory.getListingInfo(tokenAddress),
        Promise.resolve(getReadTokenContract(tokenAddress)),
      ]);

      const [decimals, totalSupply] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.totalSupply(),
      ]);

      const isListed = listingInfo[0];
      const pairAddress = listingInfo[2];
      const tokenDecimals = Number(decimals);
      const pairSummary = isListed ? await getPairSummary(tokenAddress, tokenDecimals) : null;

      const card = renderTokenCard({
        title: `${tokenInfo[0]} (${tokenInfo[1]})`,
        subtitle: isListed ? "Live factory-listed Base token." : "Created through your factory, not listed yet.",
        badgeText: isListed ? "Official Listed Token" : "Created But Not Listed",
        badgeClass: isListed ? "live" : "pending",
        tokenAddress,
        pairAddress,
        lines: [
          `Supply: ${formatDisplayAmount(formatUnitsSafe(totalSupply, tokenDecimals), tokenDecimals)}`,
          `Creator: ${shortAddress(tokenInfo[2])}`,
          isListed
            ? `Pool: ${formatDisplayAmount(pairSummary.reserveToken, tokenDecimals)} token / ${formatDisplayAmount(pairSummary.reserveBase, USDC_DECIMALS)} USDC`
            : "List this token from the factory page to make it tradeable.",
        ],
      });

      factoryTokensEl.appendChild(card);
    }
  } catch (error) {
    console.error("Factory token load error", error);
    factoryTokensEl.innerHTML = `<div class="empty-state">Could not load factory tokens right now.</div>`;
  }
}

async function loadBaseTokenCard(tokenAddress) {
  const address = ethers.getAddress(tokenAddress);
  const token = getReadTokenContract(address);
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
  ]);

  const tokenDecimals = Number(decimals);
  const pairSummary =
    address.toLowerCase() === factoryDeployment.baseToken.toLowerCase()
      ? { pairAddress: ZERO_ADDRESS, reserveToken: 0, reserveBase: 0 }
      : await getPairSummary(address, tokenDecimals);

  return renderTokenCard({
    title: `${name} (${symbol})`,
    subtitle: "Imported from the broader Base token market.",
    badgeText: "Base Token Browser",
    badgeClass: "external",
    tokenAddress: address,
    pairAddress: pairSummary.pairAddress,
    browseLabel: "Open Base Market",
    lines: [
      `Decimals: ${decimals}`,
      `Supply: ${formatDisplayAmount(formatUnitsSafe(totalSupply, tokenDecimals), tokenDecimals)}`,
      pairSummary.pairAddress !== ZERO_ADDRESS
        ? `Detected USDC pair: ${formatDisplayAmount(pairSummary.reserveBase, USDC_DECIMALS)} USDC liquidity`
        : "No USDC pair detected from the configured Base AMM yet.",
    ],
  });
}

async function renderImportedBaseTokens() {
  const imported = getImportedTokens();
  if (!imported.length) {
    baseTokenListEl.innerHTML = `<div class="empty-state">Imported Base tokens will appear here.</div>`;
    return;
  }

  baseTokenListEl.innerHTML = "";
  for (const address of imported) {
    try {
      const card = await loadBaseTokenCard(address);
      baseTokenListEl.appendChild(card);
    } catch (error) {
      console.error("Token import render error", address, error);
    }
  }
}

async function importBaseToken(addressInput) {
  try {
    const address = ethers.getAddress(addressInput.trim());
    baseTokenStatusEl.textContent = "Importing token...";
    rememberImportedToken(address);
    await renderImportedBaseTokens();
    baseTokenStatusEl.textContent = `Imported ${shortAddress(address)} into the Base token browser.`;
    baseTokenAddressInput.value = "";
  } catch (error) {
    console.error("Import error", error);
    baseTokenStatusEl.textContent = "Enter a valid Base token address.";
  }
}

async function loadBaseMarketFeed() {
  try {
    baseMarketStatusEl.textContent = "Loading live Base market feed...";
    const response = await fetch(DEXSCREENER_PROFILES_URL);
    if (!response.ok) {
      throw new Error(`DexScreener feed returned ${response.status}`);
    }

    const data = await response.json();
    const baseEntries = (Array.isArray(data) ? data : [])
      .filter((entry) => String(entry.chainId || "").toLowerCase() === "base")
      .slice(0, 12);

    if (!baseEntries.length) {
      baseMarketFeedEl.innerHTML = `<div class="empty-state">No live Base market entries were returned right now.</div>`;
      baseMarketStatusEl.textContent = "No Base entries found in the public market feed.";
      return;
    }

    baseMarketFeedEl.innerHTML = "";
    for (const entry of baseEntries) {
      baseMarketFeedEl.appendChild(
        renderTokenCard({
          title: `${entry.tokenName || entry.header || "Base Token"} (${entry.tokenSymbol || "?"})`,
          subtitle: "Live token profile from the broader Base market feed.",
          badgeText: "Base Market Feed",
          badgeClass: "external",
          tokenAddress: entry.tokenAddress,
          pairAddress: ZERO_ADDRESS,
          browseLabel: "Trade on Base",
          lines: [
            `Token: ${shortAddress(entry.tokenAddress)}`,
            entry.description ? entry.description.slice(0, 110) : "Use Import Token to pin this token into your local browser.",
          ],
        })
      );
    }

    baseMarketStatusEl.textContent = "Showing live Base token profiles from the public market feed.";
  } catch (error) {
    console.error("Base market feed error", error);
    baseMarketFeedEl.innerHTML = `<div class="empty-state">Could not load the broader Base market feed right now.</div>`;
    baseMarketStatusEl.textContent = "Public Base market feed unavailable right now.";
  }
}

async function searchBaseMarket(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    await loadBaseMarketFeed();
    return;
  }

  try {
    baseMarketStatusEl.textContent = `Searching Base market for "${trimmed}"...`;
    const response = await fetch(`${DEXSCREENER_SEARCH_URL}${encodeURIComponent(trimmed)}`);
    if (!response.ok) {
      throw new Error(`DexScreener search returned ${response.status}`);
    }

    const data = await response.json();
    const pairs = (data.pairs || [])
      .filter((pair) => String(pair.chainId || "").toLowerCase() === "base")
      .slice(0, 12);

    if (!pairs.length) {
      baseMarketFeedEl.innerHTML = `<div class="empty-state">No Base pairs matched that search.</div>`;
      baseMarketStatusEl.textContent = `No Base market pairs matched "${trimmed}".`;
      return;
    }

    baseMarketFeedEl.innerHTML = "";
    for (const pair of pairs) {
      baseMarketFeedEl.appendChild(renderMarketCard(pair));
    }
    baseMarketStatusEl.textContent = `Showing ${pairs.length} Base market matches for "${trimmed}".`;
  } catch (error) {
    console.error("Base market search error", error);
    baseMarketFeedEl.innerHTML = `<div class="empty-state">Search failed. Try another Base token, symbol, or address.</div>`;
    baseMarketStatusEl.textContent = "Base market search is unavailable right now.";
  }
}

async function fetchBestBasePair(tokenAddress) {
  try {
    const response = await fetch(`${DEXSCREENER_TOKEN_URL}${tokenAddress}`);
    if (!response.ok) return null;
    const data = await response.json();
    const basePairs = (data.pairs || [])
      .filter((p) => String(p.chainId || "").toLowerCase() === "base")
      .sort((a, b) => Number(b.liquidity?.usd || 0) - Number(a.liquidity?.usd || 0));
    return basePairs[0] || null;
  } catch {
    return null;
  }
}

async function fetchGeckoTerminalToken(tokenAddress) {
  try {
    const response = await fetch(`${GECKOTERMINAL_TOKEN_URL}${tokenAddress}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.data?.attributes || null;
  } catch {
    return null;
  }
}

function renderLivePriceCard({ name, symbol, address, priceUsd, volume24h, liquidity, change24h, source, dexName, pairUrl }) {
  const priceText = priceUsd != null
    ? `$${Number(priceUsd).toLocaleString("en-US", { maximumSignificantDigits: 6 })}`
    : "No price data";
  const volText = volume24h != null ? formatUsdLike(Number(volume24h)) : "-";
  const liqText = liquidity != null ? formatUsdLike(Number(liquidity)) : "-";
  const changeNum = Number(change24h);
  const changeText = change24h != null ? `${changeNum >= 0 ? "+" : ""}${changeNum.toFixed(2)}%` : "-";
  const changeColor = changeNum >= 0 ? "#238636" : "#da3633";

  const card = document.createElement("div");
  card.className = "token-card";
  card.innerHTML = `
    <h3>${escapeHtml(name)} (${escapeHtml(symbol)})</h3>
    <p>Via ${escapeHtml(source)}${dexName ? ` · ${escapeHtml(dexName)}` : ""}.</p>
    <span class="token-badge live">Live Price</span>
    <p>Price: <strong>${priceText}</strong></p>
    <p>24h Change: <span style="color:${changeColor}">${changeText}</span></p>
    <p>24h Volume: ${volText}</p>
    <p>Liquidity: ${liqText}</p>
    <div class="token-card-actions">
      <button class="btn-secondary" data-copy>Copy Address</button>
      <a class="btn-secondary" href="https://basescan.org/address/${address}" target="_blank" rel="noopener noreferrer">BaseScan</a>
      ${pairUrl ? `<a class="btn-secondary" href="${pairUrl}" target="_blank" rel="noopener noreferrer">View Pair</a>` : ""}
      <a class="btn-secondary" href="https://dexscreener.com/base/${address}" target="_blank" rel="noopener noreferrer">DexScreener</a>
    </div>
  `;
  card.querySelector("[data-copy]").addEventListener("click", () => copyAddress(address));
  return card;
}

function renderNotTrackedCard(name, symbol, address) {
  const card = document.createElement("div");
  card.className = "token-card";
  card.innerHTML = `
    <h3>${escapeHtml(name)} (${escapeHtml(symbol)})</h3>
    <p>No tracked DEX pairs found on Base yet.</p>
    <span class="token-badge pending">Not Yet Tracked</span>
    <p>Price: —</p>
    <p>To get a live price: add liquidity on PancakeSwap, Aerodrome, or Uniswap V3 on Base. DexScreener and GeckoTerminal will index it automatically.</p>
    <div class="token-card-actions">
      <button class="btn-secondary" data-copy>Copy Address</button>
      <a class="btn-secondary" href="https://basescan.org/address/${address}" target="_blank" rel="noopener noreferrer">BaseScan</a>
      <a class="btn-secondary" href="https://dexscreener.com/base/${address}" target="_blank" rel="noopener noreferrer">DexScreener</a>
      <a class="btn-secondary" href="https://www.geckoterminal.com/base/tokens/${address}" target="_blank" rel="noopener noreferrer">GeckoTerminal</a>
    </div>
  `;
  card.querySelector("[data-copy]").addEventListener("click", () => copyAddress(address));
  return card;
}

async function loadLivePriceCard(address, nameFallback, symbolFallback) {
  const pair = await fetchBestBasePair(address);
  if (pair) {
    return renderLivePriceCard({
      name: pair.baseToken?.name || nameFallback,
      symbol: pair.baseToken?.symbol || symbolFallback,
      address,
      priceUsd: pair.priceUsd,
      volume24h: pair.volume?.h24,
      liquidity: pair.liquidity?.usd,
      change24h: pair.priceChange?.h24,
      source: "DexScreener",
      dexName: pair.dexId,
      pairUrl: pair.url,
    });
  }

  const gecko = await fetchGeckoTerminalToken(address);
  if (gecko && gecko.price_usd) {
    return renderLivePriceCard({
      name: gecko.name || nameFallback,
      symbol: gecko.symbol || symbolFallback,
      address,
      priceUsd: gecko.price_usd,
      volume24h: gecko.volume_usd?.h24,
      liquidity: null,
      change24h: gecko.price_change_percentage?.h24,
      source: "GeckoTerminal",
      dexName: null,
      pairUrl: null,
    });
  }

  return renderNotTrackedCard(nameFallback, symbolFallback, address);
}

const tokenDecimalsCache = new Map();

async function getTokenDecimalsCached(address) {
  if (!address || address === ZEROEX_NATIVE_ADDRESS) return 18;
  const key = address.toLowerCase();
  if (tokenDecimalsCache.has(key)) return tokenDecimalsCache.get(key);
  try {
    const decimals = Number(await getReadTokenContract(address).decimals());
    tokenDecimalsCache.set(key, decimals);
    return decimals;
  } catch {
    return 18;
  }
}

async function getTokenSymbolSafe(address) {
  if (!address || address === ZEROEX_NATIVE_ADDRESS) return "ETH";
  try {
    return await getReadTokenContract(address).symbol();
  } catch {
    return shortAddress(address);
  }
}

function resolveUniToken(selectEl, customEl) {
  const value = selectEl.value;
  if (value === "custom") {
    const custom = customEl.value.trim();
    return custom || "";
  }
  if (value === "ETH") return ZEROEX_NATIVE_ADDRESS;
  return value;
}

function isNativeEth(address) {
  return address && address.toLowerCase() === ZEROEX_NATIVE_ADDRESS.toLowerCase();
}

function setUniStatus(text, cls) {
  if (!uniStatusEl) return;
  uniStatusEl.textContent = text || "";
  uniStatusEl.style.color = cls === "warn" ? "#da3633" : cls === "ok" ? "#56d364" : "#8b949e";
}

function summarizeRoute(quote) {
  const fills = quote?.route?.fills;
  if (!Array.isArray(fills) || !fills.length) return "Direct";
  const sources = [...new Set(fills.map((f) => f.source).filter(Boolean))];
  return sources.length > 2 ? `${sources.slice(0, 2).join(", ")} +${sources.length - 2}` : sources.join(", ") || "Direct";
}

let uniLastQuote = null;
let uniQuoteSeq = 0;
let uniQuoteTimer = null;

async function refreshUniQuote() {
  uniLastQuote = null;
  uniSwapBtn.disabled = true;
  uniBuyAmount.value = "";
  uniRouteEl.textContent = "-";
  uniGasEl.textContent = "-";
  uniMinReceiveEl.textContent = "-";

  const sellAddress = resolveUniToken(uniSellSelect, uniSellCustom);
  const buyAddress = resolveUniToken(uniBuySelect, uniBuyCustom);
  const sellAmountRaw = parseFloat(uniSellAmount.value);

  if (!sellAddress || !buyAddress) {
    setUniStatus("Pick both sell and buy tokens.", "warn");
    return;
  }
  if (sellAddress.toLowerCase() === buyAddress.toLowerCase()) {
    setUniStatus("Sell and buy tokens must be different.", "warn");
    return;
  }
  if (!Number.isFinite(sellAmountRaw) || sellAmountRaw <= 0) {
    setUniStatus("Enter the amount you want to sell.", "");
    return;
  }

  const sellDecimals = await getTokenDecimalsCached(sellAddress);
  const buyDecimals = await getTokenDecimalsCached(buyAddress);
  const normalized = decimalInputToString(sellAmountRaw, sellDecimals);
  if (!normalized) {
    setUniStatus("Sell amount is invalid for that token's decimals.", "warn");
    return;
  }

  let sellAmountWei;
  try {
    sellAmountWei = ethers.parseUnits(normalized, sellDecimals);
  } catch {
    setUniStatus("Could not parse the sell amount.", "warn");
    return;
  }

  const slippagePct = Math.max(0.1, Math.min(50, parseFloat(uniSlippageInput.value) || 1));
  const slippageBps = Math.round(slippagePct * 100);

  const params = new URLSearchParams({
    chainId: "8453",
    sellToken: sellAddress,
    buyToken: buyAddress,
    sellAmount: sellAmountWei.toString(),
    slippageBps: String(slippageBps),
  });
  if (signerAddress) {
    params.set("taker", signerAddress);
    params.set("kind", "quote");
  } else {
    params.set("kind", "price");
  }

  const seq = ++uniQuoteSeq;
  setUniStatus(signerAddress ? "Fetching best route from 0x..." : "Showing indicative price (connect wallet for firm quote)...", "");

  let response;
  try {
    response = await fetch(`${ZEROEX_QUOTE_ENDPOINT}?${params.toString()}`);
  } catch (error) {
    if (seq !== uniQuoteSeq) return;
    setUniStatus(error.message || "Quote request failed.", "warn");
    return;
  }
  if (seq !== uniQuoteSeq) return;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    setUniStatus(payload.message || payload.error || `Quote failed (${response.status})`, "warn");
    return;
  }

  if (payload.liquidityAvailable === false) {
    uniLastQuote = null;
    uniBuyAmount.value = "";
    uniMinReceiveEl.textContent = "-";
    uniRouteEl.textContent = "No route";
    uniGasEl.textContent = "-";
    uniAllowanceEl.textContent = "-";
    uniApproveBtn.disabled = true;
    uniSwapBtn.disabled = true;
    setUniStatus("No route found. This token pair isn't tradeable on any DEX 0x indexes (Uniswap, Aerodrome, PancakeSwap, BaseSwap, etc.). For MAREV specifically, use the MAREV Pool card below.", "warn");
    return;
  }

  uniLastQuote = { ...payload, sellAddress, buyAddress, sellDecimals, buyDecimals, sellAmountWei };

  const buyAmount = BigInt(payload.buyAmount || "0");
  const minBuyAmount = BigInt(payload.minBuyAmount || payload.buyAmount || "0");
  uniBuyAmount.value = formatDisplayAmount(parseFloat(ethers.formatUnits(buyAmount, buyDecimals)), buyDecimals);
  uniMinReceiveEl.textContent = `${formatDisplayAmount(parseFloat(ethers.formatUnits(minBuyAmount, buyDecimals)), buyDecimals)}`;
  uniRouteEl.textContent = summarizeRoute(payload);
  uniGasEl.textContent = payload?.transaction?.gas ? Number(payload.transaction.gas).toLocaleString("en-US") : "-";

  await refreshUniAllowance();
  if (payload?.transaction?.to) {
    setUniStatus("Quote ready. Approve the sell token if needed, then Swap.", "ok");
    uniSwapBtn.disabled = false;
  } else {
    setUniStatus("Indicative price loaded. Connect wallet to enable Swap.", "");
    uniSwapBtn.disabled = true;
  }
}

async function refreshUniAllowance() {
  if (!uniLastQuote) {
    uniAllowanceEl.textContent = "-";
    uniApproveBtn.disabled = true;
    uniApproveBtn.textContent = "Approve Token";
    return;
  }
  if (isNativeEth(uniLastQuote.sellAddress)) {
    uniAllowanceEl.textContent = "Native ETH (no approval needed)";
    uniApproveBtn.disabled = true;
    uniApproveBtn.textContent = "No Approval Needed";
    return;
  }
  const spender = uniLastQuote?.issues?.allowance?.spender || uniLastQuote?.transaction?.to;
  if (!signerAddress || !spender) {
    uniAllowanceEl.textContent = signerAddress ? "-" : "Connect wallet";
    uniApproveBtn.disabled = true;
    return;
  }
  try {
    const token = getReadTokenContract(uniLastQuote.sellAddress);
    const allowance = await token.allowance(signerAddress, spender);
    const symbol = await getTokenSymbolSafe(uniLastQuote.sellAddress);
    uniAllowanceEl.textContent = `${formatDisplayAmount(parseFloat(ethers.formatUnits(allowance, uniLastQuote.sellDecimals)), uniLastQuote.sellDecimals)} ${symbol}`;
    const enough = allowance >= uniLastQuote.sellAmountWei;
    uniApproveBtn.disabled = enough;
    uniApproveBtn.textContent = enough ? `${symbol} Approved` : `Approve ${symbol}`;
  } catch (error) {
    console.error("uni allowance error", error);
    uniAllowanceEl.textContent = "Error";
    uniApproveBtn.disabled = true;
  }
}

async function approveUniSell() {
  if (!signer || !signerAddress) {
    setUniStatus("Connect wallet first.", "warn");
    return;
  }
  if (!uniLastQuote) {
    setUniStatus("Get a quote first.", "warn");
    return;
  }
  if (isNativeEth(uniLastQuote.sellAddress)) return;

  const spender = uniLastQuote?.issues?.allowance?.spender || uniLastQuote?.transaction?.to;
  if (!spender) {
    setUniStatus("Quote did not include an allowance spender.", "warn");
    return;
  }

  try {
    const symbol = await getTokenSymbolSafe(uniLastQuote.sellAddress);
    const token = getRunnerTokenContract(uniLastQuote.sellAddress, signer);
    setUniStatus(`Approving ${symbol}...`, "");
    const tx = await token.approve(spender, ethers.MaxUint256);
    await tx.wait();
    setUniStatus(`${symbol} approved.`, "ok");
    await refreshUniAllowance();
  } catch (error) {
    console.error("uni approve error", error);
    if (error?.code === 4001) {
      setUniStatus("Approval rejected in MetaMask.", "warn");
      return;
    }
    setUniStatus(error.message || "Approval failed.", "warn");
  }
}

async function executeUniSwap() {
  if (!signer || !signerAddress) {
    setUniStatus("Connect wallet first.", "warn");
    return;
  }
  if (!uniLastQuote?.transaction?.to || !uniLastQuote?.transaction?.data) {
    setUniStatus("Refresh the quote before swapping.", "warn");
    return;
  }

  try {
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== 8453) {
      setUniStatus("Switch MetaMask to Base mainnet.", "warn");
      return;
    }

    const tx = uniLastQuote.transaction;
    setUniStatus("Confirm the swap in MetaMask...", "");
    const sent = await signer.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value ? BigInt(tx.value) : 0n,
      gasLimit: tx.gas ? BigInt(tx.gas) : undefined,
    });
    setUniStatus(`Swap submitted: ${sent.hash}. Waiting for confirmation...`, "");
    await sent.wait();
    setUniStatus(`Swap confirmed in tx ${sent.hash}.`, "ok");
    uniSellAmount.value = "";
    uniBuyAmount.value = "";
    uniLastQuote = null;
    await Promise.all([refreshUniBalances(), refreshUniAllowance()]);
  } catch (error) {
    console.error("uni swap error", error);
    if (error?.code === 4001 || error?.code === "ACTION_REJECTED") {
      setUniStatus("Swap rejected in MetaMask.", "warn");
      return;
    }
    setUniStatus(error.shortMessage || error.message || "Swap failed.", "warn");
  }
}

async function refreshUniBalances() {
  if (!activeAccount) {
    uniSellBalance.textContent = "-";
    uniBuyBalance.textContent = "-";
    return;
  }
  const sellAddress = resolveUniToken(uniSellSelect, uniSellCustom);
  const buyAddress = resolveUniToken(uniBuySelect, uniBuyCustom);
  await Promise.all([
    populateUniBalance(sellAddress, uniSellBalance),
    populateUniBalance(buyAddress, uniBuyBalance),
  ]);
}

async function populateUniBalance(address, el) {
  if (!address || !activeAccount) {
    el.textContent = "-";
    return;
  }
  try {
    if (isNativeEth(address)) {
      const balance = await readProvider.getBalance(activeAccount);
      el.textContent = `${formatDisplayAmount(parseFloat(ethers.formatEther(balance)), 18)} ETH`;
      return;
    }
    const decimals = await getTokenDecimalsCached(address);
    const symbol = await getTokenSymbolSafe(address);
    const raw = await getReadTokenContract(address).balanceOf(activeAccount);
    el.textContent = `${formatDisplayAmount(parseFloat(ethers.formatUnits(raw, decimals)), decimals)} ${symbol}`;
  } catch {
    el.textContent = "-";
  }
}

function scheduleUniQuote() {
  if (uniQuoteTimer) clearTimeout(uniQuoteTimer);
  uniQuoteTimer = setTimeout(refreshUniQuote, 350);
}

function flipUniSwap() {
  const sellSelected = uniSellSelect.value;
  const sellCustom = uniSellCustom.value;
  uniSellSelect.value = uniBuySelect.value;
  uniSellCustom.value = uniBuyCustom.value;
  uniBuySelect.value = sellSelected;
  uniBuyCustom.value = sellCustom;
  uniSellCustom.style.display = uniSellSelect.value === "custom" ? "" : "none";
  uniBuyCustom.style.display = uniBuySelect.value === "custom" ? "" : "none";
  uniSellAmount.value = uniBuyAmount.value;
  refreshUniBalances();
  scheduleUniQuote();
}

function bindUniListeners() {
  if (!uniSellSelect) return;

  const onSelectChange = (selectEl, customEl) => {
    customEl.style.display = selectEl.value === "custom" ? "" : "none";
    refreshUniBalances();
    scheduleUniQuote();
  };

  uniSellSelect.addEventListener("change", () => onSelectChange(uniSellSelect, uniSellCustom));
  uniBuySelect.addEventListener("change", () => onSelectChange(uniBuySelect, uniBuyCustom));
  uniSellCustom.addEventListener("input", () => { refreshUniBalances(); scheduleUniQuote(); });
  uniBuyCustom.addEventListener("input", () => { refreshUniBalances(); scheduleUniQuote(); });
  uniSellAmount.addEventListener("input", scheduleUniQuote);
  uniSlippageInput.addEventListener("input", scheduleUniQuote);
  uniApproveBtn.addEventListener("click", approveUniSell);
  uniSwapBtn.addEventListener("click", executeUniSwap);
  uniFlipBtn.addEventListener("click", flipUniSwap);

  uniSwapBtn.disabled = true;
  uniApproveBtn.disabled = true;
}

async function loadLiveMarketData() {
  const container = document.getElementById("livePricesGrid");
  if (!container) return;

  const marevAddress = contractAddresses.marev !== ZERO_ADDRESS
    ? contractAddresses.marev
    : "0x77F7188853DD13D7CE3E9bfDeb070a9544eCf446";

  const [marevCard, fireCard] = await Promise.all([
    loadLivePriceCard(marevAddress, "MAREV", "MAREV"),
    loadLivePriceCard(FIRE_COIN_ADDRESS, "Fire Coin", "FCOIN"),
  ]);

  container.innerHTML = "";
  container.appendChild(marevCard);
  container.appendChild(fireCard);
}

function initApp() {
  loadDeploymentAddresses()
    .then(async () => {
      await Promise.all([loadFactoryTokens(), renderImportedBaseTokens(), loadBaseMarketFeed(), loadFeaturedFireCoin(), loadLiveMarketData(), refreshData()]);
    })
    .catch((error) => console.error(error));

  connectButton.addEventListener("click", connectWallet);
  useManualAccountButton.addEventListener("click", async () => {
    if (!manualAccountInput.value.trim()) return;
    setActiveAccount(manualAccountInput.value.trim());
    await refreshData();
  });
  clearManualAccountButton.addEventListener("click", async () => {
    activeAccount = signerAddress || null;
    accountEl.textContent = activeAccount || "-";
    manualAccountInput.value = "";
    await refreshData();
  });
  approveButton.addEventListener("click", approveCurrentToken);
  swapButton.addEventListener("click", executeSwap);
  refreshButton.addEventListener("click", async () => {
    await Promise.all([refreshData(), loadFactoryTokens(), renderImportedBaseTokens(), loadBaseMarketFeed(), loadFeaturedFireCoin(), loadLiveMarketData(), refreshUniBalances()]);
  });
  refreshFactoryTokensButton.addEventListener("click", loadFactoryTokens);
  refreshMarketFeedButton.addEventListener("click", loadBaseMarketFeed);
  document.getElementById("refreshLivePrices")?.addEventListener("click", loadLiveMarketData);
  bindUniListeners();
  switchButton.addEventListener("click", switchToMainnet);
  downloadButton.addEventListener("click", downloadDeploymentInfo);
  importBaseTokenButton.addEventListener("click", () => importBaseToken(baseTokenAddressInput.value));
  importFireCoinButton.addEventListener("click", importFeaturedFireCoin);
  copyFireCoinAddressButton.addEventListener("click", () => copyAddress(FIRE_COIN_ADDRESS));
  fundFireCoinWithCoinbaseButton.addEventListener("click", startCoinbaseOnramp);
  buyFireCoinNowButton.addEventListener("click", buyFeaturedFireCoin);
  searchBaseMarketButton.addEventListener("click", () => searchBaseMarket(baseMarketQueryInput.value));
  baseTokenAddressInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      importBaseToken(baseTokenAddressInput.value);
    }
  });
  baseMarketQueryInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchBaseMarket(baseMarketQueryInput.value);
    }
  });

  document.querySelectorAll(".quick-token").forEach((button) => {
    button.addEventListener("click", () => importBaseToken(button.dataset.address));
  });

  document.querySelectorAll(".fire-coin-preset").forEach((button) => {
    button.addEventListener("click", () => {
      fireCoinShareCountInput.value = button.dataset.shares;
      updateFeaturedFireCoinEstimate();
    });
  });

  amountFromInput.addEventListener("input", updatePriceQuote);
  amountFromInput.addEventListener("input", updateAllowanceStatus);
  fireCoinShareCountInput.addEventListener("input", updateFeaturedFireCoinEstimate);
  tokenFromSelect.addEventListener("change", async () => {
    await updatePriceQuote();
    await updateAllowanceStatus();
  });
  tokenToSelect.addEventListener("change", updatePriceQuote);

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", connectWallet);
    window.ethereum.on("chainChanged", refreshData);
  }

  accountEl.textContent = "-";
  if (signerAccountEl) signerAccountEl.textContent = "-";
  setStatus("Ready to connect", "ok");
  emitFireCoinShareUpdate({
    shareCount: 0,
    totalUsdc: 0,
    estimatedFireAmount: "",
    symbol: "FIRE",
    chainId: BASE_CHAIN_NUMERIC_ID,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
