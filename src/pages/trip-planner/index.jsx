import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";

const API_BASE = "https://sheline-art-website-api.herokuapp.com/trip-planner";

// Trip list + create screen at /tripplanner. Each trip gets its own planner at
// /tripplanner/<slug> (meal grid + packing list) — see Trip.jsx.

const TP_CSS = `
.tp-root { min-height: 100vh; background: #f6f3ec; color: #26303a; font-family: system-ui, -apple-system, sans-serif; }
.tp-shell { max-width: 640px; margin: 0 auto; padding: 20px 16px 60px; }
.tp-card { display: block; background: #fff; border: 1px solid #e4ddd0; border-radius: 14px; padding: 16px; margin-bottom: 12px; text-decoration: none; color: inherit; transition: box-shadow 0.15s, transform 0.15s; }
.tp-card:hover { box-shadow: 0 4px 14px rgba(38,48,58,0.10); transform: translateY(-1px); }
.tp-input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d8d0c2; border-radius: 10px; font-size: 16px; background: #fff; color: #26303a; }
.tp-input:focus { outline: 2px solid #2a9d8f; border-color: #2a9d8f; }
.tp-btn { background: #2a9d8f; color: #fff; border: none; border-radius: 10px; padding: 11px 18px; font-size: 16px; font-weight: 600; cursor: pointer; }
.tp-btn:disabled { opacity: 0.5; cursor: default; }
.tp-btn:hover:not(:disabled) { background: #24897d; }
`;

export default function TripPlannerHome() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", start_date: "", end_date: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/trips`)
      .then((r) => r.json())
      .then((data) => setTrips(Array.isArray(data) ? data : []))
      .catch(() => setError("Couldn't load trips. Check your connection and refresh."));
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const canCreate = form.name.trim() && form.start_date && form.end_date && form.end_date >= form.start_date;

  async function createTrip(e) {
    e.preventDefault();
    if (!canCreate || creating) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const trip = await res.json();
      if (!res.ok || !trip.slug) throw new Error(trip.error || "create failed");
      navigate(`/tripplanner/${trip.slug}`);
    } catch (err) {
      setError(`Couldn't create the trip: ${err.message}`);
      setCreating(false);
    }
  }

  const dateRange = (t) => {
    const s = parseISO(t.start_date);
    const e = parseISO(t.end_date);
    const sameMonth = format(s, "MMM yyyy") === format(e, "MMM yyyy");
    return sameMonth
      ? `${format(s, "MMM d")}–${format(e, "d, yyyy")}`
      : `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
  };

  return (
    <div className="tp-root">
      <style>{TP_CSS}</style>
      <div className="tp-shell">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>🏖️ Trip Planner</h1>
          <Link to="/" style={{ color: "#2a9d8f", fontSize: 14, textDecoration: "none" }}>
            ← bullionventuresllc.com
          </Link>
        </div>
        <p style={{ color: "#6b7684", marginTop: 4, marginBottom: 24 }}>
          Meals and packing lists for group trips — everyone with the link can edit.
        </p>

        {error && (
          <div style={{ background: "#fdecea", border: "1px solid #f5c6c0", color: "#a33a2f", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {trips === null && !error && <p style={{ color: "#6b7684" }}>Loading trips…</p>}

        {trips?.map((t) => (
          <Link key={t.id} to={`/tripplanner/${t.slug}`} className="tp-card">
            <div style={{ fontSize: 18, fontWeight: 700 }}>{t.name}</div>
            <div style={{ color: "#6b7684", fontSize: 14, marginTop: 4 }}>
              {t.location ? `${t.location} · ` : ""}
              {dateRange(t)}
            </div>
          </Link>
        ))}

        {trips !== null && trips.length === 0 && (
          <p style={{ color: "#6b7684" }}>No trips yet — create the first one below.</p>
        )}

        {!showForm ? (
          <button className="tp-btn" style={{ marginTop: 12 }} onClick={() => setShowForm(true)}>
            + New trip
          </button>
        ) : (
          <form onSubmit={createTrip} style={{ background: "#fff", border: "1px solid #e4ddd0", borderRadius: 14, padding: 16, marginTop: 12 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Trip name</label>
              <input className="tp-input" value={form.name} onChange={set("name")} placeholder="Labor Day Beach Trip" autoFocus />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Location</label>
              <input className="tp-input" value={form.location} onChange={set("location")} placeholder="Crystal Beach, TX" />
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>First day</label>
                <input className="tp-input" type="date" value={form.start_date} onChange={set("start_date")} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>Last day</label>
                <input className="tp-input" type="date" value={form.end_date} onChange={set("end_date")} min={form.start_date || undefined} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="tp-btn" type="submit" disabled={!canCreate || creating}>
                {creating ? "Creating…" : "Create trip"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", color: "#6b7684", fontSize: 15, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
