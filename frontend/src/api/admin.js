import { ADMIN_BASE as BASE } from "./config";

export async function getUsers(role) {
  const res = await fetch(`${BASE}/users.php?role=${role}`, { credentials: "include" });
  let data;
  try { data = await res.json(); } catch { data = { error: "Invalid server response." }; }
  return { ok: res.ok, status: res.status, data };
}

export async function setUserStatus(userID, action) {
  const res = await fetch(`${BASE}/users.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userID, action }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function verifyUser(userID) {
  const res = await fetch(`${BASE}/users.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userID, action: "verify" }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function rejectUser(userID) {
  const res = await fetch(`${BASE}/users.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userID, action: "reject" }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function getActivityLogs(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined))
  ).toString();
  const url = `${BASE}/activity.php${qs ? "?" + qs : ""}`;
  const res = await fetch(url, { credentials: "include" });
  let data;
  try { data = await res.json(); } catch { data = { error: "Invalid server response." }; }
  return { ok: res.ok, status: res.status, data };
}

export async function getTopDownloads() {
  const res = await fetch(`${BASE}/activity.php?top10=1`, { credentials: "include" });
  let data;
  try { data = await res.json(); } catch { data = { error: "Invalid server response." }; }
  return { ok: res.ok, status: res.status, data };
}
