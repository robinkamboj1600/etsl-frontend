import * as React from "react";
import { Copy } from "lucide-react";

import { storesApi, toStoreView } from "@/api/stores";
import { COUNTRY } from "@/data/geo";
import { TEMPLATE } from "@/data/templates";
import { CONFIRM, LANG_OF } from "@/data/signatures";
import { signatureFor } from "@/lib/rules/confirmations";

import { Badge } from "@/components/ui/badge";
import { StableLabel } from "@/components/ui/stable-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * One example, so you can see how it works: pick the store and the
 * customer's country and the signature underneath follows.
 */
export function Templates() {
  const [active, setActive] = React.useState([]);
  React.useEffect(() => {
    let alive = true;
    storesApi
      .list({ status: "active", pageSize: 200 })
      .then((res) => alive && setActive(res.rows.map(toStoreView)))
      .catch(() => alive && setActive([]));
    return () => {
      alive = false;
    };
  }, []);
  const [storeName, setStoreName] = React.useState("");
  const [cc, setCc] = React.useState("");

  const st = active.filter((x) => x.n === storeName)[0] || null;
  const country = st ? (st.cc.indexOf(cc) > -1 ? cc : st.cc[0] || "UK") : "";

  const L = (st && CONFIRM[LANG_OF[country] || "en"]) || CONFIRM.en;
  const body = `${L.hi}\n\n${TEMPLATE.b}${st ? `\n\n${signatureFor(st, country)}` : ""}`;

  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={storeName || "none"}
          onValueChange={(v) => {
            setStoreName(v === "none" ? "" : v);
            setCc("");
          }}
        >
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No signature</SelectItem>
            {active.map((x) => (
              <SelectItem key={x.n} value={x.n}>
                {x.n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {st && st.cc.length > 1 && (
          <Select value={country} onValueChange={setCc}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {st.cc.map((c) => (
                <SelectItem key={c} value={c}>
                  {COUNTRY[c] || c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <span className="text-xs text-muted-foreground">
          {st && st.cc.length > 1
            ? "Pick the store and the customer's country — the copy button adds that signature underneath."
            : "Pick a store and the copy button adds its signature underneath."}
        </span>
      </div>

      <div>
        <p className="mb-2 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {TEMPLATE.g}
        </p>
        <Card className="max-w-2xl">
          <CardContent className="p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <b className="text-sm">{TEMPLATE.t}</b>
              <Badge variant="warn">example</Badge>
              <Button size="xs" className="ml-auto" onClick={copy}>
                <Copy className="mr-1 h-3 w-3" />
                <StableLabel value={copied ? "Copied" : "Copy"} options={["Copy", "Copied"]} />
              </Button>
            </div>
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/50 px-3 py-2.5 font-sans text-[12.5px] leading-relaxed">
              {body}
            </pre>
          </CardContent>
        </Card>
      </div>

      <p className="max-w-2xl text-xs text-muted-foreground">
        The words between braces are placeholders: fill in the customer name,
        the order number and the tracking link before you send. This is one
        example so you can see how it works — the real texts take its place.
      </p>
    </div>
  );
}
