/* Backend client for /pollen.
 *
 * Two things are stored in localStorage and nothing else:
 *
 *   pollen_zip      the last zip searched, so a return visit opens where you left
 *                   off. Falls back to 77018.
 *   pollen_journal  a random id identifying this browser's symptom journal. The
 *                   backend files logs under it and requires it to read them
 *                   back, so it is the ONLY way to reach that data — there is no
 *                   account and no recovery. Clearing site data loses the
 *                   journal, which is the honest tradeoff for a health log that
 *                   asks for no email address. See the access note in
 *                   routes/pollen.js.
 */

/* Production URL, hardcoded like every other page here. When SERVED from
 * localhost, talk to a localhost backend instead — `node scripts/pollen-local.js`
 * in the sheline-art-website-api repo. Guarded on hostname so a deployed build
 * never takes the branch. Port 3004: 3001 is /ashley's, 3002 /prospects',
 * 3003 the project board's, so all four can run at once. Override with ?api=PORT. */
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const isLocal = typeof window !== "undefined" && LOCAL_HOSTS.includes(window.location.hostname);
const localPort =
  (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("api")) ||
  "3004";
const API_BASE = isLocal
  ? `http://localhost:${localPort}/pollen`
  : "https://sheline-art-website-api.herokuapp.com/pollen";

export const DEFAULT_ZIP = "77018";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function journalId() {
  if (typeof window === "undefined") return null;
  let id;
  try {
    id = window.localStorage.getItem("pollen_journal");
  } catch {
    return null; // private mode with storage blocked — the journal just stays off
  }
  if (id) return id;
  // 160 bits of randomness, in the character set the backend's JOURNAL_RE allows.
  // crypto.getRandomValues rather than Math.random: this string is the only thing
  // standing between a symptom log and anyone who wants to guess at one.
  const bytes = new Uint8Array(20);
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  try {
    window.localStorage.setItem("pollen_journal", id);
  } catch {
    /* ignore — the id still works for this session */
  }
  return id;
}

export function rememberZip(zip) {
  try {
    window.localStorage.setItem("pollen_zip", zip);
  } catch {
    /* ignore */
  }
}

export function lastZip() {
  try {
    return window.localStorage.getItem("pollen_zip") || DEFAULT_ZIP;
  } catch {
    return DEFAULT_ZIP;
  }
}

async function request(method, path, body) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  const id = journalId();
  if (id) headers["x-pollen-journal"] = id;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // A dead network and a 500 are different problems and get different words —
    // "check your connection" is useless advice when the server is the one down.
    throw new ApiError("Couldn't reach the forecast server. Check your connection.", 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* an empty or non-JSON body is handled below */
  }
  if (!res.ok) {
    // The shared backend's global error handler serializes a thrown Error to {},
    // so an empty object here means the server threw rather than answered. Say
    // something true instead of rendering "undefined".
    const message =
      (data && data.error) ||
      (res.status >= 500
        ? "The forecast server hit an error. Try again in a minute."
        : `Request failed (${res.status}).`);
    throw new ApiError(message, res.status);
  }
  return data;
}

export const getMeta = () => request("GET", "/meta");

export const getForecast = (zip, { fresh } = {}) =>
  request("GET", `/forecast?zip=${encodeURIComponent(zip)}${fresh ? "&fresh=1" : ""}`);

export const getJournal = () => request("GET", "/journal");

export const saveJournalDay = (day, entry) => request("PUT", `/journal/${day}`, entry);

export const deleteJournalDay = (day) => request("DELETE", `/journal/${day}`);

export const getInsight = (zip) =>
  request("GET", `/journal/insight?zip=${encodeURIComponent(zip)}`);
