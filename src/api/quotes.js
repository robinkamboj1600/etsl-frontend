import React from "react";
import { casesApi } from "./cases";

/**
 * Asks the server what it would record for each order — the amount, what
 * has already gone back, and the cap. The form shows exactly these
 * numbers instead of calculating its own, so what is shown is what is
 * saved.
 *
 * jobs: [{ id, items }] — one per order. Returns null while the answer
 * for the current inputs is still on its way, otherwise
 * { [id]: { ok } | { error: { code, detail } } }.
 */
export function useQuotes(queueKey, jobs, pct, reason) {
  const key = queueKey ? JSON.stringify([queueKey, pct, reason, jobs]) : "";
  const [state, setState] = React.useState({ key: "", results: {} });

  React.useEffect(() => {
    if (!key || !jobs.length) return undefined;
    let stale = false;
    const timer = setTimeout(async () => {
      const entries = await Promise.all(
        jobs.map(async (j) => {
          try {
            const ok = await casesApi.quote({
              queueKey,
              orderNumber: j.id,
              items: j.items,
              ...(reason ? { reason } : {}),
              ...(j.cancelLines ? { cancelLines: j.cancelLines } : {}),
              ...(pct != null ? { pct } : {}),
            });
            return [j.id, { ok }];
          } catch (err) {
            return [j.id, { error: { code: err.code, detail: err.detail || "Could not check this order." } }];
          }
        }),
      );
      if (!stale) setState({ key, results: Object.fromEntries(entries) });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key || !jobs.length) return {};
  return state.key === key ? state.results : null;
}
