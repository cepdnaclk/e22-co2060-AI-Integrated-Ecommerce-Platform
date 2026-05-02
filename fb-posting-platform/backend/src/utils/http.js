async function httpRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const err = new Error(data?.error?.message || `HTTP ${response.status}`);
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return data;
}

module.exports = { httpRequest };
