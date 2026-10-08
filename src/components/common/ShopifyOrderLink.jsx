import * as React from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { ordersApi } from "@/api/orders";
import { HttpError } from "@/api/http";
import { useApp } from "@/store/app";
import { cn } from "@/lib/utils";

/**
 * An order number that opens the order's own page in the Shopify admin, in a
 * new tab. The link is worked out on the server when it is clicked. Suppliers
 * and the PayPal login see the plain order number, never a Shopify link.
 */
export function ShopifyOrderLink({ order, children, iconOnly = false, className }) {
  const { session } = useApp();
  const [busy, setBusy] = React.useState(false);
  const shown = children ?? `#${order}`;
  if (!order || session.org || session.role === "paypal") return iconOnly ? null : <>{shown}</>;

  const open = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    /* The tab is opened straight away (while the click still counts) and pointed at the order afterwards. */
    const tab = window.open("about:blank", "_blank");
    try {
      const { url } = await ordersApi.adminLink(order);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (tab) tab.close();
      toast.error(err instanceof HttpError ? err.detail || err.code : "Could not open the order in Shopify.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <a
      href="#"
      onClick={open}
      title="Open this order in Shopify"
      aria-label={`Open order ${order} in Shopify`}
      className={cn("inline-flex items-center text-primary underline-offset-2 hover:underline", busy && "opacity-60", className)}
    >
      {!iconOnly && shown}
      <ExternalLink className={cn("h-3 w-3", !iconOnly && "ml-1")} />
    </a>
  );
}
