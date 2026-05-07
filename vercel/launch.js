const BASE_CHAIN_ID_HEX = "0x2105";
const BASE_RPC_URL = "https://mainnet.base.org";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const FACTORY_ABI = [
  "function createToken(string name, string symbol, uint8 decimals, uint256 initialSupply) payable returns (address)",
  "function launchFee() view returns (uint256)",
  "event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed creator, uint256 initialSupply, uint256 timestamp)",
];

const TOKEN_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

const DISTRIBUTOR_FACTORY_ABI = [
  "function create(address token, bytes32 merkleRoot, uint256 expiry, string name) returns (address)",
  "event DistributorCreated(address indexed distributor, address indexed token, address indexed creator, bytes32 merkleRoot, uint256 expiry, string name)",
];

let provider = null;
let signer = null;
let signerAddress = null;
let factoryDeployment = {
  factory: ZERO_ADDRESS,
  merkleDistributorFactory: ZERO_ADDRESS,
};
let merkleData = null;

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
}
function setLaunchStatus(text, cls = "") { setStatusLine("launchStatus", text, cls); }
function setRecipientStatus(text, cls = "") { setStatusLine("recipientStatus", text, cls); }

function shortAddress(a) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "-";
}

async function loadDeploymentConfig() {
  try {
    const response = await fetch("./deployments-factory-base.json", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      factoryDeployment = { ...factoryDeployment, ...data };
    }
  } catch (error) {
    console.error("deployment config load failed", error);
  }

  $("contractStatus").innerHTML = `factory <code>${shortAddress(factoryDeployment.factory)}</code> &nbsp;·&nbsp; distributor-factory <code>${
    factoryDeployment.merkleDistributorFactory && factoryDeployment.merkleDistributorFactory !== ZERO_ADDRESS
      ? shortAddress(factoryDeployment.merkleDistributorFactory)
      : "<span style=\"color:var(--red)\">not deployed</span>"
  }</code>`;

  if (factoryDeployment.factory && factoryDeployment.factory !== ZERO_ADDRESS) {
    try {
      const readProvider = new ethers.JsonRpcProvider(BASE_RPC_URL);
      const factory = new ethers.Contract(factoryDeployment.factory, FACTORY_ABI, readProvider);
      const fee = await factory.launchFee();
      const el = $("launchFee");
      el.textContent = `${ethers.formatEther(fee)} ETH`;
      el.classList.remove("dim");
    } catch (error) {
      console.error("launchFee load failed", error);
    }
  }
}

function fillReadout(id, text) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  if (text && text !== "—" && text !== "-") el.classList.remove("dim");
  else el.classList.add("dim");
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
    if (Number(network.chainId) !== 8453) {
      setStatus("Wrong network", "warn");
      return;
    }
    setStatus("Connected", "ok");
  } catch (error) {
    setStatus("Failed", "err");
    setLaunchStatus(error.message || "Connect failed", "err");
  }
}

async function switchBase() {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_CHAIN_ID_HEX }],
    });
    if (provider) {
      const network = await provider.getNetwork();
      $("network").textContent = `${network.name} (0x${network.chainId.toString(16)})`;
    }
    setStatus("On Base mainnet", "ok");
  } catch (error) {
    if (error?.code === 4902) {
      try {
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
      } catch (addError) {
        setStatus(addError.message || "Failed to add Base", "warn");
      }
    } else {
      setStatus(error.message || "Switch failed", "warn");
    }
  }
}

function parseRecipients(text, decimals) {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const claims = [];
  const seen = new Set();
  const errors = [];

  lines.forEach((line, idx) => {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 2) {
      errors.push(`Line ${idx + 1}: needs "address,amount"`);
      return;
    }
    const [addr, amountText] = parts;
    let address;
    try {
      address = ethers.getAddress(addr);
    } catch {
      errors.push(`Line ${idx + 1}: invalid address "${addr}"`);
      return;
    }
    if (seen.has(address.toLowerCase())) {
      errors.push(`Line ${idx + 1}: duplicate address ${address}`);
      return;
    }
    seen.add(address.toLowerCase());
    let amountWei;
    try {
      amountWei = ethers.parseUnits(amountText, decimals);
    } catch {
      errors.push(`Line ${idx + 1}: invalid amount "${amountText}"`);
      return;
    }
    if (amountWei <= 0n) {
      errors.push(`Line ${idx + 1}: amount must be > 0`);
      return;
    }
    claims.push({ index: claims.length, account: address, amountWei });
  });

  return { claims, errors };
}

function leafHash(index, account, amountWei) {
  return ethers.solidityPackedKeccak256(["uint256", "address", "uint256"], [index, account, amountWei]);
}

function pairHash(a, b) {
  const aBig = BigInt(a);
  const bBig = BigInt(b);
  const [left, right] = aBig < bBig ? [a, b] : [b, a];
  return ethers.keccak256(ethers.concat([left, right]));
}

