const BASE_URL = 'http://localhost/LAS/backend/api/';

export async function getJSON(path){ // what does this do?
    // This function takes a path (e.g., 'read.php') and makes a GET request to the corresponding API endpoint. It then checks if the response is successful (status code 200-299) and returns the parsed JSON data. If the response is not successful, it throws an error with the HTTP status code.
    const res = await fetch(BASE_URL + path);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();

}

export async function postJSON(path, data, method='POST'){

    // This function takes a path (e.g., 'update.php'), a data object, and an optional HTTP method (default is 'POST'). It sends the data as a JSON payload to the specified API endpoint using the fetch API. It checks if the response is successful and returns the parsed JSON data. If the response is not successful, it throws an error with the HTTP status code.
    const res = await fetch(BASE_URL + path, {
        method: method,
        headers: {
            'Content-Type': 'application/json'      },  
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();

}

export async function uploadFile(path, formData) {
  const res = await fetch(BASE_URL + path, {
    method: 'POST',
    body: formData,   // no Content-Type header — browser sets it with boundary
  });
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}
