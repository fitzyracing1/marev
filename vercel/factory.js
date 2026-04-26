const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BASE_TOKEN_DECIMALS = 6;
const DEFAULT_CONFIG = {
    factory: "0x94BF8239916053F5D979bb1e87Fe3ece11e12cFa",
    listingManager: ZERO_ADDRESS,
    dexRouter: ZERO_ADDRESS,
    dexFactory: ZERO_ADDRESS,
    baseToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
};

const FACTORY_ABI = [
    "function createToken(string name, string symbol, uint8 decimals, uint256 initialSupply) payable returns (address)",
    "function launchFee() view returns (uint256)",
    "function getCreatorTokens(address creator) view returns (address[])",
    "function getTokenInfo(address token) view returns (string, string, address, uint256, uint256, bool)",
    "function getListingInfo(address token) view returns (bool, address, address)",
    "function getTotalTokens() view returns (uint256)",
    "function allTokens(uint256 index) view returns (address)",
    "event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed creator, uint256 initialSupply, uint256 timestamp)"
];

const TOKEN_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
];

const LISTING_MANAGER_ABI = [
    "function launchToken(address token, uint256 tokenAmountDesired, uint256 baseAmountDesired, uint256 amountTokenMin, uint256 amountBaseMin, uint256 deadline) returns (address pair, uint256 amountToken, uint256 amountBase, uint256 liquidity)"
];

let provider;
let signer;
let factoryContract;
let listingManagerContract;
let userAddress;
let deploymentConfig = { ...DEFAULT_CONFIG };

const SUPPORTED_CHAIN_IDS = new Set([8453, 84532]);
const BASE_MAINNET_HEX_CHAIN_ID = "0x2105";

async function switchToBaseMainnet() {
    if (!window.ethereum?.request) return false;

    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: BASE_MAINNET_HEX_CHAIN_ID }]
        });
        return true;
    } catch (error) {
        if (error?.code === 4902) {
            try {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [{
                        chainId: BASE_MAINNET_HEX_CHAIN_ID,
                        chainName: "Base Mainnet",
                        nativeCurrency: {
                            name: "Ether",
                            symbol: "ETH",
                            decimals: 18
                        },
                        rpcUrls: ["https://mainnet.base.org"],
                        blockExplorerUrls: ["https://basescan.org"]
                    }]
                });
                return true;
            } catch (addError) {
                console.error("Failed to add Base Mainnet", addError);
                return false;
            }
        }

        console.error("Failed to switch network", error);
        return false;
    }
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

async function getCurrentChainId(providerInstance) {
    const network = await providerInstance.getNetwork();
    let chainId = normalizeChainId(network.chainId);

    if (!SUPPORTED_CHAIN_IDS.has(chainId) && window.ethereum?.request) {
        const rawChainId = await window.ethereum.request({ method: "eth_chainId" });
        chainId = normalizeChainId(rawChainId);
    }

    return chainId;
}

async function loadDeploymentConfig() {
    const candidates = [
        "./deployments-factory-base.json",
        "./deployments-factory-base-sepolia.json"
    ];

    for (const candidate of candidates) {
        try {
            const response = await fetch(candidate);
            if (!response.ok) {
                continue;
            }

            const data = await response.json();
            deploymentConfig = {
                ...deploymentConfig,
                ...data,
                listingManager: data.listingManager || deploymentConfig.listingManager,
                dexRouter: data.dexRouter || data.dex || deploymentConfig.dexRouter,
                dexFactory: data.dexFactory || deploymentConfig.dexFactory,
                baseToken: data.baseToken || deploymentConfig.baseToken
            };
            return;
        } catch (error) {
            console.warn(`Could not load ${candidate}`, error);
        }
    }
}

function getReadProvider() {
    return provider || new ethers.providers.JsonRpcProvider("https://mainnet.base.org");
}

function getFactoryReadContract() {
    return new ethers.Contract(deploymentConfig.factory, FACTORY_ABI, getReadProvider());
}

