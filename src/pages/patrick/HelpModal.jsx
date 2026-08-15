import { useEffect } from "react";

/* The "?" in the header. Everything this page can do, in one modal.
 *
 * It exists because almost nothing on a card is labelled — the whole layout is
 * bought by using glyphs (↑ → ✕ ⋯) and click-the-text-to-edit instead of buttons
 * with words on them. That trade is right for a wall of 25 cards and wrong
 * without somewhere that says what the glyphs mean.
 *
 * Deliberately NOT a tour, and deliberately not shown on first visit: it's
 * reference, read once and then when something is forgotten.
 *
 * The capture KEY is not in here and must never be. This page has no login, so
 * anything printed on it is readable by anyone who finds the URL, and the key is
 * the one credential in the whole system. It lives in Heroku config only. */
export default function HelpModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="pb-modal-scrim"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="pb-modal pb-modal-wide" role="dialog" aria-label="How this board works">
        <div className="pb-help-top">
          <h2>How this board works</h2>
          <button type="button" className="pb-help-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="pb-help-lede">
          One card per app you’re still finishing. Everything lives on this screen — there’s no
          project page and no task detail view, so nothing you change here requires going somewhere
          else. A task is <strong>open</strong> or <strong>done</strong>, and nothing in between:
          priority is the <strong>order</strong> tasks sit in.
        </p>

        <div className="pb-help-sec">
          <div className="pb-help-h">On a task</div>
          <div className="pb-help-row">
            <span className="pb-help-key">▢</span>
            <span>Tick the box to finish it. Tick it again to bring it back.</span>
          </div>
          <div className="pb-help-row">
            <span className="pb-help-key">abc</span>
            <span>Click the text to rewrite it. Enter saves, Escape cancels.</span>
          </div>
          <div className="pb-help-row">
            <span className="pb-help-key">↑</span>
            <span>
              Send it to the top of the card — this is the whole priority system, and the top open
              task is what shows in <strong>Next up</strong>.
            </span>
          </div>
          <div className="pb-help-row">
            <span className="pb-help-key">→</span>
            <span>Move it to a different board. This is how Inbox items get filed.</span>
          </div>
          <div className="pb-help-row">
            <span className="pb-help-key">✕</span>
            <span>Delete, with an Undo that puts it back exactly where it was.</span>
          </div>
        </div>

        <div className="pb-help-sec">
          <div className="pb-help-h">On a card</div>
          <div className="pb-help-row">
            <span className="pb-help-key">+</span>
            <span>
              Type in the box at the bottom and press Enter. It stays focused, so you can add five
              in a row without touching the mouse.
            </span>
          </div>
          <div className="pb-help-row">
            <span className="pb-help-key">▸</span>
            <span>
              Finished tasks collapse into a “3 done” line. Open it to un-tick something, or clear
              the pile — clearing is undoable too.
            </span>
          </div>
          <div className="pb-help-row">
            <span className="pb-help-key">abc</span>
            <span>Click the card’s title to rename it.</span>
          </div>
          <div className="pb-help-row">
            <span className="pb-help-key">❐</span>
            <span>
              Copy the card’s open tasks as a prompt, numbered in board order, ready to paste
              straight into Claude. Done tasks are left out.
            </span>
          </div>
          <div className="pb-help-row">
            <span className="pb-help-key">⋯</span>
            <span>
              Edit the name and note, pick a color, move the card earlier or later on the wall,
              clear the done pile, or delete the board. Deleting asks first, and Undo restores the
              card with all its tasks.
            </span>
          </div>
        </div>

        <div className="pb-help-sec">
          <div className="pb-help-h">How the wall is ordered</div>
          <p className="pb-help-p">
            Busiest board first — most open tasks to fewest — so opening the page puts the work in
            front of you. <strong>Inbox</strong> is the exception: it leads the wall while it has
            anything waiting to be filed, and drops to the very end once it’s empty.
          </p>
          <p className="pb-help-p">
            The order is worked out when the board <strong>loads</strong>, not after every tick —
            otherwise a card would jump out from under your cursor the moment you finished its last
            task. Press <strong>↻</strong> to re-sort. Among cards with the same number of open
            tasks, “move earlier / later” in the <code>⋯</code> menu decides.
          </p>
        </div>

        <div className="pb-help-sec">
          <div className="pb-help-h">Next up, along the top</div>
          <p className="pb-help-p">
            The first open task from every board, so you can see the whole wall’s worth of “what’s
            next” in one row. Tick it off right from the chip, or click the text to jump to its
            card. It isn’t a ranked list across projects — it’s one line per board, in the order you
            put them.
          </p>
        </div>

        <div className="pb-help-sec">
          <div className="pb-help-h">Adding things from your phone</div>
          <p className="pb-help-p">
            Say <strong>“Hey Siri, Claude”</strong>, then talk. Lead with the board name and keep
            going:
          </p>
          <div className="pb-help-say">“cellr fix the varietal parser”</div>
          <p className="pb-help-p">
            No colon needed and hyphens don’t matter — <em>“southside app set the JWT secret”</em>
            {" "}lands on <strong>southside-app</strong>. Anything with no board name in front goes
            to <strong>Inbox</strong>, which appears at the front of the wall, so a thought is never
            lost just because you didn’t say where it goes.
          </p>
          <p className="pb-help-p">
            <strong>It reads the board name back to you.</strong> If you say “cellr” and hear “Added
            to Inbox”, the name wasn’t recognised — that’s the signal, rather than a silent misfile.
            The first one after a quiet spell can take ten or twenty seconds while the server wakes
            up; it isn’t stuck.
          </p>
          <p className="pb-help-p pb-help-note">
            Setting the Shortcut up: Shortcuts app → new shortcut named <strong>Claude</strong> →{" "}
            <em>Dictate Text</em> → <em>Get Contents of URL</em> (POST to{" "}
            <code>/patrick-board/capture</code> with the <code>X-Capture-Key</code> header and a JSON
            body whose <code>text</code> is the dictated text) → <em>Get Dictionary Value</em>{" "}
            <code>spoken</code> → <em>Show Notification</em>. The key is in Heroku config, not on
            this page.
          </p>
        </div>

        <div className="pb-help-sec">
          <div className="pb-help-h">Two things to know</div>
          <div className="pb-help-row">
            <span className="pb-help-key">↺</span>
            <span>
              Nothing is really deleted — Undo is a genuine restore, not a retype. If a change ever
              looks like it didn’t take, hit ↻ in the header; that refetches the board and picks up
              anything added from your phone.
            </span>
          </div>
          <div className="pb-help-row">
            <span className="pb-help-key">!</span>
            <span>
              <strong>There’s no login.</strong> This page isn’t linked from anywhere, but anyone who
              knows the URL can read and edit it. Don’t put anything private on a card.
            </span>
          </div>
        </div>

        <div className="pb-modal-acts">
          <button type="button" className="pb-btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
