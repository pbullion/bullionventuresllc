/* Thin wrapper over the /wine-tasting router on the shared Sheline backend.
 * Hardcoded production URL like every other page here — this repo has no env
 * vars (see CLAUDE.md), so local dev talks to production too. */

const API_BASE = "https://sheline-art-website-api.herokuapp.com/wine-tasting";

async function call(path, { method = "GET", body, pin } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(pin ? { "x-tasting-pin": pin } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* A gateway error page isn't JSON. Fall through to the status-based message. */
  }
  if (!res.ok) {
    const err = new Error(
      (data && data.error) || `Request failed (${res.status})`,
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
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

export const loadMe = (code) => safeGet(`wt_me_${code}`);
export const saveMe = (code, me) => safeSet(`wt_me_${code}`, me);
export const loadPin = (code) => safeGet(`wt_pin_${code}`);
export const savePin = (code, pin) => safeSet(`wt_pin_${code}`, pin);
