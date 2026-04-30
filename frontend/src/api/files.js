const BASE = "http://localhost/LAS/backend/api/crud";

// ─── Files ────────────────────────────────────────────────────────────────────

export async function getFiles(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/read.php${query ? "?" + query : ""}`, {
    credentials: "include",
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function uploadFile(formData) {
  const res = await fetch(`${BASE}/create.php`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function bulkUploadFiles(formData) {
  const res = await fetch(`${BASE}/bulk_upload.php`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function updateFile(id, payload) {
  const res = await fetch(`${BASE}/update.php?id=${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function deleteFile(id, action = "delete") {
  const res = await fetch(`${BASE}/delete.php?id=${id}&action=${action}`, {
    method: "POST",
    credentials: "include",
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function bulkDeleteFiles(ids, action = "delete") {
  const results = await Promise.allSettled(
    ids.map((id) => deleteFile(id, action))
  );
  return results.map((r, i) => ({
    fileID: ids[i],
    ...(r.status === "fulfilled" ? r.value : { ok: false, data: { error: r.reason?.message } }),
  }));
}

export function getDownloadUrl(id) {
  return `${BASE}/download.php?id=${id}&mode=inline`;
}

export function getForceDownloadUrl(id) {
  return `${BASE}/download.php?id=${id}`;
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export async function getFolders() {
  const res = await fetch(`${BASE}/folders.php`, { credentials: "include" });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function createFolder(folderName, parentID = null) {
  const res = await fetch(`${BASE}/folders.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", folderName, parentID }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function renameFolder(folderID, newName) {
  const res = await fetch(`${BASE}/folders.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "rename", folderID, newName }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function moveFolder(folderID, newParentID = null) {
  const res = await fetch(`${BASE}/folders.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "move", folderID, newParentID }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function deleteFolder(folderID) {
  const res = await fetch(`${BASE}/folders.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", folderID }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}
