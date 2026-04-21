// API functions for authentication-related operations



const BASE = "http://localhost/LAS/backend/api/accounts";

export async function login(username, password) {
  // TODO: handle errors and return more info
  // What does const res does?
  // It sends a POST request to the login.php endpoint with the provided username and password, and includes credentials (like cookies) in the request. The response is stored in the variable res.
  const res = await fetch(`${BASE}/login.php`, {
    method: "POST",
    credentials: "include", 
    // What does credentials: "include" do?
      // credentials: "include" is an option in the fetch API that allows the request to include credentials such as cookies, authorization headers, or TLS client certificates. 
      // This is necessary for maintaining user sessions and authentication when making requests to the server.

    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
  // The returned object includes:
    // - ok: a boolean indicating if the login was successful (true if status code is 200-299)
    // - status: the HTTP status code of the response
    // - data: the parsed JSON data from the response, which may include user information or error messages.
}

export async function logout() {
  const res = await fetch(`${BASE}/logout.php`, {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
  // what does res.ok do?
    // res.ok is a boolean property of the response object that indicates whether the HTTP request was successful (status code in the range 200-299).
    // If res.ok is true, it means the logout request was successful; if false, it indicates a failure.
}

// what does res.status do?
  // res.status is a property of the response object that contains the HTTP status code returned by the server. It indicates the result of the HTTP request, such as 200 for success, 401 for unauthorized, 404 for not found, etc.
  // This status code can be used to determine how to handle the response in the application.
// 

// what does res.json() do?
  // res.json() is a method of the response object that parses the response body as JSON and returns a promise that resolves to a JavaScript object. It is used to extract the data from the response when the server sends back JSON-formatted data. 
  // For example, if the server responds with a JSON object containing user information, calling res.json() will allow you to access that information as a JavaScript object in your code.

export async function register(cumload) {
  // What does cumload do?
  // The cumload is an object that contains the data needed for registration, such as username, email, password, etc. It is sent in the body of the POST request to the registration endpoint. The server will use this data to create a new user account.
  // for inquiry, cumload is named intutively to signify the info carried as a user registers.
  const res = await fetch(`${BASE}/registration.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cumload),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
  // Does res,json return the user input here?
    // res.json() will return the JSON data sent back by the server in response to the registration request. This data may include information about the newly registered user, such as their username, email, or a success message.
    // It does not return the user input directly, but rather the server's response to that input.
}

export async function getAccountInfo() {
  const res = await fetch(`${BASE}/update.php`, { credentials: "include" });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function updateAccount(cumload) {
  const res = await fetch(`${BASE}/update.php`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cumload),
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

// example fo this being used:
// In ResetPasswordPage.jsx:
// const { ok, data } = await resetPassword(token, form.password, form.confirmPassword);
// In AccountPage.jsx:
// const { ok, data } = await updateAccount(payload);

