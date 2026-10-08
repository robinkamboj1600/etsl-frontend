import * as React from "react";

import { AppProvider, useApp } from "@/store/app";
import { AuthProvider, useAuth } from "@/store/auth";
import { ThemeProvider } from "@/store/theme";
import { canSee, dept } from "@/lib/rules/permissions";
import { casesApi } from "@/api/cases";
import { useCasesChangedTick } from "@/lib/casesChanged";

import { LoginScreen } from "@/components/auth/LoginScreen";
import { AppShell } from "@/components/layout/AppShell";
import { RealCasePanel } from "@/components/cases/RealCasePanel";
import { TaskPanel } from "@/components/cases/TaskPanel";
import { TASK_QUEUES, useTaskCounts } from "@/api/tasks";
import { StorePanel } from "@/components/cases/StorePanel";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Intake } from "@/views/Intake";
import { QueueList } from "@/views/QueueList";
import { Overview } from "@/views/Overview";
import { DisputeBoard } from "@/views/DisputeBoard";
import { Stores } from "@/views/Stores";
import { Templates } from "@/views/Templates";
import { Sop } from "@/views/Sop";
import { Access } from "@/views/Access";
import { SearchResults } from "@/views/SearchResults";
import { SolvedCases } from "@/views/SolvedCases";

/**
 * Which screen is on. In production this is where a router goes; the
 * views themselves do not care how they were reached.
 */
function resolveView(view, session) {
  if (
    view === "refunds" &&
    !["rf_paypal", "rf_whop", "rf_cj"].some((x) => canSee(x, session))
  )
    return "intake";
  if (String(view).indexOf("sup_") === 0 && !canSee("supplier", session))
    return "intake";
  if (
    session.org &&
    ["overview", "sop", "templates", "intake", "disputeboard"].indexOf(view) >
      -1
  )
    return session.role === "cj" ? "sup_CJ" : "sup_DayOne";
  if (view === "disputeboard" && !canSee("dispute", session)) return "intake";
  if (
    [
      "intake",
      "access",
      "stores",
      "sop",
      "templates",
      "refunds",
      "overview",
      "disputeboard",
    ].indexOf(view) < 0 &&
    String(view).indexOf("sup_") !== 0 &&
    !canSee(view, session)
  )
    return "intake";
  if (view === "intake" && session.org)
    return session.role === "cj" ? "sup_CJ" : "sup_DayOne";
  return view;
}

function Screen() {
  const { view: rawView, session, search } = useApp();
  const view = resolveView(rawView, session);
  const q = (search || "").trim();

  const changed = useCasesChangedTick();
  const [realOpen, setRealOpen] = React.useState({});
  const [supplierOpen, setSupplierOpen] = React.useState({});
  React.useEffect(() => {
    let alive = true;
    casesApi
      .openCounts()
      .then((res) => {
        if (!alive) return;
        setRealOpen(res.counts || {});
        setSupplierOpen(res.supplierCounts || {});
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [rawView, changed]);

  const taskOpen = useTaskCounts(session, rawView, changed);
  const openCount = (id) => (TASK_QUEUES.has(id) ? taskOpen[id] : realOpen[id]) || 0;

  if (q.length >= 2)
    return (
      <AppShell
        title="Search"
        subtitle="Everything on this order number, across departments."
      >
        <SearchResults q={q} />
      </AppShell>
    );

  if (view === "intake")
    return (
      <AppShell
        title="Submit a case"
        subtitle="Pick a reason, paste the ticket link, submit."
      >
        <Intake />
      </AppShell>
    );
  if (view === "overview")
    return (
      <AppShell
        title="Overview Dashboard"
        subtitle="Refund and chargeback rates per store"
      >
        <Overview />
      </AppShell>
    );
  if (view === "disputeboard")
    return (
      <AppShell
        title="Dispute Dashboard"
        subtitle="Dispute cases in this dashboard"
      >
        <DisputeBoard />
      </AppShell>
    );
  if (view === "solved")
    return (
      <AppShell
        title="Solved Cases"
        subtitle="Refunded and resolved cases, with who processed them and when"
      >
        <SolvedCases />
      </AppShell>
    );
  if (view === "templates")
    return (
      <AppShell
        title="CS Templates"
        subtitle="One example — your own texts replace it"
      >
        <Templates />
      </AppShell>
    );
  if (view === "sop")
    return (
      <AppShell title="CS SOP" subtitle="The flow behind every decision">
        <Sop />
      </AppShell>
    );
  if (view === "stores")
    return (
      <AppShell title="Stores overview" subtitle="From the backend sheet">
        <Stores />
      </AppShell>
    );
  if (view === "access")
    return (
      <AppShell title="Access" subtitle="Who signs in and what they see">
        <Access />
      </AppShell>
    );
  if (String(view).indexOf("sup_") === 0) {
    const who = view.slice(4);
    return (
      <AppShell
        title={who}
        subtitle={`${supplierOpen[who] || 0} open`}
      >
        <QueueList viewId={view} />
      </AppShell>
    );
  }
  if (view === "refunds") {
    const open = ["rf_paypal", "rf_whop", "rf_cj"]
      .filter((x) => canSee(x, session))
      .reduce((a, x) => a + openCount(x), 0);
    return (
      <AppShell title="Refund request" subtitle={`${open} open`}>
        <QueueList viewId="refunds" />
      </AppShell>
    );
  }
  const d = dept(view);
  return (
    <AppShell
      title={d ? d.t : "Dashboard"}
      subtitle={`${openCount(view)} open`}
    >
      <QueueList viewId={view} />
    </AppShell>
  );
}

function Authed() {
  const { status, user } = useAuth();

  if (status === "loading") return null;
  if (status === "anon") return <LoginScreen />;

  return (
    <AppProvider authUser={user}>
      <TooltipProvider delayDuration={200}>
        <Screen />
        <RealCasePanel />
        <TaskPanel />
        <StorePanel />
        <Toaster />
      </TooltipProvider>
    </AppProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Authed />
      </AuthProvider>
    </ThemeProvider>
  );
}
