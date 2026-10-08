import * as React from "react";
import { http } from "./http";

/** Queues fed by the Re:amaze task service (csQueueApi) instead of our own database. */
export const TASK_QUEUES = new Set(["manual", "spam", "aifb", "suptix"]);

const qs = (params) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && q.set(k, String(v)));
  return q.toString();
};

export const tasksApi = {
  list: ({ queue, search, tab, page = 1, pageSize = 50 }) => http.get(`/tasks?${qs({ queue, search, tab, page, pageSize })}`),
  counts: () => http.get("/tasks/counts"),
  outcomes: (queue) => http.get(`/tasks/outcomes?${qs({ queue })}`),
  solved: ({ queue, page = 1, pageSize = 50 }) => http.get(`/tasks/solved?${qs({ queue, page, pageSize })}`),
  get: (id) => http.get(`/tasks/${id}`),
  saveDraft: (id, patch) => http.patch(`/tasks/${id}`, patch),
  approve: (id, body = {}) => http.post(`/tasks/${id}/approve`, body),
  unapprove: (id) => http.post(`/tasks/${id}/unapprove`),
  setOutcome: (id, body) => http.post(`/tasks/${id}/outcome`, body),
  responseChoices: (id) => http.get(`/tasks/${id}/response-choices`),
  attachments: (id) => http.get(`/tasks/${id}/attachments`),
};

/** "3h", "2d" — how long ago, for the Waiting column. */
export function since(iso) {
  if (!iso) return "—";
  const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600000));
  return h < 1 ? "just now" : h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
}

export const canActOnTask = (session, task) =>
  task.queue_key === "aifb" ? !!session.isAdmin : session.role === "lead" || session.role === "agent";

/** Open tasks per task queue; quiet (zeros) for people who have no access or no token. */
export function useTaskCounts(session, ...deps) {
  const [counts, setCounts] = React.useState({});
  const [again, setAgain] = React.useState(0);
  const allowed = session.role === "lead" || session.role === "agent" || session.role === "checker";
  React.useEffect(() => {
    if (!allowed) return undefined;
    let alive = true;
    let timer;
    tasksApi
      .counts()
      .then((r) => {
        if (!alive) return;
        setCounts(r.counts || {});
        // The first read of a big backlog takes a while; keep the badges moving until it is done.
        if (r.loading) timer = setTimeout(() => setAgain((n) => n + 1), 5000);
      })
      .catch(() => alive && setCounts({}));
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, again, ...deps]);
  return counts;
}
