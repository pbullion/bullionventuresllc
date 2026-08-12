# Logo brief — Bullion Ventures LLC

> **Status: a mark shipped from this brief (2026-08-12).** The cast-ingot mark
> in `public/favicon.svg` / `src/components/Logo.jsx` came out of direction 1
> below. This document is kept as the brand rationale and as the input for any
> future redesign — §3 (palette) and §5 (constraints) still bind. What is
> *not* done: a wordmark drawn as artwork. The lockup is the mark plus live
> system-font text, set in `Navbar.jsx`.

A self-contained brief to hand to a designer (or to Claude Design). Everything
below is pulled from the live site in this repo, so the colors and sizes are the
real ones the mark has to live inside — not aspirational.

---

## 1. The company

**Bullion Ventures LLC** — a one-person software studio. It ships two kinds of
things:

- **iOS apps** for everyday life: a baby monitor (slumbr), a daycare photo vault,
  a receipt/sales-tax scanner, an async multiplayer dice game (Zargle), kids'
  learning games, a photo-to-briefing app (debriefly), LED sports-odds displays.
- **Live data tools** that run in a browser: real-time betting/market pricing
  engines, a hurricane tracker, a Tesla in-car dashboard, trip planners.

Site headline, verbatim: *"Apps and tools that make everyday life better."*

Sub-headline: *"A small studio shipping iOS apps and live, data-driven
dashboards — from a baby monitor and a daycare photo vault to real-time market
engines that price their own edge."*

