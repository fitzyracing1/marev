const GITHUB_API_BASE = "https://api.github.com";

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ""));
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

async function ghRequest(path, options, token) {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "marev-airdrop",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  return response;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const owner = process.env.GITHUB_EDITOR_OWNER;
  const repo = process.env.GITHUB_EDITOR_REPO;
  const branch = process.env.GITHUB_EDITOR_BRANCH || "main";
  const token = process.env.GITHUB_EDITOR_TOKEN;

  if (!owner || !repo || !token) {
    res.status(500).json({ error: "GitHub editor env vars are not set" });
    return;
  }

  try {
    const body = await readBody(req);
    const tokenAddress = String(body.tokenAddress || "").toLowerCase();
    if (!isAddress(tokenAddress)) {
      res.status(400).json({ error: "tokenAddress must be a 0x-prefixed Base address" });
      return;
    }

    const distributorAddress = String(body.distributorAddress || "").toLowerCase();
    if (!isAddress(distributorAddress)) {
      res.status(400).json({ error: "distributorAddress must be a 0x-prefixed Base address" });
      return;
    }

    if (typeof body.merkleRoot !== "string" || !body.merkleRoot.startsWith("0x")) {
      res.status(400).json({ error: "merkleRoot is required" });
      return;
    }
    if (!body.claims || typeof body.claims !== "object") {
      res.status(400).json({ error: "claims object is required" });
      return;
    }

    const repoPath = `vercel/airdrops/${tokenAddress}.json`;
    const payload = {
      tokenAddress,
      distributorAddress,
      tokenName: String(body.tokenName || ""),
      tokenSymbol: String(body.tokenSymbol || ""),
      tokenDecimals: Number(body.tokenDecimals || 18),
      merkleRoot: body.merkleRoot,
      expiry: Number(body.expiry || 0),
      creator: String(body.creator || "").toLowerCase(),
      totalAmount: String(body.totalAmount || "0"),
      createdAt: new Date().toISOString(),
      claims: body.claims,
    };

    const content = Buffer.from(JSON.stringify(payload, null, 2), "utf8").toString("base64");

    const existing = await ghRequest(
      `/repos/${owner}/${repo}/contents/${repoPath}?ref=${encodeURIComponent(branch)}`,
      { method: "GET" },
      token
    );

    const putBody = {
      message: `[marev-airdrop] save ${tokenAddress}`,
      content,
      branch,
      committer: { name: "marev-airdrop", email: "airdrop@users.noreply.marev.local" },
    };
    if (existing.ok) {
      const existingPayload = await existing.json();
      putBody.sha = existingPayload.sha;
    }

    const put = await ghRequest(
      `/repos/${owner}/${repo}/contents/${repoPath}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(putBody),
      },
      token
    );

    if (!put.ok) {
      const text = await put.text();
      res.status(put.status).json({ error: text || "GitHub commit failed" });
      return;
    }

    const result = await put.json();
    res.status(200).json({
      ok: true,
      commitSha: result?.commit?.sha || null,
      contentSha: result?.content?.sha || null,
      claimUrl: `/claim?token=${tokenAddress}`,
      airdropDataPath: `/airdrops/${tokenAddress}.json`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "airdrop-save failed" });
  }
};
