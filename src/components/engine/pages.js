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
];
