/* Headlines, tappable through to the article.
 *
 * Two feeds, two tabs: AI from Hacker News, sports from ESPN. Every row is a
 * plain anchor opening a new tab — no in-page reader, because the Tesla browser
 * has a back button and does not need this page inventing one.
 *
 * The tab lives here rather than in the parent because switching it must never
 * cause a refetch: both feeds are already in memory by the time the tabs are
 * touchable, and a car is the worst possible place to wait on a network round
 * trip after tapping something. */

import { useState } from "react";

const TABS = [
  { key: "ai", label: "AI" },
  { key: "sports", label: "Sports" },
];

function ago(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function News({ ai, sports }) {
  const [tab, setTab] = useState("ai");
  const items = (tab === "ai" ? ai : sports) || [];

  return (
    <section className="dcard">
      <div className="dcard__head">
        <span className="dcard__title">Headlines</span>
        <span className="dcard__spacer" />
        <div className="dtabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`dtab${tab === t.key ? " is-on" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="dcard__body">
        {items.length === 0 ?
          <div className="dempty">
            {(tab === "ai" ? ai : sports) === null ?
              "Headlines unavailable — no connection?"
            : "Loading headlines…"}
          </div>
        : <div className="dscroll" style={{ flex: 1 }}>
            <div className="dnews">
              {items.slice(0, 18).map((a) => (
                <a
                  key={a.id}
                  className="dnews__item"
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {a.image && <img className="dnews__thumb" src={a.image} alt="" loading="lazy" />}
                  <div className="dnews__text">
                    <div className="dnews__title">{a.title}</div>
                    <div className="dnews__meta">
                      <span className="dnews__tag">{a.meta}</span>
                      <span>{a.source}</span>
                      <span>· {ago(a.published)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        }
      </div>
    </section>
  );
}

export default News;
