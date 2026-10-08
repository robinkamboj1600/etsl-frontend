/**
 * Which filter tabs a queue gets. A queue holds only the work that is still
 * open: a case that is processed moves to the Solved Cases tab.
 */
export function filterSpec(id, isRF) {
  const base = [["all", "All"]];
  if (id === "aifb") return base.concat([["pending", "Pending"]]);
  if (id === "spam") return base.concat([["pending", "Pending"]]);
  if (id === "manual") return base.concat([["wij", "To do"], ["klant", "Waiting on customer"]]);
  if (isRF) return base.concat([["wij", "To do"], ["nofunds", "No funds"]]);
  if (id === "voucher") return base.concat([["wij", "To do"], ["nocode", "Needs a code"]]);
  if (id === "repl")
    return base.concat([
      ["wij", "To do"],
      ["nocode", "Needs a draft order"],
      ["free", "Free Replacement"],
    ]);
  if (id === "cancel")
    return base.concat([["wij", "To do"], ["refund", "Waiting for refund"]]);
  if (id === "modify") return base.concat([["wij", "To do"], ["supplier", "With the supplier"]]);
  if (id === "returns")
    return base.concat([
      ["klant", "Waiting on the customer"],
      ["notrack", "No tracking yet"],
      ["wij", "On its way to us"],
    ]);
  if (id === "dispute") return base.concat([["wij", "To do"], ["overdue", "Overdue"]]);
  if (id === "outreach") return base.concat([["wij", "To do"], ["klant", "Waiting on customer"]]);
  if (id === "supplier")
    return base.concat([
      ["wij", "To do"],
      ["supplier", "With the supplier"],
      ["klant", "Waiting on customer"],
    ]);
  if (id === "cog")
    return base.concat([
      ["supplier", "With the supplier"],
      ["noamount", "No amount yet"],
      ["wij", "Back with us"],
    ]);
  return base.concat([["wij", "To do"]]);
}

export function matchFilter(c, k) {
  /* A retracted case was taken back: it has its own list and is in none of the others. */
  if (k === "retracted") return !!c.retracted;
  if (c.retracted) return false;
  if (k === "all") return !c.done;
  if (k === "done") return !!c.done;
  if (k === "pending") return !c.done;
  if (c.done) return false;
  if (k === "refund") return !!c.cancelledAt;
  if (k === "wij" && c.dept === "cancel") return !c.cancelledAt && c.turn === "wij";
  if (k === "free") return c.dept === "repl" && !/with fee/i.test(c.reason || "");
  if (k === "nofunds") return !!c.nofunds;
  if (k === "nocode") return !c.code2;
  if (k === "noamount") return !(c.cog > 0);
  if (k === "notrack") return !(c.rtn || "").trim();
  if (k === "overdue") return c.due != null && c.due - c.age <= 0;
  return c.turn === k && !c.nofunds;
}

/** Which way a new case in this department is turned when it is created. */
export const TURN = {
  rf_paypal: "wij",
  rf_whop: "wij",
  rf_cj: "wij",
  refund: "wij",
  repl: "wij",
  voucher: "wij",
  cancel: "wij",
  modify: "wij",
  returns: "klant",
  manual: "wij",
  spam: "wij",
  dispute: "wij",
  outreach: "klant",
  supplier: "supplier",
  cog: "supplier",
};