**Personality:** small, technical, self-funded, ships fast. Confident but not
corporate. Dark, dense, precise screens — closer to a trading terminal than to a
pastel SaaS landing page. It is a family-adjacent product line (babies, daycare,
kids' games) built by someone who also writes market-pricing engines, and the
brand should feel like it can hold both without going cute.

**Audience:** App Store browsers, plus people who get sent a direct link to a
tool. Nobody comes here for the LLC itself — the logo's job is to make the
studio look like one deliberate thing rather than sixteen unrelated side
projects.

---

## 2. What exists today

The name **Bullion** is the only visual cue currently in play. Gold was chosen
deliberately over the stock template indigo (`#6c63ff`) because it says
something about the name; the current mark is a placeholder, not a design.

**Current placeholder mark** (in `src/components/Navbar.jsx`) — a 16×16 rounded
square, `border-radius: 4px`, filled with a gold gradient and given a soft glow:

```
background: linear-gradient(140deg, #f6d585, #e0b24c 60%, #b8862f);
box-shadow: 0 0 12px rgba(224, 178, 76, .35);
```

It sits to the left of the wordmark "Bullion Ventures LLC" at 16.5px / weight
700 / letter-spacing −0.01em. That gold chip is the thing being replaced.

**Current favicon** (`public/favicon.svg`) is still the stock purple lightning
bolt from the project template. It is unrelated to the brand and should be
replaced by whatever comes out of this.

There is no existing logo file, no wordmark artwork, and no brand guide. Clean
slate.

---

## 3. Palette (exact, in use across the site)

| Role | Hex | Notes |
| --- | --- | --- |
| Page background | `#0a0a0d` | near-black; **every page on the site is dark** |
| Surface | `#14141a` | cards |
| Surface (raised) | `#1b1b23` | icon tiles |
| Border | `#24242e` | hairlines |
| Text | `#f4f4f7` | |
| Dim text | `#b6b6c6` | |
| Muted text | `#83839a` | |
| **Gold (primary accent)** | **`#e0b24c`** | the brand color |
| Gold bright | `#f6d585` | hover / gradient highlight |
| Gold deep | `#b8862f` | gradient shadow end |

Typography on the site is the system UI stack (`-apple-system`,
`BlinkMacSystemFont`, "Segoe UI"). No custom brand typeface exists yet — if the
logo needs one, propose it, but the wordmark should still look at home next to
system-font body copy.

Stay inside this palette. Gold on near-black is the whole identity; adding a
second brand hue would fight the sixteen colorful app icons the mark has to sit
above on the home page.

---

## 4. Deliverables

1. **Primary mark (icon only)** — square-ish, works standalone. This is the one
   that matters most; it replaces the gold chip in the navbar and becomes the
   favicon.
2. **Horizontal lockup** — mark + "Bullion Ventures LLC", for the navbar and the
   footer. Note the wordmark is long; the lockup must not crowd a 60px-tall bar
   at 375px wide.
3. **Wordmark alone** — for places too small or too wide for the mark.
4. **Favicon / app icon variants** — 512, 180 (Apple touch), 32, 16.
5. Light-background version, in case anything ever prints or lands on a white
   page. The dark version is the canonical one.

Format: **SVG**, flat paths, no raster embeds. Keep it under ~4KB — the current
placeholder favicon is a 12KB mess of blur filters and that is exactly what to
avoid.

---

## 5. Hard constraints

- **Must read at 16×16.** That is the actual size in the navbar and the favicon
  tab. If it needs 64px to make sense, it is the wrong mark.
- **Must sit on `#0a0a0d`** without a container. No white knockout box.
- **No gradients-as-crutch.** A subtle gold gradient is fine (the current chip
  uses one), but the silhouette has to work as a single flat `#e0b24c` fill.
- **No glow-dependence.** The `box-shadow` bloom is decoration; it will be
  stripped in the favicon.
- Must hold up beside the App Store icons on the home page — those are
  full-color, illustrated, and busy. The studio mark should read as quieter and
  more structural than its own products, not compete with them.
- Nothing that reads as a **cryptocurrency** brand. "Bullion" is a family name
  play, not a coin — no coin-with-a-B, no ₿-adjacent forms, no chart-line-going-
  up. Also avoid: generic gold bar stacks, cartoon treasure, indigo anything,
  and the standard "abstract swoosh" startup mark.

---

## 6. Directions worth exploring

Not a spec — pick one, or bring something better.

1. **The ingot, abstracted.** A trapezoid (gold-bar profile) reduced to
   geometry, maybe cut or notched into a "B". Literal enough to explain the
   name, abstract enough not to be clip-art. Risk: bar stacks get cheesy fast —
   keep it to one form.
2. **Monogram.** A "BV" or a single "B" built from hard-edged geometry — think
   struck metal or a stamped hallmark, not a script. Assay-mark energy: the
   little stamped seal you find on a real bar. This suits "small studio, ships
   real things."
3. **The chip, done properly.** Keep the current rounded-square silhouette but
   give it internal structure — a facet, a bevel, a cut corner that catches
   light. Lowest-risk option: the site already reads correctly with it, this
   just makes it intentional. Least distinctive, though.
4. **Weight / density.** Bullion is valuable because it's dense. Something built
   from a compact, heavy arrangement of forms — a solid block against negative
   space — that reads as *substance*. Ties to a studio that ships small, dense,
   fast things.

If one direction is clearly strongest, say so and show it worked out at 16px, at
512px, and in the navbar lockup on `#0a0a0d`.

---

## 7. Copy-paste prompt

> Design a logo for **Bullion Ventures LLC**, a one-person software studio that
> ships iOS apps for everyday life (a baby monitor, a daycare photo vault, a
> receipt/tax scanner, kids' games) and live data dashboards (real-time market
> pricing engines, a hurricane tracker, a Tesla in-car dashboard). Tagline:
> "Apps and tools that make everyday life better."
>
> Feel: small, technical, ships fast. Dense and precise — closer to a trading
> terminal than a pastel SaaS site. Confident, not corporate.
>
> Palette is fixed: gold `#e0b24c` (bright `#f6d585`, deep `#b8862f`) on
> near-black `#0a0a0d`. Every surface it appears on is dark. No second brand
> hue.
>
> Deliver: an icon-only primary mark, a horizontal lockup with the full name
> "Bullion Ventures LLC", a wordmark alone, and favicon sizes (512/180/32/16).
> Flat SVG paths, no raster, small file.
>
> Hard constraints: legible at 16×16 (it is the favicon and a navbar chip);
> works as a single flat `#e0b24c` fill with no gradient or glow; sits directly
> on `#0a0a0d` with no container; quieter and more structural than the colorful
> app icons it appears beside.
>
> Avoid: anything that reads as cryptocurrency (no coin-with-a-B, no ₿ forms, no
> upward chart line), stacked gold bars / cartoon treasure, abstract startup
> swooshes, and indigo.
>
> Explore an abstracted ingot/trapezoid, a hard-edged "B" or "BV" monogram in a
> struck-metal or assay-stamp spirit, and a faceted rounded square. Show the
> strongest one at 16px, at 512px, and in a navbar lockup on `#0a0a0d`.

---

## 8. Where it lands in this repo

For whoever wires up the result:

| File | State |
| --- | --- |
| `public/favicon.svg` | **done** — the mark; stock purple bolt gone |
| `src/components/Logo.jsx` | **done** — inline copy of the same path, `<Logo size={20} />` |
| `src/components/Navbar.jsx` | **done** — gold chip replaced by `<Logo />` |
| `index.html` | **done** — `apple-touch-icon` linked |
| `public/apple-touch-icon.png` | **done** — 180×180, `#0a0a0d` baked in (iOS won't take SVG or alpha) |
| `public/images/logo-512.png`, `logo-mark.svg` | **done** — raster + vector for anything off-site |
| `src/pages/Home.jsx` | open — the hero eyebrow is still a 6px `brandDot`, not the mark |
| `src/components/Footer.jsx` | open — text-only by choice |

**The geometry lives in two places** — `public/favicon.svg` and
`src/components/Logo.jsx` — because the navbar wants it inline (no network
request, no late flash on a sticky bar) and the tab wants a file. Change one,
change the other. The PNGs are generated, not hand-drawn:

```bash
rsvg-convert -w 180 -h 180 /tmp/bv-icon.svg -o public/apple-touch-icon.png
```

where `/tmp/bv-icon.svg` is the mark at `scale(.74)` on a full-bleed `#0a0a0d`
rect.
