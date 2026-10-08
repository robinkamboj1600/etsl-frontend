import * as React from "react";
import { Copy, Download, ExternalLink } from "lucide-react";

import { COUNTRY, flag } from "@/data/geo";
import { RETURN_FORMS, RETURN_WAREHOUSE, WAREHOUSE } from "@/data/returnForms";

import { useApp } from "@/store/app";
import {
  adminUrl,
  helpdeskUrl,
  reamazeBrand,
  returnFormUrl,
} from "@/lib/rules/links";
import { signatureFor } from "@/lib/rules/confirmations";

import { Badge } from "@/components/ui/badge";
import { StableLabel } from "@/components/ui/stable-label";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

function CopyButton({ text, label = "Copy" }) {
  const [done, setDone] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="xs"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          setDone(false);
        }
      }}
    >
      <Copy className="mr-1 h-3 w-3" />
      <StableLabel value={done ? "Copied" : label} options={[label, "Copied"]} />
    </Button>
  );
}

export function StorePanel() {
  const { openStore, setOpenStore, session } = useApp();
  const st = openStore ? openStore.st : null;
  const [lang, setLang] = React.useState(null);

  React.useEffect(() => {
    if (openStore) setLang(openStore.cc || (st && st.cc[0]) || "UK");
  }, [openStore, st]);

  /* A supplier may only open their own stores, and then without our
     Shopify admin, helpdesk and signatures. */
  const supOnly = session.org
    ? session.role === "cj"
      ? "CJ"
      : "DayOne"
    : null;
  if (!st || (supOnly && st.sup !== supOnly)) return null;

  const forms = st.rf || [];
  const known = forms.filter((c) => RETURN_FORMS[c]).length;
  const missing = forms.length - known;
  const warehouses = [
    ...new Set(forms.map((c) => RETURN_WAREHOUSE[c]).filter(Boolean)),
  ];
  const sigText = st.cc.length > 1 ? signatureFor(st, lang) : st.sgf || "—";

  return (
    <Sheet open onOpenChange={(o) => !o && setOpenStore(null)}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{st.n}</SheetTitle>
          <a
            href={`https://${st.u}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            {st.u}
          </a>
        </SheetHeader>

        <div className="flex flex-wrap gap-1.5 border-b px-5 py-3">
          {st.ni && <Badge variant="brand">{st.ni}</Badge>}
          {st.cc.map((c) => (
            <Badge key={c} variant="secondary">
              {flag(c)} {c}
            </Badge>
          ))}
          {!supOnly && <Badge variant="secondary">{st.hd}</Badge>}
          {!supOnly && st.note && <Badge variant="warn">{st.note}</Badge>}
        </div>

        {st.cc.length > 1 && (
          <div className="border-b bg-warn-soft px-5 py-2.5 text-[13px] text-warn">
            This store sells to {st.cc.length} countries. Write the reply in the
            language of the customer's country, not the store's own.
          </div>
        )}

        <Section title="Store">
          {!supOnly && <KV k="Colab code">{st.code || "—"}</KV>}
          <KV k="Supplier">{st.sup || "—"}</KV>
          {!supOnly && <KV k="Provider">{st.prov || "—"}</KV>}
          {!supOnly && (
            <KV k="Cost of goods">{st.cog != null ? `${st.cog}%` : "—"}</KV>
          )}
          <KV k="Sells to">
            {st.cc.map((c) => `${flag(c)} ${c}`).join("  ") || "—"}
          </KV>
          {!supOnly && (
            <KV k="Helpdesk">
              {helpdeskUrl(st) ? (
                <a
                  href={helpdeskUrl(st)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {st.hd}
                </a>
              ) : (
                st.hd || "—"
              )}
            </KV>
          )}
          {!supOnly && st.mail && (
            <KV k="Re:amaze mailbox">
              <span className="flex flex-wrap items-center justify-end gap-2">
                {st.mail}
                <CopyButton text={st.mail} />
                {reamazeBrand(st) &&
                  String(st.hd || "").indexOf("Re:amaze") < 0 && (
                    <a
                      href={`https://${reamazeBrand(st)}.reamaze.com/admin`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      open in Re:amaze{" "}
                      <ExternalLink className="inline h-3 w-3" />
                    </a>
                  )}
              </span>
            </KV>
          )}
          {!supOnly && (
            <KV k="Shopify admin">
              {st.sd ? (
                <a
                  href={adminUrl(st.sd)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                >
                  {st.sd}
                </a>
              ) : (
                "—"
              )}
            </KV>
          )}
        </Section>

        <Section title="Return forms">
          {forms.length ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {forms.map((cc) => {
                  const has = !!RETURN_FORMS[cc];
                  const wh = WAREHOUSE[RETURN_WAREHOUSE[cc]];
                  return has ? (
                    <a
                      key={cc}
                      href={returnFormUrl(cc)}
                      download={`Return form ${COUNTRY[cc] || cc}.pdf`}
                      title={`Download the form · returns go to the ${wh ? wh.n : "warehouse"}`}
                      className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs hover:bg-accent"
                    >
                      {flag(cc)} {COUNTRY[cc] || cc}{" "}
                      <Download className="h-3 w-3" />
                    </a>
                  ) : (
                    <a
                      key={cc}
                      href={returnFormUrl(cc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="No form for this country yet — opens the shared folder"
                      className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
                    >
                      {flag(cc)} {COUNTRY[cc] || cc}
                    </a>
                  );
                })}
              </div>
              <div className="mt-3">
                {warehouses.map((w) => (
                  <KV key={w} k={WAREHOUSE[w].n}>
                    {WAREHOUSE[w].a}
                  </KV>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                One form per country, {forms.length} in total.{" "}
                {known === 0
                  ? "None are on file yet — these open the shared Drive folder."
                  : missing === 0
                    ? "Click a country to download that form."
                    : `${known} download${known === 1 ? "" : "s"} straight away, ${missing} still open the shared Drive folder.`}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              No return forms listed for this store in the backend sheet.
            </p>
          )}
        </Section>

        {!supOnly && (
          <Section title="Signature">
            {st.cc.length > 1 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {st.cc.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={lang === c}
                      onClick={() => setLang(c)}
                      className={
                        lang === c
                          ? "rounded-full border border-primary bg-primary px-3 py-1 text-xs text-primary-foreground"
                          : "rounded-full border px-3 py-1 text-xs hover:bg-accent"
                      }
                    >
                      {flag(c)} {COUNTRY[c] || c}
                    </button>
                    <CopyButton text={signatureFor(st, c)} />
                  </span>
                ))}
              </div>
            )}
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/50 px-3 py-2.5 font-sans text-[12.5px] leading-relaxed">
              {sigText}
            </pre>
            <div className="mt-2">
              <CopyButton text={sigText} label="Copy signature" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {st.cc.length > 1
                ? "Pick the country the customer is in. The name stays the same, the greeting and the team line follow that language."
                : "Copied exactly as it stands in the onboarding sheet, line breaks and all."}
            </p>
          </Section>
        )}
      </SheetContent>
    </Sheet>
  );
}
