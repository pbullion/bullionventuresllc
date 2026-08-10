/* Labels, formatters, the CSV parser, and the stylesheet for /ashley.
 *
 * Option ORDER and the set of valid values come from the backend's GET
 * /ashley/meta (see index.jsx) — this file only supplies display text, so a new
 * status added to routes/ashley.js shows up in the UI without an edit here. Any
 * value with no label falls back to prettify(). */

export const STATUS_LABEL = {
  not_started: "Not started",
  attempted: "Attempted",
  reached: "Reached",
  meeting_scheduled: "Meeting set",
  met: "Met",
  paperwork_sent: "Paperwork sent",
  moved: "Moved to new bank",
  staying_put: "Staying at old bank",
  declined: "Declined",
  not_pursuing: "Not pursuing",
};

/* Chip colors: cool/neutral early in the pipeline, green once the accounts have
 * actually moved, red for the two ways a relationship is lost. */
export const STATUS_COLOR = {
  not_started: { bg: "#eef1f5", fg: "#5a6673" },
  attempted: { bg: "#fdf2e0", fg: "#8a5a10" },
  reached: { bg: "#e6f0fa", fg: "#1f4e79" },
  meeting_scheduled: { bg: "#e8e9fb", fg: "#3b3d8f" },
  met: { bg: "#e2f4f1", fg: "#1c7268" },
  paperwork_sent: { bg: "#f1e9f8", fg: "#6b3d91" },
  moved: { bg: "#e3f5e6", fg: "#1e7a35" },
  staying_put: { bg: "#fdeceb", fg: "#9c3128" },
  declined: { bg: "#fdeceb", fg: "#9c3128" },
  not_pursuing: { bg: "#eef1f5", fg: "#5a6673" },
};

export const CHANNEL_LABEL = {
  call: "Call",
  voicemail: "Voicemail",
  email: "Email",
  text: "Text",
  linkedin: "LinkedIn",
  in_person: "In person",
  letter: "Letter",
  other: "Other",
};

export const CHANNEL_ICON = {
  call: "📞",
  voicemail: "📟",
  email: "✉️",
  text: "💬",
  linkedin: "💼",
  in_person: "🤝",
  letter: "📨",
  other: "📌",
};

export const OUTCOME_LABEL = {
  no_answer: "No answer",
  left_message: "Left a message",
  spoke: "Spoke with them",
  meeting_set: "Meeting scheduled",
  met: "Met in person",
  moved_account: "Moving their accounts",
  declined: "Declined",
  wrong_number: "Wrong number",
  other: "Other",
};

export const PORTABILITY_LABEL = {
  high: "Likely to follow",
  medium: "Maybe",
  low: "Unlikely",
  unknown: "Unknown",
};

export const PREFERRED_LABEL = {
  "": "No preference",
  call: "Call",
  email: "Email",
  text: "Text",
  in_person: "In person",
  linkedin: "LinkedIn",
};

export const TIER_COLOR = {
  A: { bg: "#fdf2e0", fg: "#8a5a10", border: "#f0dcb4" },
  B: { bg: "#e6f0fa", fg: "#1f4e79", border: "#c6dcf0" },
  C: { bg: "#eef1f5", fg: "#5a6673", border: "#dde3ea" },
};

export const TIER_HINT = {
  A: "Top relationships — reach these first",
  B: "Solid relationships",
  C: "Smaller or lower-priority",
};

export const prettify = (v) =>
  String(v || "")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

export const statusLabel = (s) => STATUS_LABEL[s] || prettify(s);
export const channelLabel = (c) => CHANNEL_LABEL[c] || prettify(c);
export const outcomeLabel = (o) => OUTCOME_LABEL[o] || prettify(o);
export const statusColor = (s) => STATUS_COLOR[s] || STATUS_COLOR.not_started;
export const tierColor = (t) => TIER_COLOR[t] || TIER_COLOR.C;

/* Empty string when there is nobody, NOT a placeholder: timeline rows carry a
 * null contact when a touch wasn't tied to a person (or their record was since
 * deleted), and every caller tests the result for truthiness before appending
 * it — so "(no name)" rendered as a literal "· (no name)" on those rows. */
