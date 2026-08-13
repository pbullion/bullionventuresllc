/* Labels, formatters, one-tap research links and the stylesheet for /prospects.
 *
 * The backend owns which enum VALUES are legal (GET /prospects/meta); this file
 * owns only what they are called on screen. Same split as src/pages/ashley/ui.js
 * — the two pages are siblings but share no code, because /ashley is a finished
 * tool and coupling a new one to it would mean every change here risks that. */

export const STATUS_LABEL = {
  new: "New",
  researching: "Researching",
  attempted: "Attempted",
  contacted: "Contacted",
  meeting_set: "Meeting set",
  met: "Met",
  proposal: "Proposal out",
  won: "Won",
  lost: "Lost",
  not_a_fit: "Not a fit",
};

/* Foreground/background pairs, all measured at 4.5:1 or better on their own
 * background — these carry the only status information on a dense card, so they
 * cannot rely on hue alone being legible. */
export const STATUS_COLOR = {
  new: { bg: "#EEF1F4", fg: "#4A5560" },
  researching: { bg: "#EAF1FB", fg: "#1F4F86" },
  attempted: { bg: "#FDF2E3", fg: "#8A5106" },
  contacted: { bg: "#E6F2F1", fg: "#0F5F58" },
  meeting_set: { bg: "#E8F0FE", fg: "#1A4FA0" },
  met: { bg: "#E9F5EC", fg: "#1C6B31" },
  proposal: { bg: "#F1EAFB", fg: "#5B3A97" },
  won: { bg: "#DDF1E3", fg: "#14602A" },
  lost: { bg: "#FBECEA", fg: "#8F2F25" },
  not_a_fit: { bg: "#F2F3F5", fg: "#616C77" },
};

export const OWNERSHIP_LABEL = {
  public: "Public",
  private: "Private",
  pe_backed: "PE / sponsor-backed",
  subsidiary: "Subsidiary",
  nonprofit: "Not-for-profit",
  unknown: "Ownership unknown",
};

export const BASIS_LABEL = {
  filing: "reported",
  estimate: "estimated",
  not_reported: "not broken out",
  unknown: "unverified",
};

/* Spelled out on the detail screen, because "estimated" on a revenue figure is
 * the difference between a number she can quote and one she has to confirm. */
export const BASIS_NOTE = {
  filing: "Approximate figure from the company's own public reporting. Banded because it moves every year.",
  estimate:
    "Rough public-domain estimate for a private company. Treat it as a screening hint, not a fact — it can be off by a wide margin.",
  not_reported:
    "A US arm of a foreign or larger parent that doesn't break out its own revenue. Included because the local operation is unambiguously large.",
  unknown: "No revenue figure — nobody has filled this in yet.",
};

export const KIND_LABEL = {
  note: "Note",
  call: "Call",
  voicemail: "Voicemail",
  email: "Email",
  text: "Text",
  linkedin: "LinkedIn",
  in_person: "Drop-in",
  meeting: "Meeting",
  mail: "Mailed",
  referral: "Referral",
};

export const KIND_ICON = {
  note: "📝",
  call: "📞",
  voicemail: "📭",
  email: "✉️",
  text: "💬",
  linkedin: "in",
  in_person: "🚪",
  meeting: "🤝",
  mail: "📬",
  referral: "🔗",
};

export const ROLE_LABEL = {
  "": "—",
  owner: "Owner",
  ceo: "CEO",
  president: "President",
  cfo: "CFO",
  treasurer: "Treasurer",
  controller: "Controller",
  vp_finance: "VP Finance",
  accounting: "Accounting / AP",
  operations: "Operations",
  other: "Other",
};

/* Priority is hers to set. A/B/C rather than 1/2/3 because that is the language
 * of a calling plan, and the colours are deliberately quiet — a wall of red A's
 * is not a prioritised list. */
export const PRIORITY_COLOR = {
  A: { bg: "#E6F2F1", fg: "#0F5F58", border: "#9FCFCA" },
  B: { bg: "#F4F6F8", fg: "#4A5560", border: "#D3DAE1" },
  C: { bg: "#FAFAFB", fg: "#7A848E", border: "#E2E6EA" },
};

export const prettify = (v) =>
  String(v || "")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

export const statusLabel = (s) => STATUS_LABEL[s] || prettify(s);
export const statusColor = (s) => STATUS_COLOR[s] || STATUS_COLOR.new;
export const kindLabel = (k) => KIND_LABEL[k] || prettify(k);
export const roleLabel = (r) => ROLE_LABEL[r] ?? prettify(r);
export const priorityColor = (p) => PRIORITY_COLOR[p] || PRIORITY_COLOR.B;

