const BASE_RPC_URL = "https://mainnet.base.org";
const BASE_CHAIN_ID_HEX = "0x2105";

const TOKEN_3XB = "0x974F27b8675F8baeb24832E43ECA201e16Bd2b20";
const WETH = "0x4200000000000000000000000000000000000006";

// Uniswap V3 on Base
const UNI_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
const UNI_V3_NFPM    = "0x03a520b32C04BF3bEEf7BF5d27F39E8C3aDC4D9D";

const POOL_ABI = [
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint8, bool)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function fee() view returns (uint24)",
];

const FACTORY_ABI = [
  "function getPool(address,address,uint24) view returns (address)",
];

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function allowance(address,address) view returns (uint256)",
];

const NFPM_ABI = [
  "function mint((address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline)) payable returns (uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)",
];

let provider = null;
let signer = null;
let signerAddress = null;
let ethUsd = null;
let computedTicks = null; // { lower, upper, currentTick, fee, token0First }

const $ = (id) => document.getElementById(id);
const readProvider = new ethers.JsonRpcProvider(BASE_RPC_URL);

function setStatus(text, cls = "") {
  const el = $("status");
  el.textContent = (text || "").toUpperCase();
  el.className = "tag";
  if (cls) el.classList.add(cls);
}

function setLine(id, text, cls = "") {
  const el = $(id);
  el.textContent = text || "";
  el.className = "status-line";
  if (cls) el.classList.add(cls);
}

function fillReadout(id, text) {
  const el = $(id);
  el.textContent = text;
  if (text && text !== "—") el.classList.remove("dim");
  else el.classList.add("dim");
}

async function fetchEthPrice() {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
    if (!r.ok) throw new Error("CoinGecko: " + r.status);
    const d = await r.json();
    ethUsd = d.ethereum?.usd;
    fillReadout("ethPrice", ethUsd ? `$${ethUsd.toLocaleString()}` : "—");
    return ethUsd;
  } catch (e) {
    console.error("ETH price fetch failed", e);
    fillReadout("ethPrice", "—");
    return null;
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    setStatus("No wallet", "warn");
    setLine("auctionStatus", "Install MetaMask, Uniswap Wallet, Rabby, or Coinbase Wallet.", "warn");
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
    if (Number(network.chainId) !== 8453) {
      setStatus("Wrong network", "warn");
      setLine("auctionStatus", "Switch to Base mainnet.", "warn");
      return;
    }
    setStatus("Connected", "ok");
    await refreshTokenBalance();
  } catch (e) {
    setStatus("Failed", "err");
    setLine("auctionStatus", e.message || "Connect failed", "err");
  }
}

async function refreshTokenBalance() {
  if (!signerAddress) return;
  try {
    const t = new ethers.Contract(TOKEN_3XB, ERC20_ABI, readProvider);
    const bal = await t.balanceOf(signerAddress);
    fillReadout("tokenBalance", `${ethers.formatUnits(bal, 18)} 3XB`);
  } catch (e) {
    fillReadout("tokenBalance", "—");
  }
}

// Uniswap V3 tick math: sqrtPriceX96 = sqrt(price) * 2^96
// price = token1/token0 (in raw, decimal-adjusted units)
// tick = log_1.0001(price)
function priceUsdPerTokenToTick(priceUsdPerToken, token0IsWeth, ethUsdPrice) {
  // 3XB has 18 decimals, WETH has 18 decimals
  // raw price (token1/token0) we want depends on which side 3XB is on:
  //   if token0=WETH, token1=3XB: raw price = 3XB/WETH = (1 token of 3XB / price USD per 3XB) * (price USD per ETH / 1 token of ETH)
  //                                            = ethUsdPrice / priceUsdPerToken (since both 18 decimals)
  //   if token0=3XB, token1=WETH: raw price = WETH/3XB = priceUsdPerToken / ethUsdPrice
  let rawPrice;
  if (token0IsWeth) {
    rawPrice = ethUsdPrice / priceUsdPerToken;
  } else {
    rawPrice = priceUsdPerToken / ethUsdPrice;
  }
  // tick = log(rawPrice) / log(1.0001)
  return Math.floor(Math.log(rawPrice) / Math.log(1.0001));
}

