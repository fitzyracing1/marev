const { getAllowedFiles, getRepoSettings, loadEditorConfig } = require("./_editor-github");

module.exports = async (_req, res) => {
  try {
    const config = await loadEditorConfig();
    const { owner, repo, branch } = getRepoSettings();

    res.status(200).json({
      title: config.title || "MAREV Public Editor",
      description: config.description || "",
      branch,
      owner,
      repo,
      allowedFiles: await getAllowedFiles(),
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || "Could not load editor config",
    });
  }
};
