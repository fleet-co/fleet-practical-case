
/**
 * Wrapper around the native `fetch` that prepends the API base URL,
 * sets JSON headers by default, and throws on non-2xx responses
 * with the server error message when available.
 */
export const apiFetch = async (path, options = {}) => {
  const url = `/api${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed with status ${res.status}`);
  }

  return res.json();
};
