const { ensureAllowedPath, rollbackFile } = require("./_editor-github");

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

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const repoPath = String(body.path || "");
    const targetCommitSha = String(body.targetCommitSha || "");
    const actorName = String(body.actorName || "");
    const actorEmail = String(body.actorEmail || "");

    await ensureAllowedPath(repoPath);

    if (!targetCommitSha) {
      res.status(400).json({ error: "A target commit is required for rollback." });
      return;
    }

    const result = await rollbackFile({
      repoPath,
      targetCommitSha,
      actorName,
      actorEmail,
    });

    res.status(200).json({
      commitSha: result?.commit?.sha || "",
      commitUrl: result?.commit?.html_url || "",
      contentSha: result?.content?.sha || "",
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || "Could not rollback file",
    });
  }
};
