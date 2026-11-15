const { ensureWritesEnabled, getRepoSettings, proposeFileChange } = require("./_editor-github");

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

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    ensureWritesEnabled();
    getRepoSettings();

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

    // Opens a pull request; the claim page works once a maintainer merges it.
    const result = await proposeFileChange({
      repoPath,
      content: JSON.stringify(payload, null, 2),
      message: `[marev-airdrop] save ${tokenAddress}`,
      author: { name: "marev-airdrop", email: "airdrop@users.noreply.marev.local" },
      branchPrefix: "airdrop",
      prBody: `Airdrop claim data for \`${tokenAddress}\` submitted from /launch.\n\nCheck the token, distributor and Merkle root on Basescan before merging.`,
    });

    res.status(200).json({
      ok: true,
      pending: true,
      commitSha: result.commitSha,
      contentSha: result.contentSha,
      pullRequestUrl: result.pullRequestUrl,
      claimUrl: `/claim?token=${tokenAddress}`,
      airdropDataPath: `/airdrops/${tokenAddress}.json`,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || "airdrop-save failed" });
  }
};