export const contactName = (c) => {
  const name = `${c?.first_name || ""} ${c?.last_name || ""}`.trim();
  return name || "(no name)";
};

/* ── Geography ──────────────────────────────────────────────────────────────
 * Greater Houston is nine counties, and "where is it" on a calling plan means
 * which side of town — not which municipality. Derived from the city rather than
 * stored, so an imported row gets grouped without her mapping a column. */
const AREA_BY_CITY = {
  houston: "Houston",
  bellaire: "Houston",
  "west university place": "Houston",
  "jersey village": "Houston",
  spring: "North / Woodlands",
  "the woodlands": "North / Woodlands",
  conroe: "North / Woodlands",
  kingwood: "North / Woodlands",
  humble: "North / Woodlands",
  tomball: "North / Woodlands",
  magnolia: "North / Woodlands",
  montgomery: "North / Woodlands",
  willis: "North / Woodlands",
  "sugar land": "Southwest / Fort Bend",
  stafford: "Southwest / Fort Bend",
  "missouri city": "Southwest / Fort Bend",
  richmond: "Southwest / Fort Bend",
  rosenberg: "Southwest / Fort Bend",
  katy: "West / Katy",
  cypress: "West / Katy",
  brookshire: "West / Katy",
  waller: "West / Katy",
  pasadena: "East / Ship Channel",
  "deer park": "East / Ship Channel",
  "la porte": "East / Ship Channel",
  baytown: "East / Ship Channel",
  channelview: "East / Ship Channel",
  "galena park": "East / Ship Channel",
  "league city": "Bay Area / Galveston",
  webster: "Bay Area / Galveston",
  friendswood: "Bay Area / Galveston",
  seabrook: "Bay Area / Galveston",
  dickinson: "Bay Area / Galveston",
  "texas city": "Bay Area / Galveston",
  galveston: "Bay Area / Galveston",
  pearland: "South / Brazoria",
  alvin: "South / Brazoria",
  angleton: "South / Brazoria",
  "lake jackson": "South / Brazoria",
  freeport: "South / Brazoria",
  clute: "South / Brazoria",
  brenham: "Outlying",
  sealy: "Outlying",
  bellville: "Outlying",
  hempstead: "Outlying",
  liberty: "Outlying",
  dayton: "Outlying",
};

export const areaFor = (city) => AREA_BY_CITY[String(city || "").trim().toLowerCase()] || "Other";

/* ── Money ──────────────────────────────────────────────────────────────────
 * Revenue is stored in DOLLARS (routes/prospects.js says why). Displayed short,
 * because a card has room for "$450M" and not for "$450,000,000". */
