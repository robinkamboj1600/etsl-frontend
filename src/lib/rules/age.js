/** Hours open: under 8 is fine, 8 to 24 is yellow, past 24 is red. */
export const ageLevel = (hours) => (hours >= 24 ? "late" : hours >= 8 ? "soon" : "ok");

/** Hours left until the evidence deadline (negative once it has passed); null when the case has none. */
export function hoursLeft(c, now = Date.now()) {
  if (c.due == null || c.due === "") return null;
  if (typeof c.due === "number") return c.due - c.age;
  const at = new Date(c.due).getTime();
  return Number.isNaN(at) ? null : Math.round((at - now) / 3600000);
}
