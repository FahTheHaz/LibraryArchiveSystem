const BASE = "http://localhost/LAS/backend/api/admin";

export async function getUsers(role) {
  const res = await fetch(`${BASE}/users.php?role=${role}`, { credentials: "include" });
  let data;
  try { data = await res.json(); } catch { data = { error: "Invalid server response." }; }
  return { ok: res.ok, status: res.status, data };
}

// getUsers fetches the list of users from the backend. It returns an object with:
// - ok: whether the HTTP response status is in the 200-299 range
// - status: the actual HTTP status code (e.g. 200, 401, 403)
// - data: the parsed JSON response from the server, which should contain either the users or an error message.

export async function setUserStatus(userID, action) {
  const res = await fetch(`${BASE}/users.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userID, action }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}
