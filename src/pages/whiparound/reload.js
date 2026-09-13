/* Reload the page, but only when the site itself answers.
 *
 * A self-reload exists to pick up a deploy on a monitor nobody touches. Fired
 * while the network is down, it swaps a working board — still showing its last
 * good data, with the stale rail saying so — for the browser's own error page,
 * which never comes back by itself.
 *
 * THE PROBE ACCEPTS A 404. Every deep route on bullionventuresllc.com answers
 * HTTP 404 while rendering fine (Amplify serves index.html with that status), so
 * `res.ok` would never be true here. Any answer under 500 means the host is up
 * and a reload will land on the board.
 */
export async function reloadIfReachable() {
  if (navigator.onLine === false) return false;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10_000);
  try {
    const res = await fetch(`${window.location.origin}/`, {
      method: "HEAD",
      cache: "no-store",
      signal: ctl.signal,
    });
    if (res.status >= 500) return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
  window.location.reload();
  return true;
}
