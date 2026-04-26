const editorStatusEl = document.getElementById("editorStatus");
const editorRepoEl = document.getElementById("editorRepo");
const editorBranchEl = document.getElementById("editorBranch");
const editorShaEl = document.getElementById("editorSha");
const editorDescriptionEl = document.getElementById("editorDescription");
const actorNameInput = document.getElementById("actorName");
const actorEmailInput = document.getElementById("actorEmail");
const changeSummaryInput = document.getElementById("changeSummary");
const filePickerEl = document.getElementById("filePicker");
const selectedPathEl = document.getElementById("selectedPath");
const selectedDescriptionEl = document.getElementById("selectedDescription");
const editorContentEl = document.getElementById("editorContent");
const reloadFileButton = document.getElementById("reloadFile");
const saveChangesButton = document.getElementById("saveChanges");
const refreshAuditButton = document.getElementById("refreshAudit");
const refreshGlobalAuditButton = document.getElementById("refreshGlobalAudit");
const rollbackCommitEl = document.getElementById("rollbackCommit");
const rollbackSummaryEl = document.getElementById("rollbackSummary");
const rollbackButton = document.getElementById("rollbackButton");
const auditListEl = document.getElementById("auditList");

let editorConfig = null;
let currentFile = null;
let currentAudit = [];

function setStatus(text, state) {
  editorStatusEl.textContent = text;
  editorStatusEl.classList.remove("ok", "warn");
  if (state) {
    editorStatusEl.classList.add(state);
  }
}

function shortSha(sha) {
  return sha ? String(sha).slice(0, 7) : "-";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getSelectedFileEntry() {
  if (!editorConfig) return null;
  return editorConfig.allowedFiles.find((item) => item.repoPath === filePickerEl.value) || null;
}

function getActorPayload() {
  return {
    actorName: actorNameInput.value.trim(),
    actorEmail: actorEmailInput.value.trim(),
    summary: changeSummaryInput.value.trim(),
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

function renderFilePicker() {
  filePickerEl.innerHTML = "";
  editorConfig.allowedFiles.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.repoPath;
    option.textContent = `${item.label} (${item.publicPath})`;
    filePickerEl.appendChild(option);
  });
}

async function loadConfig() {
  const payload = await fetchJson("/api/editor-config");
  editorConfig = payload;
  editorRepoEl.textContent = `${payload.owner}/${payload.repo}`;
  editorBranchEl.textContent = payload.branch;
  editorDescriptionEl.textContent = payload.description || "";
  renderFilePicker();
}

async function loadFile() {
  const entry = getSelectedFileEntry();
  if (!entry) return;

  selectedPathEl.textContent = entry.repoPath;
  selectedDescriptionEl.textContent = entry.description || "";
  setStatus(`Loading ${entry.label}...`);

  const payload = await fetchJson(`/api/editor-file?path=${encodeURIComponent(entry.repoPath)}`);
  currentFile = payload;
  editorContentEl.value = payload.content || "";
  editorShaEl.textContent = shortSha(payload.sha);
  setStatus(`${entry.label} loaded`, "ok");
}

function renderRollbackOptions() {
  rollbackCommitEl.innerHTML = "";

  if (!currentAudit.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No previous revisions found";
    rollbackCommitEl.appendChild(option);
    rollbackSummaryEl.textContent = "-";
    rollbackButton.disabled = true;
    return;
  }

  currentAudit.forEach((commit) => {
    const option = document.createElement("option");
    option.value = commit.sha;
    option.textContent = `${commit.shortSha} - ${commit.actorName} - ${commit.message.slice(0, 72)}`;
    rollbackCommitEl.appendChild(option);
  });

  rollbackButton.disabled = false;
  updateRollbackSummary();
}

function updateRollbackSummary() {
  const selected = currentAudit.find((item) => item.sha === rollbackCommitEl.value);
  rollbackSummaryEl.textContent = selected
    ? `${selected.shortSha} by ${selected.actorName} on ${formatDate(selected.date)}`
    : "-";
}

function renderAuditList(commits) {
  if (!commits.length) {
    auditListEl.innerHTML = `<div class="empty-state">No public editor commits found yet.</div>`;
    return;
  }

  auditListEl.innerHTML = "";
  commits.forEach((commit) => {
    const item = document.createElement("div");
    item.className = "audit-item";
    item.innerHTML = `
      <div class="audit-item-head">
        <strong>${commit.actorName}</strong>
        <span class="mono">${commit.shortSha}</span>
      </div>
      <p>${commit.message}</p>
      <div class="audit-meta">
        <span>${formatDate(commit.date)}</span>
        <a class="btn-secondary" href="${commit.url}" target="_blank" rel="noopener noreferrer">View Commit</a>
      </div>
    `;
    auditListEl.appendChild(item);
  });
}

async function loadFileAudit() {
  const entry = getSelectedFileEntry();
  if (!entry) return;

  const payload = await fetchJson(`/api/editor-audit?path=${encodeURIComponent(entry.repoPath)}&limit=15`);
  currentAudit = payload.commits || [];
  renderRollbackOptions();
}

async function loadGlobalAudit() {
  const payload = await fetchJson("/api/editor-audit?scope=global&limit=20");
  renderAuditList(payload.commits || []);
}

async function saveChanges() {
  const entry = getSelectedFileEntry();
  if (!entry) return;

  saveChangesButton.disabled = true;
  try {
    setStatus(`Publishing ${entry.label}...`);
    const payload = await fetchJson("/api/editor-save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: entry.repoPath,
        content: editorContentEl.value,
        ...getActorPayload(),
      }),
    });

    editorShaEl.textContent = shortSha(payload.contentSha);
    setStatus(`Published ${entry.label}. Commit ${shortSha(payload.commitSha)} is live.`, "ok");
    await Promise.all([loadFileAudit(), loadGlobalAudit()]);
  } catch (error) {
    setStatus(error.message || "Could not publish change", "warn");
  } finally {
    saveChangesButton.disabled = false;
  }
}

