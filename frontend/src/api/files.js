const BASE = "http://localhost/LAS/backend/api/crud";

export async function getFiles(params = {}) {
  const query = new URLSearchParams(params).toString();
  // URLSearchParams is a built-in JavaScript class that provides a way to work with the query string of a URL.
  // It allows you to easily create and manipulate query parameters. 
  // In this code, we create a new instance of URLSearchParams with the provided params object, which converts the key-value pairs into a query string format (e.g., "key1=value1&key2=value2"). The resulting query string is then appended to the API endpoint URL when making the fetch request to retrieve files based on the specified parameters.
  const res = await fetch(`${BASE}/read.php${query ? "?" + query : ""}`, {
    credentials: "include",
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}
// example of params: { type: "PAPER", search: "report" } will result in a query string of "?type=PAPER&search=report"
// Does res,json() return the files data here?
  // Yes, res.json() parses the response body as JSON and returns a JavaScript object containing the files data or any other information sent by the server in response to the getFiles request.
  // This allows the application to access details about the retrieved files or any error messages if the request failed.

export async function uploadFile(formData) {
  const res = await fetch(`${BASE}/create.php`, {
    method: "POST",
    credentials: "include",
    body: formData, // multipart — do NOT set Content-Type header manually
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}
// Does formdata here contain the file to be uploaded?
  // Yes, formData is an instance of FormData that contains the file to be uploaded along with any other necessary data (e.g., title, description).
  // When the uploadFile function is called, it sends this formData in the body of the POST request to the create.php endpoint, allowing the server to process the file upload accordingly.



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
