/* COMPONENTS ONLY for the Fantasy Watch tabs (/fantasy/lineup,
 * /fantasy/waivers) — every constant/formatter is in ./roster.js, same split
 * as theme.js/ui.jsx (react-refresh/only-export-components).
 *
 * Every prop read here is defensive: this app has no ErrorBoundary, and the
 * backend's `leagues[]` entries do not all carry the same optional keys (a
 * pre_draft or error league has no `lineup`/`faab`/`market` at all) — see the
 * header comments on LineupWatch.jsx and Waivers.jsx for the exact contract.
 */
import { C, S } from "./theme.js";
import { Chip } from "./ui.jsx";
import { POS_COLOR, STATUS_COLOR, STATUS_LABEL, SEVERITY_COLOR, KIND_LABEL, bidLabelColor, fmtKickoff, fmtBid, fmtProj } from "./roster.js";

/* Position pill — same visual language as ffdraft's PosBadge (index.jsx:1237):
 * the position's own hue at ~15% alpha as the fill, full hue as the text. */
export function PosBadge({ pos }) {
  const hue = POS_COLOR[pos] || C.muted;
  return (
    <span style={{ background: `${hue}26`, color: hue, borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
      {pos || "?"}
    </span>
  );
}

/* A coloured status dot with an accessible label — used inline in a lineup
 * row and standalone in the per-slot status strip. */
export function StatusDot({ status, size = 9, title }) {
  const color = STATUS_COLOR[status] || STATUS_COLOR.UNKNOWN;
  const label = title || STATUS_LABEL[status] || status || "Unknown";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }}
    />
  );
}

/* One card in the action strip — the glance layer. A critical/high flag with
 * a fix, a Done button (optimistic dismiss), and a link out to the platform. */
