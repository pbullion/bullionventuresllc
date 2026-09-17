import { useEffect, useRef, useState } from "react";
import { parseAsync, renderDocument } from "docx-preview";

/* Word documents, rendered by docx-preview into real DOM (its own chunk —
 * ~250 KB with JSZip behind it).
 *
 * Two things this file does beyond calling the library:
 *
 * 1. IT NEUTRALISES THE DOCUMENT'S OWN LINKS AND EMBEDS BEFORE THEY REACH THE
 *    PAGE. docx-preview renders an "altChunk" (HTML pasted inside a .docx) as
 *    an iframe with `srcdoc`, and an srcdoc iframe INHERITS THIS ORIGIN — a
 *    script in one could read sessionStorage, where the File Drop code lives.
 *    So the nodes are built detached (parseAsync + renderDocument, which is
 *    all renderAsync does for us), every iframe gets `sandbox=""` and a CSP,
 *    object/embed/form go, and an href that isn't http/https/mailto is
 *    dropped while the rest open in a new tab. Attributes set after the nodes
 *    were in the document would already be too late.
 * 2. It fits a fixed-width page to a phone. A Word page is ~816 px wide, so
 *    `max-width` can't help: the pages are scaled with a transform and the box
 *    is given the scaled height (a transform doesn't change layout). "Full
 *    size" swaps that for a scroll box of its own — never the page body. */

const OPTIONS = {
  inWrapper: true,
  breakPages: true,
  ignoreLastRenderedPageBreak: true,
  useBase64URL: true, // pictures become data: URLs, so none outlives this tab
  renderHeaders: true,
  renderFooters: true,
  renderAltChunks: true,
  renderComments: false,
  renderChanges: false,
};

const FRAME_CSP =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'; font-src data:">';

const SAFE_PROTOCOLS = { "http:": true, "https:": true, "mailto:": true };

/* docx-preview turns the document's own styles into a <style> element, and a
 * document decides what is in it. Two things are taken out before it is
 * inserted: `@import`, and any url() that isn't a data: URI. Both fetch from
 * the network, which is how a stylesheet tells someone this file was opened —
 * and with `useBase64URL` every legitimate image in here is already a data:
 * URI, so nothing real is lost. The rest is left alone: a document's styles
 * can make a mess of their own box, which is cosmetic and hers anyway. */
function tameCss(css) {
  return String(css || "")
    .replace(/@import[^;}]*;?/gi, "")
    .replace(/url\(\s*(['"]?)(?!data:)[^)]*\1\s*\)/gi, "none");
}

function neutralize(node) {
  if (!node || node.nodeType !== 1) return;
  for (const el of [node, ...node.querySelectorAll("iframe, a[href], object, embed, form")]) {
    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    if (tag === "iframe") {
      el.setAttribute("sandbox", ""); // no scripts, no same-origin, no forms, no popups
      el.setAttribute("referrerpolicy", "no-referrer");
      if (el.srcdoc) el.srcdoc = `${FRAME_CSP}${el.srcdoc}`;
      el.removeAttribute("src"); // only the document's own pasted HTML, never a URL
    } else if (tag === "object" || tag === "embed" || tag === "form") {
      el.remove();
    } else if (tag === "a") {
      const href = el.getAttribute("href") || "";
      if (href.startsWith("#")) continue; // a bookmark inside this document
      let url = null;
      try {
        url = new URL(href);
      } catch {
        /* relative: it pointed at wherever the document used to live */
      }
      if (url && SAFE_PROTOCOLS[url.protocol]) {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      } else {
        el.removeAttribute("href");
      }
    }
  }
}

/* → the scale being shown (1 = nothing to shrink). At full size the transform
 * comes off and the box scrolls instead. */
function applyFit(box, inner, actual) {
  if (!box || !inner) return 1;
  inner.style.transform = "";
  box.style.height = "";
  const natural = inner.offsetWidth;
  const room = box.clientWidth;
  if (!natural || !room || natural <= room + 1) return 1;
  const scale = room / natural;
  if (!actual) {
    inner.style.transform = `scale(${scale})`;
    box.style.height = `${Math.ceil(inner.offsetHeight * scale)}px`;
  }
  return scale;
}

export default function DocxView({ bytes, name }) {
  const bodyRef = useRef(null);
  const styleRef = useRef(null);
  const boxRef = useRef(null);
  const innerRef = useRef(null);
  const actualRef = useRef(false);
  const [actual, setActual] = useState(false);
  const [status, setStatus] = useState("rendering"); // rendering | ready
  const [scalable, setScalable] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    const body = bodyRef.current;
    const style = styleRef.current;
    const onResize = () => {
      if (!live) return;
      setScalable(applyFit(boxRef.current, innerRef.current, actualRef.current) < 1);
    };

    parseAsync(bytes, OPTIONS)
      .then((doc) => renderDocument(doc, OPTIONS))
      .then((nodes) => {
        if (!live || !body || !style) return;
        style.innerHTML = "";
        body.innerHTML = "";
        for (const node of nodes) {
          neutralize(node);
          if (node.nodeName === "STYLE") {
            node.textContent = tameCss(node.textContent);
            style.appendChild(node);
          } else {
            body.appendChild(node);
          }
        }
        setScalable(applyFit(boxRef.current, innerRef.current, actualRef.current) < 1);
        setStatus("ready");
        window.addEventListener("resize", onResize);
      })
      .catch((err) => {
        if (live) setError(err);
      });

    return () => {
      live = false;
      window.removeEventListener("resize", onResize);
    };
  }, [bytes]);

  useEffect(() => {
    actualRef.current = actual;
    applyFit(boxRef.current, innerRef.current, actual);
  }, [actual]);

  /* A throw from docx-preview belongs to the viewer's error boundary, which
   * shows it on the same card — with a Download button — as every other
   * renderer's failure. */
  if (error) throw error;

  return (
    <div>
      {status === "rendering" && (
        <p className="fd-note" role="status" style={{ marginTop: 0 }}>
          Laying out the pages…
        </p>
      )}
      {scalable && (
        <div className="fd-row" style={{ marginBottom: 8 }}>
          <button className="fd-vtoggle" type="button" aria-pressed={!actual} onClick={() => setActual(false)}>
            Fit to screen
          </button>
          <button className="fd-vtoggle" type="button" aria-pressed={actual} onClick={() => setActual(true)}>
            Full size
          </button>
        </div>
      )}
      <div className="fd-docx">
        <div className={`fd-docx-fit${actual ? " actual fd-scroll" : ""}`} ref={boxRef}>
          <div className="fd-docx-inner" ref={innerRef}>
            <div ref={bodyRef} aria-label={name} />
          </div>
        </div>
      </div>
      <div ref={styleRef} hidden />
    </div>
  );
}
