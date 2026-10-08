import * as React from "react";

import { sessionFromAuthUser } from "@/lib/rules/session";

/**
 * One store for the whole dashboard: what the person is looking at, which
 * case/task/store is open, and the queue filters. Case data itself is
 * never held here — every list reads the backend.
 */
const AppContext = React.createContext(null);

/* The first screen after signing in. Leads and checkers (who can read the overview) start there. */
const DEFAULT_VIEW = {
  lead: "overview",
  checker: "overview",
  paypal: "refunds",
  cj: "sup_CJ",
  dayone: "sup_DayOne",
};

export function AppProvider({ children, authUser }) {
  const me = authUser.email;
  const [view, setView] = React.useState("intake");
  const [openId, setOpenIdState] = React.useState(null);
  const [openReal, setOpenReal] = React.useState(false);
  const [openTaskId, setOpenTaskId] = React.useState(null);
  const [openStore, setOpenStoreState] = React.useState(null);
  const [marked, setMarked] = React.useState({});
  const [qFilter, setQFilter] = React.useState({});
  const [rfFilter, setRfFilter] = React.useState("all");
  const [cogFilter, setCogFilter] = React.useState("all");
  const [teamFilter, setTeamFilter] = React.useState("mine");
  const [search, setSearch] = React.useState("");

  const session = React.useMemo(() => sessionFromAuthUser(authUser), [authUser]);

  /* Land on the queue that fits the signed-in role, once, on login. */
  React.useEffect(() => {
    setView(DEFAULT_VIEW[session.role] || "intake");
  }, [session.me]);

  /* A store opens on a country when you click one of its flags. */
  const setOpenStore = React.useCallback((st, cc) => {
    setOpenStoreState(st ? { st, cc: cc || null } : null);
  }, []);

  /* Database case ids and Re:amaze task ids both start at 1, so which panel
     opens is tracked explicitly, never guessed from the id alone. */
  const setOpenId = React.useCallback((id, real = true) => {
    setOpenIdState(id);
    setOpenReal(!!real);
  }, []);

  const goto = React.useCallback((v) => {
    setView(v);
    setMarked({});
    setRfFilter("all");
    setOpenId(null);
    setOpenTaskId(null);
    setOpenStoreState(null);
  }, [setOpenId]);

  const value = {
    me,
    session,
    view,
    openId,
    openReal,
    openTaskId,
    openStore,
    marked,
    qFilter,
    rfFilter,
    cogFilter,
    teamFilter,
    search,
    setView: goto,
    setOpenId,
    setOpenTaskId,
    setOpenStore,
    setMarked,
    setQFilter,
    setRfFilter,
    setCogFilter,
    setTeamFilter,
    setSearch,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
