import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api.js";
import { PB_CSS, colorFor, openTasks } from "./ui.js";
import ProjectCard from "./ProjectCard.jsx";
import ProjectModal from "./ProjectModal.jsx";

/* /patrick — a wall of mini boards, one per app still being finished.
 *
 * The premise is that EVERYTHING IS ON ONE SCREEN (Patrick, 2026-08-13). There
 * is no project detail route, no task detail modal, no navigation of any kind:
 * one grid of cards, each card its own list, every write done in place. Anything
 * that would require leaving the wall to see or change a task doesn't belong
 * here.
 *
 * A task is OPEN or DONE and nothing else — his call, against a doing/blocked
 * middle state. Rank is expressed by ORDER instead, which is why "↑" (bump to
 * top) is on every open row and why the "Next up" strip along the top can just
 * read the first open task of each card.
 *
 * Unlisted like /ashley and /prospects — no home page card, not in PrivateTools
 * — and, like /prospects, with NO LOGIN. Anyone who reaches the URL can read and
 * edit the board. See the header of routes/patrickBoard.js for what that does
 * and doesn't expose.
 *
 * Every write is optimistic: local state changes first, the request follows, and
 * a failure refetches /state and says so in a toast. On a sleeping Heroku dyno
 * the first request of the day takes seconds, and a checkbox that waits for a
 * round trip before ticking would make the whole page feel broken. */

// Deleting something soft-deletes it, so undo is a real restore rather than a
// re-create — that's what makes it worth keeping the toast up this long.
const UNDO_MS = 9000;
const ERR_MS = 5000;

const byPosition = (a, b) => a.position - b.position || a.id - b.id;
const sortState = (projects) =>
  [...projects]
    .sort(byPosition)
    .map((p) => ({ ...p, tasks: [...(p.tasks || [])].sort(byPosition) }));