function roundDownToSpacing(tick, spacing) {
  return Math.floor(tick / spacing) * spacing;
}
function roundUpToSpacing(tick, spacing) {
  return Math.ceil(tick / spacing) * spacing;
}

async function previewRange() {
  if (!ethUsd) await fetchEthPrice();
  if (!ethUsd) {
    setLine("previewStatus", "Could not fetch ETH price; using $2700 as fallback", "warn");
    ethUsd = 2700;
    fillReadout("ethPrice", `$${ethUsd} (fallback)`);
  }

  const startUsd = parseFloat($("startPrice").value);
  const endUsd = parseFloat($("endPrice").value);
  const fee = parseInt($("feeTier").value, 10);

  if (!(startUsd > 0) || !(endUsd > 0)) {
    setLine("previewStatus", "Start and end prices must be positive numbers.", "warn");
    return;
  }
  if (endUsd >= startUsd) {
    setLine("previewStatus", "End price must be lower than start price (Dutch auction descends).", "warn");
    return;
  }

  // Determine token order
  const token0First = WETH.toLowerCase() < TOKEN_3XB.toLowerCase();
  const tickSpacing = fee === 100 ? 1 : fee === 500 ? 10 : fee === 3000 ? 60 : fee === 10000 ? 200 : 60;

  const tickAtStart = priceUsdPerTokenToTick(startUsd, token0First, ethUsd);
  const tickAtEnd = priceUsdPerTokenToTick(endUsd, token0First, ethUsd);

  // For token0=WETH, lower-tick corresponds to expensive 3XB (start), upper-tick corresponds to cheap 3XB (end)
  let tickLower, tickUpper;
  if (token0First) {
    tickLower = roundDownToSpacing(Math.min(tickAtStart, tickAtEnd), tickSpacing);
    tickUpper = roundUpToSpacing(Math.max(tickAtStart, tickAtEnd), tickSpacing);
  } else {
    // 3XB=token0 case: opposite mapping
    tickLower = roundDownToSpacing(Math.min(tickAtStart, tickAtEnd), tickSpacing);
    tickUpper = roundUpToSpacing(Math.max(tickAtStart, tickAtEnd), tickSpacing);
  }

  // Look up current pool tick
  const factory = new ethers.Contract(UNI_V3_FACTORY, FACTORY_ABI, readProvider);
  const poolAddress = await factory.getPool(WETH, TOKEN_3XB, fee);
  if (!poolAddress || poolAddress === ethers.ZeroAddress) {
    setLine("previewStatus", `No pool exists for fee tier ${fee/10000}%. Create one first or use a different fee tier.`, "warn");
    fillReadout("currentTick", "no pool");
    return;
  }

  const pool = new ethers.Contract(poolAddress, POOL_ABI, readProvider);
  const slot0 = await pool.slot0();
  const currentTick = Number(slot0[1]);

  fillReadout("tickLower", String(tickLower));
  fillReadout("tickUpper", String(tickUpper));
  fillReadout("currentTick", String(currentTick));

  // Determine position composition based on current tick vs range
  let composition;
  if (currentTick < tickLower) {
    composition = token0First ? "100% WETH (no 3XB sold yet)" : "100% 3XB (auction not started)";
  } else if (currentTick > tickUpper) {
    composition = token0First ? "100% 3XB (auction not started)" : "100% WETH (no 3XB sold yet)";
  } else {
    composition = "mixed (auction in progress)";
  }
  fillReadout("positionComposition", composition);

  computedTicks = { lower: tickLower, upper: tickUpper, currentTick, fee, token0First, poolAddress };

  if ((token0First && currentTick > tickUpper) || (!token0First && currentTick < tickLower)) {
    setLine("previewStatus", "Range is below the current pool price. Position will be 100% 3XB and will activate as the pool price moves into your range.", "ok");
  } else if ((token0First && currentTick < tickLower) || (!token0First && currentTick > tickUpper)) {
    setLine("previewStatus", "Range is above the current pool price. Position would require WETH to seed; you'd need to put 3XB in a higher range. Adjust your prices.", "warn");
  } else {
    setLine("previewStatus", "Range straddles the current pool price. Position would need both WETH and 3XB. For a 3XB-only auction, adjust prices so the range is on one side of the spot.", "warn");
  }
}