function getTokenReadContract(tokenAddress) {
    return new ethers.Contract(tokenAddress, TOKEN_ABI, getReadProvider());
}

function showStatus(elementId, message, type) {
    const status = document.getElementById(elementId);
    status.className = `status ${type}`;
    status.innerHTML = message;
    status.style.display = "block";
}

function hideStatus(elementId) {
    document.getElementById(elementId).style.display = "none";
}

function shortAddress(address) {
    if (!address || address === ZERO_ADDRESS) {
        return "-";
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function renderTokenStatus(isListed, isCreator) {
    if (isListed) {
        return `<span style="display: inline-block; margin-top: 8px; padding: 6px 10px; border-radius: 999px; background: #d4edda; color: #155724; font-weight: 700; font-size: 12px;">Official Listed Token</span>`;
    }

    if (isCreator) {
        return `<span style="display: inline-block; margin-top: 8px; padding: 6px 10px; border-radius: 999px; background: #fff3cd; color: #8a5700; font-weight: 700; font-size: 12px;">Created But Not Listed</span>`;
    }

    return `<span style="display: inline-block; margin-top: 8px; padding: 6px 10px; border-radius: 999px; background: #eef2ff; color: #4c51bf; font-weight: 700; font-size: 12px;">Token Record</span>`;
}

function copyAddress(address) {
    navigator.clipboard.writeText(address);
    alert("Address copied to clipboard.");
}

function tradeToken(address) {
    navigator.clipboard.writeText(address);
    window.open("https://pancakeswap.finance/swap?chain=base", "_blank", "noopener,noreferrer");
    alert("Token address copied. Paste it into PancakeSwap on Base to trade.");
}

async function connectWallet() {
    if (typeof ethers === "undefined") {
        showStatus("createStatus", "ethers.js failed to load. Refresh the page and try again.", "error");
        return;
    }

    if (typeof window.ethereum === "undefined") {
        showStatus("createStatus", "Please install MetaMask.", "error");
        return;
    }

    try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();

        let chainId = await getCurrentChainId(provider);
        if (!SUPPORTED_CHAIN_IDS.has(chainId)) {
            showStatus("createStatus", "Switching to Base Mainnet in MetaMask...", "info");
            const switched = await switchToBaseMainnet();

            if (!switched) {
                showStatus("createStatus", `Please switch to Base network (detected chainId: ${chainId})`, "error");
                return;
            }

            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            chainId = await getCurrentChainId(provider);

            if (!SUPPORTED_CHAIN_IDS.has(chainId)) {
                showStatus("createStatus", `Please switch to Base network (detected chainId: ${chainId})`, "error");
                return;
            }
        }

        factoryContract = new ethers.Contract(deploymentConfig.factory, FACTORY_ABI, signer);
        listingManagerContract = deploymentConfig.listingManager !== ZERO_ADDRESS
            ? new ethers.Contract(deploymentConfig.listingManager, LISTING_MANAGER_ABI, signer)
            : null;

        document.getElementById("connectBtn").style.display = "none";
        document.getElementById("createForm").style.display = "block";
        document.getElementById("walletInfo").style.display = "block";
        document.getElementById("walletAddress").textContent = userAddress;

        const fee = await factoryContract.launchFee();
        document.getElementById("launchFee").textContent = ethers.utils.formatEther(fee);

        await loadUserTokens();
        await loadAllTokens();

        showStatus("createStatus", "Wallet connected successfully.", "success");
        setTimeout(() => hideStatus("createStatus"), 3000);
    } catch (error) {
        console.error(error);
        showStatus("createStatus", "Failed to connect wallet: " + error.message, "error");
    }
}

document.getElementById("createForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("tokenName").value;
    const symbol = document.getElementById("tokenSymbol").value;
    const decimals = parseInt(document.getElementById("decimals").value, 10);
    const supply = document.getElementById("supply").value;

    const button = e.target.querySelector("button");
    button.disabled = true;
    button.textContent = "Creating...";

    showStatus("createStatus", "Creating your token...", "info");

    try {
        const launchFee = await factoryContract.launchFee();
        const supplyWithDecimals = ethers.utils.parseUnits(supply, decimals);

        const tx = await factoryContract.createToken(
            name,
            symbol,
            decimals,
            supplyWithDecimals,
            { value: launchFee }
        );

        showStatus("createStatus", "Transaction sent. Waiting for confirmation...", "info");
        const receipt = await tx.wait();
        const event = receipt.events.find((entry) => entry.event === "TokenCreated");
        const tokenAddress = event.args.tokenAddress;

        showStatus(
            "createStatus",
            `Token created successfully.<br>Address: <a href="https://basescan.org/address/${tokenAddress}" target="_blank">${tokenAddress}</a><br>Add the first USDC pool from the token card below.`,
            "success"
        );

        document.getElementById("createForm").reset();
        document.getElementById("decimals").value = 18;

        await loadUserTokens();
        await loadAllTokens();
    } catch (error) {
        console.error(error);
        let errorMsg = "Failed to create token";
        if (error.message.includes("user rejected")) {
            errorMsg = "Transaction cancelled by user";
        } else if (error.message) {
            errorMsg = error.message;
        }
        showStatus("createStatus", errorMsg, "error");
    } finally {
        button.disabled = false;
        button.textContent = "Launch Token";
    }
});

