import * as React from "react";
import { useCasesChangedTick } from "@/lib/casesChanged";
import { TASK_QUEUES, useTaskCounts } from "@/api/tasks";

import logo from "@/assets/logo.png";
import { DEPTS } from "@/data/departments";
import { useApp } from "@/store/app";
import { useAuth } from "@/store/auth";
import { canSee, dept } from "@/lib/rules/permissions";
import { isRefundQueue } from "@/lib/rules/routing";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/common/Who";
import { Button } from "@/components/ui/button";
import { casesApi } from "@/api/cases";

/**
 * The queues, grouped by department, in the order the work runs:
 * the customer first, then the supplier, then the bank.
 */
const NAVGROUPS = [
  [
    "Customer Service 📩",
    [
      "cancel",
      "modify",
      "rf_whop",
      "repl",
      "voucher",
      "returns",
      "manual",
      "suptix",
      "spam",
      "aifb",
      "page:solved",
      "page:sop",
      "page:templates",
    ],
  ],
  ["Supply Chain 📦", ["outreach", "cog", "sup_CJ", "sup_DayOne"]],
  ["Disputes & Chargebacks ❌", ["page:disputeboard", "dispute"]],
  ["", ["access"]],
];

function NavButton({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      aria-current={active ? "true" : "false"}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] font-medium transition-colors",
        active
          ? "bg-white/15 text-white"
          : "text-[#c2c9f0] hover:bg-white/10 hover:text-white",
      )}
    >
      <span className="truncate">{label}</span>
      {count != null && (
        <span
          className={cn(
            "ml-auto font-mono text-[11px]",
            active ? "text-white" : "text-[#9aa4d8]",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function NavLabel({ children }) {
  return (
    <p className="mb-1 ml-2.5 mt-4 font-display text-[8.5px] font-semibold uppercase tracking-[0.16em] text-[#7c88c9] first:mt-0">
      {children}
    </p>
  );
}

export function Sidebar() {
  const { me, session, view, setView } = useApp();
  const { user: authUser, logout } = useAuth();
  const role = session.role;

  /* Badge counts come from the backend, refetched on every navigation. */
  const changed = useCasesChangedTick();
  const taskCounts = useTaskCounts(session, view, changed);
  const [realCounts, setRealCounts] = React.useState({});
  const [supplierCounts, setSupplierCounts] = React.useState({ CJ: 0, DayOne: 0 });

  React.useEffect(() => {
    let alive = true;
    casesApi
      .openCounts()
      .then((res) => {
        if (!alive) return;
        setRealCounts(res.counts || {});
        if (res.supplierCounts) setSupplierCounts(res.supplierCounts);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [view, changed]);

  const openCases = React.useCallback(
    (id) => (TASK_QUEUES.has(id) ? taskCounts[id] : realCounts[id]) || 0,
    [realCounts, taskCounts],
  );

  /* The three refund queues live under one tab with a filter. */
  const refundCount = ["rf_paypal", "rf_whop", "rf_cj"]
    .filter((q) => canSee(q, session))
    .reduce((a, q) => a + openCases(q), 0);

  const groups = NAVGROUPS.map(([title, ids]) => {
    const items = [];
    ids.forEach((id) => {
      if (id.indexOf("page:") === 0) {
        const v2 = id.slice(5);
        /* Our own SOP and reply texts are not for a supplier. */
        if (session.org && v2 !== "solved") return;
        if (v2 === "disputeboard" && !canSee("dispute", session)) return;
        items.push({
          key: v2,
          label:
            v2 === "sop"
              ? "CS SOP"
              : v2 === "templates"
                ? "CS Templates"
                : v2 === "solved"
                  ? "Solved Cases"
                  : "Dispute Dashboard",
          view: v2,
        });
        return;
      }
      if (id.indexOf("sup_") === 0) {
        const who = id.slice(4);
        if (!canSee("supplier", session)) return;
        if (role === "cj" && who !== "CJ") return;
        if (role === "dayone" && who !== "DayOne") return;
        items.push({
          key: id,
          label: who,
          view: id,
          count: role === "cj" || role === "dayone" ? realCounts.supplier || 0 : supplierCounts[who] || 0,
        });
        return;
      }
      let x = dept(id);
      if (!x) return;
      /* A lead without Whop rights falls back to the refund queue they
         are allowed to see. */
      if (id === "rf_whop" && !canSee("rf_whop", session)) {
        x = canSee("rf_cj", session)
          ? dept("rf_cj")
          : canSee("rf_paypal", session)
            ? dept("rf_paypal")
            : null;
        if (!x) return;
      }
      if (x.intakeOnly) return;
      if (!canSee(x.id, session)) return;
      if ((x.admin || x.adminOnly) && !session.isAdmin) return;
      if (isRefundQueue(x.id)) {
        items.push({
          key: "refunds",
          label: "Refund request",
          view: "refunds",
          count: refundCount,
        });
        return;
      }
      items.push({
        key: x.id,
        label: x.t,
        view: x.id,
        count: x.admin ? null : openCases(x.id),
      });
    });
    return { title, items };
  }).filter((g) => g.items.length);

  return (
    <nav className="flex h-full flex-col gap-3 overflow-hidden bg-[linear-gradient(165deg,#050a1e_0%,#101a5c_76%,#2536cf_145%)] p-[18px_13px] text-white">
      <div className="flex shrink-0 items-center gap-2.5">
        <img
          src={logo}
          alt="Empire Trade Solutions"
          className="h-[34px] w-[34px] rounded-lg"
        />
        <b className="font-display text-[11.5px] font-extrabold uppercase leading-tight">
          Empire Trade Solutions
          <span className="mt-1 block font-display text-[7.5px] font-semibold tracking-[0.24em] text-brand-300">
            Backend Dashboard
          </span>
        </b>
      </div>

      <div
        className={cn(
          "-mr-1.5 flex-1 space-y-4 overflow-y-auto pr-1.5",
          "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent]",
          "[&::-webkit-scrollbar]:w-1.5",
          "[&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15",
        )}
      >
        <div className="flex flex-col">
          {!session.org && (
            <>
              <NavButton
                label="Overview Dashboard"
                active={view === "overview"}
                onClick={() => setView("overview")}
              />
              <div className="h-3" />
            </>
          )}
          <NavLabel>Intake</NavLabel>
          {!session.org && (
            <NavButton
              label="Submit a case"
              active={view === "intake"}
              onClick={() => setView("intake")}
            />
          )}
          <NavButton
            label="Stores overview"
            active={view === "stores"}
            onClick={() => setView("stores")}
          />
        </div>

        <div className="flex flex-col">
          {groups.map((g, i) => (
            <React.Fragment key={g.title || `g${i}`}>
              {g.title ? <NavLabel>{g.title}</NavLabel> : <div className="h-4" />}
              {g.items.map((it) => (
                <NavButton
                  key={it.key}
                  label={it.label}
                  count={it.count}
                  active={view === it.view}
                  onClick={() => setView(it.view)}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <Avatar uid={me} large />
          <div className="min-w-0">
            <b className="block truncate text-[12.5px]">{authUser.name}</b>
            <small className="block truncate text-[10.5px] text-[#9aa4d8]">
              {authUser.email}
            </small>
          </div>
        </div>
        <Button variant="outline" size="xs" onClick={logout} className="w-full">
          Sign out
        </Button>
        <p className="m-0 text-[10.5px] leading-snug text-[#9aa4d8]">
          {authUser.isAdmin ? "Admin" : authUser.role}
          {authUser.team ? ` · ${authUser.team}` : ""}
          {authUser.supplierOrg ? ` · ${authUser.supplierOrg}` : ""}
        </p>
      </div>
    </nav>
  );
}
