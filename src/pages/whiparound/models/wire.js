/* The JSON reading rules every model here uses — ports of the `opt*` helpers in
 * whiparound-firetv's Models.kt, so a field the Fire TV reads as absent is
 * absent here too.
 *
 * Every read is tolerant. The backend composes a dozen upstreams, any of which
 * can drop a record, a broadcast or a score, and a board that throws because
 * one game had no television listing is worse than one with a gap in it.
 */

export function isObj(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/// `optJSONObject` — null for absent, null, or not an object.
export function obj(o, key) {
  const v = isObj(o) ? o[key] : undefined;
  return isObj(v) ? v : null;
}

/// `optJSONArray` — null for absent, null, or not an array.
export function arr(o, key) {
  const v = isObj(o) ? o[key] : undefined;
  return Array.isArray(v) ? v : null;
}

/// The objects in an array, skipping anything that is not one (`JSONArray.map`).
export function objects(o, key) {
  return (arr(o, key) ?? []).filter(isObj);
}

/// `strOrNull` — absent, null and "" are all null; a number reads as its digits.
export function str(o, key) {
  if (!isObj(o)) return null;
  const v = o[key];
  if (typeof v === "string") return v === "" ? null : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

/// `intOrNull` — truncates a fractional number, reads a numeric string.
export function int(o, key) {
  const n = dbl(o, key);
  return n == null ? null : Math.trunc(n);
}

/// `doubleOrNull` — a missing number is null, never 0. A projection of nothing
/// and a missing projection are different answers.
export function dbl(o, key) {
  if (!isObj(o)) return null;
  const v = o[key];
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/// `optBoolean(key, fallback)`.
export function bool(o, key, fallback = false) {
  if (!isObj(o)) return fallback;
  const v = o[key];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return fallback;
}

/// The non-empty strings in an array.
export function strings(o, key) {
  return (arr(o, key) ?? [])
    .map((v) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : ""))
    .filter((s) => s !== "");
}