export function fmtMoneyShort(dollars) {
  const n = Number(dollars);
  if (!Number.isFinite(n) || n === 0) return "";
  const abs = Math.abs(n);
  if (abs >= 1e9) {
    const b = n / 1e9;
    // 1.2B, but 12B not 12.0B — a trailing .0 reads like false precision.
    return `$${b >= 10 ? Math.round(b) : b.toFixed(1)}B`;
  }
  if (abs >= 1e6) return `$${Math.round(n / 1e6)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

export function revenueLabel(c) {
  const low = c?.revenue_low == null ? null : Number(c.revenue_low);
  const high = c?.revenue_high == null ? null : Number(c.revenue_high);
  if (low == null && high == null) return "";
  if (low != null && high != null) {
    if (low === high) return fmtMoneyShort(low);
    return `${fmtMoneyShort(low)}–${fmtMoneyShort(high)}`;
  }
  return low != null ? `${fmtMoneyShort(low)}+` : `under ${fmtMoneyShort(high)}`;
}

/* Filter bands. A company matches a band when its [low, high] range OVERLAPS
 * it — not when its midpoint lands inside. With banded estimates, overlap is the
 * honest test: a company estimated at $200M–$600M genuinely might belong in
 * either the $50–250M or the $250M–1B bucket, and hiding it from one of them
 * would be pretending the estimate is sharper than it is. */
export const REVENUE_BANDS = [
  { key: "50-250", label: "$50M–250M", min: 50e6, max: 250e6 },
  { key: "250-1b", label: "$250M–1B", min: 250e6, max: 1e9 },
  { key: "1b-5b", label: "$1B–5B", min: 1e9, max: 5e9 },
  { key: "5b+", label: "$5B+", min: 5e9, max: Infinity },
  { key: "none", label: "No figure", min: null, max: null },
];

export function matchesBand(company, bandKey) {
  const band = REVENUE_BANDS.find((b) => b.key === bandKey);
  if (!band) return true;
  const low = company?.revenue_low == null ? null : Number(company.revenue_low);
  const high = company?.revenue_high == null ? null : Number(company.revenue_high);
  if (band.min === null) return low == null && high == null;
  if (low == null && high == null) return false;
  const lo = low ?? high;
  const hi = high ?? low;
  return hi >= band.min && lo <= band.max;
}

/* ── Dates ────────────────────────────────────────────────────────────────── */

export const todayYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const nowLocalInput = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/* Parsed as LOCAL midnight, not UTC. `new Date("2026-08-13")` is midnight UTC,
 * which is the 12th in Central — so every date label was a day early after 7pm.
 * Same trap ashley/ui.js documents. */
const ymdToLocal = (ymd) => {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export function fmtDate(ymd) {
  if (!ymd) return "";
  const d = ymdToLocal(String(ymd).slice(0, 10));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const dayDiff = (ymd) => {
  const target = ymdToLocal(String(ymd).slice(0, 10));
  const today = ymdToLocal(todayYmd());
  return Math.round((target - today) / 86400000);
};

// "Overdue 3d" / "Today" / "in 5d" — a badge, so it has to be short.
export function dueLabel(ymd) {
  if (!ymd) return { text: "", tone: "none" };
  const n = dayDiff(ymd);
  if (Number.isNaN(n)) return { text: "", tone: "none" };
  if (n < 0) return { text: `${Math.abs(n)}d overdue`, tone: "over" };
  if (n === 0) return { text: "Due today", tone: "today" };
  if (n === 1) return { text: "Tomorrow", tone: "soon" };
  if (n <= 7) return { text: `in ${n}d`, tone: "soon" };
  return { text: fmtDate(ymd), tone: "later" };
}

export function daysAgoLabel(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const n = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (n <= 0) return "today";
  if (n === 1) return "yesterday";
  if (n < 30) return `${n}d ago`;
  if (n < 365) return `${Math.round(n / 30)}mo ago`;
  return `${Math.round(n / 365)}y ago`;
}

/* ── Links that open things ─────────────────────────────────────────────────
 * The whole point of the list on a phone: every piece of contact information is
 * a real link, so reaching someone is one tap and never a copy-paste. */

export const withProtocol = (url) => {
  const s = String(url || "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

// Strip everything but digits and a leading +, or iOS dials the punctuation.
export const telHref = (phone) => `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;
export const smsHref = (phone) => `sms:${String(phone || "").replace(/[^\d+]/g, "")}`;
export const mailHref = (email) => `mailto:${String(email || "").trim()}`;

// Shown instead of the raw URL — "quantaservices.com" beats
// "https://www.quantaservices.com/" on a 375px card.
export const prettyHost = (url) => {
  const s = withProtocol(url);
  if (!s) return "";
  try {
    return new URL(s).hostname.replace(/^www\./, "");
  } catch {
    return String(url).replace(/^https?:\/\//i, "").replace(/^www\./, "").replace(/\/$/, "");
  }
};

/* Google Maps universal URL. Opens the Maps app on iOS and Android when it is
 * installed and the browser otherwise, which a maps:// scheme does not.
 *
 * Searches by NAME plus city when there is no street address — which is most of
 * the seeded catalog on purpose, because a plausible-looking wrong street
 * address is worse than none. "Quanta Services, Houston, TX" lands correctly;
 * an invented suite number does not. */
export function mapsHref(c) {
  const parts = [
    c?.address_line1,
    c?.address_line1 ? c?.city : `${c?.name || ""} ${c?.city || ""}`,
    c?.state,
    c?.postal_code,
  ]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
}

/* ── Research links ─────────────────────────────────────────────────────────
 * Built from the company's own fields, so an imported row gets the same toolbox
 * as a seeded one with nothing to fill in.
 *
 * These are SEARCHES, not stored URLs, and that is the point. A banker's real
 * question is "who is the CFO and what has this company been doing lately", and
 * the honest answer is a link that lands her on the live source — a name typed
 * into a JSON file in August is wrong by October, and a phone number invented to
 * fill a column is worse than an empty one. */
export function researchLinks(c) {
  const name = String(c?.name || "").trim();
  const exact = encodeURIComponent(`"${name}"`);
  const links = [];

  if (c?.website) {
    links.push({ key: "site", label: "Website", sub: prettyHost(c.website), href: withProtocol(c.website), icon: "🌐" });
  }
  links.push({
    key: "news",
    label: "Recent news",
    sub: "Google News",
    href: `https://news.google.com/search?q=${exact}`,
    icon: "📰",
  });
  links.push({
    key: "people",
    label: "Find the CFO",
    sub: "LinkedIn people",
    href: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
      `${name} CFO OR Treasurer OR Controller OR "VP Finance"`
    )}`,
    icon: "👤",
  });
  links.push({
    key: "company",
    label: "Company page",
    sub: "LinkedIn",
    href: c?.linkedin
      ? withProtocol(c.linkedin)
      : `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(name)}`,
    icon: "in",
  });
  links.push({ key: "map", label: "Map it", sub: c?.city || "", href: mapsHref(c), icon: "📍" });
  if (c?.ticker) {
    links.push({
      key: "edgar",
      label: "SEC filings",
      sub: `EDGAR · ${c.ticker}`,
      href: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=${encodeURIComponent(
        c.ticker
      )}&type=10-K&dateb=&owner=include&count=20`,
      icon: "📄",
    });
  }
  links.push({
    key: "hbj",
    label: "Houston Business Journal",
    sub: "local coverage",
    href: `https://www.bizjournals.com/houston/search?q=${encodeURIComponent(name)}`,
    icon: "🗞️",
  });
  links.push({
    key: "hiring",
    label: "Are they hiring?",
    sub: "growth signal",
    href: `https://www.google.com/search?q=${encodeURIComponent(`${name} careers jobs ${c?.city || "Houston"}`)}`,
    icon: "📈",
  });
  links.push({
    key: "google",
    label: "Everything else",
    sub: "Google",
    href: `https://www.google.com/search?q=${encodeURIComponent(
      `${name} ${c?.city || "Houston"} TX`
    )}`,
    icon: "🔎",
  });
  /* The Comptroller's Taxable Entity Search is a form, not a query string, so
   * this one opens the tool rather than the result. Still worth a tap: it is
   * where the exact legal entity name and registered agent come from, which is
   * what a credit file needs and what a website never says. */
  links.push({
    key: "tx",
    label: "TX entity lookup",
    sub: "type the name",
    href: "https://mycpa.cpa.state.tx.us/coa/",
    icon: "🏛️",
  });
  return links;
}