export default function Patrick() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState(null);
  const [toast, setToast] = useState(null); // { text, undo?, kind? }
  const [modal, setModal] = useState(null); // null | { project?: {...} }
  const [flashId, setFlashId] = useState(null);

  const cardRefs = useRef({});
  const toastTimer = useRef(null);
  /* Counter for optimistic task ids, negative so they can never collide with a
   * SERIAL from Postgres. A counter rather than Date.now(): two tasks typed in
   * the same millisecond would share an id, and the lint rules here reject
   * impure calls in a component body outright. */
  const tempIds = useRef(0);

  const showToast = useCallback((next) => {
    window.clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = window.setTimeout(
      () => setToast(null),
      next.undo ? UNDO_MS : ERR_MS
    );
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const load = useCallback(
    () =>
      api
        .state()
        .then((data) => {
          setProjects(sortState(data.projects || []));
          setFatal(null);
        })
        .catch((e) => setFatal(e.message))
        .finally(() => setLoading(false)),
    []
  );

  /* Written as a promise chain, not `await load()`, and the mount fetch is
   * inlined rather than calling load() — react-hooks/set-state-in-effect reads
   * a call to a setState-carrying function from an effect body as a synchronous
   * cascade. Same shape as src/pages/prospects/index.jsx's initial load. */
  useEffect(() => {
    api
      .state()
      .then((data) => {
        setProjects(sortState(data.projects || []));
        setFatal(null);
      })
      .catch((e) => setFatal(e.message))
      .finally(() => setLoading(false));
  }, []);

  /* Every write goes through here: apply the optimistic change, fire the
   * request, and on failure refetch rather than trying to invert the change.
   * /state is one small request, so a refetch is both cheaper to reason about
   * and more truthful than a hand-written rollback — it also picks up anything
   * changed from another device. */
  const write = useCallback(
    async (optimistic, request) => {
      if (optimistic) setProjects((prev) => sortState(optimistic(prev)));
      try {
        return await request();
      } catch (e) {
        showToast({ text: e.message, kind: "err" });
        load();
        return null;
      }
    },
    [load, showToast]
  );

  // ── Task writes ────────────────────────────────────────────────────────────

  const mapTasks = (projectId, fn) => (prev) =>
    prev.map((p) => (p.id === projectId ? { ...p, tasks: fn(p.tasks || []) } : p));

  const addTask = (project, title) => {
    /* A temp negative id so the row appears the instant Enter is pressed, then
     * gets swapped for the server's row. Marked pending so the checkbox is
     * inert until it has a real id — a PATCH to /tasks/-3 is a 400. */
    tempIds.current -= 1;
    const tempId = tempIds.current;
    const maxPos = (project.tasks || []).reduce((m, t) => Math.max(m, t.position), 0);
    const optimistic = mapTasks(project.id, (tasks) => [
      ...tasks,
      {
        id: tempId,
        project_id: project.id,
        title,
        done: false,
        position: maxPos + 1,
        pending: true,
      },
    ]);

    write(optimistic, async () => {
      const saved = await api.createTask({ project_id: project.id, title });
      setProjects((prev) =>
        sortState(
          mapTasks(project.id, (tasks) => tasks.map((t) => (t.id === tempId ? saved : t)))(prev)
        )
      );
      return saved;
    });
  };

  const setDone = (task, done) =>
    write(
      mapTasks(task.project_id, (tasks) =>
        tasks.map((t) => (t.id === task.id ? { ...t, done } : t))
      ),
      () => api.updateTask(task.id, { done })
    );

  const renameTask = (task, title) =>
    write(
      mapTasks(task.project_id, (tasks) =>
        tasks.map((t) => (t.id === task.id ? { ...t, title } : t))
      ),
      () => api.updateTask(task.id, { title })
    );

  const bumpTask = (task) => {
    /* Optimistic position is a local guess; the backend recomputes min-1 itself
     * (see routes/patrickBoard.js) so two tabs can't land on the same number.
     * The guess only has to be small enough to sort first here. */
    const guess =
      (projects.find((p) => p.id === task.project_id)?.tasks || []).reduce(
        (m, t) => Math.min(m, t.position),
        0
      ) - 1;
    write(
      mapTasks(task.project_id, (tasks) =>
        tasks.map((t) => (t.id === task.id ? { ...t, position: guess } : t))
      ),
      async () => {
        const saved = await api.updateTask(task.id, { top: true });
        setProjects((prev) =>
          sortState(
            mapTasks(task.project_id, (tasks) =>
              tasks.map((t) => (t.id === task.id ? saved : t))
            )(prev)
          )
        );
        return saved;
      }
    );
  };

  const deleteTask = (task) =>
    write(
      mapTasks(task.project_id, (tasks) => tasks.filter((t) => t.id !== task.id)),
      async () => {
        const res = await api.deleteTask(task.id);
        showToast({
          text: `Deleted “${task.title.slice(0, 40)}”`,
          undo: async () => {
            setToast(null);
            await write(null, () => api.restoreTasks([task.id]));
            load();
          },
        });
        return res;
      }
    );

  const clearDone = (project) => {
    const ids = (project.tasks || []).filter((t) => t.done).map((t) => t.id);
    if (!ids.length) return;
    write(
      mapTasks(project.id, (tasks) => tasks.filter((t) => !t.done)),
      async () => {
        const res = await api.clearDone(project.id);
        showToast({
          text: `Cleared ${ids.length} done from ${project.name}`,
          undo: async () => {
            setToast(null);
            await write(null, () => api.restoreTasks(res.ids || ids));
            load();
          },
        });
        return res;
      }
    );
  };

  // ── Project writes ─────────────────────────────────────────────────────────

  const saveProject = async ({ name, subtitle, color }) => {
    const editing = modal?.project;
    try {
      if (editing) {
        const saved = await api.updateProject(editing.id, { name, subtitle, color });
        setProjects((prev) =>
          sortState(prev.map((p) => (p.id === saved.id ? { ...p, ...saved } : p)))
        );
      } else {
        const saved = await api.createProject({ name, subtitle, color });
        setProjects((prev) => sortState([...prev, { ...saved, tasks: [] }]));
      }
      setModal(null);
      return true;
    } catch (e) {
      showToast({ text: e.message, kind: "err" });
      return false;
    }
  };

  const patchProject = (project, body) =>
    write(
      (prev) => prev.map((p) => (p.id === project.id ? { ...p, ...body } : p)),
      () => api.updateProject(project.id, body)
    );

  const deleteProject = (project) => {
    // The only confirm on the page. Everything else is one soft-deleted row with
    // an undo; this takes a whole card's list off the wall at once, and the
    // button that does it sits three items from "Edit project".
    const n = (project.tasks || []).filter((t) => !t.done).length;
    const warn = n ? ` It has ${n} open task${n === 1 ? "" : "s"}.` : "";
    if (!window.confirm(`Delete “${project.name}”?${warn} You can undo this.`)) return;

    write(
      (prev) => prev.filter((p) => p.id !== project.id),
      async () => {
        const res = await api.deleteProject(project.id);
        showToast({
          text: `Deleted ${project.name}`,
          undo: async () => {
            setToast(null);
            await write(null, () => api.restoreProject(project.id));
            load();
          },
        });
        return res;
      }
    );
  };

  /* Reorder by swapping position values with the neighbour. Two PATCHes rather
   * than renumbering the wall — with a handful of projects that is the whole
   * cost, and it keeps every other card's position untouched. */
  const moveProject = (project, dir) => {
    const i = projects.findIndex((p) => p.id === project.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= projects.length) return;
    const other = projects[j];
    write(
      (prev) =>
        prev.map((p) => {
          if (p.id === project.id) return { ...p, position: other.position };
          if (p.id === other.id) return { ...p, position: project.position };
          return p;
        }),
      async () => {
        await api.updateProject(project.id, { position: other.position });
        await api.updateProject(other.id, { position: project.position });
      }
    );
  };

  // ── Next up ────────────────────────────────────────────────────────────────

  /* One chip per project that has anything open, showing its TOP open task. Not
   * a global priority list — there is no cross-project ranking to build one
   * from, and inventing one would be a number Patrick would have to maintain.
   * "The next thing on each board" is a question the data can actually answer. */
  const nextUp = useMemo(
    () =>
      projects
        .map((p) => ({ project: p, task: openTasks(p)[0] }))
        .filter((x) => x.task && !x.task.pending),
    [projects]
  );

  const jumpTo = (projectId) => {
    const el = cardRefs.current[projectId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(projectId);
    window.setTimeout(() => setFlashId((cur) => (cur === projectId ? null : cur)), 1300);
  };

  const totalOpen = projects.reduce((n, p) => n + openTasks(p).length, 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="pb-root">
      <style>{PB_CSS}</style>

      <header className="pb-top">
        <div className="pb-top-in">
          <span className="pb-brand">Project board</span>
          <span className="pb-counts">
            {loading
              ? "loading…"
              : `${totalOpen} open · ${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </span>
          <span className="pb-top-spacer" />
          <button type="button" className="pb-btn pb-btn-ghost" onClick={load} title="Refresh">
            ↻
          </button>
          <button type="button" className="pb-btn" onClick={() => setModal({})}>
            + New project
          </button>
        </div>
      </header>

      <div className="pb-shell">
        {fatal && (
          <div className="pb-empty">
            <h2>Couldn’t load the board</h2>
            <p>{fatal}</p>
            <button type="button" className="pb-btn" onClick={load}>
              Try again
            </button>
          </div>
        )}

        {!fatal && !loading && projects.length === 0 && (
          <div className="pb-empty">
            <h2>No boards yet</h2>
            <p>
              Add one project per app you’re still finishing. Each gets its own card on this wall,
              and every task lives on the card — nothing here opens another screen.
            </p>
            <button type="button" className="pb-btn" onClick={() => setModal({})}>
              + New project
            </button>
          </div>
        )}

        {nextUp.length > 0 && (
          <div className="pb-nextup">
            <div className="pb-nextup-label">Next up</div>
            <div className="pb-nextup-row">
              {nextUp.map(({ project, task }) => (
                <div key={project.id} className="pb-chip" style={{ "--chip": colorFor(project) }}>
                  <button
                    type="button"
                    className="pb-check"
                    style={{ "--accent": colorFor(project) }}
                    onClick={() => setDone(task, true)}
                    aria-label={`Mark “${task.title}” done`}
                  />
                  <span className="pb-chip-text">
                    <span className="pb-chip-proj">{project.name}</span>
                    <button
                      type="button"
                      className="pb-chip-task"
                      onClick={() => jumpTo(project.id)}
                      title="Show this card"
                    >
                      {task.title}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pb-wall">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              flash={flashId === project.id}
              canMoveLeft={i > 0}
              canMoveRight={i < projects.length - 1}
              cardRef={(el) => {
                cardRefs.current[project.id] = el;
              }}
              onAddTask={(title) => addTask(project, title)}
              onSetDone={setDone}
              onRenameTask={renameTask}
              onBumpTask={bumpTask}
              onDeleteTask={deleteTask}
              onRenameProject={(name) => patchProject(project, { name })}
              onSetColor={(color) => patchProject(project, { color })}
              onEditProject={() => setModal({ project })}
              onClearDone={() => clearDone(project)}
              onDeleteProject={() => deleteProject(project)}
              onMoveProject={(dir) => moveProject(project, dir)}
            />
          ))}
        </div>
      </div>

      {modal && (
        <ProjectModal project={modal.project} onSave={saveProject} onClose={() => setModal(null)} />
      )}

      {toast && (
        <div className={`pb-toast${toast.kind === "err" ? " pb-toast-err" : ""}`} role="status">
          <span>{toast.text}</span>
          {toast.undo && (
            <button type="button" className="pb-toast-undo" onClick={toast.undo}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
