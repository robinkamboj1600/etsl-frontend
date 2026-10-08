import * as React from "react";

const ThemeContext = React.createContext({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
});

const KEY = "etsl.theme";

function systemDark() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = React.useState(() => {
    try {
      return localStorage.getItem(KEY) || "system";
    } catch {
      return "system";
    }
  });
  const [systemIsDark, setSystemIsDark] = React.useState(systemDark);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = (e) => setSystemIsDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const resolved =
    theme === "system" ? (systemIsDark ? "dark" : "light") : theme;

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = React.useCallback((t) => {
    setThemeState(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* private mode — the theme just does not stick */
    }
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