export function StripItem({ item, onDismiss, dismissing }) {
  const color = SEVERITY_COLOR[item.severity] || SEVERITY_COLOR.low;
  const locked = item.severity === "info" || item.locked;
  const who = item.playerName || (item.slot ? `Your ${item.slot} slot` : "Lineup");
  return (
    <div
      style={{
        background: C.panel2,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 10,
        padding: "11px 12px",
        marginBottom: 8,
        opacity: locked ? 0.55 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {item.pos ? <PosBadge pos={item.pos} /> : null}
            <span>{item.leagueName ? `${item.leagueName} — ` : ""}{who}</span>
            {KIND_LABEL[item.kind] ? <Chip color={color}>{KIND_LABEL[item.kind]}</Chip> : null}
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
            {locked ? "Too late — locked" : null}
            {!locked && item.kickoffAt ? `Kicks ${fmtKickoff(item.kickoffAt)}` : null}
            {!locked && item.pointsAtRisk ? ` · ${item.pointsAtRisk.toFixed(1)} pts at risk` : null}
          </div>
          {!locked && item.alt ? (
            <div style={{ fontSize: 13, color: C.text, marginTop: 4, fontWeight: 600 }}>
              Start {item.alt.name || item.alt.playerKey} instead
              {Number.isFinite(item.alt.projWeek) ? ` (+${fmtProj(item.alt.projWeek)} proj)` : ""}
            </div>
          ) : null}
        </div>
        {!locked ? (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noreferrer" style={{ ...S.refreshBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Open
              </a>
            ) : null}
            <button type="button" onClick={onDismiss} disabled={dismissing} style={{ ...S.refreshBtn, minWidth: 44 }}>
              {dismissing ? "…" : "Done"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* One roster player row — used in both the expanded Lineup card and anywhere
 * else a single player needs a full line (pos badge, name/team, status dot +
 * label, kickoff, projection). */
export function PlayerRow({ slotLabel, player, highlight }) {
  if (!player) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", color: C.muted, fontSize: 12.5 }}>
        <span style={{ width: 34, fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>{slotLabel}</span>
        <span>— empty —</span>
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 0",
        borderBottom: `1px solid ${C.panel2}`,
        background: highlight ? "rgba(59,130,246,0.08)" : "transparent",
      }}
    >
      <span style={{ width: 34, fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", flexShrink: 0 }}>{slotLabel}</span>
      <PosBadge pos={player.pos} />
      <span style={{ flex: "1 1 auto", minWidth: 0, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {player.name || player.playerKey || "—"}
        {player.team ? <span style={{ color: C.muted, fontWeight: 400 }}> {player.team}</span> : null}
      </span>
      <StatusDot status={player.status} />
      <span style={{ fontSize: 12, color: C.muted, minWidth: 44, textAlign: "right", flexShrink: 0 }}>{fmtProj(player.proj ?? player.projWeek)}</span>
    </div>
  );
}

/* Six fixed-height bars, QB RB WR TE K DEF — a league that doesn't start a
 * position (no K/DEF in guillotine) hides that bar rather than showing a
 * meaningless flat zero next to five real numbers. */
const NEED_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];
export function NeedBars({ needs, hidePositions }) {
  const hidden = new Set(hidePositions || []);
  const positions = NEED_POSITIONS.filter((p) => !hidden.has(p));
  const summary = positions.map((p) => `${p} ${Math.round(Number((needs && needs[p]) || 0))}%`).join(", ");
  return (
    <div role="img" aria-label={`Positional need: ${summary}`} style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 32 }}>
      {positions.map((pos) => {
        const v = Math.max(0, Math.min(100, Number((needs && needs[pos]) || 0)));
        const color = v >= 70 ? "#ef4444" : v >= 40 ? "#eab308" : C.muted;
        return (
          <div key={pos} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: 22 }}>
            <div style={{ width: 8, height: 24, borderRadius: 3, background: C.panel2, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${v}%`, background: color, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.muted }}>{pos}</span>
          </div>
        );
      })}
    </div>
  );
}

export function BidChip({ bid }) {
  const text = fmtBid(bid);
  if (!text) return null;
  const color = bidLabelColor(bid.label);
  return (
    <span style={{ ...S.chip, color, borderColor: color, fontWeight: 800 }}>
      {text}
      {bid.label ? ` · ${bid.label}` : ""}
    </span>
  );
}

/* One pickup candidate — name/pos/team, week-vs-ROS projection, and the bid
 * chip. `onOpen`, when passed, makes the row tappable — unused by Waivers.jsx
 * today (the backend has no per-pickup `why` sentence yet to expand into),
 * kept as a hook for that follow-up rather than removed. */
export function PickupRow({ pickup, onOpen }) {
  return (
    <div
      role={onOpen ? "button" : undefined}
      onClick={onOpen}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.panel2}`, cursor: onOpen ? "pointer" : "default" }}
    >
      <PosBadge pos={pickup.pos} />
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {pickup.name || pickup.playerKey}
          {pickup.team ? <span style={{ color: C.muted, fontWeight: 400 }}> {pickup.team}</span> : null}
        </div>
        <div style={{ fontSize: 11.5, color: C.muted }}>
          {fmtProj(pickup.projWeek)} wk · {fmtProj(pickup.projRos ?? pickup.vorRos)} ros
        </div>
      </div>
      <BidChip bid={pickup.bid} />
    </div>
  );
}

export function DropRow({ drop }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.panel2}` }}>
      <PosBadge pos={drop.pos} />
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {drop.name || drop.playerKey}
        </div>
        <div style={{ fontSize: 11.5, color: C.muted }}>
          {fmtProj(drop.cost)} pts/wk ros
          {drop.irEligible ? " · IR eligible" : ""}
          {drop.tradeInstead ? " · trade instead" : ""}
        </div>
      </div>
    </div>
  );
}

/* Collapsible section — used to hide the full starters/bench table behind a
 * tap on the league card header, and to hide a pickup's `why` behind a tap. */
export function Expand({ open, onToggle, label, children }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        style={{ background: "transparent", border: "none", color: C.muted, fontSize: 11.5, fontWeight: 700, padding: "4px 0", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
      >
        <span style={{ transform: open ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 120ms" }}>›</span>
        {label}
      </button>
      {open ? children : null}
    </div>
  );
}

