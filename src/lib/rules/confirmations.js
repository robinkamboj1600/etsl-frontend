import { SIGN, LANG_OF, CONFIRM } from "@/data/signatures";
import { money } from "./format";

/** Pull the person and the store name out of the stored signature. */
export function sigParts(st) {
  const lines = (st.sgf || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const teamLine = lines.filter((l) => l.indexOf("|") > -1)[0] || "";
  const storeName = teamLine.indexOf("|") > -1 ? teamLine.split("|").pop().trim() : st.n;
  let person = "";
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].indexOf("|") < 0) {
      person = lines[i];
      break;
    }
  }
  return { person, store: storeName || st.n };
}

/** The store's signature, in the customer's own language. */
export function signatureFor(st, cc) {
  const pt = sigParts(st);
  const t = SIGN[cc];
  if (!t) return st.sgf || "";
  return `${t[0]}\n\n${pt.person || ""}\n${t[1]} | ${pt.store}`;
}

export function confirmKind(deptId) {
  if (deptId === "repl") return "repl";
  if (deptId === "voucher") return "voucher";
  if (deptId === "cancel") return "cancel";
  if (deptId === "modify") return "mod";
  return "refund";
}

/**
 * The confirmation that goes to the customer once a case is processed:
 * right language, right amount, right signature.
 *
 * PLACEHOLDER WORDING — replace every line with the approved text and
 * have a native speaker read it before it goes live.
 */
export function confirmText(c, st, o) {
  const cc = (o && o.cc) || (st.cc && st.cc[0]) || "UK";
  const L = CONFIRM[LANG_OF[cc] || "en"] || CONFIRM.en;
  const kind = confirmKind(c.dept);
  const body = L[kind] || CONFIRM.en[kind];
  const name = (o && o.cust) || "";
  const amt = money(st, c.amount || 0);
  const out =
    (L.hi || CONFIRM.en.hi).replace("{name}", name || "there") +
    "\n\n" +
    body
      .replace(/\{order\}/g, `#${c.order}`)
      .replace(/\{amount\}/g, amt)
      .replace(/\{code\}/g, c.code2 || "—")
      .replace(/\{change\}/g, c.change || "");
  const sg = signatureFor(st, cc);
  return `${out}\n\n${sg}`;
}
