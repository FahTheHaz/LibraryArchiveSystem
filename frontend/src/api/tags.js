import { TAGS_BASE as BASE } from "./config";

export async function getFileTags(fileID) {
  const res = await fetch(`${BASE}/tag_read.php?fileID=${fileID}`, {
    credentials: "include",
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function createTag(tagContent, fileID) {
  const res = await fetch(`${BASE}/tag_create.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagContent, fileID }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function voteTag(tagID, vote) {
  const res = await fetch(`${BASE}/tag_vote.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagID, vote }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function detachTag(tagID, fileID) {
  const res = await fetch(`${BASE}/tag_detach.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagID, fileID }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function deleteTag(tagID) {
  const res = await fetch(`${BASE}/tag_delete.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagID }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}