const fs = require("node:fs/promises");
const path = require("node:path");

const GITHUB_API_BASE = "https://api.github.com";
const AUDIT_PREFIX = "[marev-editor]";

function encodeRepoPath(repoPath) {
  return String(repoPath || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function loadEditorConfig() {
  const configPath = path.resolve(__dirname, "..", "editor-allowed-files.json");
  const raw = await fs.readFile(configPath, "utf8");
  return JSON.parse(raw);
}

async function getAllowedFiles() {
  const config = await loadEditorConfig();
  return Array.isArray(config.allowedFiles) ? config.allowedFiles : [];
}

async function ensureAllowedPath(repoPath) {
  const allowedFiles = await getAllowedFiles();
  const entry = allowedFiles.find((item) => item.repoPath === repoPath);
  if (!entry) {
    const error = new Error("That file is not editable from the public editor.");
    error.statusCode = 403;
    throw error;
  }
  return entry;
}

function getRepoSettings() {
  const owner = process.env.GITHUB_EDITOR_OWNER;
  const repo = process.env.GITHUB_EDITOR_REPO;
  const branch = process.env.GITHUB_EDITOR_BRANCH || "main";
  const token = process.env.GITHUB_EDITOR_TOKEN;

  if (!owner || !repo || !token) {
    const error = new Error("Missing GitHub editor environment variables.");
    error.statusCode = 500;
    throw error;
  }

  return { owner, repo, branch, token };
}

async function requestGitHub(resource, options = {}) {
  const { token } = getRepoSettings();
  const response = await fetch(`${GITHUB_API_BASE}${resource}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "marev-public-editor",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.text();
    const error = new Error(payload || `GitHub request failed with ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  return response;
}

function normalizeActorName(actorName) {
  const trimmed = String(actorName || "").trim().replace(/\s+/g, " ");
  if (!trimmed) {
    const error = new Error("A display name is required.");
    error.statusCode = 400;
    throw error;
  }
  return trimmed.slice(0, 60);
}

function normalizeActorEmail(actorEmail, actorName) {
  const trimmed = String(actorEmail || "").trim();
  if (trimmed) {
    return trimmed.slice(0, 120);
  }

  const fallback = actorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${fallback || "public-editor"}@users.noreply.marev.local`;
}

function normalizeSummary(summary) {
  const trimmed = String(summary || "").trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, 120) : "Public web editor update";
}

async function getFile(repoPath, ref) {
  const { owner, repo, branch } = getRepoSettings();
  const effectiveRef = ref || branch;
  const response = await requestGitHub(`/repos/${owner}/${repo}/contents/${encodeRepoPath(repoPath)}?ref=${encodeURIComponent(effectiveRef)}`);
  const payload = await response.json();
  const content = Buffer.from(payload.content || "", payload.encoding || "base64").toString("utf8");
  return {
    sha: payload.sha,
    content,
    path: payload.path,
    htmlUrl: payload.html_url,
    downloadUrl: payload.download_url,
  };
}

async function saveFile({ repoPath, content, actorName, actorEmail, summary }) {
  const { owner, repo, branch } = getRepoSettings();
  const current = await getFile(repoPath, branch);
  const safeName = normalizeActorName(actorName);
  const safeEmail = normalizeActorEmail(actorEmail, safeName);
  const safeSummary = normalizeSummary(summary);

  const body = {
    message: `${AUDIT_PREFIX} ${safeName}: ${safeSummary}`,
    content: Buffer.from(content, "utf8").toString("base64"),
    sha: current.sha,
    branch,
    committer: {
      name: safeName,
      email: safeEmail,
    },
    author: {
      name: safeName,
      email: safeEmail,
    },
  };

  const response = await requestGitHub(`/repos/${owner}/${repo}/contents/${encodeRepoPath(repoPath)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return response.json();
}

async function listAuditCommits({ repoPath, perPage = 20, global = false }) {
  const { owner, repo, branch } = getRepoSettings();
  const query = new URLSearchParams({
    sha: branch,
    per_page: String(Math.min(Math.max(perPage, 1), 50)),
  });

  if (!global && repoPath) {
    query.set("path", repoPath);
  }

  const response = await requestGitHub(`/repos/${owner}/${repo}/commits?${query.toString()}`);
  const payload = await response.json();
  const commits = Array.isArray(payload) ? payload : [];

  return commits
    .filter((commit) => {
      if (!global) return true;
      const message = commit?.commit?.message || "";
      return message.startsWith(AUDIT_PREFIX);
    })
    .map((commit) => ({
      sha: commit.sha,
      shortSha: String(commit.sha || "").slice(0, 7),
      message: commit?.commit?.message || "",
      actorName: commit?.commit?.author?.name || "Unknown",
      actorEmail: commit?.commit?.author?.email || "",
      date: commit?.commit?.author?.date || "",
      url: commit?.html_url || "",
    }));
}

async function rollbackFile({ repoPath, targetCommitSha, actorName, actorEmail }) {
  const snapshot = await getFile(repoPath, targetCommitSha);
  const safeName = normalizeActorName(actorName);
  const message = `Rollback ${path.basename(repoPath)} to ${String(targetCommitSha).slice(0, 7)}`;

  return saveFile({
    repoPath,
    content: snapshot.content,
    actorName: safeName,
    actorEmail,
    summary: message,
  });
}

module.exports = {
  AUDIT_PREFIX,
  ensureAllowedPath,
  getAllowedFiles,
  getRepoSettings,
  getFile,
  listAuditCommits,
  loadEditorConfig,
  rollbackFile,
  saveFile,
};