async function loadUserTokens() {
    const container = document.getElementById("tokenList");

    try {
        const readFactory = factoryContract || getFactoryReadContract();
        const tokens = await readFactory.getCreatorTokens(userAddress);

        if (tokens.length === 0) {
            container.innerHTML = "<p style=\"text-align: center; color: #999; padding: 20px;\">You have not created any tokens yet</p>";
            return;
        }

        container.innerHTML = "";
        for (const tokenAddress of tokens) {
            const tokenDiv = await createTokenCard(tokenAddress);
            container.appendChild(tokenDiv);
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = "<p style=\"text-align: center; color: #ff0000; padding: 20px;\">Error loading tokens</p>";
    }
}

async function loadAllTokens() {
    const container = document.getElementById("allTokens");

    try {
        const readFactory = factoryContract || getFactoryReadContract();
        const totalTokens = await readFactory.getTotalTokens();

        if (totalTokens.eq(0)) {
            container.innerHTML = "<p style=\"text-align: center; color: #999; padding: 20px;\">No tokens created yet</p>";
            return;
        }

        container.innerHTML = "";
        const start = Math.max(0, totalTokens.toNumber() - 10);
        const tokens = [];

        for (let i = totalTokens.toNumber() - 1; i >= start; i--) {
            tokens.push(await readFactory.allTokens(i));
        }

        for (const tokenAddress of tokens) {
            const tokenDiv = await createTokenCard(tokenAddress);
            container.appendChild(tokenDiv);
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = "<p style=\"text-align: center; color: #ff0000; padding: 20px;\">Error loading tokens</p>";
    }
}

function renderLaunchSection(isCreator, isListed, tokenDecimals) {
    if (!isCreator || isListed) {
        return "";
    }

    if (deploymentConfig.listingManager === ZERO_ADDRESS) {
        return `
            <div style="margin-top: 15px; padding: 12px; border-radius: 8px; background: #fff4e5; color: #8a5700;">
                Listing manager is not configured yet. Deploy the updated factory stack first.
            </div>
        `;
    }

    return `
        <div style="margin-top: 15px; padding: 15px; border-radius: 10px; background: #f8f9fa;">
            <div style="font-weight: 600; margin-bottom: 10px; color: #333;">Seed first public USDC pool</div>
            <div style="font-size: 13px; color: #666; margin-bottom: 12px;">
                This will approve your token, approve USDC, create the first pool, and mark the token as the official listed version.
            </div>
            <div style="display: grid; gap: 10px;">
                <input data-token-amount type="number" min="0" step="any" value="50" placeholder="Token amount (${tokenDecimals} decimals)">
                <input data-base-amount type="number" min="0" step="any" value="0.05" placeholder="USDC amount">
                <div style="font-size: 12px; color: #8a5700;">
                    Tiny pools work for testing but can price badly. For a more usable launch, seed more than the defaults.
                </div>
                <button data-launch-token type="button" style="width: auto;">Launch Official Pool</button>
                <div data-launch-status style="font-size: 14px; color: #555;"></div>
            </div>
        </div>
    `;
}

async function createTokenCard(tokenAddress) {
    const tokenContract = getTokenReadContract(tokenAddress);
    const readFactory = factoryContract || getFactoryReadContract();

    try {
        const [name, symbol, decimals, totalSupply, tokenInfo, listingInfo] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.decimals(),
            tokenContract.totalSupply(),
            readFactory.getTokenInfo(tokenAddress),
            readFactory.getListingInfo(tokenAddress)
        ]);

        const supplyFormatted = ethers.utils.formatUnits(totalSupply, decimals);
        const creator = tokenInfo[2];
        const isListed = listingInfo[0];
        const listingTarget = listingInfo[1];
        const pairAddress = listingInfo[2];
        const isCreator = !!userAddress && creator.toLowerCase() === userAddress.toLowerCase();

        const div = document.createElement("div");
        div.className = "token-item";
        div.innerHTML = `
            <div class="token-name">${name} <span class="token-symbol">(${symbol})</span></div>
            ${renderTokenStatus(isListed, isCreator)}
            <div style="color: #666; margin-top: 5px;">Supply: ${parseFloat(supplyFormatted).toLocaleString()}</div>
            <div style="color: #666; margin-top: 5px;">Creator: ${shortAddress(creator)}</div>
            <div style="color: #666; margin-top: 5px;">Listing: ${isListed ? "Live on standard DEX" : "Not listed yet"}</div>
            <div class="token-address">
                <a href="https://basescan.org/address/${tokenAddress}" target="_blank" style="color: #667eea;">${tokenAddress}</a>
            </div>
            ${isListed ? `
                <div style="margin-top: 10px; color: #2d6a4f;">Pair: <a href="https://basescan.org/address/${pairAddress}" target="_blank" style="color: #2d6a4f;">${shortAddress(pairAddress)}</a></div>
                <div style="margin-top: 5px; color: #2d6a4f;">Router: <a href="https://basescan.org/address/${listingTarget}" target="_blank" style="color: #2d6a4f;">${shortAddress(listingTarget)}</a></div>
                <div style="margin-top: 5px; color: #2d6a4f; font-weight: 600;">This is the official live version from the corrected factory stack.</div>
            ` : isCreator ? `
                <div style="margin-top: 10px; color: #8a5700; font-weight: 600;">This token exists, but it is not the official live version until it is listed.</div>
            ` : ""}
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
                <button data-copy-address="${tokenAddress}" style="width: auto; padding: 8px 15px; font-size: 14px;">Copy Address</button>
                ${isListed ? `<button data-trade-token="${tokenAddress}" style="width: auto; padding: 8px 15px; font-size: 14px;">Trade This Token</button>` : ""}
            </div>
            ${renderLaunchSection(isCreator, isListed, decimals)}
        `;

        div.querySelector("[data-copy-address]").addEventListener("click", () => copyAddress(tokenAddress));
        const tradeButton = div.querySelector("[data-trade-token]");
        if (tradeButton) {
            tradeButton.addEventListener("click", () => tradeToken(tokenAddress));
        }

        const launchButton = div.querySelector("[data-launch-token]");
        if (launchButton) {
            launchButton.addEventListener("click", async () => {
                const tokenAmountInput = div.querySelector("[data-token-amount]");
                const baseAmountInput = div.querySelector("[data-base-amount]");
                const statusNode = div.querySelector("[data-launch-status]");
                await launchTokenOnStandardDex(
                    tokenAddress,
                    decimals,
                    tokenAmountInput,
                    baseAmountInput,
                    launchButton,
                    statusNode
                );
            });
        }

        return div;
    } catch (error) {
        console.error("Error loading token:", tokenAddress, error);
        const div = document.createElement("div");
        div.className = "token-item";
        div.innerHTML = `<div class="token-address">Error loading: ${tokenAddress}</div>`;
        return div;
    }
}

