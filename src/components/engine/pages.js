/* Every betting screen, in one order, once.
 *
 * These five pages cross-link to each other, and before this list existed each
 * one kept its own hand-written copy of the other four. They had fallen out of
 * step: /gas-value shipped on 2026-08-28 and was added to two of the five, so
 * from /my-bets, /totals-value and /crypto-value the gas engine was simply
 * unreachable without typing the URL.
 *
 * Adding a sixth engine means adding a row HERE and nothing else. */
export const ENGINE_PAGES = [
  { key: "sports", href: "/totals-value", label: "📈 sports" },
  { key: "crypto", href: "/crypto-value", label: "🪙 crypto" },
  { key: "weather", href: "/weather-value", label: "🌡 weather" },
  { key: "gas", href: "/gas-value", label: "⛽ gas" },
  { key: "mybets", href: "/my-bets", label: "🎯 my bets" },
  /* Not an engine — the read-only view of what all four are ALLOWED to stake.
   * It sits in this list because it had no cross-nav at all: you could neither
   * reach it nor leave it without typing the URL, which is the same failure as
   * /gas-value's missing chip, just complete. */
  { key: "limits", href: "/engine-limits", label: "🧮 limits" },
];
