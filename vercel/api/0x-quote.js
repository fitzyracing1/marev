const ZEROEX_PRICE_URL = "https://api.0x.org/swap/allowance-holder/price";
const ZEROEX_QUOTE_URL = "https://api.0x.org/swap/allowance-holder/quote";

module.exports = async (req, res) => {
  const apiKey = process.env.ZEROEX_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing ZEROEX_API_KEY env var" });
    return;
  }

  const { chainId, sellToken, buyToken, sellAmount, taker, slippageBps, kind } = req.query;
  if (!chainId || !sellToken || !buyToken || !sellAmount) {
    res.status(400).json({ error: "chainId, sellToken, buyToken, and sellAmount are required" });
    return;
  }

  const useQuote = String(kind || "").toLowerCase() === "quote" && taker;
  const upstreamUrl = useQuote ? ZEROEX_QUOTE_URL : ZEROEX_PRICE_URL;

  const params = new URLSearchParams({
    chainId: String(chainId),
    sellToken: String(sellToken),
    buyToken: String(buyToken),
    sellAmount: String(sellAmount),
  });
  if (taker) params.set("taker", String(taker));
  if (slippageBps) params.set("slippageBps", String(slippageBps));

  try {
    const upstream = await fetch(`${upstreamUrl}?${params.toString()}`, {
      headers: {
        "0x-api-key": apiKey,
        "0x-version": "v2",
      },
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text || "{}");
  } catch (error) {
    res.status(502).json({ error: error.message || "0x upstream request failed" });
  }
};