// For a named person: find them, don't guess their email.
export const personSearchHref = (contact, company) =>
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    `${contactName(contact)} ${company?.name || ""}`.trim()
  )}`;

/* ── CSV parsing ────────────────────────────────────────────────────────────
 * Handled here rather than server-side: quoting rules are much easier to get
 * right where she can see the parsed preview and fix her file. Lifted in shape
 * from ashley/ui.js, which documents the Excel-paste tab case. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const src = String(text).replace(/\r\n?/g, "\n");

  /* Pasting straight out of Excel gives tab-separated text, not CSV. Pick the
   * delimiter once from the first line — testing per character would rescan the
   * whole string on every tab. */
  const firstLine = src.slice(0, src.indexOf("\n") === -1 ? src.length : src.indexOf("\n"));
  const delim = !firstLine.includes(",") && firstLine.includes("\t") ? "\t" : ",";

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);

  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""));
}

/* Columns an import can fill, in the order they appear in the mapping UI. Her
 * pipeline fields are deliberately absent — a spreadsheet must not be able to
 * walk a status backwards or overwrite a note. routes/prospects.js enforces the
 * same list server-side. */
export const IMPORT_TARGETS = [
  { value: "", label: "— skip this column —" },
  { value: "name", label: "Company name *", group: "Company" },
  { value: "dba", label: "DBA / trade name", group: "Company" },
  { value: "industry", label: "Industry", group: "Company" },
  { value: "sector", label: "Sector", group: "Company" },
  { value: "description", label: "What they do", group: "Company" },
  { value: "address_line1", label: "Street address", group: "Company" },
  { value: "address_line2", label: "Suite / floor", group: "Company" },
  { value: "city", label: "City", group: "Company" },
  { value: "state", label: "State", group: "Company" },
  { value: "postal_code", label: "ZIP", group: "Company" },
  { value: "website", label: "Website", group: "Company" },
  { value: "phone", label: "Main phone", group: "Company" },
  { value: "email", label: "General email", group: "Company" },
  { value: "linkedin", label: "LinkedIn URL", group: "Company" },
  { value: "revenue_low", label: "Revenue (or low end)", group: "Company" },
  { value: "revenue_high", label: "Revenue high end", group: "Company" },
  { value: "employees", label: "Employees", group: "Company" },
  { value: "founded", label: "Year founded", group: "Company" },
  { value: "ownership", label: "Ownership (public/private/…)", group: "Company" },
  { value: "ticker", label: "Ticker", group: "Company" },
  { value: "parent_company", label: "Parent company", group: "Company" },
  { value: "referred_by", label: "Referred by", group: "Company" },
  { value: "source_note", label: "Source note", group: "Company" },
  { value: "first_name", label: "Contact first name", group: "Contact" },
  { value: "last_name", label: "Contact last name", group: "Contact" },
  { value: "title", label: "Contact title", group: "Contact" },
  { value: "role", label: "Contact role (cfo/owner/…)", group: "Contact" },
  /* Prefixed, because a row is one flat object and an unprefixed "email" would
   * have to mean either the company's general inbox or this person's address —
   * it cannot be both. routes/prospects.js maps these back onto the contact. */
  { value: "contact_email", label: "Contact email", group: "Contact" },
  { value: "phone_office", label: "Contact office phone", group: "Contact" },
  { value: "phone_mobile", label: "Contact mobile", group: "Contact" },
  { value: "contact_linkedin", label: "Contact LinkedIn", group: "Contact" },
  { value: "contact_notes", label: "Contact notes", group: "Contact" },
];

// Guesses a target from a spreadsheet header so a well-labelled file needs no
// mapping at all. First match wins, so the specific patterns come first.
const HEADER_HINTS = [
  [/^(company|company name|account|business|organization|name)$/i, "name"],
  [/dba|trade name/i, "dba"],
  [/^(industry|sic|naics|vertical)/i, "industry"],
  [/sector|segment/i, "sector"],
  [/描述|description|what they do|summary/i, "description"],
  [/(street|address ?1|address line 1|^address$)/i, "address_line1"],
  [/(suite|floor|address ?2|address line 2)/i, "address_line2"],
  [/^(city|town)$/i, "city"],
  [/^(state|st|province)$/i, "state"],
  [/(zip|postal)/i, "postal_code"],
  [/(website|url|web|domain|homepage)/i, "website"],
  [/linked ?in/i, "linkedin"],
  [/(revenue|sales|turnover).*(low|min|from)/i, "revenue_low"],
  [/(revenue|sales|turnover).*(high|max|to)/i, "revenue_high"],
  [/(revenue|annual sales|sales volume|turnover)/i, "revenue_low"],
  [/(employees|headcount|staff|fte)/i, "employees"],
  [/(founded|established|year started)/i, "founded"],
  [/(ownership|public\/private|entity type)/i, "ownership"],
  [/(ticker|symbol)/i, "ticker"],
  [/parent/i, "parent_company"],
  [/(referred|referral|source of)/i, "referred_by"],
  [/(first name|fname|given)/i, "first_name"],
  [/(last name|lname|surname|family)/i, "last_name"],
  [/(title|job title|position)/i, "title"],
  [/(role|function)/i, "role"],
  [/(mobile|cell)/i, "phone_mobile"],
  [/(direct|office phone|work phone)/i, "phone_office"],
  [/(main phone|company phone|telephone|^tel$|^phone$)/i, "phone"],
  // A header that names a person's email goes to the contact; a bare "email"
  // column on a company list is the company's.
  [/(contact|cfo|owner|exec|personal).{0,12}e-?mail/i, "contact_email"],
  [/e-?mail/i, "email"],
  [/note|comment/i, "contact_notes"],
];

export function guessTarget(header) {
  const h = String(header || "").trim();
  if (!h) return "";
  for (const [re, target] of HEADER_HINTS) if (re.test(h)) return target;
  return "";
}

export const PROS_CSS = `
/* Palette: slate structure with a teal accent, deliberately NOT /ashley's PNC
   blue and orange — the two tools sit at different URLs doing different jobs and
   should not be mistaken for each other at a glance.

   Two teals, because one shade cannot do both jobs: --p-teal is for panels
   carrying white text (measured 4.9:1), --p-teal-dark for teal text on white
   (7.0:1). The amber accent never carries text for the same reason /ashley's
   orange doesn't — white on #D97706 is 3.3:1, under the 4.5:1 floor — so it
   appears only as a marker and a bar fill, with --p-amber-ink for amber text. */
