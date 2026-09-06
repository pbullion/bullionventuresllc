/* Thin wrapper over the /wine-tasting router on the shared Sheline backend.
 * Hardcoded production URL like every other page here — this repo has no env
 * vars (see CLAUDE.md), so local dev talks to production too. */

const API_BASE = "https://sheline-art-website-api.herokuapp.com/wine-tasting";

/* Every request is bounded and retried once.
 *
 * Both exist because of a real failure during setup on 2026-09-05: the shared
 * dyno restarted at the exact moment a ballot was submitted, the POST never
 * came back, and the button sat on "Sending…" forever with nothing to tell the
 * person holding the phone. fetch() has NO default timeout — a request to a
 * host that accepts the connection and then goes away is pending until the
 * browser gives up, which can be minutes.
 *
 * The retry is safe on every endpoint here: reads are reads, and the two writes
 * that matter are upserts keyed by something the caller supplies (the taster's
 * name plus their own edit token, the event code), so doing one twice is
 * indistinguishable from doing it once. Only network-shaped failures are
 * retried — a 400 or a 409 is an answer, not a blip. */
const TIMEOUT_MS = 12000;

async function once(path, { method, body, pin }) {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(pin ? { "x-tasting-pin": pin } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: control.signal,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      /* A gateway error page isn't JSON. Fall through to the status message. */
    }
    if (!res.ok) {
      const err = new Error(
        (data && data.error) || `The server said no (${res.status}).`,
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/* Backoff measured against the thing actually going wrong. On 2026-09-05 the
 * shared dyno was sitting at ~1070MB against a 1088MB ceiling and cycling every
 * few minutes; a restart drops in-flight requests and takes roughly ten to
 * twenty seconds to answer again. One immediate retry lands inside that window
 * and fails too, so the waits step out past it. Four attempts spanning ~17s,
 * with each attempt itself bounded at 12s. */
const BACKOFF_MS = [400, 2500, 8000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(path, { method = "GET", body, pin } = {}) {
  let last = null;
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    try {
      return await once(path, { method, body, pin });
    } catch (err) {
      // A response with a status is an answer — surface it, don't retry it.
      if (err.status) throw err;
      last = err;
      if (attempt < BACKOFF_MS.length) await sleep(BACKOFF_MS[attempt]);
    }
  }
  throw new Error(
    "Couldn't reach the server after a few tries — it may be restarting. Wait about half a minute and press the button again; nothing you typed is lost.",
    { cause: last },
  );
}

export const createEvent = (body) => call("/events", { method: "POST", body });
export const getEvent = (code) => call(`/events/${code}`);
export const getResults = (code) => call(`/events/${code}/results`);
export const submitBallot = (code, body) =>
  call(`/events/${code}/ballot`, { method: "POST", body });

export const getHostView = (code, pin) => call(`/events/${code}/host`, { pin });
export const setWines = (code, pin, wines) =>
  call(`/events/${code}/wines`, { method: "POST", pin, body: { wines } });
export const setHostPin = (code, pin, newPin) =>
  call(`/events/${code}/pin`, { method: "POST", pin, body: { new_pin: newPin } });
export const setRoster = (code, pin, roster) =>
  call(`/events/${code}/roster`, { method: "POST", pin, body: { roster } });
export const setPour = (code, pin, pourMap) =>
  call(`/events/${code}/pour`, { method: "POST", pin, body: { pour_map: pourMap } });
export const setPhase = (code, pin, phase) =>
  call(`/events/${code}/phase`, { method: "POST", pin, body: { phase } });
export const deleteBallot = (code, pin, id) =>
  call(`/events/${code}/ballots/${id}`, { method: "DELETE", pin });

/* ── Local remembering ────────────────────────────────────────────────────────
 * Two things live in localStorage, both per-event and both per-device:
 *   - the taster's name and edit token, so they can correct their own ballot
 *     and nobody else can overwrite it (the backend enforces the token);
 *   - the host PIN, so the host isn't retyping it between the wines screen and
 *     the reveal with a room waiting.
 * Every accessor is wrapped: a phone in private mode throws on read AND write,
 * and a tasting that can't remember you still has to work. */

function safeGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* out of quota, or private mode — carry on unsaved */
  }
}

/* Created before the FIRST submission, not after it, so that a retry carries the
 * same token and lands on the same row. See the note on retries above. */
export function editToken(code) {
  const key = `wt_token_${code}`;
  const existing = safeGet(key);
  if (existing) return existing;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  safeSet(key, token);
  return token;
}

export const loadMe = (code) => safeGet(`wt_me_${code}`);
export const saveMe = (code, me) => safeSet(`wt_me_${code}`, me);
export const loadPin = (code) => safeGet(`wt_pin_${code}`);
export const savePin = (code, pin) => safeSet(`wt_pin_${code}`, pin);
