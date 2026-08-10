import { useCallback, useEffect, useState } from "react";
import {
  api,
  clearToken,
  getToken,
  setToken,
  setUnauthorizedHandler,
} from "./api.js";
import { ASH_CSS } from "./ui.js";
import Dashboard from "./Dashboard.jsx";
import Clients from "./Clients.jsx";
import FollowUps from "./FollowUps.jsx";
import Settings from "./Settings.jsx";

/* /ashley — a commercial banker's client transition tracker.
 *
 * Deliberately absent from the home page AND from PrivateTools: it isn't a tool
 * for site visitors, it's one person's working book of client relationships. Not
 * being linked is convenience, not the protection — that comes from the login
 * below and from routes/ashley.js requiring a bearer token on every endpoint,
 * reads included.
 *
 * Built for a phone. She works this list between meetings, so every phone number
 * and email is a real tel:/mailto:/sms: link and logging a call is two taps. */

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "clients", label: "Clients" },
  { key: "followups", label: "Follow-ups" },
  { key: "settings", label: "Settings" },
];

export default function Ashley() {
  const [signedIn, setSignedIn] = useState(() => Boolean(getToken()));
  const [tab, setTab] = useState("dashboard");
  const [me, setMe] = useState(null);
  const [meta, setMeta] = useState(null);
  /* Bumped after any write that could change another tab's numbers, so the
   * dashboard doesn't keep showing a stale count after a call is logged. */
  const [version, setVersion] = useState(0);
  const [dueCount, setDueCount] = useState(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const signOut = useCallback(() => {
    clearToken();
    setSignedIn(false);
    setMe(null);
    setTab("dashboard");
  }, []);

  // A 401 anywhere (expired session) drops straight back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSignedIn(false);
      setMe(null);
    });
    return () => setUnauthorizedHandler(() => {});
  }, []);

  useEffect(() => {
    document.title = "Client Transition Tracker";
  }, []);

  /* Valid enum values and their order come from the backend so the two can't
   * drift; ui.js supplies only the display labels. */
  useEffect(() => {
    api.get("/meta").then(setMeta).catch(() => setMeta(null));
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    api.get("/me").then(setMe).catch(() => {});
  }, [signedIn, version]);

  // Drives the badge on the Follow-ups tab — the one number worth showing
  // without opening the tab.
  useEffect(() => {
    if (!signedIn) return;
    api
      .get("/dashboard")
      .then((d) => setDueCount((d.followUps?.overdue || 0) + (d.followUps?.due_today || 0)))
      .catch(() => {});
  }, [signedIn, version]);

  if (!signedIn) {
    return (
      <div className="ash-root">
        <style>{ASH_CSS}</style>
        <LoginScreen
          signupOpen={meta?.signupOpen}
          onSignedIn={() => {
            setSignedIn(true);
            bump();
          }}
        />
      </div>
    );
  }

  const shared = { meta, version, bump };

  return (
    <div className="ash-root">
      <style>{ASH_CSS}</style>
      <div className="ash-top">
        <div className="ash-top-row">
          <div>
            <div className="ash-brand">Client Transition Tracker</div>
            <div className="ash-sub">
              {me?.settings?.new_bank
                ? `${me.settings.previous_bank || "Previous bank"} → ${me.settings.new_bank}`
                : me?.full_name || me?.email || ""}
            </div>
          </div>
          <button className="ash-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
        <div className="ash-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              className="ash-tab"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key === "followups" && dueCount > 0 && (
                <span className="ash-tab-badge">{dueCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="ash-shell">
        {tab === "dashboard" && <Dashboard {...shared} onGoToClients={() => setTab("clients")} />}
        {tab === "clients" && <Clients {...shared} />}
        {tab === "followups" && <FollowUps {...shared} />}
        {tab === "settings" && <Settings {...shared} me={me} />}
      </div>
    </div>
  );
}

/* Sign-in, plus a one-time registration path gated on the signup code that only
 * exists as a Heroku config var. The register form is hidden entirely unless the
 * backend reports signup is open. */
function LoginScreen({ signupOpen, onSignedIn }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    code: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const path = mode === "login" ? "/login" : "/register";
      const data = await api.post(path, form);
      if (!data?.token) throw new Error("No session returned.");
      setToken(data.token);
      onSignedIn();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="ash-login">
      <div className="ash-login-card">
        <div style={{ fontSize: 19, fontWeight: 800, color: "#1f4e79" }}>
          Client Transition Tracker
        </div>
        <p className="ash-muted" style={{ marginTop: 6, marginBottom: 18 }}>
          {mode === "login"
            ? "Sign in to your client book."
            : "Create your account with the setup code."}
        </p>
        {error && <div className="ash-err">{error}</div>}
        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="ash-field">
              <label className="ash-label" htmlFor="ash-name">Your name</label>
              <input id="ash-name" className="ash-input" value={form.fullName} onChange={set("fullName")} autoComplete="name" />
            </div>
          )}
          <div className="ash-field">
            <label className="ash-label" htmlFor="ash-email">Email</label>
            <input
              id="ash-email"
              className="ash-input"
              type="email"
              value={form.email}
              onChange={set("email")}
              autoComplete="username"
              required
            />
          </div>
          <div className="ash-field">
            <label className="ash-label" htmlFor="ash-pw">Password</label>
            <input
              id="ash-pw"
              className="ash-input"
              type="password"
              value={form.password}
              onChange={set("password")}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
            {mode === "register" && (
              <div className="ash-tiny" style={{ marginTop: 4 }}>At least 8 characters.</div>
            )}
          </div>
          {mode === "register" && (
            <div className="ash-field">
              <label className="ash-label" htmlFor="ash-code">Setup code</label>
              <input id="ash-code" className="ash-input" value={form.code} onChange={set("code")} required />
            </div>
          )}
          <button className="ash-btn ash-btn-block" type="submit" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        {signupOpen && (
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button
              className="ash-link"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "First time? Set up your account" : "Back to sign in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
