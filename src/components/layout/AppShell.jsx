import * as React from "react";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ title, subtitle, children }) {
  return (
    <div className="grid h-screen grid-cols-1 overflow-hidden md:grid-cols-[212px_minmax(0,1fr)]">
      <Sidebar />
      <main className="min-w-0 overflow-y-auto">
        <Topbar title={title} subtitle={subtitle} />
        <div className="p-5">{children}</div>
      </main>
    </div>
  );
}
