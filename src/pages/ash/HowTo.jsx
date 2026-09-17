import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* The File Drop instructions on /ash, for Ashley — a button that opens a modal.
 *
 * Added 2026-09-16 (Patrick: "add it to that page as a modal"). The steps name
 * the real buttons on /file-drop and /file-drop/download, so if a label there
 * changes, change it here too: "Choose folder", "Check the list", "Start
 * upload", "Retry failed", "Your Files" and "Download Files" (the /ash rows),
 * "Download everything to a folder on this computer…", "Delete everything from
 * S3…".
 *
 * The dialog is portalled to <body> and the app root is made `inert` while it
 * is open, so a screen reader's cursor can't wander onto the rows behind it
 * (Tab is also trapped). The <style> stays in the tree; its rules are global.
 *
 * THIS REPO AND THIS PAGE ARE PUBLIC. Never put the code in here — it says "the
 * code Patrick gave you" on purpose, because that code can read and delete
 * everything — and keep the wording about files and computers, not about why
 * they are being moved.
 *
 * `/ash#how-to` opens it straight away, so Patrick can text one link. The hash
 * survives the host's trailing-slash 301 (browsers carry a fragment across a
 * redirect whose Location has none). Closing removes the hash, so a reload
 * doesn't reopen it. */
const HASH = "#how-to";

