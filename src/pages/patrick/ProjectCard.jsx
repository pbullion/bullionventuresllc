import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CARD_COLORS, colorFor, copyText, doneTasks, openTasks, promptText } from "./ui.js";

/* One project = one card on the wall.
 *
 * Everything a task needs is on the card: the checkbox toggles it, the text is
 * an inline editor, the two hover actions bump it to the top or delete it, and
 * the add box lives at the bottom. Nothing here opens a screen — the page's
 * whole premise is that the board is visible at once, and a detail view would be
 * a second place for a task to live.
 *
 * The parent owns all state and every write. This component holds only what is
 * local to looking at a card: whether the done pile is expanded, which row is
 * being edited, and whether the ⋯ menu is open. */

/* Small anchored popover. Positioned with fixed coordinates measured from the
 * button rather than absolute-inside-the-card, because the card has
 * overflow:hidden for its rounded corners and an absolutely positioned menu
 * would be clipped by it. */
function Menu({ anchor, onClose, children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  /* Measured after paint but before the browser shows it, so the menu never
   * appears at its unclamped position for a frame. */
  useLayoutEffect(() => {
    const a = anchor?.getBoundingClientRect();
    const m = ref.current?.getBoundingClientRect();
    if (!a || !m) return;
    const margin = 8;
    const left = Math.min(Math.max(margin, a.right - m.width), window.innerWidth - m.width - margin);
    const below = a.bottom + 6;
    // Flip above the button when there isn't room below — on a phone the ⋯ of a
    // card near the bottom of the wall would otherwise open off screen.
    const top =
      below + m.height > window.innerHeight - margin
        ? Math.max(margin, a.top - m.height - 6)
        : below;
    setPos({ top, left });
  }, [anchor]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="pb-pop-scrim" onClick={onClose} />
      <div className="pb-pop" ref={ref} style={pos} role="menu">
        {children}
      </div>
    </>
  );
}

/* The inline editor, for both a task's text and a project's name.
 *
 * A separate component rather than a branch inside the row, so the draft is
 * seeded by useState on mount instead of being pushed in by an effect — the
 * caller mounts it only while editing, which makes "start editing" and "reset
 * the draft" the same event. (react-hooks/set-state-in-effect rejects the
 * effect-push version outright, and it is the worse design anyway: it re-seeds
 * the draft whenever the row's title changes underneath the cursor.) */
function InlineEditor({ initial, onCommit, onCancel }) {
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef(null);
  // Escape must not save. Blur fires after it, so the intent has to be recorded
  // somewhere the blur handler can read — a ref, not state, because it is read
  // in the same tick it is written.
  const cancelled = useRef(false);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    // Select-all, so a whole-line rewrite is one keystroke — the common case
    // when fixing a task's wording.
    el.select();
  }, []);

  const commit = () => {
    if (cancelled.current) return;
    const next = draft.trim();
    if (next && next !== initial) onCommit(next);
    else onCancel();
  };

  return (
    <input
      ref={inputRef}
      className="pb-edit"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          cancelled.current = true;
          onCancel();
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function TaskRow({ task, editing, onStartEdit, onEndEdit, onToggle, onBump, onMove, onDelete }) {
  if (editing) {
    return (
      <li className="pb-task">
        <InlineEditor
          initial={task.title}
          onCommit={(title) => {
            onEndEdit();
            onToggle.rename(title);
          }}
          onCancel={onEndEdit}
        />
      </li>
    );
  }

  return (
    <li className={`pb-task${task.done ? " pb-task-done" : ""}`}>
      <button
        type="button"
        className={`pb-check${task.done ? " pb-check-on" : ""}`}
        onClick={() => onToggle.done(!task.done)}
        disabled={task.pending}
        aria-label={task.done ? "Mark not done" : "Mark done"}
      >
        {task.done ? "✓" : ""}
      </button>
      <button
        type="button"
        className="pb-task-text"
        onClick={() => !task.pending && onStartEdit()}
        title="Click to edit"
      >
        {task.title}
      </button>
      <span className="pb-task-acts">
        {!task.done && (
          <button type="button" className="pb-act" onClick={onBump} title="Move to top">
            ↑
          </button>
        )}
        {/* Only when there is somewhere to move it to — on a one-project board
            this would be a button that can't do anything. */}
        {onMove && (
          <button
            type="button"
            className="pb-act"
            onClick={(e) => onMove(e.currentTarget)}
            title="Move to another board"
          >
            →
          </button>
        )}
        <button type="button" className="pb-act" onClick={onDelete} title="Delete">
          ✕
        </button>
      </span>
    </li>
  );
}

export default function ProjectCard({
  project,
  otherProjects,
  onMoveTask,
  flash,
  canMoveLeft,
  canMoveRight,
  onAddTask,
  onSetDone,
  onRenameTask,
  onBumpTask,
  onDeleteTask,
  onRenameProject,
  onSetColor,
  onEditProject,
  onClearDone,
  onDeleteProject,
  onMoveProject,
  cardRef,
}) {
  const accent = colorFor(project);
  const open = openTasks(project);
  const done = doneTasks(project);

  const [showDone, setShowDone] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draft, setDraft] = useState("");
  const [menuAnchor, setMenuAnchor] = useState(null);
  // { task, anchor } while a row's "move to another board" list is open.
  const [moving, setMoving] = useState(null);
  // null | "ok" | "err" — the copy button's own feedback, cleared on a timer.
  const [copied, setCopied] = useState(null);
  const copyTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const copyPrompt = async () => {
    const ok = await copyText(promptText(project));
    window.clearTimeout(copyTimer.current);
    setCopied(ok ? "ok" : "err");
    copyTimer.current = window.setTimeout(() => setCopied(null), 1600);
  };

  const submitAdd = (e) => {
    e?.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    onAddTask(title);
    // The input keeps focus, so a brain-dump of five tasks is five lines of
    // typing and no clicks.
  };

  const closeMenu = () => setMenuAnchor(null);

  return (
    <section className="pb-card" style={{ "--accent": accent }} ref={cardRef}>
      <div className={`pb-card-head${flash ? " pb-card-flash" : ""}`}>
        <div className="pb-card-title-wrap">
          {editingTitle ? (
            <InlineEditor
              initial={project.name}
              onCommit={(name) => {
                setEditingTitle(false);
                onRenameProject(name);
              }}
              onCancel={() => setEditingTitle(false)}
            />
          ) : (
            <button
              type="button"
              className="pb-card-title"
              onClick={() => setEditingTitle(true)}
              title="Click to rename"
            >
              {project.name}
            </button>
          )}
          {!!project.subtitle && !editingTitle && (
            <div className="pb-card-sub">{project.subtitle}</div>
          )}
        </div>
        <span className="pb-card-count">{open.length ? `${open.length} open` : "clear"}</span>
        {/* Hidden on a cleared card rather than disabled — the prompt it would
            write has nothing in it to work on. */}
        {open.length > 0 && (
          <button
            type="button"
            className={`pb-menu-btn${copied ? ` pb-copy-${copied}` : ""}`}
            onClick={copyPrompt}
            title="Copy these tasks as a prompt"
            aria-label={`Copy ${project.name} tasks as a prompt`}
          >
            {copied === "ok" ? "✓" : copied === "err" ? "!" : "❐"}
          </button>
        )}
        <button
          type="button"
          className="pb-menu-btn"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          aria-label={`${project.name} options`}
        >
          ⋯
        </button>
      </div>

      <ul className="pb-tasks">
        {open.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            editing={editingTask === t.id}
            onStartEdit={() => setEditingTask(t.id)}
            onEndEdit={() => setEditingTask(null)}
            onToggle={{
              done: (v) => onSetDone(t, v),
              rename: (title) => onRenameTask(t, title),
            }}
            onBump={() => onBumpTask(t)}
            onMove={
              otherProjects.length ? (anchor) => setMoving({ task: t, anchor }) : null
            }
            onDelete={() => onDeleteTask(t)}
          />
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <button type="button" className="pb-done-toggle" onClick={() => setShowDone((v) => !v)}>
            {showDone ? "▾" : "▸"} {done.length} done
          </button>
          {showDone && (
            <>
              <ul className="pb-tasks">
                {done.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    editing={editingTask === t.id}
                    onStartEdit={() => setEditingTask(t.id)}
                    onEndEdit={() => setEditingTask(null)}
                    onToggle={{
                      done: (v) => onSetDone(t, v),
                      rename: (title) => onRenameTask(t, title),
                    }}
                    onBump={() => onBumpTask(t)}
                    onDelete={() => onDeleteTask(t)}
                  />
                ))}
              </ul>
              <button type="button" className="pb-clear-done" onClick={onClearDone}>
                Clear {done.length} done
              </button>
            </>
          )}
        </>
      )}

      <form className="pb-add" onSubmit={submitAdd}>
        <input
          className="pb-add-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          /* Enter is handled here as well as by the form's onSubmit. A form
             whose only control is a text input submits implicitly on Enter, but
             that is the corner of the spec browsers are least consistent about —
             and typing a task then pressing Enter IS this page, so it doesn't
             get to depend on a fallback. The form stays for the semantics. */
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitAdd();
            }
          }}
          placeholder="+ add a task"
          aria-label={`Add a task to ${project.name}`}
        />
      </form>

      {/* Filing a task off this board — the other half of capture. Inbox items
          arrive here with no home, and this is how they get one. */}
      {moving && (
        <Menu anchor={moving.anchor} onClose={() => setMoving(null)}>
          <div className="pb-pop-label">Move to</div>
          {otherProjects.map((p) => (
            <button
              key={p.id}
              type="button"
              className="pb-pop-item"
              onClick={() => {
                const task = moving.task;
                setMoving(null);
                onMoveTask(task, p);
              }}
            >
              {p.name}
            </button>
          ))}
        </Menu>
      )}

      {menuAnchor && (
        <Menu anchor={menuAnchor} onClose={closeMenu}>
          <button
            type="button"
            className="pb-pop-item"
            onClick={() => {
              closeMenu();
              onEditProject();
            }}
          >
            Edit project…
          </button>
          <button
            type="button"
            className="pb-pop-item"
            disabled={!canMoveLeft}
            style={!canMoveLeft ? { opacity: 0.4, cursor: "default" } : undefined}
            onClick={() => {
              closeMenu();
              if (canMoveLeft) onMoveProject(-1);
            }}
          >
            Move earlier
          </button>
          <button
            type="button"
            className="pb-pop-item"
            disabled={!canMoveRight}
            style={!canMoveRight ? { opacity: 0.4, cursor: "default" } : undefined}
            onClick={() => {
              closeMenu();
              if (canMoveRight) onMoveProject(1);
            }}
          >
            Move later
          </button>
          {done.length > 0 && (
            <button
              type="button"
              className="pb-pop-item"
              onClick={() => {
                closeMenu();
                onClearDone();
              }}
            >
              Clear {done.length} done
            </button>
          )}

          <div className="pb-pop-label">Color</div>
          <div className="pb-swatches">
            {CARD_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`pb-swatch${accent === c ? " pb-swatch-on" : ""}`}
                style={{ background: c }}
                aria-label={`Set color ${c}`}
                onClick={() => {
                  closeMenu();
                  onSetColor(c);
                }}
              />
            ))}
          </div>

          <button
            type="button"
            className="pb-pop-item pb-pop-danger"
            onClick={() => {
              closeMenu();
              onDeleteProject();
            }}
          >
            Delete project
          </button>
        </Menu>
      )}
    </section>
  );
}
