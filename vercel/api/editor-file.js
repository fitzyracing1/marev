const { ensureAllowedPath, getFile } = require("./_editor-github");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const repoPath = String(req.query.path || "");
    const allowedEntry = await ensureAllowedPath(repoPath);
    const file = await getFile(repoPath);

    res.status(200).json({
      file: allowedEntry,
      sha: file.sha,
      content: file.content,
      htmlUrl: file.htmlUrl,
      downloadUrl: file.downloadUrl,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || "Could not load file",
    });
  }
};
