import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { createThirdwebClient } from "https://esm.sh/thirdweb@5.105.41";
import { ThirdwebProvider, SwapWidget } from "https://esm.sh/thirdweb@5.105.41/react";

const rootEl = document.getElementById("thirdwebSwapRoot");
const statusEl = document.getElementById("thirdwebWidgetStatus");
const config = window.APP_INTEGRATIONS || {};

if (!rootEl) {
  throw new Error("Missing thirdwebSwapRoot container");
}

function renderPlaceholder(message) {
  rootEl.classList.remove("thirdweb-widget-mounted");
  rootEl.innerHTML = `<div class="empty-state">${message}</div>`;
}

if (!config.thirdwebClientId) {
  statusEl.textContent = "Add your public thirdweb client ID in integrations.js to enable the embedded swap widget.";
  renderPlaceholder("thirdweb widget is disabled until a client ID is configured.");
} else {
  const client = createThirdwebClient({
    clientId: config.thirdwebClientId,
  });

  function App() {
    const [shareState, setShareState] = React.useState({
      shareCount: 0,
      totalUsdc: 0,
      estimatedFireAmount: "",
      symbol: "FIRE",
    });

    React.useEffect(() => {
      const handleUpdate = (event) => {
        setShareState((current) => ({
          ...current,
          ...(event.detail || {}),
        }));
      };

      window.addEventListener("firecoin-share-update", handleUpdate);
      return () => window.removeEventListener("firecoin-share-update", handleUpdate);
    }, []);

    const prefill = {
      sellToken: {
        chainId: 8453,
        tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      },
      buyToken: {
        chainId: 8453,
        tokenAddress: "0x1c78664aed3c83db40bfe1319e7461c3f5b6398d",
      },
    };

    if (shareState.estimatedFireAmount) {
      prefill.buyToken.amount = shareState.estimatedFireAmount;
    }

    return React.createElement(
      ThirdwebProvider,
      null,
      React.createElement(
        "div",
        null,
        React.createElement(
          "p",
          { className: "hint" },
          shareState.shareCount > 0
            ? `${shareState.shareCount} share${shareState.shareCount === 1 ? "" : "s"} selected. Widget is prefilling about ${shareState.estimatedFireAmount || "0"} ${shareState.symbol} on Base.`
            : "Choose a share count above to prefill the swap widget."
        ),
        React.createElement(SwapWidget, {
          client,
          prefill,
        })
      )
    );
  }

  rootEl.classList.add("thirdweb-widget-mounted");
  statusEl.textContent = "thirdweb widget ready. It will default to Base USDC -> Fire Coin.";
  createRoot(rootEl).render(React.createElement(App));
}
