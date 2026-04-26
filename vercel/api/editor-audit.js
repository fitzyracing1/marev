const { ensureAllowedPath, listAuditCommits } = require("./_editor-github");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const repoPath = String(req.query.path || "");
    const globalMode = String(req.query.scope || "") === "global" || !repoPath;

    if (!globalMode) {
      await ensureAllowedPath(repoPath);
    }

    const commits = await listAuditCommits({
      repoPath: globalMode ? "" : repoPath,
      global: globalMode,
      perPage: Number(req.query.limit || 20),
    });

    res.status(200).json({
      commits,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || "Could not load audit history",
    });
  }
};
