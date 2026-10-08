import * as React from "react";

import { authApi } from "@/api/auth";
import { HttpError } from "@/api/http";

const AuthContext = React.createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = React.useState("loading"); // loading | anon | authed
  const [user, setUser] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    authApi
      .me()
      .then((res) => {
        if (!alive) return;
        setUser(res.user);
        setStatus("authed");
      })
      .catch(() => {
        if (!alive) return;
        setStatus("anon");
      });
    return () => {
      alive = false;
    };
  }, []);

  const login = React.useCallback(async (email, password) => {
    setError(null);
    try {
      const res = await authApi.login(email, password);
      setUser(res.user);
      setStatus("authed");
    } catch (err) {
      setError(
        err instanceof HttpError ? err.detail || err.code : "Sign-in failed.",
      );
      throw err;
    }
  }, []);

  const logout = React.useCallback(async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
    setStatus("anon");
  }, []);

  const value = { status, user, error, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
