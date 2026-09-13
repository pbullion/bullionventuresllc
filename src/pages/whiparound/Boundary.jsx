import { Component } from "react";
import { T } from "./theme";
import { reloadIfReachable } from "./reload";

/* A board left on a monitor for days cannot afford React's default answer to a
 * render error, which is to unmount everything — the poll loop, the wake lock
 * and the 12-hour reload included — and leave a black rectangle on the wall
 * until somebody walks over. The Fire TV board gets a relaunch from its watchdog;
 * this is the web's equivalent.
 */

/* One screen (or the strip). A throw costs that screen until `resetKey` changes
 * — index.jsx passes the last good poll's timestamp, so the next fresh data gets
 * another attempt — and the rotation keeps moving past it meanwhile. */
export class ScreenBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, resetKey: props.resetKey };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error) {
    console.error("[whiparound] a screen failed to render:", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* The whole page — anything that throws outside a screen, including the
 * rotation arithmetic itself. Says so in one line and reloads once a minute as
 * soon as the site answers. It reloads even under the Fullscreen API: leaving
 * full screen is better than a dead board. */
export class PageBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
    this.timer = null;
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("[whiparound] the board failed to render:", error);
    if (this.timer == null) {
      this.timer = setInterval(() => {
        reloadIfReachable();
      }, 60_000);
    }
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: T.bg,
          color: T.muted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
          font: "600 24px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        The board hit an error. It will reload itself within a minute.
      </div>
    );
  }
}
