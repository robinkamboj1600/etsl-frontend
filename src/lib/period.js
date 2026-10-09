export const PERIODS = [
  ["all", "All time"],
  ["today", "Today"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["custom", "Pick dates…"],
];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** The from/to a period stands for, in the browser's day. */
export function rangeOf(period, fromText, toText) {
  const now = new Date();
  if (period === "today") return { from: startOfDay(now) };
  if (period === "7d") return { from: new Date(now.getTime() - 7 * 86_400_000) };
  if (period === "30d") return { from: new Date(now.getTime() - 30 * 86_400_000) };
  if (period === "custom")
    return {
      from: fromText ? new Date(`${fromText}T00:00:00`) : undefined,
      to: toText ? new Date(`${toText}T23:59:59.999`) : undefined,
    };
  return {};
}