export const contactName = (c) => {
  if (!c) return "";
  return `${c.first_name || ""} ${c.last_name || ""}`.trim();
};

/* ── Formatters ─────────────────────────────────────────────────────────── */

// Compact on cards ($2.4M), because a client list of full-precision dollar
// amounts is unreadable on a phone.
export function fmtMoneyShort(value) {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

export function fmtMoney(value) {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// DATE columns arrive as "YYYY-MM-DD" strings. Splitting the parts by hand
// avoids new Date("2026-08-01"), which parses as UTC midnight and renders as
// July 31 in US Central.
export function fmtDate(ymd) {
  if (!ymd) return "—";
  const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// TIMESTAMPTZ values are full ISO strings and are safe to hand to Date directly.
export function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* The LOCAL calendar day of a timestamp. Slicing the first 10 characters off an
 * ISO string takes the UTC day instead, which reads a call made at 8pm Central
 * as having happened tomorrow. */
export function fmtDay(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function daysAgoLabel(iso) {
  if (!iso) return "never";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "never";
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// Relative wording for a follow-up date, which is what makes an overdue item
// read as urgent in a list.
export function dueLabel(ymd) {
  if (!ymd) return "";
  const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  if (days === -1) return "1 day overdue";
  if (days < 0) return `${-days} days overdue`;
  if (days <= 7) return `due in ${days} days`;
  return `due ${fmtDate(ymd)}`;
}

export const todayYmd = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Value for a datetime-local input, in LOCAL time. toISOString() would shift a
// 3pm call to 8pm UTC and show the wrong time in the form.
export const nowLocalInput = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Digits only, so "(713) 555-0100 x12" still produces a dialable tel: href.
export const telHref = (phone) => `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;

/* ── CSV parsing ────────────────────────────────────────────────────────────
 * Handled here rather than server-side: quoting rules are much easier to get
 * right where the user can see the parsed preview table and fix their file. */
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

  // Drop trailing blank lines, and any row that is entirely empty.
  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ""));
}

/* Import targets, in the order they appear in the mapping UI. */
export const IMPORT_TARGETS = [
  { value: "", label: "— skip this column —" },
  { value: "company_name", label: "Company name *", group: "Client" },
  { value: "dba", label: "DBA / trade name", group: "Client" },
  { value: "industry", label: "Industry", group: "Client" },
  { value: "address_line1", label: "Address line 1", group: "Client" },
  { value: "address_line2", label: "Address line 2", group: "Client" },
  { value: "city", label: "City", group: "Client" },
  { value: "state", label: "State", group: "Client" },
  { value: "postal_code", label: "ZIP", group: "Client" },
  { value: "website", label: "Website", group: "Client" },
  { value: "relationship_since", label: "Relationship since", group: "Client" },
  { value: "tier", label: "Tier (A/B/C)", group: "Client" },
  { value: "portability", label: "Portability (high/medium/low)", group: "Client" },
  { value: "loan_balance", label: "Loan balance", group: "Client" },
  { value: "deposit_balance", label: "Deposit balance", group: "Client" },
  { value: "annual_fee_income", label: "Annual fee income", group: "Client" },
  { value: "credit_facilities", label: "Credit facilities", group: "Client" },
  { value: "next_maturity_date", label: "Next maturity (YYYY-MM-DD)", group: "Client" },
  { value: "referral_source", label: "Referral source", group: "Client" },
  { value: "notes", label: "Client notes", group: "Client" },
  { value: "first_name", label: "First name", group: "Contact" },
  { value: "last_name", label: "Last name", group: "Contact" },
  { value: "title", label: "Title", group: "Contact" },
  { value: "role", label: "Role", group: "Contact" },
  { value: "email", label: "Email", group: "Contact" },
  { value: "email_alt", label: "Email (alt)", group: "Contact" },
  { value: "phone_mobile", label: "Mobile phone", group: "Contact" },
  { value: "phone_office", label: "Office phone", group: "Contact" },
  { value: "phone_alt", label: "Other phone", group: "Contact" },
  { value: "preferred_channel", label: "Preferred contact method", group: "Contact" },
  { value: "linkedin", label: "LinkedIn", group: "Contact" },
  { value: "birthday", label: "Birthday", group: "Contact" },
  { value: "contact_notes", label: "Contact notes", group: "Contact" },
];

/* Guesses a target column from a spreadsheet header. Deliberately generous —
 * real exports say "Customer Name", "Co.", "Cell", "E-Mail Address". */
const HEADER_HINTS = [
  [/^(company|customer|client|business|account|borrower|entity|organization|co)\b|name of (company|business)/i, "company_name"],
  [/\bdba\b|trade name/i, "dba"],
  [/industry|naics|sector/i, "industry"],
  [/address\s*2|suite|unit/i, "address_line2"],
  [/address|street/i, "address_line1"],
  [/city|town/i, "city"],
  [/^state$|province|^st\.?$/i, "state"],
  [/zip|postal/i, "postal_code"],
  [/website|url|web site|domain/i, "website"],
  [/since|client since|customer since|onboard/i, "relationship_since"],
  [/tier|priority|rank|segment/i, "tier"],
  [/portab|likelihood|follow/i, "portability"],
  [/loan|credit exposure|outstanding|commitment/i, "loan_balance"],
  [/deposit|dda|balance/i, "deposit_balance"],
  [/fee income|fees|revenue/i, "annual_fee_income"],
  [/facilit|line of credit|loc\b/i, "credit_facilities"],
  [/matur|renewal|expir/i, "next_maturity_date"],
  [/referral|source|referred/i, "referral_source"],
  [/contact notes|person notes/i, "contact_notes"],
  [/notes|comment|memo|remark/i, "notes"],
  [/first\s*name|fname|given/i, "first_name"],
  [/last\s*name|lname|surname|family name/i, "last_name"],
  [/title|position|job/i, "title"],
  [/role/i, "role"],
  [/alt.*e-?mail|secondary e-?mail|e-?mail\s*2/i, "email_alt"],
  [/e-?mail/i, "email"],
  [/mobile|cell/i, "phone_mobile"],
  [/office|work|direct|main/i, "phone_office"],
  [/fax|other phone|home/i, "phone_alt"],
  [/prefer/i, "preferred_channel"],
  [/linked/i, "linkedin"],
  [/birth|bday|dob/i, "birthday"],
  [/phone|tel/i, "phone_mobile"],
];

export function guessTarget(header) {
  const h = String(header || "").trim();
  if (!h) return "";
  const exact = IMPORT_TARGETS.find((t) => t.value === h.toLowerCase().replace(/\s+/g, "_"));
  if (exact) return exact.value;
  for (const [re, target] of HEADER_HINTS) if (re.test(h)) return target;
  return "";
}

/* ── Stylesheet ─────────────────────────────────────────────────────────────
 * Mobile-first: this gets used on a phone between meetings, so tap targets are
 * 44px+ and font-size on inputs is 16px (anything smaller makes iOS Safari zoom
 * the page on focus). */
export const ASH_CSS = `
.ash-root { min-height: 100vh; background: #f4f6f9; color: #1f2933; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-text-size-adjust: 100%; }
.ash-shell { max-width: 760px; margin: 0 auto; padding: 0 14px 96px; }

.ash-top { position: sticky; top: 0; z-index: 20; background: #1f4e79; color: #fff; margin: 0 0 14px; padding: 12px 16px; box-shadow: 0 1px 8px rgba(31,41,51,0.16); }
.ash-top-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; max-width: 760px; margin: 0 auto; }
.ash-brand { font-size: 17px; font-weight: 700; letter-spacing: 0.2px; }
.ash-sub { font-size: 12px; opacity: 0.75; margin-top: 1px; }
.ash-signout { background: rgba(255,255,255,0.14); color: #fff; border: none; border-radius: 8px; padding: 8px 12px; font-size: 13px; cursor: pointer; min-height: 40px; }
.ash-signout:hover { background: rgba(255,255,255,0.24); }

.ash-tabs { display: flex; gap: 4px; max-width: 760px; margin: 10px auto 0; overflow-x: auto; scrollbar-width: none; }
.ash-tabs::-webkit-scrollbar { display: none; }
.ash-tab { flex: 0 0 auto; background: transparent; border: none; color: rgba(255,255,255,0.72); font-size: 14px; font-weight: 600; padding: 10px 12px; border-radius: 8px 8px 0 0; cursor: pointer; white-space: nowrap; min-height: 42px; }
.ash-tab[aria-selected="true"] { background: #f4f6f9; color: #1f4e79; }
.ash-tab-badge { display: inline-block; min-width: 18px; margin-left: 6px; padding: 1px 5px; border-radius: 9px; background: #c0392b; color: #fff; font-size: 11px; font-weight: 700; }

.ash-card { background: #fff; border: 1px solid #e3e8ee; border-radius: 14px; padding: 14px; margin-bottom: 12px; }
.ash-card-tap { cursor: pointer; transition: box-shadow .14s, transform .14s; }
.ash-card-tap:hover { box-shadow: 0 4px 14px rgba(31,41,51,0.09); transform: translateY(-1px); }
.ash-h2 { font-size: 15px; font-weight: 700; margin: 0 0 10px; color: #1f4e79; }
.ash-muted { color: #6b7785; font-size: 13px; }
.ash-tiny { color: #8794a1; font-size: 12px; }
.ash-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ash-between { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.ash-divide { border-top: 1px solid #eef1f5; margin: 12px -14px; }

.ash-chip { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.ash-tierchip { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 7px; font-size: 13px; font-weight: 800; border: 1px solid; }

.ash-input, .ash-select, .ash-textarea { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1px solid #d5dde5; border-radius: 10px; font-size: 16px; background: #fff; color: #1f2933; font-family: inherit; }
.ash-textarea { min-height: 76px; resize: vertical; }
.ash-input:focus, .ash-select:focus, .ash-textarea:focus { outline: 2px solid #1f4e79; outline-offset: -1px; border-color: #1f4e79; }
/* iOS Safari gives date/datetime inputs an intrinsic width that won't shrink in
   a flex column, and centers their text. Strip the native look so they match. */
input.ash-input[type="date"], input.ash-input[type="datetime-local"] { -webkit-appearance: none; appearance: none; min-height: 45px; text-align: left; }
input.ash-input[type="date"]::-webkit-date-and-time-value,
input.ash-input[type="datetime-local"]::-webkit-date-and-time-value { text-align: left; margin: 0; }
.ash-label { display: block; font-size: 12px; font-weight: 600; color: #55616e; margin: 0 0 4px; }
.ash-field { margin-bottom: 10px; min-width: 0; }
/* The <label> in Field.jsx wraps its control, and a label is inline by default —
   without this the label text and the input sit side by side. */
.ash-label-wrap { display: block; }
.ash-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 480px) { .ash-grid2 { grid-template-columns: 1fr; } }

.ash-btn { background: #1f4e79; color: #fff; border: none; border-radius: 10px; padding: 12px 16px; font-size: 15px; font-weight: 600; cursor: pointer; min-height: 44px; }
.ash-btn:hover:not(:disabled) { background: #1a4166; }
.ash-btn:disabled { opacity: .5; cursor: default; }
.ash-btn-ghost { background: #fff; color: #1f4e79; border: 1px solid #cfdae6; }
.ash-btn-ghost:hover:not(:disabled) { background: #f0f5fa; }
.ash-btn-danger { background: #fff; color: #a33328; border: 1px solid #f0cdc8; }
.ash-btn-danger:hover:not(:disabled) { background: #fdeceb; }
.ash-btn-sm { padding: 8px 12px; font-size: 13px; min-height: 40px; border-radius: 9px; }
.ash-btn-block { width: 100%; }

.ash-err { background: #fdeceb; border: 1px solid #f4cdc8; color: #8f2f25; border-radius: 10px; padding: 10px 12px; font-size: 14px; margin-bottom: 12px; }
.ash-ok { background: #e6f5ea; border: 1px solid #c3e6cd; color: #1c6b31; border-radius: 10px; padding: 10px 12px; font-size: 14px; margin-bottom: 12px; }

.ash-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.ash-stat { background: #fff; border: 1px solid #e3e8ee; border-radius: 12px; padding: 11px 12px; }
.ash-stat-n { font-size: 22px; font-weight: 800; color: #1f4e79; line-height: 1.15; }
.ash-stat-l { font-size: 11px; color: #6b7785; text-transform: uppercase; letter-spacing: .4px; margin-top: 2px; }

.ash-bar { height: 10px; background: #e6ebf1; border-radius: 999px; overflow: hidden; }
.ash-bar-fill { height: 100%; background: linear-gradient(90deg, #2a9d8f, #1f4e79); border-radius: 999px; transition: width .3s; }

.ash-search { display: flex; gap: 8px; margin-bottom: 10px; }
.ash-filters { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 10px; scrollbar-width: none; }
.ash-filters::-webkit-scrollbar { display: none; }
.ash-pill { flex: 0 0 auto; background: #fff; border: 1px solid #d5dde5; color: #48545f; border-radius: 999px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; min-height: 40px; }
.ash-pill[aria-pressed="true"] { background: #1f4e79; border-color: #1f4e79; color: #fff; }

.ash-timeline { list-style: none; margin: 0; padding: 0; }
.ash-tl-item { display: flex; gap: 10px; padding: 11px 0; border-top: 1px solid #eef1f5; }
.ash-tl-item:first-child { border-top: none; }
.ash-tl-icon { flex: 0 0 30px; width: 30px; height: 30px; border-radius: 50%; background: #f0f4f8; display: flex; align-items: center; justify-content: center; font-size: 15px; }
.ash-tl-body { flex: 1; min-width: 0; }

.ash-contact { border: 1px solid #e6ebf1; border-radius: 12px; padding: 11px; margin-bottom: 9px; background: #fbfcfd; }
.ash-actions { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 9px; }
.ash-iconbtn { display: inline-flex; align-items: center; gap: 5px; background: #fff; border: 1px solid #cfdae6; color: #1f4e79; border-radius: 9px; padding: 8px 12px; font-size: 13px; font-weight: 600; text-decoration: none; min-height: 42px; cursor: pointer; }
.ash-iconbtn:hover { background: #f0f5fa; }

.ash-modal-bg { position: fixed; inset: 0; background: rgba(20,28,36,0.5); z-index: 60; display: flex; align-items: flex-end; justify-content: center; padding: 0; overflow-y: auto; }
@media (min-width: 620px) { .ash-modal-bg { align-items: center; padding: 24px; } }
.ash-modal { background: #f4f6f9; width: 100%; max-width: 560px; border-radius: 16px 16px 0 0; padding: 16px; max-height: 92vh; overflow-y: auto; }
@media (min-width: 620px) { .ash-modal { border-radius: 16px; } }
.ash-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ash-modal-title { font-size: 16px; font-weight: 700; color: #1f4e79; }
.ash-x { background: none; border: none; font-size: 22px; line-height: 1; color: #8794a1; cursor: pointer; padding: 4px 8px; min-width: 44px; min-height: 44px; }

.ash-fab { position: fixed; right: 16px; bottom: 20px; z-index: 30; background: #1f4e79; color: #fff; border: none; border-radius: 999px; padding: 14px 20px; font-size: 15px; font-weight: 700; box-shadow: 0 6px 18px rgba(31,78,121,0.34); cursor: pointer; }
.ash-fab:hover { background: #1a4166; }

.ash-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ash-table th, .ash-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eef1f5; white-space: nowrap; }
.ash-table th { color: #6b7785; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; }
.ash-scroll-x { overflow-x: auto; }

.ash-login { max-width: 380px; margin: 0 auto; padding: 48px 16px; }
.ash-login-card { background: #fff; border: 1px solid #e3e8ee; border-radius: 16px; padding: 22px; }
.ash-link { display: inline-flex; align-items: center; justify-content: center; background: none; border: none; color: #1f4e79; font-size: 13px; text-decoration: underline; cursor: pointer; padding: 10px; min-height: 44px; min-width: 44px; }
.ash-link:disabled { opacity: .5; cursor: default; }
.ash-dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; font-size: 14px; margin: 0; }
.ash-dl dt { color: #6b7785; }
.ash-dl dd { margin: 0; }
`;