async function approveToken() {
  if (!signer || !signerAddress) {
    setLine("auctionStatus", "Connect wallet first.", "warn");
    return;
  }
  if (!computedTicks) {
    setLine("auctionStatus", "Click 'Preview Range' first.", "warn");
    return;
  }

  const amountStr = $("amountInput").value;
  if (!amountStr) { setLine("auctionStatus", "Enter an amount.", "warn"); return; }
  const amount = ethers.parseUnits(amountStr, 18);

  const t = new ethers.Contract(TOKEN_3XB, ERC20_ABI, signer);
  setLine("auctionStatus", "Confirm 3XB approval in your wallet...", "");
  try {
    const tx = await t.approve(UNI_V3_NFPM, amount);
    setLine("auctionStatus", `Approval submitted: ${tx.hash}. Waiting...`, "");
    await tx.wait();
    setLine("auctionStatus", "3XB approved. Now click Mint Auction Position.", "ok");
  } catch (e) {
    if (e?.code === 4001 || e?.code === "ACTION_REJECTED") {
      setLine("auctionStatus", "Approval rejected in wallet.", "warn");
    } else {
      setLine("auctionStatus", e.shortMessage || e.message || "Approval failed.", "err");
    }
  }
}

async function mintPosition() {
  if (!signer || !signerAddress) {
    setLine("auctionStatus", "Connect wallet first.", "warn");
    return;
  }
  if (!computedTicks) {
    setLine("auctionStatus", "Click 'Preview Range' first.", "warn");
    return;
  }

  const amountStr = $("amountInput").value;
  const amount = ethers.parseUnits(amountStr, 18);
  const { lower, upper, fee, token0First } = computedTicks;

  const params = {
    token0: token0First ? WETH : TOKEN_3XB,
    token1: token0First ? TOKEN_3XB : WETH,
    fee,
    tickLower: lower,
    tickUpper: upper,
    amount0Desired: token0First ? 0n : amount,
    amount1Desired: token0First ? amount : 0n,
    amount0Min: 0n,
    amount1Min: 0n,
    recipient: signerAddress,
    deadline: Math.floor(Date.now() / 1000) + 20 * 60,
  };

  const nfpm = new ethers.Contract(UNI_V3_NFPM, NFPM_ABI, signer);
  setLine("auctionStatus", "Confirm mint in your wallet...", "");
  try {
    const tx = await nfpm.mint(params, { gasLimit: 800000 });
    setLine("auctionStatus", `Mint submitted: ${tx.hash}. Waiting...`, "");
    const receipt = await tx.wait();
    // Find the Transfer event from NFPM (from address(0)) — the position NFT ID is the tokenId
    let tokenId = null;
    for (const log of receipt.logs || []) {
      if (log.address?.toLowerCase() === UNI_V3_NFPM.toLowerCase() && log.topics?.[0]?.toLowerCase() === ethers.id("Transfer(address,address,uint256)").toLowerCase()) {
        tokenId = BigInt(log.topics[3]).toString();
        break;
      }
    }
    fillReadout("resultTokenId", tokenId || "(see Uniswap UI)");
    fillReadout("resultTx", tx.hash);
    $("auctionResult").style.display = "";
    setLine("auctionStatus", "Auction live. Buyers can now swap on Uniswap. View your position at app.uniswap.org/pools.", "ok");
  } catch (e) {
    if (e?.code === 4001 || e?.code === "ACTION_REJECTED") {
      setLine("auctionStatus", "Mint rejected in wallet.", "warn");
    } else {
      setLine("auctionStatus", e.shortMessage || e.message || "Mint failed.", "err");
    }
  }
}

function init() {
  fetchEthPrice();
  $("connectButton").addEventListener("click", connectWallet);
  $("previewButton").addEventListener("click", previewRange);
  $("approveButton").addEventListener("click", approveToken);
  $("mintButton").addEventListener("click", mintPosition);

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
