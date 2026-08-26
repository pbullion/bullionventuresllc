/* Patrick's five teams, one row each, in the order he named them.
 *
 * A row shows whichever of three things is true right now: live score, today's
 * start time, or the next game. Rows never disappear when a team is out of
 * season — a missing row reads as "broken", a row saying "Nov 2" reads as
 * "nothing yet", and only one of those is true in August. */

import { TEAMS } from "./data";

const DAY_MS = 24 * 60 * 60 * 1000;

const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

/* "7:05 PM" today, "Sat 2:30 PM" this week, "Nov 2" beyond it. */
function whenLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return time;
  if (d - now < 6 * DAY_MS && d > now) {
    return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function TeamRow({ cfg, event }) {
  if (!event) {
    return (
      <div className="dteam">
        <img className="dteam__logo" src={cfg.logo} alt="" />
        <div style={{ minWidth: 0 }}>
          <div className="dteam__matchup">{cfg.label}</div>
          <div className="dteam__sub">No game scheduled</div>
        </div>
        <div className="dteam__right">
          <span className="dteam__when">—</span>
        </div>
      </div>
    );
  }

  const { us, them, state } = event;
  const live = state === "in";
  const done = state === "post";
  const vs = them ? `${us?.abbr || cfg.label} ${event.atHome ? "vs" : "@"} ${them.abbr}` : cfg.label;

  return (
    <a
      className={`dteam${live ? " is-live" : ""}`}
      href={event.link}
      target="_blank"
      rel="noopener noreferrer"
    >
      <img className="dteam__logo" src={cfg.logo} alt="" />
      <div style={{ minWidth: 0 }}>
        <div className="dteam__matchup">{vs}</div>
        <div className="dteam__sub">
          {live ?
            event.detail
          : done ?
            /* Date-stamp a final that is not from today. ESPN keeps a team's
             * last result in `nextEvent` for days, and a bare "Final" reads as
             * tonight's game when it is actually last Saturday's. */
            [event.detail, isToday(event.date) ? null : whenLabel(event.date)]
              .filter(Boolean)
              .join(" · ")
          : [cfg.label, event.broadcast].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div className="dteam__right">
        {live && (
          <span className="dlive">
            <span className="dlive__dot" />
            LIVE
          </span>
        )}
        {live || done ?
          <span
            className="dteam__score"
            style={done && us?.winner ? { color: "var(--pos)" } : undefined}
          >
            {us?.score ?? "0"}–{them?.score ?? "0"}
          </span>
        : <span className="dteam__when">{whenLabel(event.date)}</span>}
      </div>
    </a>
  );
}

function Teams({ events, stale }) {
  const anyLive = TEAMS.some((c) => events?.[c.key]?.state === "in");

  return (
    <section className="dcard">
      <div className="dcard__head">
        <span className="dcard__title">Scoreboard</span>
        <span className="dcard__spacer" />
        {anyLive ?
          <span className="dlive">
            <span className="dlive__dot" />
            LIVE
          </span>
        : stale ?
          <span className="dcard__note">offline</span>
        : null}
      </div>
      <div className="dcard__body">
        <div className="dteams">
          {TEAMS.map((cfg) => (
            <TeamRow key={cfg.key} cfg={cfg} event={events?.[cfg.key]} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Teams;
