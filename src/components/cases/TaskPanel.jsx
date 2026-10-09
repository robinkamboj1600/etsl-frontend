import * as React from "react";
import { toast } from "sonner";

import { useApp } from "@/store/app";
import { HttpError } from "@/api/http";
import { canActOnTask, since, tasksApi } from "@/api/tasks";
import { notifyCasesChanged } from "@/lib/casesChanged";

import { ShopifyOrderLink } from "@/components/common/ShopifyOrderLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Section({ title, children }) {
  return (
    <div className="border-b px-5 py-4 last:border-b-0">
      <h4 className="mb-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function KV({ k, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed py-1.5 last:border-b-0">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="text-right text-[13px]">{children}</span>
    </div>
  );
}

const FAULTS = [
  ["supplier_s_fault", "Supplier's fault"],
  ["customer_s_fault", "Customer's fault"],
  ["unknown", "Not sure"],
];

const fail = (err, fallback) =>
  toast.error(err instanceof HttpError ? err.detail || err.code : fallback);

/**
 * One task from the Re:amaze task service: read the ticket, edit the
 * reply, approve it for sending, or close it with an outcome. The service
 * sends the reply itself once approved — this screen never does.
 */
export function TaskPanel() {
  const { openTaskId, setOpenTaskId, session } = useApp();
  const [t, setT] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [reply, setReply] = React.useState("");
  const [note, setNote] = React.useState("");
  const [order, setOrder] = React.useState("");
  const [outcomes, setOutcomes] = React.useState([]);
  const [outcome, setOutcome] = React.useState("");
  const [busy, setBusy] = React.useState(null); // which action is running
  const [loadingFiles, setLoadingFiles] = React.useState(false);
  const [files, setFiles] = React.useState(null);
  const [choices, setChoices] = React.useState(null); // customer-response pick list; null = not loaded

  const fill = (res) => {
    setT(res);
    setReply(res.outbound_body ?? "");
    setNote(res.note ?? "");
    setOrder(res.order_number_found ?? "");
  };

  const load = React.useCallback(() => {
    if (!openTaskId) {
      setT(null);
      return;
    }
    setLoading(true);
    setFiles(null);
    tasksApi
      .get(openTaskId)
      .then(fill)
      .catch((err) => {
        fail(err, "Could not open this case.");
        setOpenTaskId(null);
      })
      .finally(() => setLoading(false));
  }, [openTaskId, setOpenTaskId]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!t) return;
    tasksApi
      .outcomes(t.queue_key)
      .then((r) => setOutcomes(r.outcomes))
      .catch(() => setOutcomes([]));
    setOutcome("");
  }, [t && t.id, t && t.queue_key]);

  const can = t ? canActOnTask(session, t) : false;
  const ticked = !!(t && t.submit_reply);
  const isRts = !!t && String(t.proposal || "").startsWith("rts:");
  const canPickResponse = !!t && can && t.state !== "resolved" && isRts;
  React.useEffect(() => {
    setChoices(null);
    if (!canPickResponse) return undefined;
    let alive = true;
    tasksApi
      .responseChoices(t.id)
      .then((r) => alive && setChoices(r.choices || []))
      .catch(() => alive && setChoices([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t && t.id, canPickResponse]);

  // `keep` leaves the unsaved reply, note and order fields as typed; the server copy of the task is still refreshed.
  const act = async (fn, msg, closes = false, key = "action", keep = false) => {
    setBusy(key);
    try {
      const res = await fn();
      if (msg) toast(msg);
      notifyCasesChanged();
      if (closes) setOpenTaskId(null);
      else if (keep) setT(res);
      else fill(res);
    } catch (err) {
      fail(err, "That didn't work.");
      load();
    } finally {
      setBusy(null);
    }
  };

  // A locked draft is approved as written: no body editor, and no body ever sent with a save or an approval.
  const editLocked = !!(t && t.edit_locked);
  const draftChanged =
    t && !editLocked ? reply !== (t.outbound_body ?? "") : false;
  const canEditDraft = can && !!t && t.state !== "resolved" && !ticked;
  const choiceOptions = [
    ...new Set([
      ...(choices || []).map((c) => c.choice).filter(Boolean),
      ...(t && t.customer_response ? [t.customer_response] : []),
    ]),
  ];
  const hasMergeHold = !!t && typeof t.merge_confirmed === "boolean";
  const hasFaultCard = !!(
    t &&
    (t.card_message != null ||
      t.fault != null ||
      String(t.proposal || "").startsWith("chart:"))
  );

  return (
    <Sheet open={!!openTaskId} onOpenChange={(o) => !o && setOpenTaskId(null)}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        {loading || !t ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>
                Case ID #{t.id}{" "}
                <span className="ml-2 font-normal text-muted-foreground">
                  {t.store_slug}
                </span>
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-wrap gap-1.5 border-b px-5 py-3">
              <Badge variant="brand">{t.queue_key}</Badge>
              {t.priority && (
                <Badge
                  variant={
                    String(t.priority).toLowerCase() === "urgent"
                      ? "crit"
                      : "secondary"
                  }
                >
                  {t.priority}
                </Badge>
              )}
              <Badge variant="secondary">
                {String(t.disposition || "").replace(/_/g, " ")}
              </Badge>
              {ticked && (
                <Badge variant="good">
                  {t.approval_source === "machine"
                    ? "Approved by the system"
                    : "Approved by a person"}
                </Badge>
              )}
              {t.state === "resolved" && <Badge variant="good">solved</Badge>}
            </div>

            <Section title="The ticket">
              <KV k="Why it is here">{t.reason}</KV>
              <KV k="Customer waiting">{since(t.customer_waiting_since)}</KV>
              {t.order_number && (
                <KV k="Shopify order">
                  <ShopifyOrderLink order={t.order_number}>
                    {t.order_number}
                  </ShopifyOrderLink>
                </KV>
              )}
              <KV k="Order">
                {can && t.state !== "resolved" && !ticked ? (
                  <Input
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    className="h-7 w-48 text-right text-xs"
                    placeholder="not found"
                  />
                ) : t.order_number_found ? (
                  <ShopifyOrderLink order={t.order_number_found}>
                    {t.order_number_found}
                  </ShopifyOrderLink>
                ) : (
                  "—"
                )}
              </KV>
              {t.ticket_url && (
                <KV k="Ticket">
                  <a
                    href={t.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    open in Re:amaze
                  </a>
                </KV>
              )}
              {t.customer_replied_since_draft && (
                <p className="mt-2 rounded-md border border-warn/40 bg-warn-soft px-3 py-2 text-xs text-warn">
                  The customer wrote again after this draft was prepared. Read
                  the new message first. If you approve the draft now, the system
                  may take the approval back and say why in "Why it is here".
                </p>
              )}
            </Section>

            {hasFaultCard && (
              <Section title="Return — whose fault">
                {t.card_message && (
                  <p className="mb-2 whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
                    {t.card_message}
                  </p>
                )}
                {t.card_items && (
                  <p className="mb-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {t.card_items}
                  </p>
                )}
                {t.card_delivered_at && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Delivered{" "}
                    {new Date(t.card_delivered_at).toLocaleDateString("en-GB")}
                  </p>
                )}
                {can && t.state !== "resolved" && !ticked ? (
                  <Select
                    value={t.fault || "none"}
                    onValueChange={(v) =>
                      act(
                        () =>
                          tasksApi.saveDraft(t.id, {
                            fault: v === "none" ? null : v,
                          }),
                        "Saved.",
                      )
                    }
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      {FAULTS.map(([k, l]) => (
                        <SelectItem key={k} value={k}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm">
                    {FAULTS.find(([k]) => k === t.fault)?.[1] || "Not set"}
                  </span>
                )}
              </Section>
            )}

            {(isRts || t.customer_response) && (
              <Section title="Return to sender — customer's response">
                {canPickResponse && !ticked ? (
                  <>
                    <Select
                      value={t.customer_response || "none"}
                      disabled={!!busy || choices === null}
                      onValueChange={(v) =>
                        act(
                          () =>
                            tasksApi.saveDraft(t.id, {
                              customer_response: v === "none" ? null : v,
                            }),
                          "Saved.",
                          false,
                          "response",
                          true,
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            choices === null ? "Loading…" : undefined
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not set</SelectItem>
                        {choiceOptions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-xs text-muted-foreground">
                      This is the store's list of responses. Pick the one the
                      customer gave; the system matches it exactly and holds the
                      task if it does not fit this return.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-sm">
                      {t.customer_response || "Not set"}
                    </span>
                    {canPickResponse && ticked && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Take the approval back to change the customer's response.
                      </p>
                    )}
                  </>
                )}
              </Section>
            )}

            {hasMergeHold && (
              <Section title="Possible duplicate">
                <p className="mb-2 text-xs text-muted-foreground">
                  This ticket is held as a possible duplicate. Merge the newer
                  conversation into the older one in Re:amaze (a merge cannot be
                  undone), then tick "Merge done". The system reads Re:amaze and
                  closes or clears this task itself.
                </p>
                {t.dup_sibling_link ? (
                  <a
                    href={t.dup_sibling_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline-offset-2 hover:underline"
                  >
                    open the other conversation
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The link to the other conversation is not available yet.
                    Check again in a moment.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {t.merge_confirmed ? (
                    <>
                      <Badge variant="good">Merge done</Badge>
                      {t.merge_confirmed_at && (
                        <span className="text-xs text-muted-foreground">
                          confirmed{" "}
                          {new Date(t.merge_confirmed_at).toLocaleString(
                            "en-GB",
                          )}
                        </span>
                      )}
                      {canEditDraft && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={!!busy}
                          loading={busy === "merge"}
                          onClick={() =>
                            act(
                              () =>
                                tasksApi.saveDraft(t.id, {
                                  merge_confirmed: false,
                                }),
                              "Merge done cleared.",
                              false,
                              "merge",
                              true,
                            )
                          }
                        >
                          Clear
                        </Button>
                      )}
                    </>
                  ) : (
                    canEditDraft && (
                      <Button
                        size="sm"
                        disabled={!!busy || !t.dup_sibling_link}
                        loading={busy === "merge"}
                        title={
                          !t.dup_sibling_link
                            ? "The other conversation's link is not available yet"
                            : undefined
                        }
                        onClick={() =>
                          act(
                            () =>
                              tasksApi.saveDraft(t.id, {
                                merge_confirmed: true,
                              }),
                            "Merge marked as done.",
                            false,
                            "merge",
                            true,
                          )
                        }
                      >
                        Merge done
                      </Button>
                    )
                  )}
                </div>
                {can && ticked && t.state !== "resolved" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Take the reply's approval back before changing Merge done.
                  </p>
                )}
              </Section>
            )}

            <Section title="Reply">
              {editLocked && canEditDraft && (
                <p className="mb-3 rounded-md border border-warn/40 bg-warn-soft px-3 py-2 text-xs text-warn">
                  This reply is locked: approve it as written, or unlock it
                  first to change the wording.
                </p>
              )}
              {t.proposed_body && (
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Suggested by the system
                    </span>
                    {canEditDraft && !editLocked && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setReply(t.proposed_body)}
                      >
                        Use this
                      </Button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-xs">
                    {t.proposed_body}
                  </p>
                </div>
              )}
              <div className="mb-1 text-xs text-muted-foreground">
                Reply that will be sent
              </div>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={7}
                className="text-xs"
                disabled={
                  !can || ticked || t.state === "resolved" || editLocked
                }
                placeholder={
                  can
                    ? "Write the reply, or use the suggestion above."
                    : "No reply written yet."
                }
              />
              <div className="mb-1 mt-3 text-xs text-muted-foreground">
                Internal note
              </div>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="text-xs"
                disabled={!can || ticked || t.state === "resolved"}
              />

              {can && t.state !== "resolved" && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {!ticked && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!busy}
                        onClick={() =>
                          act(
                            () =>
                              tasksApi.saveDraft(t.id, {
                                ...(editLocked
                                  ? {}
                                  : { outbound_body: reply || null }),
                                note: note || null,
                                order_number_found: order || null,
                              }),
                            "Draft saved.",
                            false,
                            "draft",
                          )
                        }
                        loading={busy === "draft"}
                      >
                        Save draft
                      </Button>
                      <Button
                        size="sm"
                        disabled={!!busy || !(reply || t.outbound_body)}
                        title={
                          !(reply || t.outbound_body)
                            ? "Write the reply first"
                            : undefined
                        }
                        onClick={() =>
                          act(
                            () =>
                              tasksApi.approve(
                                t.id,
                                draftChanged ? { outbound_body: reply } : {},
                              ),
                            "Approved. The system will send it.",
                            false,
                            "tick",
                          )
                        }
                        loading={busy === "tick"}
                      >
                        {editLocked ? "Approve as written" : "Approve to send"}
                      </Button>
                      {editLocked && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!busy}
                          loading={busy === "unlock"}
                          onClick={() =>
                            act(
                              () =>
                                tasksApi.saveDraft(t.id, { edit_unlock: true }),
                              "Unlocked — you can edit the reply now.",
                              false,
                              "unlock",
                              true,
                            )
                          }
                        >
                          Unlock to edit
                        </Button>
                      )}
                    </>
                  )}
                  {ticked && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!!busy}
                      loading={busy === "untick"}
                      onClick={() =>
                        act(
                          () => tasksApi.unapprove(t.id),
                          "Approval removed.",
                          false,
                          "untick",
                        )
                      }
                    >
                      Take the approval back
                    </Button>
                  )}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Approving hands the reply to the system, which sends it. It does
                not send it from here, and it can take the approval back (for
                example if the customer wrote again). The reason then shows
                above.
              </p>
            </Section>

            {can && t.state !== "resolved" && (
              <Section title="Close this case">
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={outcome || "none"}
                    onValueChange={(v) => setOutcome(v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="w-60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Pick an outcome…</SelectItem>
                      {outcomes.map((o) => (
                        <SelectItem key={o.outcome_key} value={o.outcome_key}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={!!busy || !outcome || ticked}
                    title={
                      ticked
                        ? "Take the approval back first"
                        : !outcome
                          ? "Pick an outcome"
                          : undefined
                    }
                    onClick={() =>
                      act(
                        () =>
                          tasksApi.setOutcome(t.id, {
                            outcome,
                            note: note || null,
                          }),
                        "Case closed.",
                        true,
                        "close",
                      )
                    }
                    loading={busy === "close"}
                  >
                    Close task
                  </Button>
                </div>
                {ticked && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    An approved task cannot be closed. Take the approval back first.
                  </p>
                )}
              </Section>
            )}

            {t.state === "resolved" && (
              <Section title="Closed">
                <KV k="Outcome">{t.outcome || "—"}</KV>
                <KV k="Closed by">{t.resolved_by || "—"}</KV>
                <KV k="Closed at">
                  {t.resolved_at
                    ? new Date(t.resolved_at).toLocaleString("en-GB")
                    : "—"}
                </KV>
              </Section>
            )}

            <Section title="Attachments">
              {files === null ? (
                <Button
                  size="xs"
                  variant="outline"
                  loading={loadingFiles}
                  onClick={() => {
                    setLoadingFiles(true);
                    tasksApi
                      .attachments(t.id)
                      .then((r) => setFiles(r.attachments))
                      .catch((err) =>
                        fail(err, "Could not load the attachments."),
                      )
                      .finally(() => setLoadingFiles(false));
                  }}
                >
                  Load attachments
                </Button>
              ) : files.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No attachments on this ticket.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {files.map((f) => (
                    <div
                      key={f.key}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="truncate">{f.file_name || "file"}</span>
                      {f.url ? (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-primary underline-offset-2 hover:underline"
                        >
                          open
                          {f.size
                            ? ` (${Math.max(1, Math.round(f.size / 1024))} KB)`
                            : ""}
                        </a>
                      ) : (
                        <span className="shrink-0 text-muted-foreground">
                          open the ticket to see it
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
