import { http } from "./http";

export const storesApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("status", params.status);
    q.set("page", String(params.page || 1));
    q.set("pageSize", String(params.pageSize || 25));
    return http.get(`/stores?${q.toString()}`);
  },
  sync: () => http.post("/stores/sync"),
};

/** Backend Store rows -> the short keys Stores, StorePanel and lib/rules read. */
export function toStoreView(s) {
  return {
    id: String(s.id),
    n: s.name,
    u: s.url,
    ni: s.niche || "",
    cc: s.countriesSold || [],
    sd: s.shopifyDomain || "",
    code: s.colabCode || "",
    sg: s.signatureHtml || "",
    sgf: s.signatureText || "",
    hd: s.helpdesk || "",
    mail: s.helpdeskAddress || "",
    note: s.statusNote || "",
    sup: s.supplier || "",
    prov: s.paymentProvider || "",
    rf: s.countriesSold || [],
    cog: s.costOfGoodsPct != null ? Number(s.costOfGoodsPct) : null,
  };
}
