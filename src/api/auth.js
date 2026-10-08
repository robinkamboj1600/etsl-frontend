import { http } from "./http";

export const authApi = {
  me: () => http.get("/auth/me"),
  login: (email, password) => http.post("/auth/login", { email, password }),
  logout: () => http.post("/auth/logout"),
};
