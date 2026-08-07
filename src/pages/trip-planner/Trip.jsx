import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { eachDayOfInterval, format, parseISO } from "date-fns";

const API_BASE = "https://sheline-art-website-api.herokuapp.com/trip-planner";

// Per-trip planner at /tripplanner/<slug>: a day-by-day meal grid (breakfast /
// lunch / dinner / snacks) plus a shared packing checklist. Everything saves to
// the backend as you edit; the whole trip refetches when the tab regains focus
// so the other families' edits show up.

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
.tp-daymeals { background: none; border: none; color: #9fb3c8; cursor: pointer; font-size: 12px; padding: 2px 6px; font-weight: 600; }
.tp-daymeals:hover { color: #fff; }
.tp-mealtoggle { border: 1px solid #d8d0c2; background: #fff; color: #6b7684; border-radius: 999px; padding: 5px 11px; font-size: 13px; font-weight: 600; cursor: pointer; }
.tp-mealtoggle.on { background: #e7f3f1; border-color: #2a9d8f; color: #1f7a6f; }
.tp-jump { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.tp-jump a { background: #fff; border: 1px solid #d8d0c2; border-radius: 999px; padding: 7px 14px; font-size: 14px; font-weight: 600; color: #26303a; text-decoration: none; }
.tp-jump a:hover { border-color: #2a9d8f; color: #1f7a6f; }
h2[id] { scroll-margin-top: 12px; }
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

function Chip({ children, color }) {
  const c = color || FAMILY_COLORS[0];
  return (
    <span style={{ background: c.bg, color: c.fg, borderRadius: 999, padding: "2px 9px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

// Inline editor for one meal slot. Saves the whole slot in one PUT upsert;
// clearing every field deletes the slot server-side. Ingredient edits are
// queued locally and committed alongside Save so a brand-new slot (no meal row
// yet) can take ingredients too — each one becomes a Groceries item on the
// shopping list, linked to this meal.
function MealEditor({ meal, ingredients, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(meal?.title || "");
  const [assigned, setAssigned] = useState(meal?.assigned_to || "");
  const [details, setDetails] = useState(meal?.details || "");
  const [ings, setIngs] = useState(ingredients.map((i) => ({ id: i.id, name: i.name })));
  const [newIng, setNewIng] = useState("");

  const addIng = () => {
    const name = newIng.trim();
    if (!name) return;
    setIngs((l) => [...l, { id: null, name }]);
    setNewIng("");
  };

  const save = (fields) => {
    const kept = new Set(ings.filter((g) => g.id).map((g) => g.id));
    const removeIds = ingredients.filter((i) => !kept.has(i.id)).map((i) => i.id);
    const addNames = ings.filter((g) => !g.id).map((g) => g.name);
    // Don't lose an ingredient typed but not yet added when Save is tapped.
    const pending = newIng.trim();
    if (pending) addNames.push(pending);
    onSave(fields, { addNames, removeIds });
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
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7684", margin: "2px 0 6px" }}>
        🛒 Ingredients <span style={{ fontWeight: 400 }}>— auto-added to the shopping list</span>
      </div>
      {ings.map((g, idx) => (
        <div key={g.id ?? `new-${idx}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
          <span style={{ flex: 1, fontSize: 14 }}>{g.name}</span>
          <button className="tp-del" title="Remove ingredient" onClick={() => setIngs((l) => l.filter((_, i) => i !== idx))}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          className="tp-input"
          style={{ marginBottom: 0, flex: 1 }}
          value={newIng}
          onChange={(e) => setNewIng(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addIng();
            }
          }}
          placeholder="Add an ingredient…"
        />
        <button className="tp-btn" type="button" onClick={addIng} disabled={!newIng.trim()}>
          Add
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className="tp-btn" disabled={saving} onClick={() => save({ title, assigned_to: assigned, details })}>
          {saving ? "Saving…" : "Save"}
        </button>
        {meal && (
          <button className="tp-btn-quiet" disabled={saving} onClick={() => onSave({ title: "", assigned_to: "", details: "" }, { addNames: [], removeIds: [] })}>
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
  const [newItem, setNewItem] = useState({ name: "", category: "Packing", assigned_to: "" });
  const [addingItem, setAddingItem] = useState(false);
  const [newBring, setNewBring] = useState({ name: "", assigned_to: "" });
  const [addingBring, setAddingBring] = useState(false);
  const [familiesDraft, setFamiliesDraft] = useState(null); // comma string while editing, null when not
  const notesTimer = useRef(null);

  const load = useCallback(() => {
    fetch(`${API_BASE}/trips/${slug}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setTrip(data);
      })
      .catch(() => setError("Couldn't load the trip. Check your connection and refresh."));
  }, [slug]);

  useEffect(load, [load]);

  // Pick up other families' edits whenever the tab comes back into view.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  async function saveMeal(date, mealType, fields, ingChanges = { addNames: [], removeIds: [] }) {
    const slotKey = `${date}|${mealType}`;
    setSavingSlot(slotKey);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/trips/${slug}/meals`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, meal_type: mealType, ...fields }),
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
          ingChanges.addNames.map((name) =>
            fetch(`${API_BASE}/trips/${slug}/items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, category: "Groceries", meal_id: saved.id }),
            }).then((r) => (r.ok ? r.json() : null))
          )
        ),
        Promise.all(ingChanges.removeIds.map((id) => fetch(`${API_BASE}/items/${id}`, { method: "DELETE" }))),
      ]);

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
      const res = await fetch(`${API_BASE}/trips/${slug}/items`, {
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
      const res = await fetch(`${API_BASE}/items/${item.id}`, {
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

  async function deleteItem(item) {
    setTrip((t) => ({ ...t, items: t.items.filter((i) => i.id !== item.id) }));
    try {
      const res = await fetch(`${API_BASE}/items/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setTrip((t) => ({ ...t, items: [...t.items, item] }));
      setError("Couldn't delete that item — try again.");
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
      const res = await fetch(`${API_BASE}/trips/${slug}/items`, {
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

  async function saveFamilies() {
    const fams = familiesDraft.split(",").map((f) => f.trim()).filter(Boolean);
    try {
      const res = await fetch(`${API_BASE}/trips/${slug}`, {
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

  async function toggleDayMeal(date, mealKey) {
    const current = trip.day_meals?.[date] || MEAL_TYPES.map((t) => t.key);
    const next = current.includes(mealKey)
      ? current.filter((k) => k !== mealKey)
      : MEAL_TYPES.map((t) => t.key).filter((k) => current.includes(k) || k === mealKey);
    const dayMeals = { ...(trip.day_meals || {}), [date]: next };
    const prev = trip.day_meals;
    setTrip((t) => ({ ...t, day_meals: dayMeals }));
    try {
      const res = await fetch(`${API_BASE}/trips/${slug}`, {
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

  function saveNotes(notes) {
    setTrip((t) => ({ ...t, notes }));
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      fetch(`${API_BASE}/trips/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      }).catch(() => setError("Couldn't save the trip notes — check your connection."));
    }, 800);
  }

  async function deleteTrip() {
    if (!window.confirm(`Delete "${trip.name}" and everything in it? This can't be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/trips/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      navigate("/tripplanner");
    } catch {
      setError("Couldn't delete the trip — try again.");
    }
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

  const days = eachDayOfInterval({ start: parseISO(trip.start_date), end: parseISO(trip.end_date) });
  const mealFor = (date, type) => trip.meals.find((m) => m.date === date && m.meal_type === type);
  const mealById = Object.fromEntries(trip.meals.map((m) => [m.id, m]));
  const bringItems = trip.items.filter((i) => i.category === "Bringing");
  const listItems = trip.items.filter((i) => i.category !== "Bringing");
  const families = trip.families || [];
  // Color-match "Angelle" but also "Angelle family" / "the Angelles".
  const colorFor = (name) => {
    if (!name) return undefined;
    const idx = families.findIndex((f) => name.toLowerCase().includes(f.toLowerCase()));
    return idx >= 0 ? FAMILY_COLORS[idx % FAMILY_COLORS.length] : undefined;
  };
  const categories = [...new Set(listItems.map((i) => i.category))];
  const categorySuggestions = [...new Set(["Packing", "Groceries", "Beach gear", "Kids", ...categories])];

  return (
    <div className="tp-root">
      <style>{TP_CSS}</style>
      <div className="tp-shell">
        <Link to="/tripplanner" style={{ color: "#2a9d8f", fontSize: 14, textDecoration: "none" }}>
          ← All trips
        </Link>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          <h1 style={{ fontSize: 26, margin: 0 }}>{trip.name}</h1>
          <div style={{ color: "#6b7684", fontSize: 15 }}>
            {trip.location ? `${trip.location} · ` : ""}
            {format(days[0], "EEE MMM d")} – {format(days[days.length - 1], "EEE MMM d")}
          </div>
        </div>

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
          <a href="#tp-packing">🛒 Shopping & packing{trip.items.some((i) => i.category !== "Bringing") ? ` (${trip.items.filter((i) => i.category !== "Bringing" && !i.checked).length} to go)` : ""}</a>
          <a href="#tp-bringing">🏕️ Bringing</a>
          <a href="#tp-notes">📝 Notes</a>
        </nav>

        {error && (
          <div style={{ background: "#fdecea", border: "1px solid #f5c6c0", color: "#a33a2f", borderRadius: 10, padding: "10px 14px", margin: "12px 0" }}>
            {error}
          </div>
        )}

        <h2 id="tp-meals" style={{ fontSize: 19, margin: "22px 0 10px" }}>Meals</h2>
        <div className="tp-days">
          {days.map((day) => {
            const date = format(day, "yyyy-MM-dd");
            const needed = trip.day_meals?.[date] || MEAL_TYPES.map((t) => t.key);
            // A slot with a meal already planned always stays visible, even if
            // it's been toggled off for this day — nothing disappears silently.
            const visible = MEAL_TYPES.filter(({ key }) => needed.includes(key) || mealFor(date, key));
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
                          saving={savingSlot === slotKey}
                          onSave={(fields, ingChanges) => saveMeal(date, key, fields, ingChanges)}
                          onCancel={() => setEditingSlot(null)}
                        />
                      </div>
                    );
                  }
                  return (
                    <button key={key} className="tp-slot" onClick={() => setEditingSlot(slotKey)}>
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
                  );
                })}
              </div>
            );
          })}
        </div>

        <h2 id="tp-packing" style={{ fontSize: 19, margin: "28px 0 10px" }}>Shopping & packing list</h2>
        <div style={{ background: "#fff", border: "1px solid #e4ddd0", borderRadius: 14, padding: 16, maxWidth: 640 }}>
          {listItems.length === 0 && (
            <p style={{ color: "#6b7684", marginTop: 0 }}>Nothing on the list yet — add the essentials below.</p>
          )}
          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7684", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                {cat}
              </div>
              {listItems
                .filter((i) => i.category === cat)
                .map((item) => {
                  const meal = item.meal_id ? mealById[item.meal_id] : null;
                  return (
                    <div key={item.id} className="tp-item-row">
                      <input type="checkbox" className="tp-check" checked={item.checked} onChange={() => toggleItem(item)} />
                      <span style={{ flex: 1, textDecoration: item.checked ? "line-through" : "none", color: item.checked ? "#a8a094" : "inherit" }}>
                        {item.name}
                        {meal && (
                          <span style={{ fontSize: 12, color: "#a8a094", marginLeft: 6 }}>
                            {format(parseISO(meal.date), "EEE")} {meal.meal_type}
                            {meal.title ? ` · ${meal.title}` : ""}
                          </span>
                        )}
                      </span>
                      {item.assigned_to && <Chip color={colorFor(item.assigned_to)}>{item.assigned_to}</Chip>}
                      <button className="tp-del" title="Remove item" onClick={() => deleteItem(item)}>✕</button>
                    </div>
                  );
                })}
            </div>
          ))}

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
            <input
              className="tp-input"
              style={{ flex: "1 1 110px", marginBottom: 0 }}
              value={newItem.assigned_to}
              onChange={(e) => setNewItem((n) => ({ ...n, assigned_to: e.target.value }))}
              placeholder="Who (optional)"
            />
            <button className="tp-btn" type="submit" disabled={!newItem.name.trim() || addingItem}>
              {addingItem ? "Adding…" : "Add"}
            </button>
          </form>
        </div>

        <h2 id="tp-bringing" style={{ fontSize: 19, margin: "28px 0 10px" }}>Who's bringing what</h2>
        <div style={{ background: "#fff", border: "1px solid #e4ddd0", borderRadius: 14, padding: 16, maxWidth: 640 }}>
          {bringItems.length === 0 && (
            <p style={{ color: "#6b7684", marginTop: 0 }}>
              Nothing claimed yet — pop-up canopy, beach cart, cooler, cornhole…
            </p>
          )}
          {bringItems.map((item) => (
            <div key={item.id} className="tp-item-row">
              <input type="checkbox" className="tp-check" title="Packed / loaded" checked={item.checked} onChange={() => toggleItem(item)} />
              <span style={{ flex: 1, textDecoration: item.checked ? "line-through" : "none", color: item.checked ? "#a8a094" : "inherit" }}>
                {item.name}
              </span>
              <Chip color={colorFor(item.assigned_to)}>{item.assigned_to}</Chip>
              <button className="tp-del" title="Remove" onClick={() => deleteItem(item)}>✕</button>
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

        <h2 id="tp-notes" style={{ fontSize: 19, margin: "28px 0 10px" }}>Trip notes</h2>
        <textarea
          className="tp-input"
          style={{ maxWidth: 640, minHeight: 90, resize: "vertical", boxSizing: "border-box" }}
          value={trip.notes || ""}
          onChange={(e) => saveNotes(e.target.value)}
          placeholder="Cabin address, door code, who's driving, arrival times…"
        />

        <div style={{ marginTop: 40 }}>
          <button
            onClick={deleteTrip}
            style={{ background: "none", border: "1px solid #e0c9c5", color: "#a33a2f", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}
          >
            Delete this trip
          </button>
        </div>
      </div>
    </div>
  );
}
