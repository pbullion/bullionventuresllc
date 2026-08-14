/* Backend client for /patrick — the project board.
 *
 * There is no login and no access code (see the header of
 * routes/patrickBoard.js), so this file is only a fetch wrapper: no token, no
 * code header, nothing stored in localStorage. */

/* Production URL, hardcoded like every other page in this repo.
 *
 * The one addition, copied from src/pages/prospects/api.js: when the page is
 * SERVED from localhost, talk to a backend on localhost too. This repo's
 * read-only screens hit production from a dev server quite happily — but this
 * one writes, and pointing a local dev session at the live board means a UI
 * experiment reorders the real list. Run the backend with
 * `node scripts/patrick-board-local.js` in the sheline-art-website-api repo.
 *
 * Guarded on hostname, so a deployed build never takes this branch. Override the
 * port with ?api=PORT. Port 3003, because 3001 is /ashley's and 3002 /prospects'
 * — all three can run at once. */
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const isLocal = typeof window !== "undefined" && LOCAL_HOSTS.includes(window.location.hostname);
const localPort =
  (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("api")) ||
  "3003";
const API_BASE = isLocal
  ? `http://localhost:${localPort}/patrick-board`
  : "https://sheline-art-website-api.herokuapp.com/patrick-board";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Couldn't reach the server.", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    /* The backend's global error handler does res.json(err), and a thrown Error
     * serializes to {} — so an empty body means the server threw, not that it
     * sent an empty message. Say something useful either way. */
    const message =
      (data && data.error) ||
      (res.status >= 500
        ? `The server hit an error (${res.status}).`
        : `Request failed (${res.status}).`);
    throw new ApiError(message, res.status);
  }
  return data;
}

export const api = {
  state: () => request("GET", "/state"),

  createProject: (body) => request("POST", "/projects", body),
  updateProject: (id, body) => request("PATCH", `/projects/${id}`, body),
  deleteProject: (id) => request("DELETE", `/projects/${id}`),
  restoreProject: (id) => request("POST", `/projects/${id}/restore`, {}),
  clearDone: (id) => request("POST", `/projects/${id}/clear-done`, {}),

  createTask: (body) => request("POST", "/tasks", body),
  updateTask: (id, body) => request("PATCH", `/tasks/${id}`, body),
  deleteTask: (id) => request("DELETE", `/tasks/${id}`),
  restoreTasks: (ids) => request("POST", "/tasks/restore", { ids }),
};