function buildMerkleTree(claims) {
  const leaves = claims.map((c) => leafHash(c.index, c.account, c.amountWei));
  const layers = [leaves.slice()];
  while (layers[layers.length - 1].length > 1) {
    const cur = layers[layers.length - 1];
    const next = [];
    for (let i = 0; i < cur.length; i += 2) {
      if (i + 1 < cur.length) next.push(pairHash(cur[i], cur[i + 1]));
      else next.push(cur[i]);
    }
    layers.push(next);
  }
  return { root: layers[layers.length - 1][0], layers };
}

function getProof(layers, leafIndex) {
  const proof = [];
  let i = leafIndex;
  for (let l = 0; l < layers.length - 1; l++) {
    const sibling = i % 2 === 0 ? i + 1 : i - 1;
    if (sibling < layers[l].length) proof.push(layers[l][sibling]);
    i = Math.floor(i / 2);
  }
  return proof;
}

function validateRecipients() {
  merkleData = null;
  const decimals = Math.max(0, Math.min(18, parseInt($("tokenDecimals").value, 10) || 18));
  const supplyText = ($("tokenSupply").value || "").trim();

  const { claims, errors } = parseRecipients($("recipientList").value, decimals);

  fillReadout("recipientCount", String(claims.length));
  if (errors.length) {
    setRecipientStatus(`Found ${errors.length} issue(s):\n${errors.slice(0, 10).join("\n")}`, "warn");
    fillReadout("recipientTotal", "—");
    fillReadout("creatorKeeps", "—");
    fillReadout("merkleRootDisplay", "—");
    return;
  }
  if (!claims.length) {
    setRecipientStatus("No recipients found.", "warn");
    return;
  }

  const total = claims.reduce((sum, c) => sum + c.amountWei, 0n);
  fillReadout("recipientTotal", `${ethers.formatUnits(total, decimals)} tokens`);

  if (supplyText) {
    try {
      const supplyWei = ethers.parseUnits(supplyText, decimals);
      if (total > supplyWei) {
        setRecipientStatus(`Total airdrop (${ethers.formatUnits(total, decimals)}) exceeds total supply (${supplyText}).`, "warn");
        fillReadout("creatorKeeps", "Negative");
      } else {
        const remaining = supplyWei - total;
        fillReadout("creatorKeeps", `${ethers.formatUnits(remaining, decimals)} tokens`);
      }
    } catch {
      fillReadout("creatorKeeps", "?");
    }
  } else {
    fillReadout("creatorKeeps", "?");
  }

  const { root, layers } = buildMerkleTree(claims);
  fillReadout("merkleRootDisplay", root);

  merkleData = { decimals, claims, total, root, layers };
  setRecipientStatus(`${claims.length} recipients validated. Merkle root computed.`, "ok");
}

function loadSampleList() {
  if (!signerAddress) {
    setRecipientStatus("Connect wallet first to use it as a sample recipient.", "warn");
    return;
  }
  $("recipientList").value = `# CSV format: address,amount (in human units of your token)
${signerAddress},100
0x4253AaCA78419dd5d82A74708c29c6Bdfe325565,250
0xDD0C7e78229672Af3103d4771238ab3A384c5083,500`;
  validateRecipients();
}

