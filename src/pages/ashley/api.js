/* Backend client for /ashley — the client transition tracker.
 *
 * Unlike the rest of this site's tools, every endpoint here needs a bearer
 * token; the shell in index.jsx shows the login screen until there is one. The
 * token is stored under a key of its own so clearing it can never disturb the
 * betting PIN in bv_autobet_pin. */

const API_BASE = "https://sheline-art-website-api.herokuapp.com/ashley";
const TOKEN_KEY = "ash_token";

export const getToken = () => window.localStorage.getItem(TOKEN_KEY) || "";
export const setToken = (t) => window.localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => window.localStorage.removeItem(TOKEN_KEY);

/* Called when the backend rejects the token, so the shell can drop straight to
 * the login screen instead of every screen rendering its own 401 error. */
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection.", 0);
  }

  // An expired 30-day session lands here; kick the whole app back to login.
  if (res.status === 401 && path !== "/login" && path !== "/register") {
    clearToken();
    onUnauthorized();
    throw new ApiError("Your session expired — please sign in again.", 401);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    /* The backend's global error handler does res.json(err), and a thrown Error
     * serializes to {} — so an empty body means the server threw, not that it
     * sent an empty message. Say something useful either way. */
    const message =
      (data && data.error) ||
      (res.status >= 500
        ? `The server hit an error (${res.status}). Try again in a moment.`
        : `Request failed (${res.status}).`);
    throw new ApiError(message, res.status);
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body ?? {}),
  patch: (path, body) => request("PATCH", path, body),
  put: (path, body) => request("PUT", path, body),
  del: (path) => request("DELETE", path),

  /* CSV comes back as a file, not JSON, so it needs its own path — fetched with
   * the auth header and saved from a blob rather than by navigating to a URL
   * with the token in the query string, which would leak it into history. */
  async downloadCsv(type) {
    const res = await fetch(`${API_BASE}/export?type=${encodeURIComponent(type)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.status === 401) {
      clearToken();
      onUnauthorized();
      throw new ApiError("Your session expired — please sign in again.", 401);
    }
    if (!res.ok) throw new ApiError(`Export failed (${res.status}).`, res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ashley-${type}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    /* Deferred, not revoked in the same tick: Chrome starts the download
     * synchronously so an immediate revoke is fine there, but iOS Safari — the
     * phone this is built for — can cancel a save whose blob URL vanished before
     * it read it. */
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
