const BASE = "http://localhost/LAS/backend/api/crud";

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
    body: formData, // multipart — do NOT set Content-Type header manually
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

export function getDownloadUrl(id) {
  return `${BASE}/download.php?id=${id}`;
}
