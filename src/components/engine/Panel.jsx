import { useState } from "react";
import { C, panelStyle, h2Style } from "./theme.js";

/* A collapsible section, remembered per browser.
 *
 * Lifted out of /crypto-value on 2026-08-31, where it was the only page that
 * had one — the other four laid their sections out as plain cards, so on a
 * phone every engine page but that one was a single unscrollable column you had
 * to thumb past to reach the tables at the bottom. Same markup and the same
 * localStorage keys crypto already wrote, so nobody's collapsed sections were
 * forgotten by the move.
 *
 * `id` is namespaced per page by the caller's `keyPrefix` (crypto keeps
 * "bv_crypto_panel_" so its stored state carries over); two pages can therefore
 * both have an "autobet" panel without sharing one remembered state. */
const storageKey = (prefix, id) => `${prefix}${id}`;

export default function Panel({
  id,
  keyPrefix = "bv_panel_",
  title,
  right,
  defaultOpen = true,
  children,
  style,
}) {
  const [open, setOpen] = useState(() => {
    try {
      const v = window.localStorage.getItem(storageKey(keyPrefix, id));
      return v == null ? defaultOpen : v === "1";
    } catch {
      return defaultOpen; // private mode / storage disabled
    }
  });
  const toggle = () =>
    setOpen((v) => {
      try {
        window.localStorage.setItem(storageKey(keyPrefix, id), v ? "0" : "1");
      } catch {
        /* not persisted — collapsing still works for this session */
      }
      return !v;
    });
  return (
    <div style={style ? { ...panelStyle, ...style } : panelStyle}>
      <div style={{ ...h2Style, marginBottom: open ? 10 : 0 }}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          style={{
            background: "transparent",
            border: "none",
            color: C.text,
            font: "inherit",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            textAlign: "left",
          }}
        >
          <span style={{ color: C.muted, fontSize: 11 }}>
            {open ? "▾" : "▸"}
          </span>
          {title}
        </button>
        {right != null && (
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {right}
          </span>
        )}
      </div>
      {open && children}
    </div>
  );
}
