/* The memory quota of the dyno /health reports on, in MB.
 *
 * WHY THIS IS A MODULE AND NOT A CONSTANT IN EACH PAGE.
 *
 * It was a constant in each page — `const QUOTA_MB = 1024` in both
 * pages/status/index.jsx and components/BackendHealthStrip.jsx — and when the
 * backend was resized to Performance-M on 2026-09-12 neither was updated. Both
 * then rendered "RSS 1401 MB — 137% of the 1024 MB quota — R14" against a dyno
 * sitting at 55% of a 2560 MB quota, with zero R14 lines in `heroku logs`. The
 * strip says it on /morning-review, the first page opened each day.
 *
 * That is the failure mode both files exist to prevent, pointed at themselves:
 * a status page that cries wolf is worse than no status page, because the next
 * real climb reads as more of the same. The number now lives in one place.
 *
 * PREFER THE LIVE VALUE. The dyno already knows its own quota — /health/memory
 * reads it from the cgroup and reports it as `cgroup.limit_mb` (2560 today). It
 * is not in /health's smaller `mem` block yet, and this deliberately does NOT
 * fetch the second endpoint to get it: both callers poll on a timer, both carry
 * comments about a status page that must not add load to the thing it measures,
 * and doubling every poll to read a number that changes once a year is the
 * wrong trade. So this reads a quota field if one is ever added to `mem`, and
 * otherwise falls back. If that field appears, this drift closes for good and
 * no caller changes.
 *
 * Until then FALLBACK_QUOTA_MB is the one value here that a dyno resize
 * invalidates. It is the whole bug. If you resize, change it.
 */

// Performance-M, since 2026-09-12. Standard-2X was 1024.
export const FALLBACK_QUOTA_MB = 2560;

/* Pass the `mem` block of a /health response. Absent, unparseable, or a dyno
 * that reported something nonsensical all land on the fallback rather than
 * producing an Infinity/NaN percentage — every caller divides by this. */
export const quotaMb = (mem) => {
  const live = mem?.quota_mb ?? mem?.cgroup_limit_mb;
  return Number.isFinite(live) && live > 0 ? live : FALLBACK_QUOTA_MB;
};

/* THE SECOND THRESHOLD, AND WHY A PERCENTAGE IS NOT ENOUGH.
 *
 * The bands below used to be purely quota-relative: warn at 85%, bad at 100%.
 * On a 1024 MB Standard-2X that warned at 870 MB, which was under this app's
 * normal resting size — it was always going to fire. On a 2560 MB
 * Performance-M the same 85% warns at 2176 MB, and the resize moved it there
 * silently. So a regression back to the 1930 MB idle peak measured during the
 * 2026-09-12 outage now renders GREEN at 75%, which is exactly the blind spot
 * this page was built to remove.
 *
 * The two thresholds answer different questions and both are worth having:
 *   - the PERCENTAGE asks "how close to R14" — a property of the dyno, and it
 *     should keep moving when the dyno is resized.
 *   - REGRESSION_MB asks "is this process bigger than it has ever normally
 *     been" — a property of the APP, and resizing the dyno does not make a
 *     process that has doubled in size fine.
 *
 * 1900 is deliberately conservative. Measured steady state on Performance-M is
 * 1300-1450 MB, and 1930 MB is the idle peak recorded during an actual outage,
 * so this can only fire on something genuinely unprecedented and cannot cry
 * wolf at today's normal. That caution is the point: the whole lesson of the
 * stale 1024 above is that a status page nobody believes is worse than none.
 *
 * It is a floor set from a handful of short-uptime samples, though — there is
 * no multi-day observation of this app on this dyno yet. If normal drift turns
 * out to reach it, RAISE it rather than deleting it.
 */
export const REGRESSION_MB = 1900;

export const rssTone = (rss, quota) => {
  if (!Number.isFinite(rss)) return "idle";
  if (rss / quota >= 1) return "bad";
  return rss / quota >= 0.85 || rss >= REGRESSION_MB ? "warn" : "ok";
};