.pros-root {
  min-height: 100vh; background: #f5f7f8; color: #1f2933;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-text-size-adjust: 100%;
  --p-card-pad: 15px; --p-gutter: 13px;
  --p-teal: #0F766E;
  --p-teal-dark: #115E59;
  --p-teal-tint: #E6F2F1;
  --p-teal-wash: #F2F8F7;
  --p-teal-line: #BFDCD8;
  --p-amber: #D97706;
  --p-amber-ink: #8A5106;
  --p-line: #E2E7EB;
  --p-muted: #66727E;
}
.pros-shell { max-width: 820px; margin: 0 auto; padding: 14px var(--p-gutter) 110px; }

/* Sticky header. padding-bottom is 0 so the search row sits flush against the
   content below it rather than floating on a strip of teal. */
.pros-top {
  position: sticky; top: 0; z-index: 30; background: var(--p-teal); color: #fff;
  padding: 12px 0 0; box-shadow: 0 1px 8px rgba(31,41,51,0.16);
}
.pros-top-in { max-width: 820px; margin: 0 auto; padding: 0 var(--p-gutter); }
.pros-top-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pros-brand { font-size: 16px; font-weight: 700; letter-spacing: .2px; line-height: 1.25; }
.pros-sub { font-size: 12px; opacity: .8; margin-top: 2px; }
.pros-icon-btn {
  background: rgba(255,255,255,0.15); color: #fff; border: none; border-radius: 9px;
  padding: 9px 12px; font-size: 13px; font-weight: 600; cursor: pointer; min-height: 42px;
  white-space: nowrap;
}
.pros-icon-btn:hover { background: rgba(255,255,255,0.26); }