export default function HowTo() {
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.location.hash === HASH);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const trigger = triggerRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = document.getElementById("root");
    if (root) root.inert = true;
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      // Keep Tab inside the dialog: a modal that lets focus wander behind the
      // backdrop is one a keyboard user can get lost under.
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = panelRef.current.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (root) root.inert = false; // before refocusing the trigger inside it
      if (window.location.hash === HASH) {
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      }
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <style>{CSS}</style>
      <button ref={triggerRef} type="button" className="ash-howto-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>
          📖
        </span>
        <span>
          <span style={S.btnTitle}>How to send &amp; download your files</span>
          <span style={S.btnSub}>Step by step, start to finish</span>
        </span>
      </button>

      {open && portal(
        <div
          className="ash-howto-backdrop"
          onMouseDown={(e) => {
            // Only a press that starts on the backdrop itself closes — not a
            // text selection dragged out of the panel.
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="ash-howto-title" className="ash-howto-panel">
            <div style={S.head}>
              <h2 id="ash-howto-title" style={S.title}>
                Moving your files
              </h2>
              <button ref={closeRef} type="button" className="ash-howto-close" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <p style={S.lead}>
              Two parts: send the files from the computer they&apos;re on, then download them at home. Use the code
              Patrick gave you for both.
            </p>

            <section style={S.section}>
              <h3 style={S.h3}>
                <span style={S.num}>1</span> Send them <span style={S.where}>— on the computer the files are on</span>
              </h3>
              <ol style={S.ol}>
                <li>
                  Tap <b>Send Files</b> on this page (or go to <span style={S.url}>bullionventuresllc.com/file-drop</span>)
                  and enter your code.
                </li>
                <li>
                  Wait for <b>✅ Direct upload works on this network.</b> If a red message shows instead, stop and send
                  Patrick a screenshot.
                </li>
                <li>
                  Click <b>Choose folder</b> and pick a whole folder — Documents, Desktop, Pictures. Do it again for each
                  folder; they all add up into one list. <b>Choose files</b> is for single files, or drag things onto the
                  page.
                </li>
                <li>
                  Step 2 on that page (putting it all inside a folder) is optional — leave it blank.
                </li>
                <li>
                  Click <b>Check the list</b>, look over the numbers, then <b>Start upload</b>.
                </li>
                <li>
                  Leave the tab open until it says <b>✅ All … files are uploaded</b>. You can keep using the computer; if
                  the internet drops, it waits and carries on by itself.
                </li>
                <li>
                  Anything listed under <b>Didn&apos;t upload</b>? Click <b>Retry failed</b>.
                </li>
              </ol>
              <div style={S.tips}>
                <p style={S.tip}>
                  <b>Tab closed or computer restarted?</b> Open the page again, enter the code and pick the same folders.
                  Anything already uploaded is skipped, and big files pick up where they stopped.
                </p>
                <p style={S.tip}>
                  <b>Outlook files (.pst):</b> close Outlook first — a file that&apos;s open can&apos;t be read.
                </p>
                <p style={S.tip}>
                  <b>OneDrive folders with cloud icons:</b> those files aren&apos;t really on the computer yet. Right-click
                  the folder → <b>Always keep on this device</b>, let it finish, then pick it.
                </p>
              </div>
            </section>

            <section style={S.section}>
              <h3 style={S.h3}>
                <span style={S.num}>2</span> Download them <span style={S.where}>— at home</span>
              </h3>
              <ol style={S.ol}>
                <li>
                  Use <b>Chrome</b> or <b>Edge</b> — Safari can&apos;t save a whole folder.
                </li>
                <li>
                  Tap <b>Download Files</b> on this page (or go to{" "}
                  <span style={S.url}>bullionventuresllc.com/file-drop/download</span>) and enter the same code.
                </li>
                <li>
                  Click <b>Download everything to a folder on this computer…</b> and pick where they should go (Documents is fine). Say yes
                  when the browser asks to let the site save into that folder. Everything lands in a{" "}
                  <b>file-drop</b> folder, with your original folders inside.
                </li>
                <li>
                  Leave it running until it says <b>Download finished</b>. If it stops, click the button again and pick
                  the same folder — anything already downloaded is skipped.
                </li>
              </ol>
              <p style={S.tip}>
                <b>Just want one file?</b> Tap <b>Your Files</b> on this page instead, search for it by name, and tap
                the name — it opens in a new tab, on a phone or a computer. Nothing there can delete anything.
              </p>
            </section>

            <section style={{ ...S.section, marginBottom: 0 }}>
              <h3 style={S.h3}>
                <span style={S.num}>3</span> Clean up <span style={S.where}>— the same day</span>
              </h3>
              <ol style={S.ol}>
                <li>Open a handful of the downloaded files to make sure they&apos;re all there and open fine.</li>
                <li>
                  On the download page, click <b>Delete everything from S3…</b> then <b>Yes, delete</b>. This can&apos;t
                  be undone, so only after step 1.
                </li>
                <li>Tell Patrick you&apos;re done so he can switch the code off.</li>
              </ol>
            </section>

            <div style={S.foot}>
              <button type="button" className="ash-howto-done" onClick={() => setOpen(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>,
      )}
    </>
  );
}

/* Portal into <body> in the browser; render in place where there is no
 * document (server-side rendering in tests). */
const portal = (node) => (typeof document === "undefined" ? node : createPortal(node, document.body));

const GOLD = "#e0b24c";

const CSS = `
.ash-howto-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 560px;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 13px;
  background: rgba(224, 178, 76, .08);
  border: 1px solid rgba(224, 178, 76, .45);
  color: #f4f4f7;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color .15s ease, border-color .15s ease;
}
.ash-howto-btn:hover { background: rgba(224, 178, 76, .14); border-color: ${GOLD}; }
.ash-howto-btn:focus-visible, .ash-howto-close:focus-visible, .ash-howto-done:focus-visible {
  outline: 2px solid ${GOLD};
  outline-offset: 2px;
}
.ash-howto-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, .72);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
  overflow-y: auto;
  overscroll-behavior: contain;
}
.ash-howto-panel {
  box-sizing: border-box;
  width: 100%;
  max-width: 640px;
  margin: auto 0;
  padding: 22px 22px 18px;
  border-radius: 16px;
  background: #101015;
  border: 1px solid #2c2c38;
  color: #f4f4f7;
  box-shadow: 0 24px 80px rgba(0, 0, 0, .6);
  line-height: 1.55;
}
.ash-howto-panel li + li { margin-top: 7px; }
.ash-howto-close {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid #2c2c38;
  background: #17171e;
  color: #c9c9d6;
  font-size: 16px;
  cursor: pointer;
}
.ash-howto-done {
  padding: 10px 22px;
  border-radius: 10px;
  border: 0;
  background: ${GOLD};
  color: #16120a;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
@media (prefers-reduced-motion: reduce) {
  .ash-howto-btn { transition: none; }
}
`;

const S = {
  btnTitle: { display: "block", fontSize: 15, fontWeight: 700 },
  btnSub: { display: "block", fontSize: 12.5, color: "#a3a3b8", marginTop: 1 },
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  title: { margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" },
  lead: { margin: "8px 0 18px", fontSize: 14.5, color: "#b4b4c6" },
  section: { marginBottom: 20 },
  h3: { display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 8, margin: "0 0 8px", fontSize: 16.5, fontWeight: 700 },
  num: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 999,
    background: GOLD,
    color: "#16120a",
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
  },
  where: { fontSize: 13.5, fontWeight: 500, color: "#a3a3b8" },
  ol: { margin: 0, paddingLeft: 22, fontSize: 14.5, color: "#e4e4ec" },
  url: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 13, color: GOLD, overflowWrap: "anywhere" },
  tips: { marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "#15151c", border: "1px solid #24242e" },
  tip: { margin: "4px 0", fontSize: 13.5, color: "#c4c4d2" },
  foot: { display: "flex", justifyContent: "flex-end", marginTop: 18 },
};