async function launchFlow() {
  setLaunchStatus("");
  if (!signer || !signerAddress) {
    setLaunchStatus("Connect wallet first.", "warn");
    return;
  }
  if (factoryDeployment.factory === ZERO_ADDRESS) {
    setLaunchStatus("Token factory address is missing from the deployment file.", "warn");
    return;
  }
  if (!factoryDeployment.merkleDistributorFactory || factoryDeployment.merkleDistributorFactory === ZERO_ADDRESS) {
    setLaunchStatus("MerkleDistributorFactory is not deployed yet. Deploy it from /dex with hardhat.", "warn");
    return;
  }

  if (!merkleData) {
    setLaunchStatus("Validate the recipient list first.", "warn");
    return;
  }

  const name = $("tokenName").value.trim();
  const symbol = $("tokenSymbol").value.trim();
  const decimals = merkleData.decimals;
  const supplyText = $("tokenSupply").value.trim();
  if (!name || !symbol || !supplyText) {
    setLaunchStatus("Token name, symbol, and supply are all required.", "warn");
    return;
  }
  let supplyWei;
  try {
    supplyWei = ethers.parseUnits(supplyText, decimals);
  } catch {
    setLaunchStatus("Invalid supply for given decimals.", "warn");
    return;
  }
  if (supplyWei < merkleData.total) {
    setLaunchStatus("Total supply is less than total airdrop allocation.", "warn");
    return;
  }

  const expiryDays = parseInt($("expiryDays").value, 10);
  const expiryUnix = Number.isFinite(expiryDays) && expiryDays > 0
    ? Math.floor(Date.now() / 1000) + expiryDays * 86400
    : 0;

  const launchButton = $("launchButton");
  launchButton.disabled = true;

  try {
    // Step 1: createToken via factory
    setLaunchStatus("Step 1/4: confirm token creation in your wallet...", "");
    const factory = new ethers.Contract(factoryDeployment.factory, FACTORY_ABI, signer);
    const launchFee = await factory.launchFee();
    const txCreate = await factory.createToken(name, symbol, decimals, supplyWei, { value: launchFee });
    setLaunchStatus(`Step 1/4: createToken submitted (${txCreate.hash}). Waiting...`, "");
    const receiptCreate = await txCreate.wait();

    // Find TokenCreated event to extract token address
    let tokenAddress = null;
    for (const log of receiptCreate.logs || []) {
      try {
        const parsed = factory.interface.parseLog(log);
        if (parsed?.name === "TokenCreated") {
          tokenAddress = parsed.args.tokenAddress;
          break;
        }
      } catch {}
    }
    if (!tokenAddress) throw new Error("Could not find TokenCreated event in receipt");
    setLaunchStatus(`Step 1/4 ✓ Token deployed: ${tokenAddress}`, "ok");

    // Step 2: create distributor
    setLaunchStatus("Step 2/4: confirm distributor creation in your wallet...", "");
    const distributorFactory = new ethers.Contract(
      factoryDeployment.merkleDistributorFactory,
      DISTRIBUTOR_FACTORY_ABI,
      signer
    );
    const txDistributor = await distributorFactory.create(
      tokenAddress,
      merkleData.root,
      expiryUnix,
      `${name} airdrop`
    );
    setLaunchStatus(`Step 2/4: distributor.create submitted (${txDistributor.hash}). Waiting...`, "");
    const receiptDistributor = await txDistributor.wait();
    let distributorAddress = null;
    for (const log of receiptDistributor.logs || []) {
      try {
        const parsed = distributorFactory.interface.parseLog(log);
        if (parsed?.name === "DistributorCreated") {
          distributorAddress = parsed.args.distributor;
          break;
        }
      } catch {}
    }
    if (!distributorAddress) throw new Error("Could not find DistributorCreated event");
    setLaunchStatus(`Step 2/4 ✓ Distributor deployed: ${distributorAddress}`, "ok");

    // Step 3: fund distributor
    setLaunchStatus("Step 3/4: confirm transfer to distributor in your wallet...", "");
    const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
    const txFund = await tokenContract.transfer(distributorAddress, merkleData.total);
    setLaunchStatus(`Step 3/4: token transfer submitted (${txFund.hash}). Waiting...`, "");
    await txFund.wait();
    setLaunchStatus("Step 3/4 ✓ Distributor funded.", "ok");

    // Step 4: save Merkle JSON
    setLaunchStatus("Step 4/4: publishing claim data...", "");
    const claimsByAddress = {};
    merkleData.claims.forEach((c) => {
      claimsByAddress[c.account.toLowerCase()] = {
        index: c.index,
        amountWei: c.amountWei.toString(),
        proof: getProof(merkleData.layers, c.index),
      };
    });

    const saveResponse = await fetch("/api/airdrop-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenAddress,
        distributorAddress,
        tokenName: name,
        tokenSymbol: symbol,
        tokenDecimals: decimals,
        merkleRoot: merkleData.root,
        expiry: expiryUnix,
        creator: signerAddress,
        totalAmount: merkleData.total.toString(),
        claims: claimsByAddress,
      }),
    });
    const savePayload = await saveResponse.json().catch(() => ({}));
    if (!saveResponse.ok) {
      throw new Error(savePayload.error || `Publish failed (${saveResponse.status})`);
    }

    setLaunchStatus("Step 4/4 ✓ Claim data published. Launch complete!", "ok");

    const claimUrl = `${window.location.origin}/claim?token=${tokenAddress.toLowerCase()}`;
    fillReadout("resultTokenAddress", tokenAddress);
    fillReadout("resultDistributorAddress", distributorAddress);
    $("resultClaimLink").innerHTML = `<a href="${claimUrl}" target="_blank" rel="noopener noreferrer">${claimUrl}</a>`;
    $("resultClaimLink").classList.remove("dim");
    $("launchResult").classList.add("shown");
  } catch (error) {
    console.error("launch error", error);
    setLaunchStatus(error.shortMessage || error.message || "Launch failed", "err");
  } finally {
    launchButton.disabled = false;
  }
}

function init() {
  loadDeploymentConfig();

  $("connectButton").addEventListener("click", connectWallet);
  $("switchBaseButton").addEventListener("click", switchBase);
  $("validateRecipientsButton").addEventListener("click", validateRecipients);
  $("loadSampleButton").addEventListener("click", loadSampleList);
  $("launchButton").addEventListener("click", launchFlow);

  if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
