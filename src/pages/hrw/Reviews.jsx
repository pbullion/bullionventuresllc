/* The reviews section on a restaurant page.
 *
 * Reviews attach to a PLACE rather than to a row in the spreadsheet, so the six
 * Fadi's locations share one conversation — see places.js. When a place has more
 * than one location that is said out loud, because a review of the Katy branch
 * showing up on the Galleria page is confusing unless the page admits it.
 *
 * One review per browser per place, enforced by the backend's unique index, so
 * the form doubles as the edit form: if this browser has already written one it
 * comes back filled in and posting again replaces it.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { C } from "./theme.js";
import { MEALS, mealLabel } from "./data.js";
import {
  deleteReview,
  formatAvg,
  loadReviews,
  ratingWord,
  readReviewerName,
  saveReview,
  stars,
  writeReviewerName,
} from "./reviews.js";

const BODY_MAX = 1200;

/* "3 days ago", but anything inside a minute is "just now". A review you have
 * only this second posted came back reading "in 0 seconds" — the row is written
 * with the database's clock, which is a hair ahead of the browser's. */
function timeAgo(iso) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return Date.now() - at.getTime() < 60000
    ? "just now"
    : formatDistanceToNowStrict(at, { addSuffix: true });
}

export default function Reviews({ place, slug, siblings = [] }) {
  // Tagged with the place it belongs to, so navigating from one restaurant to
  // the next shows a spinner rather than the previous page's reviews — without
  // an effect that clears state on the way in.
  const [result, setResult] = useState(null);
  const [nonce, setNonce] = useState(0);
  const [edited, setEdited] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const key = place.key;
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    loadReviews(key).then(
      (d) => live && setResult({ key, data: d }),
      (e) => live && setResult({ key, error: e.message }),
    );
    return () => {
      live = false;
    };
  }, [key, nonce]);

  const current = result?.key === key ? result : null;
  const data = current?.data || null;
  const error = current?.error || null;

  const mine = data?.reviews.find((r) => r.mine) || null;

  /* The form starts from whatever this browser already has on file, so "write"
   * and "edit" are one control. Derived rather than copied into state on load:
   * `edited` is null until a key is pressed, and goes back to null after a save,
   * which re-reads the freshly stored review. */
  const stored = useMemo(
    () =>
      mine
        ? {
            rating: mine.rating,
            body: mine.body || "",
            meal: mine.meal || "",
            author: mine.author || "",
          }
        : { rating: 0, body: "", meal: "", author: readReviewerName() },
    [mine],
  );
  const draft = edited || stored;
  const setDraft = (update) => setEdited((prev) => update(prev || stored));

  const submit = async (e) => {
    e.preventDefault();
    if (!draft.rating || busy) return;
    setBusy(true);
    setFormError(null);
    try {
      await saveReview({
        place: key,
        placeName: place.name,
        slug,
        rating: draft.rating,
        body: draft.body.trim(),
        author: draft.author.trim(),
        meal: draft.meal || null,
      });
      writeReviewerName(draft.author.trim());
      setOpen(false);
      setEdited(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!mine || busy) return;
    setBusy(true);
    setFormError(null);
    try {
      await deleteReview(mine.id);
      setOpen(false);
      setEdited(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const n = data?.n ?? 0;

  return (
    <section style={{ marginTop: 34 }} id="reviews">
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          paddingBottom: 12,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.01em" }}>
          Reviews
        </h2>
        {n > 0 && (
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 7 }}>
            <span style={{ fontSize: 19, fontWeight: 800, color: C.goldBright }}>
              {formatAvg(data.avg)}
            </span>
            <span aria-hidden style={{ color: C.gold, fontSize: 14, letterSpacing: 1 }}>
              {stars(data.avg)}
            </span>
            <span style={{ fontSize: 13, color: C.muted }}>
              {n} {n === 1 ? "review" : "reviews"}
            </span>
          </span>
        )}
        {!open && (
          <button
            className="hrw-chip"
            style={{ marginLeft: "auto" }}
            onClick={() => setOpen(true)}
          >
            {mine ? "✎ Edit your review" : "✍️ Write a review"}
          </button>
        )}
      </header>

      {siblings.length > 0 && (
        <p style={{ margin: "12px 0 0", fontSize: 12.5, color: C.muted, lineHeight: 1.65 }}>
          Shared across all {place.count} {place.name} locations — reviews written at{" "}
          {siblings.slice(0, 2).map((s, i) => (
            <span key={s.slug}>
              {i > 0 && ", "}
              <Link to={`/hrw/${s.slug}`} style={{ color: C.dim, textDecoration: "underline" }}>
                {s.neighborhoods[0] || s.name}
              </Link>
            </span>
          ))}
          {siblings.length > 2 && ` and ${siblings.length - 2} more`} show up here too.
        </p>
      )}

      {open && (
        <form
          onSubmit={submit}
          className="hrw-in"
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 16,
            marginTop: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div role="radiogroup" aria-label="Your rating" style={{ display: "flex", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  className="hrw-rate"
                  role="radio"
                  aria-checked={draft.rating === v}
                  aria-label={`${v} out of 5`}
                  data-on={v <= draft.rating ? "true" : undefined}
                  onClick={() => setDraft((d) => ({ ...d, rating: v }))}
                >
                  {v <= draft.rating ? "★" : "☆"}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 13, color: draft.rating ? C.gold : C.muted }}>
              {draft.rating ? ratingWord(draft.rating) : "Tap a star"}
            </span>
          </div>

          <div className="hrw-scroller">
            <span style={{ fontSize: 12.5, color: C.muted, alignSelf: "center", paddingRight: 2 }}>
              Ate:
            </span>
            {MEALS.map((m) => (
              <button
                key={m}
                type="button"
                className="hrw-chip"
                aria-pressed={draft.meal === m ? "true" : undefined}
                onClick={() => setDraft((d) => ({ ...d, meal: d.meal === m ? "" : m }))}
              >
                {mealLabel(m)}
              </button>
            ))}
          </div>

          <textarea
            className="hrw-input"
            rows={4}
            maxLength={BODY_MAX}
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            placeholder="What did you order, and was it worth it?"
            aria-label="Your review"
            style={{ resize: "vertical", lineHeight: 1.5 }}
          />

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="hrw-input"
              style={{ width: "auto", flex: "1 1 180px", fontSize: 14 }}
              value={draft.author}
              maxLength={40}
              onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
              placeholder="Your name (optional)"
              aria-label="Your name, optional"
            />
            <span style={{ fontSize: 11.5, color: C.muted }}>
              {draft.body.length}/{BODY_MAX}
            </span>
          </div>

          {formError && (
            <p style={{ margin: 0, fontSize: 13, color: C.rose }}>{formError}</p>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={!draft.rating || busy}
              style={{
                background: draft.rating ? C.gold : C.surfaceHi,
                color: draft.rating ? "#1a1405" : C.muted,
                border: 0,
                borderRadius: 10,
                padding: "11px 18px",
                fontSize: 14,
                fontWeight: 800,
                fontFamily: "inherit",
                cursor: draft.rating && !busy ? "pointer" : "default",
              }}
            >
              {busy ? "Saving…" : mine ? "Update review" : "Post review"}
            </button>
            <button type="button" className="hrw-chip" onClick={() => setOpen(false)}>
              Cancel
            </button>
            {mine && (
              <button
                type="button"
                onClick={remove}
                style={{
                  marginLeft: "auto",
                  background: "none",
                  border: 0,
                  color: C.muted,
                  fontSize: 13,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: "8px 4px",
                }}
              >
                Delete mine
              </button>
            )}
          </div>

          <p style={{ margin: 0, fontSize: 11.5, color: C.muted, lineHeight: 1.6 }}>
            Posted publicly, no account needed. You can edit or delete it from
            this browser — clearing site data loses that ability.
          </p>
        </form>
      )}

      {error && (
        <p style={{ marginTop: 14, fontSize: 13.5, color: C.dim }}>
          Couldn't load reviews ({error}).{" "}
          <button
            onClick={reload}
            style={{
              background: "none",
              border: 0,
              color: C.gold,
              cursor: "pointer",
              textDecoration: "underline",
              font: "inherit",
            }}
          >
            Try again
          </button>
        </p>
      )}

      {!data && !error && (
        <div style={{ display: "grid", placeItems: "center", padding: "26px 0" }}>
          <div className="hrw-spinner" />
        </div>
      )}

      {data && n === 0 && !open && (
        <p style={{ marginTop: 14, fontSize: 14, color: C.dim, lineHeight: 1.6 }}>
          No reviews yet.{" "}
          <button
            onClick={() => setOpen(true)}
            style={{
              background: "none",
              border: 0,
              color: C.gold,
              cursor: "pointer",
              textDecoration: "underline",
              font: "inherit",
            }}
          >
            Be the first
          </button>{" "}
          — it's the only thing on this page the restaurants didn't write.
        </p>
      )}

      {data?.reviews.map((r) => (
        <Review key={r.id} r={r} onEdit={() => setOpen(true)} />
      ))}
    </section>
  );
}

function Review({ r, onEdit }) {
  const when = r.createdAt ? timeAgo(r.createdAt) : "";
  return (
    <article
      style={{
        padding: "15px 0",
        borderBottom: `1px solid ${C.border}`,
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <span aria-label={`${r.rating} out of 5`} style={{ color: C.gold, fontSize: 14, letterSpacing: 1 }}>
          {stars(r.rating)}
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.author || "Anonymous"}</span>
        {r.meal && (
          <span style={{ fontSize: 11.5, color: C.muted }}>· {mealLabel(r.meal)}</span>
        )}
        {when && (
          <span style={{ fontSize: 11.5, color: C.muted, marginLeft: "auto" }}>{when}</span>
        )}
      </div>
      {r.body && (
        <p style={{ margin: 0, fontSize: 14, color: C.dim, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {r.body}
        </p>
      )}
      {r.mine && (
        <button
          onClick={onEdit}
          style={{
            justifySelf: "start",
            background: "none",
            border: 0,
            color: C.muted,
            fontSize: 12,
            fontFamily: "inherit",
            cursor: "pointer",
            textDecoration: "underline",
            padding: "2px 0",
          }}
        >
          Yours — edit or delete
        </button>
      )}
    </article>
  );
}
