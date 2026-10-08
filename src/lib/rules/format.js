/**
 * Money is shown in the store's own currency, in the store's own
 * notation (1.234,56 for the euro stores, 1,234.56 for UK/US).
 */
export function money(st, n) {
  const sym = typeof st === "string" ? st : st.sym;
  const loc = typeof st === "string" ? "nl-NL" : st.loc || "nl-NL";
  const post = typeof st === "object" && st.post;
  const v = Number(n || 0).toLocaleString(loc, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return post ? `${v} ${sym}` : `${sym}${v}`;
}

/** Whole numbers on the dashboards. */
export function nf(n) {
  return Number(n || 0).toLocaleString("en-GB");
}

export function pct1(v) {
  return `${Number(v || 0).toFixed(2).replace(".", ",")}%`;
}

export function slug(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
