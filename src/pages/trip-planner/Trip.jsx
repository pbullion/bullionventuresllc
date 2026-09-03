import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { deleteTripWithPin, setTripAccess, tripFetch, TRIP_DELETE_VISIBLE } from "./tripPin";
import { groupByAisle, sortByName } from "./groceryAisles";
import { formatAmount, rollUpItems } from "./rollup";
import { conditionName } from "../../lib/weatherConditions";

const API_BASE = "https://sheline-art-website-api.herokuapp.com/trip-planner";

// Per-trip planner at /tripplanner/<slug>: a day-by-day meal grid (breakfast /
// lunch / dinner / snacks) plus a shared packing checklist. Everything saves to
// the backend as you edit; the whole trip refetches when the tab regains focus
// so the other families' edits show up.

/* Per-family packing lives in tp_items like everything else — category plus
 * assigned_to, no schema change. It needs its OWN category rather than reusing
 * "Packing" so it can be excluded from the shared Shopping list; with
 * category "Packing" every personal item would show up in both places. */
const FAMILY_PACKING = "Family packing";

const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast", emoji: "🍳" },
  { key: "lunch", label: "Lunch", emoji: "🥪" },
  { key: "dinner", label: "Dinner", emoji: "🍽️" },
  { key: "snacks", label: "Snacks & drinks", emoji: "🍉" },
];

const TP_CSS = `
.tp-root { min-height: 100vh; background: #f6f3ec; color: #26303a; font-family: system-ui, -apple-system, sans-serif; }
.tp-shell { max-width: 1180px; margin: 0 auto; padding: 20px 16px 80px; }
.tp-days { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; }
.tp-daycard { background: #fff; border: 1px solid #e4ddd0; border-radius: 14px; overflow: hidden; }
.tp-slot { width: 100%; text-align: left; background: none; border: none; border-top: 1px solid #f0ebe0; padding: 10px 14px; cursor: pointer; font: inherit; color: inherit; display: block; }
.tp-slot:hover { background: #faf8f2; }
.tp-input { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #d8d0c2; border-radius: 8px; font-size: 15px; background: #fff; color: #26303a; margin-bottom: 8px; }
.tp-input:focus { outline: 2px solid #2a9d8f; border-color: #2a9d8f; }
.tp-btn { background: #2a9d8f; color: #fff; border: none; border-radius: 8px; padding: 8px 14px; font-size: 14px; font-weight: 600; cursor: pointer; }
.tp-btn:disabled { opacity: 0.5; cursor: default; }
.tp-btn:hover:not(:disabled) { background: #24897d; }
.tp-btn-quiet { background: none; border: none; color: #6b7684; font-size: 14px; cursor: pointer; padding: 8px 10px; }
.tp-check { width: 20px; height: 20px; accent-color: #2a9d8f; flex-shrink: 0; cursor: pointer; }
.tp-item-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f0ebe0; }
.tp-del { background: none; border: none; color: #c2b8a6; cursor: pointer; font-size: 16px; padding: 2px 6px; }
.tp-del:hover { color: #a33a2f; }
.tp-edit { background: none; border: none; color: #c2b8a6; cursor: pointer; font-size: 14px; padding: 2px 6px; }
.tp-edit:hover { color: #1f7a6f; }
.tp-editrow { padding: 10px 0; border-bottom: 1px solid #f0ebe0; }
.tp-editpart { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.tp-daymeals { background: none; border: none; color: #9fb3c8; cursor: pointer; font-size: 12px; padding: 2px 6px; font-weight: 600; }
.tp-daymeals:hover { color: #fff; }
.tp-mealtoggle { border: 1px solid #d8d0c2; background: #fff; color: #6b7684; border-radius: 999px; padding: 5px 11px; font-size: 13px; font-weight: 600; cursor: pointer; }
.tp-mealtoggle.on { background: #e7f3f1; border-color: #2a9d8f; color: #1f7a6f; }
.tp-jump { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.tp-jump a { background: #fff; border: 1px solid #d8d0c2; border-radius: 999px; padding: 7px 14px; font-size: 14px; font-weight: 600; color: #26303a; text-decoration: none; }
.tp-jump a:hover { border-color: #2a9d8f; color: #1f7a6f; }
h2[id] { scroll-margin-top: 12px; }
.tp-qty { font-weight: 700; color: #1f7a6f; white-space: nowrap; }
.tp-breakdown { font-size: 12px; color: #a8a094; margin-top: 2px; display: flex; flex-wrap: wrap; gap: 2px 12px; }
.tp-recipe-link { background: none; border: none; padding: 0; font: inherit; font-size: 13px; font-weight: 600; color: #1f7a6f; cursor: pointer; text-decoration: underline; }
/* The backdrop is fixed and the sheet scrolls inside it, so a long recipe never
   scrolls the trip page underneath it on a phone. */
.tp-modal-back { position: fixed; inset: 0; background: rgba(22, 28, 34, 0.55); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 50; }
.tp-modal { background: #fff; border-radius: 16px; max-width: 560px; width: 100%; max-height: 88vh; overflow-y: auto; padding: 20px 22px 24px; box-shadow: 0 18px 50px rgba(0,0,0,0.3); }
.tp-modal h3 { margin: 0 0 2px; font-size: 21px; }
.tp-modal ol { padding-left: 20px; margin: 0; }
.tp-modal ol li { margin-bottom: 9px; line-height: 1.45; }
.tp-modal-x { position: sticky; top: 0; float: right; background: #f0ebe0; border: none; border-radius: 999px; width: 30px; height: 30px; font-size: 16px; color: #6b7684; cursor: pointer; line-height: 1; }
.tp-ing-row { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px solid #f6f3ec; font-size: 15px; }
.tp-scale { border: 1px solid #d8d0c2; background: #fff; color: #6b7684; border-radius: 999px; padding: 4px 10px; font-size: 13px; font-weight: 600; cursor: pointer; }
.tp-scale.on { background: #e7f3f1; border-color: #2a9d8f; color: #1f7a6f; }
/* The forecast strip. Each day is a button now — same face it had as a div, so
   the strip doesn't suddenly look like a toolbar, but with a real hit target,
   a focus ring and keyboard access. */
.tp-wxcard { background: #fff; border: 1px solid #e4ddd0; border-radius: 12px; padding: 8px 12px; text-align: center; min-width: 86px; flex-shrink: 0; cursor: pointer; font: inherit; color: inherit; }
.tp-wxcard:hover { border-color: #2a9d8f; }
.tp-wxcard:focus-visible { outline: 2px solid #2a9d8f; outline-offset: 2px; }
.tp-wxlabel { font-size: 12px; font-weight: 700; color: #6b7684; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.tp-wxchart { display: flex; align-items: flex-end; gap: 2px; }
.tp-wxcol { flex: 1; min-width: 0; }
.tp-wxbar-track { height: 58px; display: flex; align-items: flex-end; background: #faf8f2; border-radius: 3px; }
.tp-wxbar { width: 100%; border-radius: 3px; }
.tp-wxtick { font-size: 9px; color: #a8a094; text-align: center; height: 12px; line-height: 12px; white-space: nowrap; }
.tp-wxhours { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.tp-wxhour { text-align: center; min-width: 52px; flex-shrink: 0; }
`;

// One color per family, assigned by position in trip.families.
const FAMILY_COLORS = [
  { bg: "#e7f3f1", fg: "#1f7a6f" }, // teal
  { bg: "#fdeee8", fg: "#c25537" }, // coral
  { bg: "#e8eff7", fg: "#3d6a94" }, // blue
  { bg: "#f0e9f7", fg: "#7a55a8" }, // purple
  { bg: "#fdf3dc", fg: "#9a7418" }, // gold
  { bg: "#fde8ef", fg: "#b04a6e" }, // pink
];

// Address links hand off to the phone's Maps app rather than a browser tab:
// maps.apple.com opens Maps directly on iOS/macOS, maps.google.com opens the
// Google Maps app on Android (and the web map everywhere else).
const IS_APPLE = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
const mapsHref = (q) =>
  `${IS_APPLE ? "https://maps.apple.com/?q=" : "https://maps.google.com/?q="}${encodeURIComponent(q)}`;

// Listing links get typed in without a scheme as often as not.
const externalHref = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

const CABIN_FIELDS = [
  { key: "link", label: "Listing link" },
  // isAddress drives the Maps link. It's a flag rather than a `key === "address"`
  // check in the renderer so a second address field gets the same treatment for
  // free — which is the whole point of key pickup being here.
  { key: "address", label: "Address", isAddress: true },
  { key: "check_in", label: "Check-in" },
  { key: "check_out", label: "Check-out" },
  { key: "key_pickup", label: "Key pickup", isAddress: true },
  { key: "cart_dropoff", label: "Golf cart drop-off" },
  { key: "cart_pickup", label: "Golf cart pickup" },
  { key: "door_code", label: "Door code" },
  { key: "wifi_name", label: "WiFi network" },
  { key: "wifi_password", label: "WiFi password" },
  { key: "parking", label: "Parking / house notes" },
];

// The times everyone asks about in the group chat, pulled out of the cabin card
// and shown as a strip at the top — "what time can we get in?" gets asked on the
// drive down, not standing in the driveway. They're stored in the same cabin
// blob (the trip's only free-form store) so they stay editable in one place,
// which is also why the golf cart lives under "cabin" despite not being it.
const LOGISTICS = [
  { label: "Check-in", icon: "🔑", keys: ["check_in"] },
  { label: "Check-out", icon: "🚗", keys: ["check_out"] },
  { label: "Golf cart", icon: "🛺", keys: ["cart_dropoff", "cart_pickup"] },
];

