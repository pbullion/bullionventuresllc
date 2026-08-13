/* Backend client for /prospects — the Houston C&I prospect book.
 *
 * There is no login here (see the header of routes/prospects.js). The backend
 * CAN be gated on a shared code by setting PROSPECTS_ACCESS_CODE on Heroku; when
 * that is on, GET /meta reports codeRequired and the shell prompts once, storing
 * the answer under a key of its own so clearing it can never disturb the
 * betting PIN in bv_autobet_pin or Ashley's token in ash_token. */

/* Production URL, hardcoded like every other page in this repo.
 *
 * The one addition: when the page is SERVED from localhost, talk to a backend on
 * localhost too. This repo's other pages hit production from a dev server, which
 * is fine for read-only screens — but this one writes prospect records, and
 * pointing a local dev session at the live database is a bad default for a tool
 * someone types real notes into. Run the backend with
 * `node scripts/prospects-local.js` in the sheline-art-website-api repo.
 *
 * Guarded on hostname, so a deployed build never takes this branch. Override the
 * port with ?api=PORT. Port 3002, because 3001 is /ashley's — both can run. */
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const isLocal = typeof window !== "undefined" && LOCAL_HOSTS.includes(window.location.hostname);
const localPort =
  (typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("api")) ||
  "3002";
const API_BASE = isLocal
  ? `http://localhost:${localPort}/prospects`
  : "https://sheline-art-website-api.herokuapp.com/prospects";

const CODE_KEY = "pros_code";

export const getCode = () => window.localStorage.getItem(CODE_KEY) || "";
export const setCode = (c) => window.localStorage.setItem(CODE_KEY, c);
export const clearCode = () => window.localStorage.removeItem(CODE_KEY);

/* Called when the backend rejects the code, so the shell can prompt once
 * instead of every screen rendering its own 401. */
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
  const code = getCode();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(code ? { "X-Prospects-Code": code } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection.", 0);
  }

  // /meta is ungated on purpose — it is how we learn a code is needed at all, so
  // a 401 there would be a real server problem, not a missing code.
  if (res.status === 401 && path !== "/meta") {
    clearCode();
    onUnauthorized();
    throw new ApiError("That access code didn't work.", 401);
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
  del: (path) => request("DELETE", path),

  /* CSV comes back as a file, not JSON, so it needs its own path — fetched with
   * the code header and saved from a blob rather than by navigating to a URL
   * with the code in the query string, which would leak it into history. */
  async downloadCsv(type) {
    const res = await fetch(`${API_BASE}/export?type=${encodeURIComponent(type)}`, {
      headers: { ...(getCode() ? { "X-Prospects-Code": getCode() } : {}) },
    });
    if (res.status === 401) {
      clearCode();
      onUnauthorized();
      throw new ApiError("That access code didn't work.", 401);
    }
    if (!res.ok) throw new ApiError(`Export failed (${res.status}).`, res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospects-${type}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    /* Deferred, not revoked in the same tick: Chrome starts the download
     * synchronously so an immediate revoke is fine there, but iOS Safari — the
     * phone this is built for — can cancel a save whose blob URL vanished
     * before it read it. */
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
