const BASE = "http://localhost/LAS/backend/api/accounts";

export async function login(username, password) {
  const res = await fetch(`${BASE}/login.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function logout() {
  const res = await fetch(`${BASE}/logout.php`, {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}

export async function register(payload) {
  const res = await fetch(`${BASE}/registration.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function getAccountInfo() {
  const res = await fetch(`${BASE}/update.php`, { credentials: "include" });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function updateAccount(payload) {
  const res = await fetch(`${BASE}/update.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function forgotPassword(email) {
  const res = await fetch(`${BASE}/pass_forgot.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function resetPassword(token, password, confirmPassword) {
  const res = await fetch(`${BASE}/pass_reset.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password, confirmPassword }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}
// Balls
// pretending to work.com
// Initialising bulls and horse game

