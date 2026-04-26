const { generateJwt } = require("@coinbase/cdp-sdk/auth");

const REQUEST_HOST = "api.cdp.coinbase.com";
const REQUEST_PATH = "/platform/v2/onramp/sessions";

function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function isValidAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ""));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKeyId = process.env.CDP_API_KEY_ID;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET;

  if (!apiKeyId || !apiKeySecret) {
    res.status(500).json({ error: "Missing Coinbase CDP API credentials" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const destinationAddress = String(body.destinationAddress || "");
    const paymentAmount = Number(body.paymentAmount || 0);
    const shareCount = Math.floor(Number(body.shareCount || 0));

    if (!isValidAddress(destinationAddress)) {
      res.status(400).json({ error: "A valid Base destination wallet is required" });
      return;
    }

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      res.status(400).json({ error: "A positive USD amount is required" });
      return;
    }

    const jwt = await generateJwt({
      apiKeyId,
      apiKeySecret,
      requestMethod: "POST",
      requestHost: REQUEST_HOST,
      requestPath: REQUEST_PATH,
      expiresIn: 120,
    });

    const clientIpHeader = String(req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "");
    const clientIp = clientIpHeader.split(",")[0].trim();

    const response = await fetch(`https://${REQUEST_HOST}${REQUEST_PATH}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        purchaseCurrency: "USDC",
        destinationNetwork: "base",
        destinationAddress,
        paymentAmount: paymentAmount.toFixed(2),
        paymentCurrency: "USD",
        partnerUserRef: shareCount > 0 ? `fire-share-${shareCount}` : "fire-share",
        ...(clientIp ? { clientIp } : {}),
        ...(process.env.COINBASE_ONRAMP_REDIRECT_URL ? { redirectUrl: process.env.COINBASE_ONRAMP_REDIRECT_URL } : {}),
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      res.status(response.status).json({
        error: payload?.error || payload?.message || "Coinbase Onramp session request failed",
        details: payload,
      });
      return;
    }

    res.status(200).json({
      onrampUrl: payload?.session?.onrampUrl || null,
      session: payload?.session || null,
      quote: payload?.quote || null,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Unexpected Coinbase Onramp error",
    });
  }
};
