import * as React from "react";

const EVENT = "etsl:cases-changed";

/** Tell the sidebar badges and the page header that case counts moved. */
export const notifyCasesChanged = () => window.dispatchEvent(new Event(EVENT));

export function useCasesChangedTick() {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return tick;
}