async function rollbackSelectedFile() {
  const entry = getSelectedFileEntry();
  const targetCommitSha = rollbackCommitEl.value;
  if (!entry || !targetCommitSha) return;

  rollbackButton.disabled = true;
  try {
    setStatus(`Rolling back ${entry.label}...`);
    const payload = await fetchJson("/api/editor-rollback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: entry.repoPath,
        targetCommitSha,
        actorName: actorNameInput.value.trim(),
        actorEmail: actorEmailInput.value.trim(),
      }),
    });

    editorShaEl.textContent = shortSha(payload.contentSha);
    setStatus(`Rollback published. Commit ${shortSha(payload.commitSha)} is live.`, "ok");
    await Promise.all([loadFile(), loadFileAudit(), loadGlobalAudit()]);
  } catch (error) {
    setStatus(error.message || "Could not rollback file", "warn");
  } finally {
    rollbackButton.disabled = false;
  }
}

async function changeSelectedFile() {
  try {
    await Promise.all([loadFile(), loadFileAudit()]);
  } catch (error) {
    setStatus(error.message || "Could not load selected file", "warn");
  }
}

async function initEditor() {
  try {
    await loadConfig();
    if (editorConfig.allowedFiles.length) {
      filePickerEl.value = editorConfig.allowedFiles[0].repoPath;
    }
    await Promise.all([changeSelectedFile(), loadGlobalAudit()]);
  } catch (error) {
    setStatus(error.message || "Editor failed to initialize", "warn");
    auditListEl.innerHTML = `<div class="empty-state">Editor APIs are not ready yet.</div>`;
    return;
  }

  filePickerEl.addEventListener("change", changeSelectedFile);
  reloadFileButton.addEventListener("click", changeSelectedFile);
  saveChangesButton.addEventListener("click", saveChanges);
  refreshAuditButton.addEventListener("click", loadFileAudit);
  refreshGlobalAuditButton.addEventListener("click", loadGlobalAudit);
  rollbackCommitEl.addEventListener("change", updateRollbackSummary);
  rollbackButton.addEventListener("click", rollbackSelectedFile);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEditor);
} else {
  initEditor();
}