/* Search sits IN the teal header so it survives scrolling — she filters far more
   often than she scrolls to the top. */
.pros-search-wrap { position: relative; margin: 11px 0 0; }
.pros-search {
  width: 100%; box-sizing: border-box; padding: 12px 38px 12px 13px;
  border: 1px solid rgba(255,255,255,0.28); border-radius: 11px;
  background: rgba(255,255,255,0.14); color: #fff;
  font-size: 16px; font-family: inherit; min-height: 46px;
}
.pros-search::placeholder { color: rgba(255,255,255,0.72); }
.pros-search:focus { outline: 2px solid #fff; outline-offset: -1px; background: rgba(255,255,255,0.22); }
.pros-search-clear {
  position: absolute; right: 5px; top: 50%; transform: translateY(-50%);
  background: transparent; border: none; color: rgba(255,255,255,0.85);
  font-size: 20px; cursor: pointer; width: 34px; height: 34px; line-height: 1;
}

/* Quick filters. Scrolls sideways rather than wrapping to three rows on a phone
   and pushing the first card off screen. */
.pros-quick {
  display: flex; gap: 7px; margin: 10px 0 0; padding: 0 0 11px;
  overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch;
}
.pros-quick::-webkit-scrollbar { display: none; }
.pros-quick-chip {
  flex: 0 0 auto; background: rgba(255,255,255,0.13); color: #fff;
  border: 1px solid rgba(255,255,255,0.22); border-radius: 999px;
  padding: 8px 13px; font-size: 13px; font-weight: 600; cursor: pointer;
  min-height: 38px; white-space: nowrap;
}
.pros-quick-chip[aria-pressed="true"] { background: #fff; color: var(--p-teal-dark); border-color: #fff; }
.pros-quick-count {
  display: inline-block; margin-left: 6px; padding: 0 5px; border-radius: 8px;
  background: rgba(0,0,0,0.14); font-size: 11px; font-weight: 700;
}
.pros-quick-chip[aria-pressed="true"] .pros-quick-count { background: var(--p-teal-tint); }

.pros-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 2px 0 12px; flex-wrap: wrap; }
.pros-count { font-size: 13px; color: var(--p-muted); }
.pros-sort { display: flex; align-items: center; gap: 6px; }

.pros-card {
  background: #fff; border: 1px solid var(--p-line); border-radius: 13px;
  padding: var(--p-card-pad); margin-bottom: 11px;
}
.pros-card-tap { cursor: pointer; transition: box-shadow .14s, transform .14s; }
.pros-card-tap:hover { box-shadow: 0 4px 14px rgba(31,41,51,0.09); transform: translateY(-1px); }
.pros-h2 { font-size: 15px; font-weight: 700; margin: 0 0 9px; color: var(--p-teal-dark); }
.pros-name { font-size: 16px; font-weight: 700; line-height: 1.3; color: #16212b; }
.pros-muted { color: var(--p-muted); font-size: 13px; }
.pros-tiny { color: #7E8992; font-size: 12px; }
.pros-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pros-between { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.pros-divide { border-top: 1px solid #EEF1F4; margin: 13px calc(-1 * var(--p-card-pad)); }

.pros-chip { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.pros-prio {
  display: inline-flex; align-items: center; justify-content: center;
  width: 25px; height: 25px; border-radius: 7px; font-size: 13px; font-weight: 800;
  border: 1px solid; flex: 0 0 auto;
}
.pros-due { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.pros-due-over { background: #FBE9E7; color: #8F2F25; }
.pros-due-today { background: #FDF0DC; color: var(--p-amber-ink); }
.pros-due-soon { background: var(--p-teal-tint); color: var(--p-teal-dark); }
.pros-due-later { background: #F1F4F6; color: var(--p-muted); }

/* The action row on a card: tel:, mailto:, the website and the map. Sized to the
   44px tap target Apple's HIG asks for, because this is the part she uses while
   holding a coffee. */
.pros-acts { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 11px; }
.pros-act {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--p-teal-wash); color: var(--p-teal-dark);
  border: 1px solid var(--p-teal-line); border-radius: 10px;
  padding: 9px 12px; font-size: 13px; font-weight: 600; text-decoration: none;
  min-height: 42px; box-sizing: border-box; cursor: pointer;
}
.pros-act:hover { background: var(--p-teal-tint); }
.pros-act-flat { background: #fff; color: #4A5560; border-color: var(--p-line); }
.pros-act-flat:hover { background: #F7F9FA; }

/* Research grid on the detail screen — two up on a phone, three on a laptop.
   auto-fit rather than a fixed count so the labels never truncate. */
.pros-research { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
.pros-rlink {
  display: flex; align-items: center; gap: 9px; text-decoration: none;
  background: #fff; border: 1px solid var(--p-line); border-radius: 11px;
  padding: 10px 11px; min-height: 52px; box-sizing: border-box;
}
.pros-rlink:hover { border-color: var(--p-teal-line); background: var(--p-teal-wash); }
.pros-rlink-ico {
  flex: 0 0 auto; width: 27px; height: 27px; border-radius: 8px;
  background: var(--p-teal-tint); color: var(--p-teal-dark);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700;
}
.pros-rlink-l { font-size: 13px; font-weight: 650; color: #23303B; line-height: 1.25; }
.pros-rlink-s { font-size: 11px; color: #7E8992; margin-top: 1px; }

.pros-input, .pros-select, .pros-textarea {
  width: 100%; box-sizing: border-box; padding: 11px 12px;
  border: 1px solid #D3DAE1; border-radius: 10px;
  /* 16px, not 14 — iOS Safari zooms the whole page in on focus below 16px. */
  font-size: 16px; background: #fff; color: #1f2933; font-family: inherit;
  min-height: 45px;
}
.pros-textarea { min-height: 84px; resize: vertical; line-height: 1.45; }
.pros-input:focus, .pros-select:focus, .pros-textarea:focus {
  outline: 2px solid var(--p-teal); outline-offset: -1px; border-color: var(--p-teal);
}
/* iOS Safari gives date/datetime inputs an intrinsic width that will not shrink
   in a flex column, and centers their text. Strip the native look to match. */
input.pros-input[type="date"], input.pros-input[type="datetime-local"] {
  -webkit-appearance: none; appearance: none; text-align: left;
}
input.pros-input[type="date"]::-webkit-date-and-time-value,
input.pros-input[type="datetime-local"]::-webkit-date-and-time-value { text-align: left; margin: 0; }
.pros-label { display: block; font-size: 12px; font-weight: 600; color: #55616E; margin: 0 0 6px; }
.pros-field { margin-bottom: 14px; min-width: 0; }
.pros-card > .pros-field:last-child, .pros-card > .pros-grid2:last-child { margin-bottom: 0; }
.pros-label-wrap { display: block; }
.pros-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 12px; margin-bottom: 14px; }
.pros-grid2 .pros-field { margin-bottom: 0; }
@media (max-width: 520px) { .pros-grid2 { grid-template-columns: 1fr; } }

.pros-btn {
  background: var(--p-teal); color: #fff; border: none; border-radius: 10px;
  padding: 12px 16px; font-size: 15px; font-weight: 600; cursor: pointer; min-height: 45px;
}
.pros-btn:hover:not(:disabled) { background: var(--p-teal-dark); }
.pros-btn:disabled { opacity: .5; cursor: default; }
.pros-btn-ghost { background: #fff; color: var(--p-teal-dark); border: 1px solid var(--p-teal-line); }
.pros-btn-ghost:hover:not(:disabled) { background: var(--p-teal-wash); }
.pros-btn-danger { background: #fff; color: #A33328; border: 1px solid #F0CDC8; }
.pros-btn-danger:hover:not(:disabled) { background: #FDECEB; }
.pros-btn-sm { padding: 8px 12px; font-size: 13px; min-height: 40px; border-radius: 9px; }
.pros-btn-block { width: 100%; }
.pros-link {
  background: none; border: none; padding: 0; color: var(--p-teal-dark);
  font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: underline;
}

.pros-err { background: #FDECEB; border: 1px solid #F4CDC8; color: #8F2F25; border-radius: 10px; padding: 10px 12px; font-size: 14px; margin-bottom: 12px; }
.pros-ok { background: #E6F5EA; border: 1px solid #C3E6CD; color: #1C6B31; border-radius: 10px; padding: 10px 12px; font-size: 14px; margin-bottom: 12px; }
.pros-warn { background: #FDF6E7; border: 1px solid #F0E0BC; color: #7A5A10; border-radius: 10px; padding: 10px 12px; font-size: 13px; margin-bottom: 12px; line-height: 1.5; }

.pros-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(104px, 1fr)); gap: 9px; margin-bottom: 13px; }
.pros-stat { background: #fff; border: 1px solid var(--p-line); border-radius: 11px; padding: 10px 11px; text-align: left; font: inherit; cursor: pointer; }
.pros-stat[aria-pressed="true"] { border-color: var(--p-teal); box-shadow: inset 0 0 0 1px var(--p-teal); }
.pros-stat-n { font-size: 20px; font-weight: 800; color: var(--p-teal-dark); line-height: 1.15; }
.pros-stat-l { font-size: 10.5px; color: var(--p-muted); text-transform: uppercase; letter-spacing: .4px; margin-top: 2px; }

/* Facts table on the detail screen. A definition list rather than a grid so it
   collapses to stacked rows on a narrow phone without label/value drifting
   apart. */
.pros-facts { display: grid; grid-template-columns: 128px 1fr; gap: 8px 12px; font-size: 13.5px; }
.pros-facts dt { color: var(--p-muted); }
.pros-facts dd { margin: 0; color: #23303B; }
@media (max-width: 430px) {
  .pros-facts { grid-template-columns: 1fr; gap: 2px; }
  .pros-facts dt { font-size: 11.5px; text-transform: uppercase; letter-spacing: .3px; margin-top: 7px; }
  .pros-facts dt:first-child { margin-top: 0; }
}

/* Bottom sheet, because a centered dialog on a phone puts its controls under
   the thumb's reach and its close button at the top of a scrolled page. */
.pros-scrim { position: fixed; inset: 0; background: rgba(19,26,32,0.5); z-index: 60; display: flex; align-items: flex-end; justify-content: center; }
.pros-sheet {
  background: #f5f7f8; width: 100%; max-width: 640px; max-height: 92vh; overflow-y: auto;
  border-radius: 16px 16px 0 0; padding: 15px var(--p-gutter) calc(24px + env(safe-area-inset-bottom));
  box-shadow: 0 -6px 26px rgba(19,26,32,0.24);
}
@media (min-width: 700px) {
  .pros-scrim { align-items: center; }
  .pros-sheet { border-radius: 16px; max-height: 86vh; padding-bottom: 22px; }
}
.pros-sheet-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 13px; }
.pros-sheet-title { font-size: 16px; font-weight: 700; color: var(--p-teal-dark); }
.pros-x { background: #fff; border: 1px solid var(--p-line); border-radius: 9px; width: 40px; height: 40px; font-size: 19px; line-height: 1; cursor: pointer; color: #55616E; }

/* Multi-select as a wrap of toggles — a native <select multiple> is unusable on
   a phone, and this doubles as the display of what is currently on. */
.pros-toggles { display: flex; flex-wrap: wrap; gap: 7px; }
.pros-toggle {
  background: #fff; border: 1px solid var(--p-line); border-radius: 999px;
  padding: 8px 12px; font-size: 13px; font-weight: 600; color: #4A5560;
  cursor: pointer; min-height: 40px;
}
.pros-toggle[aria-pressed="true"] { background: var(--p-teal-tint); border-color: var(--p-teal); color: var(--p-teal-dark); }

.pros-empty { padding: 26px var(--p-card-pad); text-align: center; }
.pros-empty p { margin: 0 0 15px; color: var(--p-muted); font-size: 14px; line-height: 1.55; }

.pros-back { background: none; border: none; color: #fff; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; padding: 6px 0; opacity: .9; }
.pros-back:hover { opacity: 1; }

.pros-timeline { list-style: none; margin: 0; padding: 0; }
.pros-tl-item { display: flex; gap: 10px; padding: 11px 0; border-top: 1px solid #EEF1F4; }
.pros-tl-item:first-child { border-top: none; padding-top: 2px; }
.pros-tl-ico {
  flex: 0 0 auto; width: 30px; height: 30px; border-radius: 9px; background: #F1F4F6;
  display: flex; align-items: center; justify-content: center; font-size: 14px;
}
.pros-tl-body { min-width: 0; flex: 1; }
.pros-tl-when { font-size: 11.5px; color: #7E8992; }
.pros-tl-text { font-size: 14px; line-height: 1.5; margin-top: 2px; white-space: pre-wrap; overflow-wrap: anywhere; }

/* Contact rows keep their tap targets on one line at 375px by letting the
   action buttons wrap under the name rather than squeezing it. */
.pros-person { padding: 11px 0; border-top: 1px solid #EEF1F4; }
.pros-person:first-of-type { border-top: none; }
.pros-verify { display: inline-block; background: #FDF6E7; color: #7A5A10; border: 1px solid #F0E0BC; border-radius: 999px; padding: 2px 7px; font-size: 11px; font-weight: 700; }

.pros-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.pros-table { border-collapse: collapse; font-size: 12.5px; min-width: 100%; }
.pros-table th, .pros-table td { border: 1px solid var(--p-line); padding: 6px 8px; text-align: left; white-space: nowrap; }
.pros-table th { background: #F1F4F6; font-weight: 700; position: sticky; top: 0; }
`;