function Chip({ children, color }) {
  const c = color || FAMILY_COLORS[0];
  return (
    <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: "2px 9px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

/* One dialog layer: Escape to close, and the page behind frozen.
 *
 * Both modals on this page used to run this effect themselves, each adding its
 * own document-level keydown listener with no idea the other existed. Two open
 * at once — reachable, because a #recipe-<id> link opens the recipe as soon as
 * the trip loads, which can land after you have already tapped a forecast day —
 * and one Escape closed BOTH, because both listeners fired.
 *
 * The stack fixes that: only the top layer answers Escape. It also makes the
 * scroll lock correct rather than accidentally correct — the first layer to
 * open saves the page's real overflow and the last one out restores it, so a
 * nested dialog can't save "hidden" as the value to go back to.
 *
 * onClose must be referentially stable (both callers use useCallback), or the
 * effect tears down and re-pushes on every render and this layer jumps to the
 * top of the stack.
 *
 * One coupling to know about before adding a third dialog here: the layer that
 * answers Escape is the last one MOUNTED, while the one that paints on top is
 * whichever comes later in the JSX — both backdrops share z-index 50, so source
 * order decides. Today those agree, because the only way to get two open is to
 * tap a forecast day and have a #recipe-<id> link resolve afterwards. Reorder
 * the JSX, or add a dialog that can open beneath an existing one, and Escape
 * would start closing a layer the reader cannot see.
 */
const modalStack = [];
let savedOverflow = null;

function useModalLayer(onClose) {
  useEffect(() => {
    const layer = {};
    modalStack.push(layer);
    if (modalStack.length === 1) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (modalStack[modalStack.length - 1] !== layer) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      const i = modalStack.indexOf(layer);
      if (i !== -1) modalStack.splice(i, 1);
      if (modalStack.length === 0) {
        document.body.style.overflow = savedOverflow ?? "";
        savedOverflow = null;
      }
    };
  }, [onClose]);
}

/* The recipe itself, over the page rather than on it.
 *
 * A modal and not a route: you open a recipe while standing at the stove with
 * the meal plan already scrolled to the right day, and a route change loses that
 * position on the way back. It writes #recipe-<id> into the URL anyway so the
 * casserole can be texted to somebody as a link, and the page reads that hash on
 * load to reopen it.
 *
 * Quantities are shown SCALED — if the meal is set to 2x, the card says 2 lb,
 * not "1 lb (x2)". The scale is stated in the header so the numbers are never
 * mysterious, and the recipe's own yield sits next to it, because doubling a
 * 9x13 means finding a second pan and that is worth seeing before you start. */
function RecipeModal({ recipe, scale = 1, mealTitle, onClose }) {
  // Esc closes, and the page behind is frozen so a scroll gesture inside a long
  // recipe doesn't leak through to the trip and lose the reader's place.
  useModalLayer(onClose);

  if (!recipe) return null;
  const ings = recipe.ingredients || [];
  const steps = recipe.directions || [];

  return (
    <div
      className="tp-modal-back"
      role="dialog"
      aria-modal="true"
      aria-label={recipe.title}
      // Only a click that both starts and ends on the backdrop closes it —
      // otherwise a text selection that drags off the sheet shuts the recipe.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tp-modal">
        <button className="tp-modal-x" onClick={onClose} aria-label="Close recipe">✕</button>
        <h3>{recipe.title}</h3>
        <div style={{ fontSize: 13, color: "#6b7684", marginBottom: 14 }}>
          {[
            recipe.servings && `Makes ${recipe.servings}`,
            scale !== 1 && `cooking ${scale}x`,
            recipe.source && `from ${recipe.source}`,
          ]
            .filter(Boolean)
            .join(" · ")}
          {mealTitle ? <div style={{ marginTop: 2 }}>For: {mealTitle}</div> : null}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7684", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          Ingredients{scale !== 1 ? ` (scaled ${scale}x)` : ""}
        </div>
        <div style={{ marginBottom: 18 }}>
          {ings.map((ing, i) => (
            <div className="tp-ing-row" key={i}>
              <span className="tp-qty" style={{ minWidth: 78 }}>
                {formatAmount(ing.qty == null ? null : ing.qty * scale, ing.unit)}
              </span>
              <span style={{ flex: 1 }}>
                {ing.name}
                {ing.note && <span style={{ color: "#a8a094" }}> — {ing.note}</span>}
              </span>
            </div>
          ))}
          {ings.length === 0 && <div style={{ color: "#a8a094", fontSize: 14 }}>No ingredients recorded.</div>}
        </div>

        {steps.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7684", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Directions
            </div>
            <ol>
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </>
        )}

        {recipe.notes && (
          <div style={{ marginTop: 16, background: "#faf8f2", border: "1px solid #f0ebe0", borderRadius: 10, padding: "10px 12px", fontSize: 14, whiteSpace: "pre-wrap" }}>
            {recipe.notes}
          </div>
        )}

        {recipe.source_url && (
          <div style={{ marginTop: 16, fontSize: 14 }}>
            <a href={recipe.source_url} target="_blank" rel="noreferrer" style={{ color: "#1f7a6f" }}>
              Original recipe ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* The wettest stretch of a day, in words.
 *
 * A column chart answers "when" only if you read it carefully, and the reason
 * anybody opens a day is to decide whether the morning on the water survives.
 * So the chart gets a sentence over it.
 *
 * The threshold floats with the day instead of being fixed: a day peaking at
 * 35% has a wettest stretch worth naming, and a fixed 50% would call it dry;
 * a day peaking at 90% should not have its "likeliest" window include every
 * hour that merely cleared 50.
 *
 * 60% of the peak, floored at 20, was picked against the real forecast rather
 * than by taste. A stricter 70% cut turned a Sep 5 curve that sat between 22%
 * and 36% from six in the morning to five in the evening into "8 AM to 9 AM",
 * which is a true statement about the maximum and a false one about the day.
 */
function rainWindow(hours) {
  const pts = hours.filter((h) => h.rainChance != null);
  if (!pts.length) return null;
  const peak = Math.max(...pts.map((h) => h.rainChance));
  if (peak < 15) return { peak, run: null };

  const thresh = Math.max(20, Math.round(peak * 0.6));
  let best = null;
  let cur = null;
  const longer = (a, b) => !b || a.to.hour - a.from.hour > b.to.hour - b.from.hour;
  for (const h of hours) {
    if ((h.rainChance ?? 0) >= thresh) {
      cur = cur ? { from: cur.from, to: h } : { from: h, to: h };
    } else if (cur) {
      if (longer(cur, best)) best = cur;
      cur = null;
    }
  }
  if (cur && longer(cur, best)) best = cur;
  return { peak, run: best };
}

// A stat with its label, for the grid of daily figures.
function WxStat({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#a8a094", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginTop: 1 }}>{value}</div>
    </div>
  );
}

/* One day of the forecast, opened from its card in the strip.
 *
 * The strip can only ever say "58%", which is the same number for an afternoon
 * of steady rain and a shower at 4am — and those are different days for a trip
 * that is mostly outdoors. This is the hour-by-hour behind that number.
 *
 * Every block below renders only if its data is there. That is not defensive
 * habit: the frontend deploys the moment it merges and the backend deploys
 * separately, so between the two this modal is opening days that carry nothing
 * but the six fields the strip already used. It has to be useful anyway.
 */
function WeatherDayModal({ day, place, onClose }) {
  useModalLayer(onClose);

  if (!day) return null;

  const hours = Array.isArray(day.hours) ? day.hours : [];
  const rain = hours.length ? rainWindow(hours) : null;
  const wet = (day.precipType && day.precipType !== "clear" ? day.precipType : "rain").toLowerCase();
  const halves = [
    { label: "Daytime", icon: "🌤️", block: day.daytime },
    { label: "Overnight", icon: "🌙", block: day.overnight },
  ].filter((h) => h.block);

  /* Past hours are dimmed rather than dropped, and only on the day actually in
   * progress. Dropping them would make one card in the strip start at 2PM while
   * its neighbours start at midnight, and the chart would stop being comparable
   * across days — which is most of what the strip is for. */
  const todayKey = new Date().toLocaleDateString("en-CA");
  const nowHour = day.date === todayKey ? new Date().getHours() : -1;

  /* Filtered here rather than left to each WxStat's own null check, so a day
   * with none of them renders no grid at all — an empty grid still takes its
   * top margin, which left a dead gap above the "not available" line in exactly
   * the state this modal is designed to handle. */
  const stats = [
    { label: "Sunrise", value: day.sunrise },
    { label: "Sunset", value: day.sunset },
    { label: wet === "snow" ? "Snowfall" : "Rainfall", value: day.precipAmount == null ? null : `${day.precipAmount}"` },
    { label: "Wind", value: day.windMph == null ? null : `${day.windMph} mph` },
    { label: "Gusts", value: day.windGustMph == null ? null : `${day.windGustMph} mph` },
    { label: "UV index", value: day.uvIndex == null ? null : String(day.uvIndex) },
  ].filter((st) => st.value != null && st.value !== "");

  const detailed = hours.length > 0 || halves.length > 0 || stats.length > 0;

  return (
    <div
      className="tp-modal-back"
      role="dialog"
      aria-modal="true"
      aria-label={`Forecast for ${day.day} ${day.dateLabel}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tp-modal">
        <button className="tp-modal-x" onClick={onClose} aria-label="Close forecast">✕</button>
        <h3>
          {day.emoji} {day.day}, {day.dateLabel}
        </h3>
        <div style={{ fontSize: 13, color: "#6b7684", marginBottom: 14 }}>
          {[place, conditionName(day.condition)].filter(Boolean).join(" · ")}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 34, fontWeight: 700 }}>{day.high}°</span>
          <span style={{ fontSize: 20, color: "#a8a094" }}>{day.low}°</span>
          <span style={{ fontSize: 16, color: "#3d6a94", fontWeight: 600 }}>💧 {day.rainChance}%</span>
        </div>

        {hours.length > 0 && (
          <>
            <div className="tp-wxlabel">{wet === "snow" ? "Snow" : "Rain"} through the day</div>
            {rain && (
              <div style={{ fontSize: 14, color: "#26303a", margin: "0 0 10px" }}>
                {rain.run
                  ? `Likeliest ${rain.run.from.hour === rain.run.to.hour ? `around ${rain.run.from.time}` : `between ${rain.run.from.time} and ${rain.run.to.time}`} — up to ${rain.peak}% in any one hour.`
                  : rain.peak === 0
                    ? `No ${wet} in any hour of the day.`
                    : `Nothing concentrated — no single hour above ${rain.peak}%.`}
              </div>
            )}
            {/* The day figure is routinely far higher than every bar under it —
                Sep 4 read 58% against a 22% hourly peak — because WeatherKit's
                daily number is the chance of rain AT SOME POINT and each bar is
                the chance within that hour. Both are right, and side by side
                without this line they read as a bug in the page. Only shown
                when they actually diverge. */}
            {rain && day.rainChance != null && day.rainChance - rain.peak > 10 && (
              <div style={{ fontSize: 12, color: "#a8a094", margin: "-4px 0 10px" }}>
                The {day.rainChance}% above is the chance of {wet} at some point in the day; each bar is that one hour.
              </div>
            )}
            <div
              className="tp-wxchart"
              role="img"
              aria-label={
                rain?.run
                  ? `Hourly ${wet} chance, highest ${rain.peak} percent between ${rain.run.from.time} and ${rain.run.to.time}`
                  : `Hourly ${wet} chance, peaking at ${rain?.peak ?? 0} percent`
              }
            >
              {hours.map((h) => (
                <div key={h.hour} className="tp-wxcol" title={`${h.time || ""} · ${h.rainChance ?? "—"}%${h.precipAmount ? ` · ${h.precipAmount}"` : ""}`}>
                  <div className="tp-wxbar-track">
                    <div
                      className="tp-wxbar"
                      style={{
                        height: `${Math.max(2, h.rainChance ?? 0)}%`,
                        // One hue, weight carrying the number — a rainbow ramp
                        // would imply categories the forecast doesn't have.
                        background: `rgba(61, 106, 148, ${0.2 + 0.8 * ((h.rainChance ?? 0) / 100)})`,
                        opacity: h.hour < nowHour ? 0.35 : 1,
                      }}
                    />
                  </div>
                  {/* The only string op on a backend field in here. Guarded not
                      because `time` is ever missing today — it is always set —
                      but because this page has no ErrorBoundary above it, so a
                      throw during render white-screens the whole trip, not the
                      chart. */}
                  <div className="tp-wxtick">{h.hour % 6 === 0 && h.time ? h.time.replace(" ", "").replace("M", "") : ""}</div>
                </div>
              ))}
            </div>

            <div className="tp-wxlabel" style={{ marginTop: 16 }}>Hour by hour</div>
            <div className="tp-wxhours">
              {hours.map((h) => (
                <div key={h.hour} className="tp-wxhour" style={{ opacity: h.hour < nowHour ? 0.4 : 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7684" }}>{h.time}</div>
                  <div style={{ fontSize: 17, margin: "1px 0" }}>{h.emoji}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{h.temp == null ? "—" : `${h.temp}°`}</div>
                  <div style={{ fontSize: 11, color: "#3d6a94" }}>{h.rainChance == null ? "" : `💧${h.rainChance}%`}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {halves.length > 0 && (
          <>
            <div className="tp-wxlabel" style={{ marginTop: 18 }}>Split</div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${halves.length}, 1fr)`, gap: 10 }}>
              {halves.map((h) => (
                <div key={h.label} style={{ background: "#faf8f2", border: "1px solid #f0ebe0", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7684" }}>{h.icon} {h.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>
                    {h.block.high == null ? "—" : `${h.block.high}°`}{" "}
                    <span style={{ color: "#a8a094", fontWeight: 400 }}>{h.block.low == null ? "" : `${h.block.low}°`}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#3d6a94", marginTop: 2 }}>
                    {h.block.rainChance == null ? "—" : `💧 ${h.block.rainChance}%`}
                    {h.block.precipAmount ? ` · ${h.block.precipAmount}"` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#a8a094", marginTop: 2 }}>
                    {[h.block.humidity != null && `${h.block.humidity}% humidity`, h.block.windMph != null && `${h.block.windMph} mph wind`]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {stats.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 12, marginTop: 18 }}>
            {stats.map((st) => (
              <WxStat key={st.label} label={st.label} value={st.value} />
            ))}
          </div>
        )}

        {!detailed && (
          <div style={{ color: "#a8a094", fontSize: 14, marginTop: 8 }}>
            Hour-by-hour detail isn't available for this day yet.
          </div>
        )}
      </div>
    </div>
  );
}

// Inline editor for one meal slot. Saves the whole slot in one PUT upsert;
// clearing every field deletes the slot server-side. Ingredient edits are
// queued locally and committed alongside Save so a brand-new slot (no meal row
// yet) can take ingredients too — each one becomes a Groceries item on the
// shopping list, linked to this meal.
function MealEditor({ meal, ingredients, recipes, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(meal?.title || "");
  const [assigned, setAssigned] = useState(meal?.assigned_to || "");
  const [details, setDetails] = useState(meal?.details || "");
  const [ings, setIngs] = useState(
    ingredients.map((i) => ({ id: i.id, name: i.name, qty: i.qty, unit: i.unit, from_recipe: i.from_recipe }))
  );
  const [newIng, setNewIng] = useState({ qty: "", unit: "", name: "" });
  const [recipeId, setRecipeId] = useState(meal?.recipe_id ? String(meal.recipe_id) : "");
  const [scale, setScale] = useState(Number(meal?.recipe_scale) || 1);

  const addIng = () => {
    const name = newIng.name.trim();
    if (!name) return;
    setIngs((l) => [...l, { id: null, name, qty: newIng.qty, unit: newIng.unit.trim() }]);
    setNewIng({ qty: "", unit: "", name: "" });
  };

  const save = (fields) => {
    const kept = new Set(ings.filter((g) => g.id).map((g) => g.id));
    const removeIds = ingredients.filter((i) => !kept.has(i.id)).map((i) => i.id);
    const addItems = ings
      .filter((g) => !g.id)
      .map((g) => ({ name: g.name, qty: g.qty || null, unit: g.unit || "" }));
    // Don't lose an ingredient typed but not yet added when Save is tapped.
    if (newIng.name.trim()) {
      addItems.push({ name: newIng.name.trim(), qty: newIng.qty || null, unit: newIng.unit.trim() });
    }
    /* The recipe link is reported as a CHANGE, not a value: attaching one
     * rewrites the meal's ingredient rows server-side, so re-sending the same
     * recipe on an unrelated title edit would silently undo an ingredient the
     * cook had just deleted by hand. `null` means detach, `undefined` means
     * leave whatever is there alone. */
    const wasId = meal?.recipe_id ? String(meal.recipe_id) : "";
    const wasScale = Number(meal?.recipe_scale) || 1;
    let recipeChange;
    if (recipeId !== wasId || (recipeId && scale !== wasScale)) {
      recipeChange = recipeId ? { recipe_id: Number(recipeId), scale } : null;
    }
    onSave(fields, { addItems, removeIds }, recipeChange);
  };

  return (
    <div style={{ padding: "10px 14px", borderTop: "1px solid #f0ebe0", background: "#faf8f2" }}>
      <input className="tp-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the meal? (e.g. Taco night)" autoFocus />
      <input className="tp-input" value={assigned} onChange={(e) => setAssigned(e.target.value)} placeholder="Who's got it? (e.g. Angelle family)" />
      <textarea
        className="tp-input"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Notes — sides, drinks, recipe link…"
        rows={2}
        style={{ resize: "vertical" }}
      />
      {/* Attaching a recipe fills the ingredient list below from the recipe's own
          quantities, scaled. It does not touch anything added by hand here. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "4px 0 10px" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7684" }}>📖 Recipe</span>
        <select
          className="tp-input"
          style={{ marginBottom: 0, flex: "1 1 160px", width: "auto" }}
          value={recipeId}
          onChange={(e) => setRecipeId(e.target.value)}
        >
          <option value="">— none —</option>
          {recipes.map((r) => (
            <option key={r.id} value={String(r.id)}>{r.title}</option>
          ))}
        </select>
        {recipeId && (
          <div style={{ display: "flex", gap: 4 }}>
            {[1, 1.5, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                className={`tp-scale${scale === n ? " on" : ""}`}
                onClick={() => setScale(n)}
                title={`Cook ${n}x the recipe`}
              >
                {n}x
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7684", margin: "2px 0 6px" }}>
        🛒 Ingredients <span style={{ fontWeight: 400 }}>— auto-added to the shopping list</span>
      </div>
      {ings.map((g, idx) => (
        <div key={g.id ?? `new-${idx}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
          <span className="tp-qty" style={{ fontSize: 14, minWidth: 62 }}>{formatAmount(g.qty, g.unit)}</span>
          <span style={{ flex: 1, fontSize: 14 }}>
            {g.name}
            {/* Says where the row came from, so deleting one reads as "we already
                have salt" rather than as editing the recipe itself. */}
            {g.from_recipe && <span style={{ color: "#c2b8a6", marginLeft: 5 }} title="From the attached recipe">📖</span>}
          </span>
          <button className="tp-del" title="Remove ingredient" onClick={() => setIngs((l) => l.filter((_, i) => i !== idx))}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input
          className="tp-input"
          style={{ marginBottom: 0, flex: "0 0 52px" }}
          value={newIng.qty}
          onChange={(e) => setNewIng((n) => ({ ...n, qty: e.target.value }))}
          placeholder="2"
          inputMode="decimal"
          aria-label="Quantity"
        />
        <input
          className="tp-input"
          style={{ marginBottom: 0, flex: "0 0 64px" }}
          value={newIng.unit}
          onChange={(e) => setNewIng((n) => ({ ...n, unit: e.target.value }))}
          placeholder="lb"
          list="tp-units"
          aria-label="Unit"
        />
        <datalist id="tp-units">
          {["lb", "oz", "cup", "tsp", "tbsp", "can", "bag", "box", "bottle", "jar", "pkg", "dozen"].map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <input
          className="tp-input"
          style={{ marginBottom: 0, flex: 1 }}
          value={newIng.name}
          onChange={(e) => setNewIng((n) => ({ ...n, name: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addIng();
            }
          }}
          placeholder="Add an ingredient…"
          aria-label="Ingredient"
        />
        <button className="tp-btn" type="button" onClick={addIng} disabled={!newIng.name.trim()}>
          Add
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className="tp-btn" disabled={saving} onClick={() => save({ title, assigned_to: assigned, details })}>
          {saving ? "Saving…" : "Save"}
        </button>
        {meal && (
          <button className="tp-btn-quiet" disabled={saving} onClick={() => onSave({ title: "", assigned_to: "", details: "" }, { addItems: [], removeIds: [] })}>
            Clear
          </button>
        )}
        <button className="tp-btn-quiet" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function TripPlanner() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null); // "YYYY-MM-DD|meal_type"
  const [savingSlot, setSavingSlot] = useState(null);
  const [pickingDay, setPickingDay] = useState(null); // date whose meal-slot picker is open
  const [newItem, setNewItem] = useState({ name: "", category: "Groceries", assigned_to: "" });
  /* Which shopping row is open for editing, as "<category>|<row key>" — the row
   * key alone is the normalized NAME, which is only unique inside a category.
   * `itemDraft` is one draft per underlying tp_items row, because a rolled-up
   * line stands for every meal that wants that ingredient and each of those
   * rows has its own amount and its own owner. */
  const [editingItem, setEditingItem] = useState(null);
  const [itemDraft, setItemDraft] = useState([]);
  const [savingItem, setSavingItem] = useState(false);
  /* Whose rows the shopping list is showing — "" is everyone, "Unclaimed" is
   * the rows nobody has taken. Not persisted: a filter that survived a reload
   * would look like items had gone missing. */
  const [whoFilter, setWhoFilter] = useState("");
  /* Same pair for "Who's bringing what": which family's rows are showing, and
   * which claim is open for editing. Separate from the shopping list's — the
   * two sections answer different questions and filtering one to Hays has no
   * business hiding the other's groceries. */
  const [bringFilter, setBringFilter] = useState("");
  const [editingBring, setEditingBring] = useState(null); // tp_items id
  const [bringDraft, setBringDraft] = useState({ name: "", assigned_to: "" });
  const [savingBring, setSavingBring] = useState(false);
  /* The recipe CATALOGUE (id/title only) — every recipe that exists, for the
   * picker in the meal editor. Distinct from trip.recipes, which is the handful
   * of full recipes this trip's meals actually use and arrives with the trip. */
  const [recipeCatalog, setRecipeCatalog] = useState([]);
  const [openRecipe, setOpenRecipe] = useState(null); // { recipe, scale, mealTitle }
  const [openWxDay, setOpenWxDay] = useState(null); // a day off the forecast strip
  const [addingItem, setAddingItem] = useState(false);
  const [newBring, setNewBring] = useState({ name: "", assigned_to: "" });
  // One draft per family, keyed by name, so typing in one family's box doesn't
  // clear another's.
  /* Which shopping-list categories are collapsed, persisted per trip: a 39-item
   * grocery list is worth folding away once you've shopped, and it should stay
   * folded when you come back to the page rather than every visit. */
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = window.localStorage.getItem(`tp_collapsed_${slug}`);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  const toggleCollapsed = (cat) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      try {
        window.localStorage.setItem(`tp_collapsed_${slug}`, JSON.stringify([...next]));
      } catch {
        /* private mode — collapsing still works for this visit */
      }
      return next;
    });

  /* Family packing lists start CLOSED, so this tracks which are OPEN — the
   * inverse of the shopping-list set above. Storing "expanded" rather than
   * "collapsed" is what makes closed the default without seeding the set from
   * the family list, and it means a family added later also arrives closed
   * instead of being the one that is mysteriously open. */
  const [expandedFams, setExpandedFams] = useState(() => {
    try {
      const raw = window.localStorage.getItem(`tp_openfams_${slug}`);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  const toggleFamily = (family) =>
    setExpandedFams((prev) => {
      const next = new Set(prev);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      try {
        window.localStorage.setItem(`tp_openfams_${slug}`, JSON.stringify([...next]));
      } catch {
        /* private mode — expanding still works for this visit */
      }
      return next;
    });

  const [newPack, setNewPack] = useState({});
  const [addingPack, setAddingPack] = useState(null);
  const [addingBring, setAddingBring] = useState(false);
  const [familiesDraft, setFamiliesDraft] = useState(null); // comma string while editing, null when not
  const [datesDraft, setDatesDraft] = useState(null); // { start_date, end_date } while editing
  const [savingDates, setSavingDates] = useState(false);
  const [wx, setWx] = useState(null); // forecast payload from the backend
  const [cabinDraft, setCabinDraft] = useState(null); // cabin object while editing
  const [locked, setLocked] = useState(null); // { name } while the PIN is needed
  const [pinDraft, setPinDraft] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const notesTimer = useRef(null);

  const load = useCallback(() => {
    tripFetch(slug, `${API_BASE}/trips/${slug}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        /* 401 is the trip's access PIN: either none is stored yet or the one
         * stored is wrong (someone rotated it). Both land on the unlock screen.
         * The stored PIN is deliberately NOT cleared here — leaving it means a
         * network blip that 401s doesn't log the whole family out. */
        if (r.status === 401) {
          return r.json().then((body) => {
            setLocked({ name: body.name || "" });
            return null;
          });
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setLocked(null);
          setTrip(data);
        }
      })
      .catch(() => setError("Couldn't load the trip. Check your connection and refresh."));
  }, [slug]);

  /* Unlocking is just "store the PIN, load again" — there's no separate verify
   * endpoint, because the load itself is the verification and a second one
   * would be a second place for the two answers to disagree. */
  function unlock(e) {
    e.preventDefault();
    const entered = pinDraft.trim();
    if (!entered) return;
    setUnlocking(true);
    setError("");
    setTripAccess(slug, entered);
    tripFetch(slug, `${API_BASE}/trips/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 401 ? "wrong" : `HTTP ${r.status}`))))
      .then((data) => {
        setLocked(null);
        setTrip(data);
        setPinDraft("");
      })
      .catch((err) => setError(err.message === "wrong" ? "That's not the PIN for this trip." : "Couldn't reach the server — try again."))
      .finally(() => setUnlocking(false));
  }

  useEffect(load, [load]);

  /* A callback rather than an inline effect because changing the trip dates has
   * to re-run it: the forecast is computed server-side for the trip's range, so
   * a strip left unfetched after a date change is showing days the trip no
   * longer has. (The caller clears `wx` first — doing it in here would be a
   * setState in the mount effect below.) */
  const loadWeather = useCallback(() => {
    tripFetch(slug, `${API_BASE}/trips/${slug}/weather`)
      .then((r) => r.json())
      .then(setWx)
      .catch(() => {}); // weather is decoration — never block the page on it
  }, [slug]);

  useEffect(loadWeather, [loadWeather]);

  /* The picker's list of every recipe on file. Open endpoint, no PIN — a recipe
   * title is not trip data — and failure is silent: without it you simply can't
   * attach a recipe, which must not stop the rest of the page loading. */
  useEffect(() => {
    fetch(`${API_BASE}/recipes`)
      .then((r) => r.json())
      .then((rows) => setRecipeCatalog(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, []);

  /* #recipe-<id> opens that recipe straight away, so a link to one can be texted
   * to whoever is cooking. Waits for the trip, because the scale to show it at
   * belongs to the meal rather than the recipe.
   *
   * Fires AT MOST ONCE per page load. The trip refetches on every tab focus and
   * after any recipe edit, and without the latch this effect re-ran on each one
   * and reopened a modal the reader had already closed — the hash is still in
   * the URL, so the condition stays true forever. */
  const hashOpened = useRef(false);
  useEffect(() => {
    if (hashOpened.current || !trip?.recipes) return;
    const m = /^#recipe-(\d+)$/.exec(window.location.hash || "");
    if (!m) return;
    hashOpened.current = true;
    const recipe = trip.recipes.find((r) => String(r.id) === m[1]);
    if (!recipe) return;
    const meal = trip.meals.find((x) => String(x.recipe_id) === m[1]);
    setOpenRecipe({ recipe, scale: Number(meal?.recipe_scale) || 1, mealTitle: meal?.title });
  }, [trip]);

  /* Opening a recipe puts it in the URL so the address bar is shareable, and
   * closing takes it back out. replaceState, not a hash assignment: assigning
   * location.hash pushes a history entry, which turns the browser Back button
   * into "reopen the recipe I just closed". */
  const showRecipe = useCallback((recipe, scale, mealTitle) => {
    if (!recipe) return;
    setOpenRecipe({ recipe, scale: Number(scale) || 1, mealTitle });
    window.history.replaceState(null, "", `#recipe-${recipe.id}`);
  }, []);

  /* Stable, like hideRecipe below, and for the same reason the recipe one is:
   * the modal's Esc-and-scroll-lock effect keys on this, and the trip refetches
   * on every tab focus — an inline arrow would tear that effect down and
   * re-register it each time the page came back into view with the sheet open. */
  const hideWxDay = useCallback(() => setOpenWxDay(null), []);

  const hideRecipe = useCallback(() => {
    setOpenRecipe(null);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  // Pick up other families' edits whenever the tab comes back into view.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  async function saveMeal(date, mealType, fields, ingChanges = { addItems: [], removeIds: [] }, recipeChange) {
    const slotKey = `${date}|${mealType}`;
    setSavingSlot(slotKey);
    setError("");
    try {
      /* `keep` tells the server not to treat "every text field empty" as a
       * request to clear the slot when there are ingredients here. Only the
       * client knows this on a NEW slot: the items don't exist server-side yet,
       * so there is nothing for it to count. Snacks & drinks is the case that
       * needs it — you add "chips, queso" and never type a meal title, so all
       * three fields are blank and the slot was being deleted out from under the
       * ingredients before they were ever posted. */
      const existingIngredients = (() => {
        const slot = trip.meals.find((m) => m.date === date && m.meal_type === mealType);
        return slot ? trip.items.some((i) => i.meal_id === slot.id) : false;
      })();
      const keep =
        ingChanges.addItems.length > 0 ||
        !!recipeChange ||
        (existingIngredients && ingChanges.removeIds.length === 0);

      const res = await tripFetch(slug, `${API_BASE}/trips/${slug}/meals`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, meal_type: mealType, ...fields, keep }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || "save failed");

      if (saved.cleared) {
        // Server cascade-deleted the meal's ingredients — drop them locally too.
        setTrip((t) => {
          const old = t.meals.find((m) => m.date === date && m.meal_type === mealType);
          return {
            ...t,
            meals: t.meals.filter((m) => m !== old),
            items: old ? t.items.filter((i) => i.meal_id !== old.id) : t.items,
          };
        });
        setEditingSlot(null);
        return;
      }

      const [added] = await Promise.all([
        Promise.all(
          ingChanges.addItems.map((ing) =>
            tripFetch(slug, `${API_BASE}/trips/${slug}/items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...ing, category: "Groceries", meal_id: saved.id }),
            }).then((r) => (r.ok ? r.json() : null))
          )
        ),
        Promise.all(ingChanges.removeIds.map((id) => tripFetch(slug, `${API_BASE}/items/${id}`, { method: "DELETE" }))),
      ]);

      /* Attaching or re-scaling a recipe rewrites this meal's ingredient rows on
       * the server, so the local copy is stale the moment it succeeds — refetch
       * rather than trying to mirror the server's insert/delete set here. It is
       * one request and only on the edits that actually moved a recipe. */
      if (recipeChange !== undefined) {
        const url = `${API_BASE}/trips/${slug}/meals/${saved.id}/recipe`;
        const res2 = recipeChange
          ? await tripFetch(slug, url, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(recipeChange),
            })
          : await tripFetch(slug, url, { method: "DELETE" });
        if (!res2.ok) throw new Error("couldn't update the recipe for that meal");
        setEditingSlot(null);
        await load();
        return;
      }

      setTrip((t) => ({
        ...t,
        meals: [...t.meals.filter((m) => !(m.date === date && m.meal_type === mealType)), saved],
        items: [...t.items.filter((i) => !ingChanges.removeIds.includes(i.id)), ...added.filter(Boolean)],
      }));
      setEditingSlot(null);
    } catch (err) {
      setError(`Couldn't save that meal: ${err.message}`);
    } finally {
      setSavingSlot(null);
    }
  }

  async function addItem(e) {
    e.preventDefault();
    if (!newItem.name.trim() || addingItem) return;
    setAddingItem(true);
    setError("");
    try {
      const res = await tripFetch(slug, `${API_BASE}/trips/${slug}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      const item = await res.json();
      if (!res.ok) throw new Error(item.error || "add failed");
      setTrip((t) => ({ ...t, items: [...t.items, item] }));
      setNewItem((n) => ({ ...n, name: "", assigned_to: "" }));
    } catch (err) {
      setError(`Couldn't add that item: ${err.message}`);
    } finally {
      setAddingItem(false);
    }
  }

  async function toggleItem(item) {
    // Optimistic — flip locally, revert on failure.
    const flip = (checked) =>
      setTrip((t) => ({ ...t, items: t.items.map((i) => (i.id === item.id ? { ...i, checked } : i)) }));
    flip(!item.checked);
    try {
      const res = await tripFetch(slug, `${API_BASE}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: !item.checked }),
      });
      if (!res.ok) throw new Error();
    } catch {
      flip(item.checked);
      setError("Couldn't save that checkbox — try again.");
    }
  }

  /* A shopping row can stand for several ingredient rows — one per meal that
   * wants it — so ticking it has to tick all of them, or the line comes back
   * half-checked on the next load and the count in the heading is wrong.
   *
   * Toggling toward "all bought" when any part is still open: a row showing 2 lb
   * is one purchase, and the person tapping it has that sausage in the cart. */
  async function toggleRow(row) {
    const target = !row.checked;
    await Promise.all(row.parts.filter((p) => p.checked !== target).map((p) => toggleItem(p)));
  }

  async function deleteRow(row) {
    if (
      row.parts.length > 1 &&
      !window.confirm(
        `"${row.name}" is on the list for ${row.parts.length} meals. Remove all ${row.parts.length}?`
      )
    ) {
      return;
    }
    await Promise.all(row.parts.map((p) => deleteItem(p)));
  }

  async function deleteItem(item) {
    setTrip((t) => ({ ...t, items: t.items.filter((i) => i.id !== item.id) }));
    try {
      const res = await tripFetch(slug, `${API_BASE}/items/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setTrip((t) => ({ ...t, items: [...t.items, item] }));
      setError("Couldn't delete that item — try again.");
    }
  }

  /* Opens one shopping row for editing. The draft is per underlying tp_items
   * row, not per line: a rolled-up "2 lb sausage" is two rows on two different
   * meals, and they can honestly disagree about the amount and about who is
   * buying it, so each gets its own set of fields. A single-part row — nearly
   * all of them — renders as one plain line of inputs. */
  function startEditRow(rowId, row) {
    setEditingItem(rowId);
    setItemDraft(
      row.parts.map((p) => ({
        id: p.id,
        name: p.name || "",
        // Blank, not "0": the backend stores an absent quantity as NULL and a
        // zero would drop the row out of the totals. See cleanQty server-side.
        qty: p.qty == null ? "" : String(p.qty),
        unit: p.unit || "",
        assigned_to: p.assigned_to || "",
        category: p.category || "",
        meal_id: p.meal_id,
        from_recipe: p.from_recipe,
      }))
    );
  }

  const updateDraft = (idx, patch) =>
    setItemDraft((parts) => parts.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  async function saveItemEdits() {
    if (savingItem || itemDraft.some((d) => !d.name.trim())) return;
    setSavingItem(true);
    setError("");
    try {
      const saved = await Promise.all(
        itemDraft.map(async (d) => {
          const res = await tripFetch(slug, `${API_BASE}/items/${d.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: d.name.trim(),
              category: d.category.trim() || "Groceries",
              assigned_to: d.assigned_to.trim(),
              // "" clears the quantity; the backend turns it back into NULL.
              qty: d.qty.trim(),
              unit: d.unit.trim(),
            }),
          });
          const row = await res.json();
          if (!res.ok) throw new Error(row.error || "save failed");
          return row;
        })
      );
      setTrip((t) => ({
        ...t,
        items: t.items.map((i) => saved.find((sv) => sv.id === i.id) || i),
      }));
      setEditingItem(null);
      setItemDraft([]);
    } catch (err) {
      setError(`Couldn't save that item: ${err.message}`);
    } finally {
      setSavingItem(false);
    }
  }

  /* A claim is one row with no rollup behind it, so its editor is just the two
   * fields that make it up: what it is, and whose car it goes in. Reassigning
   * is the point — things get claimed in a group chat and swapped later, and
   * before this the only way to move one was to delete it and retype it under
   * the other family. */
  function startEditBring(item) {
    setEditingBring(item.id);
    setBringDraft({ name: item.name || "", assigned_to: item.assigned_to || "" });
  }

  async function saveBringEdits() {
    if (savingBring || !bringDraft.name.trim() || !bringDraft.assigned_to.trim()) return;
    setSavingBring(true);
    setError("");
    try {
      const res = await tripFetch(slug, `${API_BASE}/items/${editingBring}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bringDraft.name.trim(),
          assigned_to: bringDraft.assigned_to.trim(),
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || "save failed");
      setTrip((t) => ({ ...t, items: t.items.map((i) => (i.id === saved.id ? saved : i)) }));
      setEditingBring(null);
    } catch (err) {
      setError(`Couldn't save that: ${err.message}`);
    } finally {
      setSavingBring(false);
    }
  }

  // "Bringing" entries reuse tp_items with a reserved category — the person is
  // required, and the section renders grouped by person instead of category.
  async function addBring(e) {
    e.preventDefault();
    if (!newBring.name.trim() || !newBring.assigned_to.trim() || addingBring) return;
    setAddingBring(true);
    setError("");
    try {
      const res = await tripFetch(slug, `${API_BASE}/trips/${slug}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newBring, category: "Bringing" }),
      });
      const item = await res.json();
      if (!res.ok) throw new Error(item.error || "add failed");
      setTrip((t) => ({ ...t, items: [...t.items, item] }));
      setNewBring((n) => ({ ...n, name: "" }));
    } catch (err) {
      setError(`Couldn't add that: ${err.message}`);
    } finally {
      setAddingBring(false);
    }
  }

  /* Adds to ONE family's personal packing list. Same endpoint as everything
   * else; the family is carried in assigned_to and the FAMILY_PACKING category
   * keeps it out of the shared list. */
  async function addPack(e, family) {
    e.preventDefault();
    const name = String(newPack[family] || "").trim();
    if (!name || addingPack) return;
    setAddingPack(family);
    setError("");
    try {
      const res = await tripFetch(slug, `${API_BASE}/trips/${slug}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category: FAMILY_PACKING, assigned_to: family }),
      });
      const item = await res.json();
      if (!res.ok) throw new Error(item.error || "add failed");
      setTrip((t) => ({ ...t, items: [...t.items, item] }));
      setNewPack((n) => ({ ...n, [family]: "" }));
    } catch (err) {
      setError(`Couldn't add that: ${err.message}`);
    } finally {
      setAddingPack(null);
    }
  }

  async function saveFamilies() {
    const fams = familiesDraft.split(",").map((f) => f.trim()).filter(Boolean);
    try {
      const res = await tripFetch(slug, `${API_BASE}/trips/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ families: fams }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || "save failed");
      setTrip((t) => ({ ...t, families: saved.families }));
      setFamiliesDraft(null);
    } catch (err) {
      setError(`Couldn't save families: ${err.message}`);
    }
  }

  /* Trips move — a night gets added, everyone leaves a day early. The dates are
   * the spine of this page (the meal grid, the header range and the forecast are
   * all derived from them), so editing them re-derives all three rather than
   * touching any of the child rows.
   *
   * Nothing is deleted when the trip shrinks. Meals planned on days that fall
   * away stop being rendered but stay in tp_meals, and their day_meals entries
   * are left alone too, so widening the dates back restores the grid exactly as
   * it was. That's the whole reason the confirm below can promise it. */
  async function saveDates() {
    const start_date = datesDraft.start_date;
    const end_date = datesDraft.end_date;
    if (!start_date || !end_date) {
      setError("Pick both a first and a last day.");
      return;
    }
    if (end_date < start_date) {
      setError("The last day can't be before the first day.");
      return;
    }
    if (start_date !== trip.start_date || end_date !== trip.end_date) {
      const dropped = trip.meals.filter((m) => m.date < start_date || m.date > end_date);
      if (dropped.length > 0) {
        const dayList = [...new Set(dropped.map((m) => m.date))]
          .sort()
          .map((d) => format(parseISO(d), "EEE MMM d"))
          .join(", ");
        const ok = window.confirm(
          `${dropped.length} planned meal${dropped.length === 1 ? "" : "s"} (${dayList}) ` +
            `fall outside those dates. They'll be hidden, not deleted — widening the dates ` +
            `again brings them back. Save anyway?`
        );
        if (!ok) return;
      }
    }
    setSavingDates(true);
    setError("");
    try {
      await patchTrip({ start_date, end_date });
      setDatesDraft(null);
      // The forecast is built for the trip's range: blank the old days out
      // rather than leave them looking current while the new ones load.
      setWx(null);
      loadWeather();
    } catch (err) {
      setError(`Couldn't save the dates: ${err.message}`);
    } finally {
      setSavingDates(false);
    }
  }

  async function toggleDayMeal(date, mealKey) {
    const current = trip.day_meals?.[date] || MEAL_TYPES.map((t) => t.key);
    const next = current.includes(mealKey)
      ? current.filter((k) => k !== mealKey)
      : MEAL_TYPES.map((t) => t.key).filter((k) => current.includes(k) || k === mealKey);
    const dayMeals = { ...(trip.day_meals || {}), [date]: next };
    const prev = trip.day_meals;
    setTrip((t) => ({ ...t, day_meals: dayMeals }));
    try {
      const res = await tripFetch(slug, `${API_BASE}/trips/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_meals: dayMeals }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTrip((t) => ({ ...t, day_meals: prev }));
      setError("Couldn't save that day's meal setup — try again.");
    }
  }

  // Generic trip-field save; merges the returned trip row over local state
  // while keeping the child collections (meals/items/expenses/activities).
  async function patchTrip(body) {
    const res = await tripFetch(slug, `${API_BASE}/trips/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const saved = await res.json();
    if (!res.ok) throw new Error(saved.error || "save failed");
    setTrip((t) => ({ ...saved, meals: t.meals, items: t.items, expenses: t.expenses, activities: t.activities }));
    return saved;
  }

  async function saveCabin() {
    try {
      await patchTrip({ cabin: cabinDraft });
      setCabinDraft(null);
    } catch (err) {
      setError(`Couldn't save cabin info: ${err.message}`);
    }
  }

  function saveNotes(notes) {
    setTrip((t) => ({ ...t, notes }));
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      tripFetch(slug, `${API_BASE}/trips/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      }).catch(() => setError("Couldn't save the trip notes — check your connection."));
    }, 800);
  }

  // PIN-gated as of 2026-08-07 (Patrick's request), same gate as the delete on
  // the trip list — this one predates it and was wide open to anyone with the
  // link. Confirm first, then prompt for the PIN, so a misclick never reaches
  // the dialog that matters.
  async function deleteTrip() {
    if (!window.confirm(`Delete "${trip.name}" and everything in it? This can't be undone.`)) return;
    const result = await deleteTripWithPin(API_BASE, { slug, name: trip.name });
    if (result.ok) navigate("/tripplanner");
    else if (result.error) setError(result.error);
  }

  if (notFound) {
    return (
      <div className="tp-root">
        <style>{TP_CSS}</style>
        <div className="tp-shell" style={{ maxWidth: 640 }}>
          <h1>Trip not found</h1>
          <p style={{ color: "#6b7684" }}>That trip doesn't exist (or was deleted).</p>
          <Link to="/tripplanner" style={{ color: "#2a9d8f" }}>← All trips</Link>
        </div>
      </div>
    );
  }

  /* Checked before the loading state, and before `trip` exists at all — nothing
   * about a locked trip has been fetched, so there is nothing to render behind
   * this screen. */
  if (locked) {
    return (
      <div className="tp-root">
        <style>{TP_CSS}</style>
        <div className="tp-shell" style={{ maxWidth: 420 }}>
          <Link to="/tripplanner" style={{ color: "#2a9d8f", fontSize: 14, textDecoration: "none" }}>
            ← All trips
          </Link>
          <div style={{ background: "#fff", border: "1px solid #e4ddd0", borderRadius: 14, padding: 20, marginTop: 16, textAlign: "center" }}>
            <div style={{ fontSize: 34 }}>🔒</div>
            <h1 style={{ fontSize: 21, margin: "6px 0 4px" }}>{locked.name || "This trip"}</h1>
            <p style={{ color: "#6b7684", fontSize: 14, margin: "0 0 16px" }}>
              Enter the trip PIN to open it.
            </p>
            <form onSubmit={unlock}>
              <input
                className="tp-input"
                /* Not type="number": that draws spinners and strips leading
                   zeros, and 0930 is a perfectly good PIN. inputMode still gets
                   the number pad on a phone. */
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value)}
                placeholder="••••"
                style={{ textAlign: "center", letterSpacing: 6, fontSize: 20, marginBottom: 12 }}
                autoFocus
              />
              <button className="tp-btn" type="submit" disabled={!pinDraft.trim() || unlocking} style={{ width: "100%" }}>
                {unlocking ? "Checking…" : "Open trip"}
              </button>
            </form>
            {error && <p style={{ color: "#a33a2f", fontSize: 14, marginBottom: 0 }}>{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="tp-root">
        <style>{TP_CSS}</style>
        <div className="tp-shell" style={{ maxWidth: 640 }}>
          <p style={{ color: "#6b7684" }}>{error || "Loading trip…"}</p>
        </div>
      </div>
    );
  }

  /* eachDayOfInterval throws on a backwards interval, which would white-screen
   * the whole page. The date editor and the backend both refuse to save one, but
   * this render runs against whatever the row already holds — so it degrades to
   * a single day instead of taking the trip down. */
  const tripStart = parseISO(trip.start_date);
  const tripEnd = parseISO(trip.end_date);
  const days = tripEnd >= tripStart ? eachDayOfInterval({ start: tripStart, end: tripEnd }) : [tripStart];
  // Meals still stored on days the trip no longer covers (someone shortened it).
  // Surfaced rather than silently dropped — see the banner under the Meals
  // heading and the marker on their ingredients in the shopping list.
  const outsideDate = (date) => date < trip.start_date || date > trip.end_date;
  const outsideMeals = trip.meals.filter((m) => outsideDate(m.date));
  const mealFor = (date, type) => trip.meals.find((m) => m.date === date && m.meal_type === type);
  /* Clearing a slot can leave an empty tp_meals row behind: the server keeps the
   * row when it still counts ingredients, and the client removes those a moment
   * later. That husk is not a planned meal, so it must not be what decides a
   * toggled-off slot stays on screen — otherwise breakfast comes back as "—". */
  const mealHasContent = (m) =>
    !!m &&
    ((m.title || "").trim() !== "" ||
      (m.details || "").trim() !== "" ||
      (m.assigned_to || "").trim() !== "" ||
      trip.items.some((i) => i.meal_id === m.id));
  const mealById = Object.fromEntries(trip.meals.map((m) => [m.id, m]));
  const recipeById = Object.fromEntries((trip.recipes || []).map((r) => [r.id, r]));
  const bringItems = trip.items.filter((i) => i.category === "Bringing");
  const allListItems = trip.items.filter(
    (i) => i.category !== "Bringing" && i.category !== FAMILY_PACKING
  );
  const families = trip.families || [];
  // Color-match "Angelle" but also "Angelle family" / "the Angelles".
  const colorFor = (name) => {
    if (!name) return undefined;
    const idx = families.findIndex((f) => name.toLowerCase().includes(f.toLowerCase()));
    return idx >= 0 ? FAMILY_COLORS[idx % FAMILY_COLORS.length] : undefined;
  };
  /* Which bucket a row's owner falls in, for the filter and its pills. Same
   * lenient family match as the chips — "Bullion family" and "the Bullions"
   * both belong to Bullion — with everything unassigned under one label so
   * "what has nobody taken yet" is answerable. */
  const ownerKey = (item) => {
    const who = String(item.assigned_to || "").trim();
    if (!who) return "Unclaimed";
    return families.find((f) => who.toLowerCase().includes(f.toLowerCase())) || who;
  };
  const ownerKeys = new Set(allListItems.map(ownerKey));
  const whoOptions = [
    ...families.filter((f) => ownerKeys.has(f)),
    ...[...ownerKeys].filter((k) => !families.includes(k) && k !== "Unclaimed").sort(),
    ...(ownerKeys.has("Unclaimed") ? ["Unclaimed"] : []),
  ];
  /* Reassigning the last row away from the family you are filtered to empties
   * that bucket, and dropping its pill would leave the list looking empty with
   * no visible way back to Everyone. The active filter always keeps a pill. */
  if (whoFilter && !whoOptions.includes(whoFilter)) whoOptions.push(whoFilter);
  /* Filtering the underlying rows rather than the rolled-up lines is deliberate:
   * a 2 lb sausage line that is 1 lb yours and 1 lb theirs shows YOUR 1 lb under
   * a filter, which is the number you are shopping to. Hiding whole lines would
   * show a total you aren't buying. */
  const listItems = whoFilter ? allListItems.filter((i) => ownerKey(i) === whoFilter) : allListItems;
  const categories = [...new Set(listItems.map((i) => i.category))];
  const allCategories = [...new Set(allListItems.map((i) => i.category))];
  /* Counted over rolled-up ROWS, matching what the list renders. Counting raw
   * tp_items here instead told you "12 to go" above a list of 10 lines, because
   * the two ingredient rows behind "2 lb sausage" are one thing to buy.
   *
   * Deliberately over the UNFILTERED list: this number rides in the jump nav at
   * the top of the page, where it reads as "the trip still needs this much",
   * and having it drop when someone filters to their own rows would read as
   * items having been bought. */
  const shoppingLeft =
    allCategories.reduce(
      (n, cat) => n + rollUpItems(allListItems.filter((i) => i.category === cat)).filter((r) => !r.checked).length,
      0
    ) + trip.items.filter((i) => i.category === FAMILY_PACKING && !i.checked).length;
  /* "Who's bringing what" grouped by family rather than by when it was claimed —
   * the question it answers is "what am I loading in my car". Families keep
   * trip.families order so the section headings run in the same order as their
   * colour chips; a name that isn't on the list (or is blank) sorts to the end
   * under "Unclaimed" rather than being dropped. */
  /* Each family's packing list: their shared-gear claims from "Who's bringing
   * what" auto-included, plus whatever they've added themselves.
   *
   * Every family on the trip gets a section even with nothing in it — an empty
   * list is the prompt to fill it in, and hiding it makes the feature invisible
   * to whoever hasn't started. */
  const familyPacking = (() => {
    const matches = (who, family) =>
      String(who || "").toLowerCase().includes(String(family).toLowerCase());
    return families.map((family) => ({
      family,
      shared: sortByName(bringItems.filter((i) => matches(i.assigned_to, family))),
      own: sortByName(
        trip.items.filter(
          (i) => i.category === FAMILY_PACKING && matches(i.assigned_to, family)
        )
      ),
    }));
  })();

  const bringGroups = (() => {
    const key = (item) => {
      const who = String(item.assigned_to || "").trim();
      if (!who) return "Unclaimed";
      const match = families.find((f) => who.toLowerCase().includes(f.toLowerCase()));
      return match || who;
    };
    const buckets = new Map();
    bringItems.forEach((item) => {
      const k = key(item);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(item);
    });
    const ordered = [
      ...families.filter((f) => buckets.has(f)),
      ...[...buckets.keys()].filter((k) => !families.includes(k) && k !== "Unclaimed").sort(),
      ...(buckets.has("Unclaimed") ? ["Unclaimed"] : []),
    ];
    return ordered.map((label) => ({ label, items: sortByName(buckets.get(label)) }));
  })();
  const bringWhoOptions = bringGroups.map((g) => g.label);
  /* Same guard as the shopping filter: moving the last claim off the family you
   * are filtered to would otherwise take its pill with it and strand you on an
   * empty list with no visible way back to Everyone. */
  if (bringFilter && !bringWhoOptions.includes(bringFilter)) bringWhoOptions.push(bringFilter);
  const shownBringGroups = bringFilter
    ? bringGroups.filter((g) => g.label === bringFilter)
    : bringGroups;
  const categorySuggestions = [...new Set(["Groceries", "Beach gear", "Kids", ...allCategories])];
  // Listing + address ride along in the header too — they're what everyone
  // reaches for on the drive down, and the cabin card is at the bottom.
  const cabin = trip.cabin || {};
  const mapQuery = cabin.address || trip.location;
  // A card only appears once it has something to say — an empty "Golf cart"
  // heading reads like the cart fell through.
  const logistics = LOGISTICS.map(({ label, icon, keys }) => ({
    label,
    icon,
    lines: keys.map((k) => cabin[k]).filter(Boolean),
  })).filter((l) => l.lines.length > 0);

  return (
    <div className="tp-root">
      <style>{TP_CSS}</style>
      {openWxDay && (
        <WeatherDayModal day={openWxDay} place={wx?.place || trip.location} onClose={hideWxDay} />
      )}
      {openRecipe && (
        <RecipeModal
          recipe={openRecipe.recipe}
          scale={openRecipe.scale}
          mealTitle={openRecipe.mealTitle}
          onClose={hideRecipe}
        />
      )}
      <div className="tp-shell">
        <Link to="/tripplanner" style={{ color: "#2a9d8f", fontSize: 14, textDecoration: "none" }}>
          ← All trips
        </Link>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          <h1 style={{ fontSize: 26, margin: 0 }}>{trip.name}</h1>
          {datesDraft === null ? (
            <div style={{ color: "#6b7684", fontSize: 15, display: "flex", alignItems: "baseline", gap: 6 }}>
              <span>
                {trip.location ? `${trip.location} · ` : ""}
                {format(days[0], "EEE MMM d")} – {format(days[days.length - 1], "EEE MMM d")}
              </span>
              {/* The dates are where the day cards come from, so editing them
                  lives on the label that shows them rather than off in the
                  cabin card with the check-in time. */}
              <button
                className="tp-btn-quiet"
                style={{ fontSize: 13, padding: "2px 6px" }}
                onClick={() => setDatesDraft({ start_date: trip.start_date, end_date: trip.end_date })}
              >
                edit dates
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <input
                className="tp-input"
                type="date"
                style={{ marginBottom: 0, width: "auto" }}
                value={datesDraft.start_date}
                onChange={(e) => setDatesDraft((d) => ({ ...d, start_date: e.target.value }))}
              />
              <span style={{ color: "#6b7684" }}>–</span>
              <input
                className="tp-input"
                type="date"
                style={{ marginBottom: 0, width: "auto" }}
                value={datesDraft.end_date}
                min={datesDraft.start_date || undefined}
                onChange={(e) => setDatesDraft((d) => ({ ...d, end_date: e.target.value }))}
              />
              <button
                className="tp-btn"
                onClick={saveDates}
                disabled={
                  savingDates ||
                  !datesDraft.start_date ||
                  !datesDraft.end_date ||
                  datesDraft.end_date < datesDraft.start_date
                }
              >
                {savingDates ? "Saving…" : "Save"}
              </button>
              <button className="tp-btn-quiet" disabled={savingDates} onClick={() => setDatesDraft(null)}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {(cabin.link || mapQuery) && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 15 }}>
            {cabin.link && (
              <a href={externalHref(cabin.link)} target="_blank" rel="noreferrer" style={{ color: "#2a9d8f", fontWeight: 600 }}>
                🏠 The house
              </a>
            )}
            {mapQuery && (
              <a href={mapsHref(mapQuery)} target="_blank" rel="noreferrer" style={{ color: "#2a9d8f", fontWeight: 600 }}>
                📍 {mapQuery}
              </a>
            )}
          </div>
        )}

        {logistics.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            {logistics.map(({ label, icon, lines }) => (
              <div
                key={label}
                style={{ background: "#fff", border: "1px solid #e4ddd0", borderRadius: 12, padding: "9px 13px", minWidth: 150, flex: "1 1 170px", maxWidth: 260 }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7684", textTransform: "uppercase", letterSpacing: 0.4 }}>
                  {icon} {label}
                </div>
                {lines.map((line) => (
                  <div key={line} style={{ fontSize: 15, fontWeight: 600, marginTop: 3 }}>{line}</div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {familiesDraft === null ? (
            <>
              {families.map((f) => (
                <Chip key={f} color={colorFor(f)}>{f}</Chip>
              ))}
              <button
                className="tp-btn-quiet"
                style={{ fontSize: 13, padding: "2px 6px" }}
                onClick={() => setFamiliesDraft(families.join(", "))}
              >
                {families.length ? "edit families" : "+ add families (for color coding)"}
              </button>
            </>
          ) : (
            <>
              <input
                className="tp-input"
                style={{ marginBottom: 0, maxWidth: 340 }}
                value={familiesDraft}
                onChange={(e) => setFamiliesDraft(e.target.value)}
                placeholder="Angelle, Bullion, Hays"
                autoFocus
              />
              <button className="tp-btn" onClick={saveFamilies}>Save</button>
              <button className="tp-btn-quiet" onClick={() => setFamiliesDraft(null)}>Cancel</button>
            </>
          )}
        </div>

        <nav className="tp-jump">
          <a href="#tp-meals">🍽️ Meals</a>
          <a href="#tp-packing">🛒 Shopping{allListItems.length + trip.items.filter((i) => i.category === FAMILY_PACKING).length > 0 ? ` (${shoppingLeft} to go)` : ""}</a>
          <a href="#tp-bringing">🏕️ Bringing</a>
          <a href="#tp-familypacking">🧳 Family packing</a>
          <a href="#tp-cabin">🏠 Cabin</a>
          <a href="#tp-notes">📝 Notes</a>
        </nav>

        {wx?.available && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 14, paddingBottom: 4 }}>
            {wx.days.map((d) => (
              <button
                key={d.date}
                className="tp-wxcard"
                onClick={() => setOpenWxDay(d)}
                aria-label={`${d.day} ${d.dateLabel}: high ${d.high}, low ${d.low}, ${d.rainChance}% rain. Open hourly detail.`}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7684" }}>{d.day} {d.dateLabel}</div>
                <div style={{ fontSize: 22, margin: "2px 0" }}>{d.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.high}° <span style={{ color: "#a8a094", fontWeight: 400 }}>{d.low}°</span></div>
                <div style={{ fontSize: 11, color: "#3d6a94" }}>💧{d.rainChance}%</div>
              </button>
            ))}
          </div>
        )}
        {wx && !wx.available && trip.location && (
          <div style={{ color: "#a8a094", fontSize: 13, marginTop: 10 }}>
            🌤️ Forecast for {trip.location} will show here about 10 days out.
          </div>
        )}

        {error && (
          <div style={{ background: "#fdecea", border: "1px solid #f5c6c0", color: "#a33a2f", borderRadius: 10, padding: "10px 14px", margin: "12px 0" }}>
            {error}
          </div>
        )}

        <h2 id="tp-meals" style={{ fontSize: 19, margin: "22px 0 10px" }}>Meals</h2>
        {/* Shortening a trip has to say so. Without this the day cards just
            quietly stop existing and the meals planned on them look deleted —
            they aren't, and the fix is to widen the dates back. */}
        {outsideMeals.length > 0 && (
          <div style={{ background: "#fff8e6", border: "1px solid #f0dfae", color: "#7a5c11", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 14, maxWidth: 640 }}>
            📅 {outsideMeals.length} planned meal{outsideMeals.length === 1 ? "" : "s"} fall outside these
            dates ({[...new Set(outsideMeals.map((m) => m.date))].sort().map((d) => format(parseISO(d), "EEE MMM d")).join(", ")}).
            Still saved, just not shown — widen the trip dates to get them back.
          </div>
        )}
        <div className="tp-days">
          {days.map((day) => {
            const date = format(day, "yyyy-MM-dd");
            const needed = trip.day_meals?.[date] || MEAL_TYPES.map((t) => t.key);
            // A slot with a meal already planned always stays visible, even if
            // it's been toggled off for this day — nothing disappears silently.
            // An emptied-out slot has nothing to lose, so it just goes away.
            const visible = MEAL_TYPES.filter(
              ({ key }) => needed.includes(key) || mealHasContent(mealFor(date, key))
            );
            return (
              <div key={date} className="tp-daycard">
                <div style={{ background: "#26303a", color: "#fff", padding: "9px 14px", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span>
                    {format(day, "EEEE")}
                    <span style={{ fontWeight: 400, opacity: 0.75, marginLeft: 8 }}>{format(day, "MMM d")}</span>
                  </span>
                  <button className="tp-daymeals" onClick={() => setPickingDay(pickingDay === date ? null : date)}>
                    {pickingDay === date ? "done" : "which meals?"}
                  </button>
                </div>
                {pickingDay === date && (
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #f0ebe0", background: "#faf8f2", display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {MEAL_TYPES.map(({ key, label, emoji }) => (
                      <button
                        key={key}
                        className={`tp-mealtoggle${needed.includes(key) ? " on" : ""}`}
                        onClick={() => toggleDayMeal(date, key)}
                      >
                        {emoji} {label}
                      </button>
                    ))}
                  </div>
                )}
                {visible.length === 0 && (
                  <div style={{ padding: "12px 14px", color: "#b8ad9a", fontSize: 14 }}>No meals needed this day</div>
                )}
                {visible.map(({ key, label, emoji }) => {
                  const meal = mealFor(date, key);
                  const mealIngs = meal ? trip.items.filter((i) => i.meal_id === meal.id) : [];
                  const slotKey = `${date}|${key}`;
                  if (editingSlot === slotKey) {
                    return (
                      <div key={key}>
                        <div style={{ padding: "10px 14px 0", fontSize: 12, fontWeight: 700, color: "#6b7684", textTransform: "uppercase", letterSpacing: 0.5 }}>
                          {emoji} {label}
                        </div>
                        <MealEditor
                          meal={meal}
                          ingredients={mealIngs}
                          recipes={recipeCatalog}
                          saving={savingSlot === slotKey}
                          onSave={(fields, ingChanges) => saveMeal(date, key, fields, ingChanges)}
                          onCancel={() => setEditingSlot(null)}
                        />
                      </div>
                    );
                  }
                  const cardRecipe = meal?.recipe_id ? recipeById[meal.recipe_id] : null;
                  return (
                    /* The slot is a button, so the recipe link sits OUTSIDE it
                       rather than nested in it — a button inside a button is
                       invalid, and the inner one swallows taps unpredictably on
                       iOS Safari, which is most of how this page gets read. */
                    <div key={key}>
                    <button className="tp-slot" onClick={() => setEditingSlot(slotKey)}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7684", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span>{emoji} {label}</span>
                        {meal?.assigned_to && <Chip color={colorFor(meal.assigned_to)}>{meal.assigned_to}</Chip>}
                      </div>
                      {meal ? (
                        <>
                          <div style={{ fontWeight: 600, marginTop: 3 }}>{meal.title || "—"}</div>
                          {meal.details && <div style={{ fontSize: 13, color: "#6b7684", marginTop: 2, whiteSpace: "pre-wrap" }}>{meal.details}</div>}
                          {mealIngs.length > 0 && (
                            <div style={{ fontSize: 13, color: "#6b7684", marginTop: 3 }}>
                              🛒{" "}
                              {mealIngs.map((i, idx) => (
                                <span key={i.id} style={{ textDecoration: i.checked ? "line-through" : "none", color: i.checked ? "#a8a094" : undefined }}>
                                  {i.qty != null && <span className="tp-qty">{formatAmount(i.qty, i.unit)} </span>}
                                  {i.name}
                                  {idx < mealIngs.length - 1 ? ", " : ""}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ color: "#b8ad9a", marginTop: 3, fontSize: 14 }}>+ Add {label.toLowerCase()}</div>
                      )}
                    </button>
                    {cardRecipe && (
                      <div style={{ padding: "0 14px 10px" }}>
                        <button
                          className="tp-recipe-link"
                          onClick={() => showRecipe(cardRecipe, meal.recipe_scale, meal.title)}
                        >
                          📖 {cardRecipe.title}
                          {Number(meal.recipe_scale) !== 1 ? ` · ${Number(meal.recipe_scale)}x` : ""}
                        </button>
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <h2 id="tp-packing" style={{ fontSize: 19, margin: "28px 0 10px" }}>Shopping list</h2>
        <div style={{ background: "#fff", border: "1px solid #e4ddd0", borderRadius: 14, padding: 16, maxWidth: 640 }}>
          {/* Who's responsible. Only worth showing once somebody has actually been
              put on a row — before that every pill but "Everyone" is empty. */}
          {(whoOptions.length > 0 || whoFilter) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              <button
                type="button"
                className={`tp-mealtoggle${whoFilter === "" ? " on" : ""}`}
                onClick={() => setWhoFilter("")}
              >
                Everyone
              </button>
              {whoOptions.map((who) => (
                <button
                  key={who}
                  type="button"
                  className={`tp-mealtoggle${whoFilter === who ? " on" : ""}`}
                  onClick={() => setWhoFilter(whoFilter === who ? "" : who)}
                >
                  {who}
                </button>
              ))}
            </div>
          )}
          {listItems.length === 0 && (
            <p style={{ color: "#6b7684", marginTop: 0 }}>
              {whoFilter
                ? `Nothing on ${whoFilter === "Unclaimed" ? "the unclaimed" : `${whoFilter}'s`} list — pick Everyone to see the rest.`
                : "Nothing on the list yet — add the essentials below."}
            </p>
          )}
          {categories.map((cat) => {
            const catRows = rollUpItems(listItems.filter((i) => i.category === cat));
            const left = catRows.filter((r) => !r.checked).length;
            const isCollapsed = collapsed.has(cat);
            return (
            <div key={cat} style={{ marginBottom: 14 }}>
              {/* The whole heading is the toggle — a 39-item grocery list is the
                  bulk of this page once the meals are planned, and the count
                  stays visible while collapsed so it still tells you where you
                  are. aria-expanded so it reads as a disclosure, not a label. */}
              <button
                type="button"
                onClick={() => toggleCollapsed(cat)}
                aria-expanded={!isCollapsed}
                style={{
                  display: "flex", alignItems: "center", gap: 6, width: "100%",
                  background: "none", border: "none", padding: "4px 0", cursor: "pointer",
                  font: "inherit", fontSize: 12, fontWeight: 700, color: "#6b7684",
                  textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left",
                }}
              >
                <span style={{ fontSize: 10, color: "#a8a094" }}>{isCollapsed ? "▶" : "▼"}</span>
                {cat}
                <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#a8a094" }}>
                  {left > 0 ? `${left} to go` : `${catRows.length} done`}
                </span>
              </button>
              {!isCollapsed && (
                <>
              {/* Groceries get aisle sub-headings so the trip is one pass through
                  the store; every other category is just sorted A-Z, because an
                  aisle means nothing for beach chairs. Either way the bought
                  rows sink to the bottom of their group — see byDoneThenName in
                  groceryAisles.js. */}
              {/* Roll up FIRST, then file into aisles. The other order files each
                  meal's copy separately and a merged row would have to pick an
                  aisle from one of them — "Jimmy Dean Sausage" and "Breakfast
                  Sausage" both land in Meat today, but nothing guarantees that
                  for the next pair, and a row appearing in two aisles is worse
                  than either aisle being slightly off. */}
              {(cat.toLowerCase() === "groceries"
                ? groupByAisle(rollUpItems(listItems.filter((i) => i.category === cat)))
                : [{ label: null, items: sortByName(rollUpItems(listItems.filter((i) => i.category === cat))) }]
              ).map((group) => (
                <div key={group.label || "all"}>
                  {group.label && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#a8a094", textTransform: "uppercase", letterSpacing: 0.4, margin: "10px 0 2px" }}>
                      {group.label}
                    </div>
                  )}
                  {group.items.map((row) => {
                  /* One row per ingredient, not per meal. `row.parts` is every
                     underlying tp_items row it stands for — usually one, and
                     then this renders exactly as the list always has. */
                  const shared = row.parts.length > 1;
                  const soleMeal = !shared && row.parts[0].meal_id ? mealById[row.parts[0].meal_id] : null;
                  const owners = [...new Set(row.parts.map((p) => p.assigned_to).filter(Boolean))];
                  /* Row key is the normalized name, which is only unique inside
                     a category — "Ice" in Groceries and in Beach gear are two
                     different lines and must not open each other. */
                  const rowId = `${cat}|${row.key}`;
                  if (editingItem === rowId) {
                    return (
                      <div key={row.key} className="tp-editrow">
                        {itemDraft.map((d, idx) => {
                          const m = d.meal_id ? mealById[d.meal_id] : null;
                          return (
                            <div key={d.id} style={{ marginBottom: 8 }}>
                              {/* Only says which meal when there is more than one
                                  to tell apart — on an ordinary row the label is
                                  noise above a single line of inputs. */}
                              {itemDraft.length > 1 && (
                                <div style={{ fontSize: 12, color: "#a8a094", marginBottom: 3 }}>
                                  {m ? `${format(parseISO(m.date), "EEE")} ${m.title || m.meal_type}` : "on the list"}
                                </div>
                              )}
                              <div className="tp-editpart">
                                <input
                                  className="tp-input"
                                  style={{ flex: "2 1 150px", marginBottom: 0 }}
                                  value={d.name}
                                  onChange={(e) => updateDraft(idx, { name: e.target.value })}
                                  placeholder="Item"
                                  aria-label="Item"
                                />
                                <input
                                  className="tp-input"
                                  style={{ flex: "0 1 68px", marginBottom: 0 }}
                                  value={d.qty}
                                  onChange={(e) => updateDraft(idx, { qty: e.target.value })}
                                  placeholder="Qty"
                                  inputMode="decimal"
                                  aria-label="Quantity"
                                />
                                <input
                                  className="tp-input"
                                  style={{ flex: "0 1 88px", marginBottom: 0 }}
                                  value={d.unit}
                                  onChange={(e) => updateDraft(idx, { unit: e.target.value })}
                                  placeholder="Unit"
                                  list="tp-units"
                                  aria-label="Unit"
                                />
                                {families.length > 0 ? (
                                  <select
                                    className="tp-input"
                                    style={{ flex: "1 1 120px", marginBottom: 0 }}
                                    value={d.assigned_to}
                                    onChange={(e) => updateDraft(idx, { assigned_to: e.target.value })}
                                    aria-label="Who's responsible"
                                  >
                                    <option value="">Nobody yet</option>
                                    {families.map((f) => (
                                      <option key={f} value={f}>{f}</option>
                                    ))}
                                    {/* A name typed in before the families list
                                        existed (or since removed from it) is
                                        still on the row — keep it selectable so
                                        opening the editor can't silently blank
                                        somebody out. */}
                                    {d.assigned_to && !families.includes(d.assigned_to) && (
                                      <option value={d.assigned_to}>{d.assigned_to}</option>
                                    )}
                                  </select>
                                ) : (
                                  <input
                                    className="tp-input"
                                    style={{ flex: "1 1 120px", marginBottom: 0 }}
                                    value={d.assigned_to}
                                    onChange={(e) => updateDraft(idx, { assigned_to: e.target.value })}
                                    placeholder="Who"
                                    aria-label="Who's responsible"
                                  />
                                )}
                                <input
                                  className="tp-input"
                                  style={{ flex: "1 1 110px", marginBottom: 0 }}
                                  value={d.category}
                                  onChange={(e) => updateDraft(idx, { category: e.target.value })}
                                  list="tp-categories"
                                  placeholder="Category"
                                  aria-label="Category"
                                />
                              </div>
                              {/* Attaching or rescaling a recipe deletes and
                                  rebuilds its ingredient rows, so an edit made
                                  here goes with them. Say so rather than let the
                                  change quietly disappear next time the meal is
                                  touched. */}
                              {d.from_recipe && (
                                <div style={{ fontSize: 12, color: "#a8802a", marginTop: 4 }}>
                                  Comes from the recipe on that meal — rescaling or re-picking the recipe rebuilds this row and overwrites these edits.
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                          <button
                            className="tp-btn"
                            type="button"
                            onClick={saveItemEdits}
                            disabled={savingItem || itemDraft.some((d) => !d.name.trim())}
                          >
                            {savingItem ? "Saving…" : "Save"}
                          </button>
                          <button
                            className="tp-btn-quiet"
                            type="button"
                            onClick={() => { setEditingItem(null); setItemDraft([]); }}
                            disabled={savingItem}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={row.key} className="tp-item-row">
                      <input type="checkbox" className="tp-check" checked={row.checked} onChange={() => toggleRow(row)} />
                      <span style={{ flex: 1, textDecoration: row.checked ? "line-through" : "none", color: row.checked ? "#a8a094" : "inherit" }}>
                        {row.name}
                        {row.total.text && <span className="tp-qty"> — {row.total.text}</span>}
                        {/* Says out loud that the total is short: two meals want
                            it, one of them never said how much, and the number
                            to the left only covers the other. Better than a
                            confident figure that under-buys. */}
                        {row.total.unquantified > 0 && row.total.text && (
                          <span style={{ fontSize: 12, color: "#a8802a" }}> +{row.total.unquantified} more, amount not set</span>
                        )}
                        {soleMeal && (
                          <span style={{ fontSize: 12, color: "#a8a094", marginLeft: 6 }}>
                            {format(parseISO(soleMeal.date), "EEE")} {soleMeal.meal_type}
                            {soleMeal.title ? ` · ${soleMeal.title}` : ""}
                            {/* Its day is no longer part of the trip, so the
                                "Thu dinner" above points at a card that isn't
                                on the page — say why before someone buys for
                                a meal nobody is cooking. */}
                            {outsideDate(soleMeal.date) && (
                              <span style={{ color: "#a8802a" }}> · outside trip dates</span>
                            )}
                          </span>
                        )}
                        {/* The whole reason the totals exist: WHICH meals, and
                            how much each one wants. Without it a doubled number
                            is unexplainable, and dropping a meal leaves you
                            unable to work out what the new total should be. */}
                        {shared && (
                          <span className="tp-breakdown">
                            {row.parts.map((p) => {
                              const m = p.meal_id ? mealById[p.meal_id] : null;
                              const when = m
                                ? `${format(parseISO(m.date), "EEE")} ${m.title || m.meal_type}`
                                : "on the list";
                              const amount = p.qty != null ? ` ${formatAmount(p.qty, p.unit)}` : "";
                              return (
                                <span key={p.id} style={{ textDecoration: p.checked ? "line-through" : "none" }}>
                                  · {when}{amount}
                                  {m && outsideDate(m.date) && <span style={{ color: "#a8802a" }}> (outside trip dates)</span>}
                                </span>
                              );
                            })}
                          </span>
                        )}
                      </span>
                      {owners.map((o) => (
                        <Chip key={o} color={colorFor(o)}>{o}</Chip>
                      ))}
                      <button className="tp-edit" title="Edit item" onClick={() => startEditRow(rowId, row)}>✎</button>
                      <button className="tp-del" title="Remove item" onClick={() => deleteRow(row)}>✕</button>
                    </div>
                  );
                  })}
                </div>
              ))}
                </>
              )}
            </div>
            );
          })}

          <form onSubmit={addItem} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <input
              className="tp-input"
              style={{ flex: "2 1 160px", marginBottom: 0 }}
              value={newItem.name}
              onChange={(e) => setNewItem((n) => ({ ...n, name: e.target.value }))}
              placeholder="Add an item…"
            />
            <input
              className="tp-input"
              style={{ flex: "1 1 110px", marginBottom: 0 }}
              value={newItem.category}
              onChange={(e) => setNewItem((n) => ({ ...n, category: e.target.value }))}
              list="tp-categories"
              placeholder="Category"
            />
            <datalist id="tp-categories">
              {categorySuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {/* The canonical spellings the backend stores. Two amounts only add
                together when their units match exactly, so "lb" vs "pounds"
                typed by two people is a rollup that silently stops totalling —
                see cleanUnit in routes/tripPlanner.js. */}
            <datalist id="tp-units">
              {["lb", "oz", "cup", "tsp", "tbsp", "can", "pkg", "bottle", "bag", "box", "jar", "dozen", "ct", "qt", "gal"].map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            {/* Picked, not typed, once the trip knows its families: the chips,
                the colour coding and the filter above all match on the family
                NAME, and a free-typed "bullions" quietly lands in its own
                bucket. Falls back to a text box on a trip with no families. */}
            {families.length > 0 ? (
              <select
                className="tp-input"
                style={{ flex: "1 1 130px", marginBottom: 0 }}
                value={newItem.assigned_to}
                onChange={(e) => setNewItem((n) => ({ ...n, assigned_to: e.target.value }))}
                aria-label="Who's responsible"
              >
                <option value="">Who's responsible…</option>
                {families.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            ) : (
              <input
                className="tp-input"
                style={{ flex: "1 1 110px", marginBottom: 0 }}
                value={newItem.assigned_to}
                onChange={(e) => setNewItem((n) => ({ ...n, assigned_to: e.target.value }))}
                placeholder="Who (optional)"
              />
            )}
            <button className="tp-btn" type="submit" disabled={!newItem.name.trim() || addingItem}>
              {addingItem ? "Adding…" : "Add"}
            </button>
          </form>
        </div>

        <h2 id="tp-bringing" style={{ fontSize: 19, margin: "28px 0 10px" }}>Who's bringing what</h2>
        <div style={{ background: "#fff", border: "1px solid #e4ddd0", borderRadius: 14, padding: 16, maxWidth: 640 }}>
          {(bringWhoOptions.length > 0 || bringFilter) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              <button
                type="button"
                className={`tp-mealtoggle${bringFilter === "" ? " on" : ""}`}
                onClick={() => setBringFilter("")}
              >
                Everyone
              </button>
              {bringWhoOptions.map((who) => (
                <button
                  key={who}
                  type="button"
                  className={`tp-mealtoggle${bringFilter === who ? " on" : ""}`}
                  onClick={() => setBringFilter(bringFilter === who ? "" : who)}
                >
                  {who}
                </button>
              ))}
            </div>
          )}
          {bringItems.length === 0 && (
            <p style={{ color: "#6b7684", marginTop: 0 }}>
              Nothing claimed yet — pop-up canopy, beach cart, cooler, cornhole…
            </p>
          )}
          {bringItems.length > 0 && shownBringGroups.length === 0 && (
            <p style={{ color: "#6b7684", marginTop: 0 }}>
              {bringFilter === "Unclaimed"
                ? "Everything here has a family on it — pick Everyone to see the rest."
                : `${bringFilter} hasn't claimed anything — pick Everyone to see the rest.`}
            </p>
          )}
          {/* Grouped by family, A-Z inside each with anything already loaded
              sunk to the bottom of its group: the question this list answers is
              "what goes in MY car", which reading down one family's rows gives
              you and a claim-ordered list does not. The per-row chip is dropped
              inside a group — the heading already says whose it is. */}
          {shownBringGroups.map((group) => (
            <div key={group.label}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 2px" }}>
                <Chip color={colorFor(group.label)}>{group.label}</Chip>
                <span style={{ fontSize: 12, color: "#a8a094" }}>
                  {group.items.length} item{group.items.length === 1 ? "" : "s"}
                </span>
              </div>
              {group.items.map((item) =>
                editingBring === item.id ? (
                  <div key={item.id} className="tp-editrow">
                    <div className="tp-editpart">
                      <input
                        className="tp-input"
                        style={{ flex: "2 1 160px", marginBottom: 0 }}
                        value={bringDraft.name}
                        onChange={(e) => setBringDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="I'm bringing…"
                        aria-label="Item"
                      />
                      {families.length > 0 ? (
                        <select
                          className="tp-input"
                          style={{ flex: "1 1 120px", marginBottom: 0 }}
                          value={bringDraft.assigned_to}
                          onChange={(e) => setBringDraft((d) => ({ ...d, assigned_to: e.target.value }))}
                          aria-label="Which family"
                        >
                          <option value="">Family…</option>
                          {families.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                          {/* A claim made under a name that isn't on the families
                              list — typed before the list existed, or since
                              renamed — keeps its value selectable so opening the
                              editor can't silently reassign it. */}
                          {bringDraft.assigned_to && !families.includes(bringDraft.assigned_to) && (
                            <option value={bringDraft.assigned_to}>{bringDraft.assigned_to}</option>
                          )}
                        </select>
                      ) : (
                        <input
                          className="tp-input"
                          style={{ flex: "1 1 120px", marginBottom: 0 }}
                          value={bringDraft.assigned_to}
                          onChange={(e) => setBringDraft((d) => ({ ...d, assigned_to: e.target.value }))}
                          placeholder="Who"
                          aria-label="Which family"
                        />
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
                      <button
                        className="tp-btn"
                        type="button"
                        onClick={saveBringEdits}
                        disabled={savingBring || !bringDraft.name.trim() || !bringDraft.assigned_to.trim()}
                      >
                        {savingBring ? "Saving…" : "Save"}
                      </button>
                      <button
                        className="tp-btn-quiet"
                        type="button"
                        onClick={() => setEditingBring(null)}
                        disabled={savingBring}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={item.id} className="tp-item-row">
                    <input type="checkbox" className="tp-check" title="Packed / loaded" checked={item.checked} onChange={() => toggleItem(item)} />
                    <span style={{ flex: 1, textDecoration: item.checked ? "line-through" : "none", color: item.checked ? "#a8a094" : "inherit" }}>
                      {item.name}
                    </span>
                    <button className="tp-edit" title="Edit" onClick={() => startEditBring(item)}>✎</button>
                    <button className="tp-del" title="Remove" onClick={() => deleteItem(item)}>✕</button>
                  </div>
                )
              )}
            </div>
          ))}
          <form onSubmit={addBring} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <input
              className="tp-input"
              style={{ flex: "2 1 160px", marginBottom: 0 }}
              value={newBring.name}
              onChange={(e) => setNewBring((n) => ({ ...n, name: e.target.value }))}
              placeholder="I'm bringing…"
            />
            {families.length > 0 ? (
              <select
                className="tp-input"
                style={{ flex: "1 1 120px", marginBottom: 0 }}
                value={newBring.assigned_to}
                onChange={(e) => setNewBring((n) => ({ ...n, assigned_to: e.target.value }))}
              >
                <option value="">Family…</option>
                {families.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            ) : (
              <input
                className="tp-input"
                style={{ flex: "1 1 120px", marginBottom: 0 }}
                value={newBring.assigned_to}
                onChange={(e) => setNewBring((n) => ({ ...n, assigned_to: e.target.value }))}
                placeholder="Who"
              />
            )}
            <button className="tp-btn" type="submit" disabled={!newBring.name.trim() || !newBring.assigned_to.trim() || addingBring}>
              {addingBring ? "Adding…" : "Add"}
            </button>
          </form>
        </div>

        <h2 id="tp-familypacking" style={{ fontSize: 19, margin: "28px 0 10px" }}>Packing, by family</h2>
        <div style={{ background: "#fff", border: "1px solid #e4ddd0", borderRadius: 14, padding: 16, maxWidth: 640 }}>
          {families.length === 0 && (
            <p style={{ color: "#6b7684", marginTop: 0 }}>
              Add the families up by the trip name and each one gets its own list here.
            </p>
          )}
          {familyPacking.map(({ family, shared, own }, idx) => {
            const total = shared.length + own.length;
            const packed = [...shared, ...own].filter((i) => i.checked).length;
            const isOpen = expandedFams.has(family);
            return (
            <div
              key={family}
              style={{
                paddingTop: idx === 0 ? 0 : 14,
                marginTop: idx === 0 ? 0 : 14,
                borderTop: idx === 0 ? "none" : "1px solid #f0ebe0",
              }}
            >
              {/* The whole row is the toggle. Closed is the default because with
                  four families this page was mostly other people's lists — but
                  the count and the packed/total progress stay visible while
                  closed, so you can still see at a glance who has not started. */}
              <button
                type="button"
                onClick={() => toggleFamily(family)}
                aria-expanded={isOpen}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  background: "none", border: "none", padding: "4px 0",
                  cursor: "pointer", font: "inherit", textAlign: "left",
                }}
              >
                <span style={{ fontSize: 10, color: "#a8a094" }}>{isOpen ? "▼" : "▶"}</span>
                <Chip color={colorFor(family)}>{family}</Chip>
                <span style={{ fontSize: 12, color: "#a8a094" }}>
                  {total === 0
                    ? "nothing yet"
                    : `${packed}/${total} packed`}
                </span>
              </button>
              {isOpen && (
                <>

              {/* Shared gear, pulled in from "Who's bringing what" so it can be
                  ticked off while loading the car. No ✕ here on purpose: these
                  are the same rows as the Bringing claims, and deleting shared
                  gear from what looks like a personal list would surprise
                  whoever else was counting on it. Remove it up there instead. */}
              {shared.map((item) => (
                <div key={item.id} className="tp-item-row">
                  <input type="checkbox" className="tp-check" title="Packed / loaded" checked={item.checked} onChange={() => toggleItem(item)} />
                  <span style={{ flex: 1, textDecoration: item.checked ? "line-through" : "none", color: item.checked ? "#a8a094" : "inherit" }}>
                    {item.name}
                    <span style={{ fontSize: 12, color: "#a8a094", marginLeft: 6 }}>shared gear</span>
                  </span>
                </div>
              ))}

              {own.map((item) => (
                <div key={item.id} className="tp-item-row">
                  <input type="checkbox" className="tp-check" title="Packed" checked={item.checked} onChange={() => toggleItem(item)} />
                  <span style={{ flex: 1, textDecoration: item.checked ? "line-through" : "none", color: item.checked ? "#a8a094" : "inherit" }}>
                    {item.name}
                  </span>
                  <button className="tp-del" title="Remove" onClick={() => deleteItem(item)}>✕</button>
                </div>
              ))}

              <form onSubmit={(e) => addPack(e, family)} style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input
                  className="tp-input"
                  style={{ flex: 1, marginBottom: 0 }}
                  value={newPack[family] || ""}
                  onChange={(e) => setNewPack((n) => ({ ...n, [family]: e.target.value }))}
                  placeholder={`Add to ${family}'s list…`}
                />
                <button
                  className="tp-btn"
                  type="submit"
                  disabled={!String(newPack[family] || "").trim() || addingPack === family}
                >
                  {addingPack === family ? "Adding…" : "Add"}
                </button>
              </form>
                </>
              )}
            </div>
            );
          })}
        </div>

        <h2 id="tp-cabin" style={{ fontSize: 19, margin: "28px 0 10px" }}>Cabin info</h2>
        <div style={{ background: "#fff", border: "1px solid #e4ddd0", borderRadius: 14, padding: 16, maxWidth: 640 }}>
          {cabinDraft === null ? (
            <>
              {CABIN_FIELDS.every(({ key }) => !(trip.cabin || {})[key]) && (
                <p style={{ color: "#6b7684", marginTop: 0 }}>Door code, WiFi, address — the stuff everyone texts you for.</p>
              )}
              {CABIN_FIELDS.map(({ key, label, isAddress }) => {
                const val = (trip.cabin || {})[key];
                if (!val) return null;
                return (
                  <div key={key} style={{ padding: "6px 0", borderBottom: "1px solid #f0ebe0", display: "flex", gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#6b7684", minWidth: 110 }}>{label}</span>
                    {isAddress ? (
                      <a href={mapsHref(val)} target="_blank" rel="noreferrer" style={{ color: "#2a9d8f" }}>
                        {val} ↗
                      </a>
                    ) : key === "link" ? (
                      <a
                        href={externalHref(val)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#2a9d8f", wordBreak: "break-all" }}
                      >
                        {val}
                      </a>
                    ) : (
                      <span style={{ whiteSpace: "pre-wrap" }}>{val}</span>
                    )}
                  </div>
                );
              })}
              <button className="tp-btn" style={{ marginTop: 12 }} onClick={() => setCabinDraft({ ...(trip.cabin || {}) })}>
                Edit cabin info
              </button>
            </>
          ) : (
            <>
              {CABIN_FIELDS.map(({ key, label }) => (
                <div key={key} style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 3 }}>{label}</label>
                  <input
                    className="tp-input"
                    style={{ marginBottom: 0 }}
                    value={cabinDraft[key] || ""}
                    onChange={(e) => setCabinDraft((c) => ({ ...c, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="tp-btn" onClick={saveCabin}>Save</button>
                <button className="tp-btn-quiet" onClick={() => setCabinDraft(null)}>Cancel</button>
              </div>
            </>
          )}
        </div>

        <h2 id="tp-notes" style={{ fontSize: 19, margin: "28px 0 10px" }}>Trip notes</h2>
        <textarea
          className="tp-input"
          style={{ maxWidth: 640, minHeight: 90, resize: "vertical", boxSizing: "border-box" }}
          value={trip.notes || ""}
          onChange={(e) => saveNotes(e.target.value)}
          placeholder="Cabin address, door code, who's driving, arrival times…"
        />

        {TRIP_DELETE_VISIBLE && (
          <div style={{ marginTop: 40 }}>
            <button
              onClick={deleteTrip}
              style={{ background: "none", border: "1px solid #e0c9c5", color: "#a33a2f", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}
            >
              Delete this trip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
