/* The bodies of the full-screen section views.
 *
 * These are the "more detail" half of the board: everything the cards had no
 * room for, and nothing that needed another network call — every field here was
 * already in a payload the pollers were fetching anyway (ESPN carries venue,
 * broadcasts, per-inning linescores and game leaders in the same scoreboard
 * response; Kalshi's summary carries a per-league lifetime breakdown). Opening
 * a section costs nothing and works offline off the last poll. */

import { useState } from "react";
import { WeatherIcon } from "./icons";
import { TEAMS, cToF } from "./data";

/* ------------------------------------------------------------------ shared */

const money = (n, d = 2) =>
  n == null || Number.isNaN(Number(n)) ? "—" : `$${Number(n).toFixed(d)}`;

const signed = (n) => {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  return `${v >= 0 ? "+" : "−"}$${Math.abs(v).toFixed(2)}`;
};

const pnlClass = (n) => (n == null ? "" : Number(n) >= 0 ? "dk__pos" : "dk__neg");

const humanize = (code) =>
  String(code || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim() || "—";

const clock = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—";

function Metric({ k, v, sub }) {
  return (
    <div className="dmetric">
      <div className="dmetric__k">{k}</div>
      <div className="dmetric__v">{v}</div>
      {sub && <div className="dmetric__sub">{sub}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------- weather */

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const bearing = (deg) => (deg == null ? "" : COMPASS[Math.round(deg / 22.5) % 16]);
const kmhToMph = (v) => (v == null ? null : Math.round(v * 0.621371));

function WeatherPanel({ weather, place }) {
  const cur = weather?.currentWeather;
  const days = weather?.forecastDaily?.days || [];
  if (!cur) return <div className="dempty">Weather unavailable</div>;

  /* One shared temperature axis across all ten days, so the bars are
     comparable to each other rather than each being scaled to itself. */
  const highs = days.map((d) => cToF(d.temperatureMax)).filter((n) => n != null);
  const lows = days.map((d) => cToF(d.temperatureMin)).filter((n) => n != null);
  const axisMax = Math.max(...highs, 0);
  const axisMin = Math.min(...lows, axisMax);
  const span = Math.max(1, axisMax - axisMin);

  return (
    <div className="dpanel">
      <section className="dpanel__block">
        <div className="dwx__now">
          <WeatherIcon
            code={cur.conditionCode}
            daylight={cur.daylight !== false}
            className="dwx__icon"
          />
          <div>
            <div className="dwx__temp">{cToF(cur.temperature)}°</div>
            <div className="dwx__cond">{humanize(cur.conditionCode)}</div>
            <div className="dwx__place">{place || "Current location"}</div>
          </div>
        </div>

        <div className="dmetrics">
          <Metric k="Feels like" v={`${cToF(cur.temperatureApparent)}°`} />
          <Metric k="Humidity" v={`${Math.round((cur.humidity ?? 0) * 100)}%`} />
          <Metric k="Dew point" v={`${cToF(cur.temperatureDewPoint)}°`} />
          <Metric
            k="Wind"
            v={`${kmhToMph(cur.windSpeed) ?? "—"} mph`}
            sub={bearing(cur.windDirection)}
          />
          <Metric k="Gusts" v={`${kmhToMph(cur.windGust) ?? "—"} mph`} />
          <Metric k="UV index" v={cur.uvIndex ?? "—"} />
          <Metric
            k="Pressure"
            v={`${Math.round(cur.pressure ?? 0)} mb`}
            sub={cur.pressureTrend}
          />
          <Metric
            k="Visibility"
            v={`${cur.visibility == null ? "—" : Math.round(cur.visibility * 0.000621371)} mi`}
          />
          <Metric k="Cloud cover" v={`${Math.round((cur.cloudCover ?? 0) * 100)}%`} />
          <Metric k="Sunrise" v={clock(days[0]?.sunrise)} />
          <Metric k="Sunset" v={clock(days[0]?.sunset)} />
          <Metric k="Moon" v={<span className="dcap">{humanize(days[0]?.moonPhase)}</span>} />
        </div>
      </section>

      <section className="dpanel__block">
        <h2 className="dpanel__h">Ten days</h2>
        <div className="dwx__days">
          {days.map((d, i) => {
            const hi = cToF(d.temperatureMax);
            const lo = cToF(d.temperatureMin);
            const pop = Math.round((d.precipitationChance || 0) * 100);
            return (
              <div key={d.forecastStart} className="dwx__day">
                <span className="dwx__dayname">
                  {i === 0 ?
                    "Today"
                  : new Date(d.forecastStart).toLocaleDateString([], { weekday: "short" })}
                </span>
                <span className="dwx__daydate">
                  {new Date(d.forecastStart).toLocaleDateString([], {
                    month: "numeric",
                    day: "numeric",
                  })}
                </span>
                <WeatherIcon code={d.conditionCode} className="dwx__dayicon" />
                <span className="dwx__pop">{pop >= 20 ? `${pop}%` : ""}</span>
                <span className="dwx__lo">{lo}°</span>
                <span className="dwx__bar">
                  <span
                    className="dwx__fill"
                    style={{
                      left: `${((lo - axisMin) / span) * 100}%`,
                      right: `${100 - ((hi - axisMin) / span) * 100}%`,
                    }}
                  />
                </span>
                <span className="dwx__hi">{hi}°</span>
                <span className="dwx__uv">UV {d.maxUvIndex ?? "—"}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------- teams */

/* ESPN returns score "0" for both sides of a game that has not started, so a
 * scheduled game rendered as a 0-0 tie. Only a started game has a score. */
function Side({ side, live, started }) {
  if (!side) return null;
  return (
    <div className={`dgm__side${side.winner ? " is-winner" : ""}`}>
      {side.logo && <img className="dgm__logo" src={side.logo} alt="" />}
      <div className="dgm__id">
        <div className="dgm__name">{side.fullName || side.name || side.abbr}</div>
        {side.record && <div className="dgm__rec">{side.record}</div>}
      </div>
      {started && <div className={`dgm__score${live ? " is-live" : ""}`}>{side.score ?? "—"}</div>}
    </div>
  );
}

function Linescore({ event }) {
  const away = event.us?.homeAway === "away" ? event.us : event.them;
  const home = event.us?.homeAway === "home" ? event.us : event.them;
  const n = Math.max(away?.linescores?.length || 0, home?.linescores?.length || 0);
  if (!n) return null;

  const row = (side) => (
    <tr>
      <th scope="row">{side?.abbr}</th>
      {Array.from({ length: n }, (_, i) => (
        <td key={i}>{side?.linescores?.[i] ?? "-"}</td>
      ))}
      <td className="dgm__total">{side?.score ?? "—"}</td>
      {side?.hits != null && <td>{side.hits}</td>}
      {side?.errors != null && <td>{side.errors}</td>}
    </tr>
  );

  return (
    <div className="dgm__linewrap">
      <table className="dgm__line">
        <thead>
          <tr>
            <th />
            {Array.from({ length: n }, (_, i) => (
              <th key={i}>{i + 1}</th>
            ))}
            <th className="dgm__total">R</th>
            {away?.hits != null && <th>H</th>}
            {away?.errors != null && <th>E</th>}
          </tr>
        </thead>
        <tbody>
          {row(away)}
          {row(home)}
        </tbody>
      </table>
    </div>
  );
}

function GameCard({ cfg, event }) {
  if (!event) {
    return (
      <article className="dgm">
        <div className="dgm__head">
          <img className="dgm__crest" src={cfg.logo} alt="" />
          <span className="dgm__team">{cfg.label}</span>
        </div>
        <div className="dempty">Nothing scheduled</div>
      </article>
    );
  }

  const live = event.state === "in";
  const done = event.state === "post";
  const away = event.us?.homeAway === "away" ? event.us : event.them;
  const home = event.us?.homeAway === "home" ? event.us : event.them;

  const meta = [
    event.venue && `${event.venue}${event.venueCity ? ` · ${event.venueCity}` : ""}`,
    event.broadcasts?.length ? event.broadcasts.join(", ") : event.broadcast,
    event.odds,
    event.overUnder != null ? `O/U ${event.overUnder}` : null,
    event.note,
  ].filter(Boolean);

  return (
    <article className={`dgm${live ? " is-live" : ""}`}>
      <div className="dgm__head">
        <img className="dgm__crest" src={cfg.logo} alt="" />
        <span className="dgm__team">{cfg.label}</span>
        <span className="dcard__spacer" />
        {live && (
          <span className="dlive">
            <span className="dlive__dot" />
            LIVE
          </span>
        )}
        <span className="dgm__status">
          {live || done ?
            event.detail
          : new Date(event.date).toLocaleString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          }
        </span>
      </div>

      <div className="dgm__sides">
        <Side side={away} live={live} started={live || done} />
        <span className="dgm__at">{"@"}</span>
        <Side side={home} live={live} started={live || done} />
      </div>

      {(live || done) && <Linescore event={event} />}

      {event.leaders?.length > 0 && (
        <div className="dgm__leaders">
          {event.leaders.slice(0, 3).map((l) => (
            <div key={l.category} className="dgm__leader">
              <span className="dgm__lk">{l.category}</span>
              <span className="dgm__lv">
                {l.who} — {l.stat}
              </span>
            </div>
          ))}
        </div>
      )}

      {meta.length > 0 && <div className="dgm__meta">{meta.join("  ·  ")}</div>}

      <a className="dpill dgm__link" href={event.link} target="_blank" rel="noopener noreferrer">
        Gamecast ↗
      </a>
    </article>
  );
}

function TeamsPanel({ events }) {
  return (
    <div className="dpanel">
      <div className="dgames">
        {TEAMS.map((cfg) => (
          <GameCard key={cfg.key} cfg={cfg} event={events?.[cfg.key]} />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- news */

function ago(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function NewsPanel({ ai, sports }) {
  const [tab, setTab] = useState("ai");
  const items = (tab === "ai" ? ai : sports) || [];

  return (
    <div className="dpanel">
      <div className="dtabs dtabs--big">
        <button
          type="button"
          className={`dtab${tab === "ai" ? " is-on" : ""}`}
          onClick={() => setTab("ai")}
        >
          AI
        </button>
        <button
          type="button"
          className={`dtab${tab === "sports" ? " is-on" : ""}`}
          onClick={() => setTab("sports")}
        >
          Sports
        </button>
      </div>

      {items.length === 0 ?
        <div className="dempty">Nothing loaded</div>
      : <div className="dread">
          {items.map((a) => (
            <a
              key={a.id}
              className="dread__item"
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {a.image && <img className="dread__thumb" src={a.image} alt="" loading="lazy" />}
              <div className="dread__text">
                <div className="dread__title">{a.title}</div>
                {a.description && <p className="dread__desc">{a.description}</p>}
                <div className="dread__meta">
                  <span className="dnews__tag">{a.meta}</span>
                  <span>{a.source}</span>
                  <span>· {ago(a.published)}</span>
                  {a.comments != null && <span>· {a.comments} comments</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      }
    </div>
  );
}

/* ------------------------------------------------------------------ kalshi */

function KalshiPanel({ data }) {
  if (!data?.ok) return <div className="dempty">Portfolio unavailable</div>;

  const { cash, portfolio, openPnl, open, lifetime, byGroup, hidden } = data;
  const roi = lifetime?.roi == null ? null : lifetime.roi * 100;

  return (
    <div className="dpanel">
      <div className="dmetrics dmetrics--wide">
        <Metric k="Cash" v={money(cash)} />
        <Metric k="Positions" v={money(portfolio)} />
        <Metric k="Open P&L" v={<span className={pnlClass(openPnl)}>{signed(openPnl)}</span>} />
        <Metric
          k="Lifetime P&L"
          v={<span className={pnlClass(lifetime?.pnl)}>{signed(lifetime?.pnl)}</span>}
        />
        <Metric k="Record" v={lifetime ? `${lifetime.wins}–${lifetime.losses}` : "—"} />
        <Metric
          k="ROI"
          v={
            roi == null ? "—" : (
              <span className={pnlClass(roi)}>{`${roi >= 0 ? "+" : "−"}${Math.abs(roi).toFixed(1)}%`}</span>
            )
          }
        />
      </div>

      <section className="dpanel__block">
        <h2 className="dpanel__h">
          Open positions
          <span className="dpanel__hnote">
            {open.length}
            {hidden > 0 ? ` shown · ${hidden} without detail` : ""}
          </span>
        </h2>
        {open.length === 0 ?
          <div className="dempty">Nothing open</div>
        : <div className="dtable">
            <div className="dtable__head dtable__row dtable__row--pos">
              <span className="dtable__main">Position</span>
              <span>Win %</span>
              <span>Cost</span>
              <span>Value</span>
              <span>P&L</span>
              <span>Closes</span>
            </div>
            {open.map((p) => (
              <div key={p.ticker} className={`dtable__row dtable__row--pos${p.live ? " is-live" : ""}`}>
                <span className="dtable__main">
                  <span className="dtable__pick">{p.pick || p.title}</span>
                  <span className="dtable__sub">
                    {[p.city, p.league, p.legs > 1 ? `${p.legs} legs` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span>{p.winPct == null ? "—" : `${Math.round(p.winPct)}%`}</span>
                <span>{money(p.cost)}</span>
                <span>{money(p.value)}</span>
                <span className={pnlClass(p.pnl)}>{signed(p.pnl)}</span>
                <span>{p.closeTime ? clock(p.closeTime) : "—"}</span>
              </div>
            ))}
          </div>
        }
      </section>

      {byGroup?.length > 0 && (
        <section className="dpanel__block">
          <h2 className="dpanel__h">
            Lifetime by market
            <span className="dpanel__hnote">worst first</span>
          </h2>
          <div className="dtable">
            <div className="dtable__head dtable__row dtable__row--grp">
              <span className="dtable__main">Market</span>
              <span>Record</span>
              <span>Open</span>
              <span>Staked</span>
              <span>P&L</span>
              <span>ROI</span>
            </div>
            {byGroup.map((g) => {
              const gRoi = g.staked > 0 ? (g.pnl / g.staked) * 100 : null;
              return (
                <div key={`${g.league}-${g.marketType}`} className="dtable__row dtable__row--grp">
                  <span className="dtable__main">
                    <span className="dtable__pick">{g.league}</span>
                    {g.marketType && <span className="dtable__sub">{g.marketType}</span>}
                  </span>
                  <span>
                    {g.wins}–{g.losses}
                  </span>
                  <span>{g.open || "—"}</span>
                  <span>{money(g.staked, 0)}</span>
                  <span className={pnlClass(g.pnl)}>{signed(g.pnl)}</span>
                  <span className={pnlClass(gRoi)}>
                    {gRoi == null ? "—" : `${gRoi >= 0 ? "+" : "−"}${Math.abs(gRoi).toFixed(0)}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export { WeatherPanel, TeamsPanel, NewsPanel, KalshiPanel };
