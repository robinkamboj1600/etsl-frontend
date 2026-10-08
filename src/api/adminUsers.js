import { http } from "./http";

export const adminUsersApi = {
  list: () => http.get("/admin/users"),
  create: (input) => http.post("/admin/users", input),
  update: (id, input) => http.patch(`/admin/users/${id}`, input),
  setQueueToken: (id, token) => http.put(`/admin/users/${id}/queue-token`, { token }),
};
