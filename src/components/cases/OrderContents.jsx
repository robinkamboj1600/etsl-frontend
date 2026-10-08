import { Badge } from "@/components/ui/badge";
import { Thumb } from "@/components/common/Thumb";
import { money } from "@/lib/rules/format";
import { productUrl } from "@/lib/rules/links";

/**
 * What is on the order(s) being cancelled: the same rows as the refund
 * list, but nothing to tick — the whole order goes. Shipping and
 * insurance are shown too, since on an unshipped order they go back.
 */
export function OrderContents({ orders }) {
  const many = orders.length > 1;
  return (
    <div className="mb-3 space-y-3">
      {orders.map((f) => (
        <div key={f.id} className="rounded-lg border">
          {many && (
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs">
              <span className="font-mono font-semibold">#{f.id}</span>
              <Badge variant="secondary">{f.s.name}</Badge>
              <Badge variant="secondary">{f.o.status}</Badge>
            </div>
          )}
          <div className="divide-y">
            {f.o.items.map((it, i) => {
              const url = productUrl(f.s, it);
              return (
                <div key={`${it.n}-${i}`} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  {it.ins ? <Badge variant="good">goes back too</Badge> : <Thumb src={it.img} className="h-12 w-12 sm:h-14 sm:w-14" />}
                  <span className="min-w-0 flex-1 basis-40">
                    {url && !it.ins ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12.5px] text-primary underline-offset-2 hover:underline"
                      >
                        {it.n}
                      </a>
                    ) : (
                      <span className="text-[12.5px]">{it.n}</span>
                    )}
                    <small className="block text-xs text-muted-foreground">
                      {it.v} · {it.q}×
                    </small>
                  </span>
                  <span className="font-mono text-xs">{money(f.s, it.p * it.q)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              Paid by the customer
              {f.o.refunded > 0 ? ` · ${money(f.s, f.o.refunded)} already refunded` : ""}
            </span>
            <span className="font-mono font-semibold">{money(f.s, f.o.paid)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

