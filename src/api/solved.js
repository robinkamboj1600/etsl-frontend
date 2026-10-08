import { http } from "./http";

export const solvedApi = {
  list: ({ tab, from, to, by, search, page = 1, pageSize = 25 }) => {
    const q = new URLSearchParams();
    q.set("tab", tab || "all");
    if (from) q.set("from", from.toISOString());
    if (to) q.set("to", to.toISOString());
    if (by) q.set("by", by);
    if (search) q.set("search", search);
    q.set("page", String(page));
    q.set("pageSize", String(pageSize));
    return http.get(`/solved?${q.toString()}`);
  },
  people: () => http.get("/solved/people"),
};

/** The people the task service names are not always people: say what they are. */
export const solverLabel = (name) =>
  name === "bizworkflows" ? "Automation" : name === "nocodb_ui" ? "NocoDB" : name || "—";