async function ensureAllowance(contract, spender, requiredAmount, statusNode, label) {
    const allowance = await contract.allowance(userAddress, spender);
    if (allowance.gte(requiredAmount)) {
        statusNode.textContent = `${label} approval already set.`;
        return;
    }

    statusNode.textContent = `Confirm ${label} approval in MetaMask...`;
    const tx = await contract.approve(spender, ethers.constants.MaxUint256);
    statusNode.textContent = `${label} approval sent. Waiting for confirmation...`;
    await tx.wait();
    statusNode.textContent = `${label} approval confirmed.`;
}

async function launchTokenOnStandardDex(tokenAddress, tokenDecimals, tokenAmountInput, baseAmountInput, button, statusNode) {
    if (!listingManagerContract || !signer || !userAddress) {
        statusNode.textContent = "Connect your wallet first.";
        return;
    }

    const tokenAmountRaw = tokenAmountInput.value.trim();
    const baseAmountRaw = baseAmountInput.value.trim();

    if (!tokenAmountRaw || !baseAmountRaw) {
        statusNode.textContent = "Enter both token and USDC amounts.";
        return;
    }

    button.disabled = true;
    statusNode.textContent = "Preparing launch...";

    try {
        const tokenAmount = ethers.utils.parseUnits(tokenAmountRaw, tokenDecimals);
        const baseAmount = ethers.utils.parseUnits(baseAmountRaw, BASE_TOKEN_DECIMALS);
        const baseAmountFloat = parseFloat(baseAmountRaw);
        const deadline = Math.floor(Date.now() / 1000) + (20 * 60);
        const minTokenAmount = tokenAmount.mul(95).div(100);
        const minBaseAmount = baseAmount.mul(95).div(100);

        if (baseAmountFloat < 0.05) {
            statusNode.textContent = "Use at least 0.05 USDC so the pool is actually testable.";
            return;
        }

        const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
        const baseTokenContract = new ethers.Contract(deploymentConfig.baseToken, TOKEN_ABI, signer);

        statusNode.textContent = "Step 1/3: checking token approval...";
        await ensureAllowance(tokenContract, deploymentConfig.listingManager, tokenAmount, statusNode, await tokenContract.symbol());
        statusNode.textContent = "Step 2/3: checking USDC approval...";
        await ensureAllowance(baseTokenContract, deploymentConfig.listingManager, baseAmount, statusNode, "USDC");

        statusNode.textContent = "Step 3/3: confirm pool launch in MetaMask...";
        const tx = await listingManagerContract.launchToken(
            tokenAddress,
            tokenAmount,
            baseAmount,
            minTokenAmount,
            minBaseAmount,
            deadline
        );
        statusNode.textContent = "Pool launch sent. Waiting for confirmation...";
        await tx.wait();

        statusNode.textContent = "Liquidity added and listing registered. This token is now the official live version.";
        await loadUserTokens();
        await loadAllTokens();
    } catch (error) {
        console.error(error);
        if (error?.code === 4001 || (error.message && error.message.includes("user rejected"))) {
            statusNode.textContent = "Transaction rejected in MetaMask.";
        } else if (error?.code === -32002) {
            statusNode.textContent = "MetaMask already has a pending request open.";
        } else {
            statusNode.textContent = error.message || "Launch failed";
        }
    } finally {
        button.disabled = false;
    }
}

if (typeof window.ethereum !== "undefined") {
    window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
            window.location.reload();
        }
    });

    window.ethereum.on("chainChanged", () => {
        window.location.reload();
    });
}

window.addEventListener("load", async () => {
    try {
        await loadDeploymentConfig();
        await loadAllTokens();
    } catch (error) {
        console.error("Error loading initial tokens:", error);
    }
});
