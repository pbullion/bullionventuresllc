import { useMemo, useState } from "react";

import { formatBytes } from "../helpers.js";
import { previewOf } from "../library.js";
import { openBytes, safeName, saveBytes } from "./blobs.js";
import { canOpenAttachment, emailDocument, parseEml, parseMsg } from "./emailParse.js";

/* Outlook .msg and .eml files (its own chunk — msgreader, the compressed-RTF
 * decoder and the RTF→HTML parser).
 *
 * THE BODY IS UNTRUSTED HTML AND ONLY EVER APPEARS INSIDE
 * `<iframe sandbox="" srcDoc>`: empty sandbox, so no scripts, no forms, no
 * popups and its own opaque origin (it cannot reach this page or the code in
 * sessionStorage), plus a CSP that allows nothing but data: images — so the
 * tracking pixels in a five-year-old marketing email never phone home, and
 * the pictures that were actually attached still show (emailParse swaps their
 * `cid:` references for data: URLs).
 *
 * An empty sandbox rules out measuring the content to size the frame, so it
 * gets a generous fixed height and scrolls inside itself.
 *
 * Parsing is synchronous in render: a file this couldn't read throws, and the
 * viewer's error boundary turns that into a card with a Download button. */

function Row({ attachment }) {
  const [error, setError] = useState("");
  /* Both actions are synchronous — msgreader and the MIME parser hand back the
   * bytes on the spot — so a new tab still counts as opened by the press. */
  const act = (run) => {
    setError("");
    try {
      run();
    } catch (err) {
      setError(err.message || "Couldn't open that attachment.");
    }
  };
  const openable = !attachment.embedded && canOpenAttachment(attachment.name);
  return (
    <li className="fd-vrow">
      <span className="fd-vrow-name">{attachment.name}</span>
      {attachment.size !== null && <span className="fd-vrow-size">{formatBytes(attachment.size)}</span>}
      <span className="fd-vrow-acts">
        {openable && (
          <button
            className="fd-btn ghost small"
            type="button"
            onClick={() => act(() => openBytes(attachment.bytes(), attachment.name))}
          >
            Open
          </button>
        )}
        <button
          className="fd-btn quiet small"
          type="button"
          onClick={() => act(() => saveBytes(attachment.bytes(), attachment.name))}
        >
          Download
        </button>
      </span>
      {error && <span className="fd-vrow-err">{error}</span>}
    </li>
  );
}

export default function EmailView({ bytes, path }) {
  const mail = useMemo(() => (previewOf(path) === "eml" ? parseEml(new Uint8Array(bytes)) : parseMsg(bytes)), [bytes, path]);
  const doc = useMemo(() => (mail.html ? emailDocument(mail.html) : ""), [mail]);

  const fields = [
    ["From", mail.from],
    ["To", mail.to],
    ["Cc", mail.cc],
    ["Date", mail.date ? mail.date.toLocaleString() : mail.dateText],
  ].filter(([, value]) => Boolean(value));

  return (
    <div>
      <div className="fd-card">
        <h2 className="fd-mail-subject">{mail.subject || "(no subject)"}</h2>
        {fields.length > 0 && (
          <dl className="fd-mail-meta">
            {fields.map(([label, value]) => [
              <dt key={`${label}-t`}>{label}</dt>,
              <dd key={`${label}-d`}>{value}</dd>,
            ])}
          </dl>
        )}
        {mail.html ? (
          <iframe className="fd-mail-frame" sandbox="" srcDoc={doc} title="Email body" referrerPolicy="no-referrer" />
        ) : mail.text ? (
          <pre className="fd-mail-text">{mail.text}</pre>
        ) : (
          <p className="fd-note" style={{ marginTop: 0 }}>
            This email has no message text — only the details above{mail.attachments.length ? " and the attachments below." : "."}
          </p>
        )}
        {mail.html && (
          <p className="fd-vhint" style={{ marginTop: 8 }}>
            Pictures and trackers from the internet are blocked in here; anything that was attached to the email
            still shows.
          </p>
        )}
      </div>
      {mail.attachments.length > 0 && (
        <div className="fd-card">
          <h2>
            {mail.attachments.length} attachment{mail.attachments.length === 1 ? "" : "s"}
          </h2>
          <ul className="fd-vlist">
            {mail.attachments.map((att) => (
              <Row attachment={att} key={`${att.key}-${safeName(att.name)}`} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
