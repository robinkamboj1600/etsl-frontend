/**
 * What the toast says after a case is processed, built from what
 * actually happened: the confirmation may be on the clipboard, the
 * ticket may have opened, neither is guaranteed in every browser.
 */
export function processMessage(base, copied, opened) {
  return (
    base +
    (copied ? " The confirmation is on your clipboard" : "") +
    (opened
      ? copied
        ? " and the ticket is open — paste it there."
        : " The ticket is open."
      : copied
        ? " — there is no ticket link on this case, so paste it wherever you reply."
        : "")
  );
}

/** Copy, open the ticket, and say what happened. */
export async function finishProcess(res) {
  if (!res.ok) return res;
  let copied = false;
  if (res.confirmation) {
    try {
      await navigator.clipboard.writeText(res.confirmation);
      copied = true;
    } catch {
      copied = false;
    }
  }
  let opened = false;
  if (res.ticket) {
    try {
      window.open(res.ticket, "_blank", "noopener");
      opened = true;
    } catch {
      opened = false;
    }
  }
  res.message = processMessage(res.message, copied, opened);
  return res;
}
