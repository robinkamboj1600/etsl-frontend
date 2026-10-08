/**
 * Demo order data. This is the only part of the data folder that is
 * not real: it exists so the screens have something to render.
 * The backend replaces all of it with the Shopify Admin API.
 */

export const FIXED = {
  AVERY5809LANE: {
    cust: "H. Whitcombe",
    cc: "UK",
    pay: "Credit Card",
    status: "Delivered",
    days: 3,
    items: [
      { n: "Gerbera Midi Dress", v: "Black / M", q: 1, p: 64.95 },
      { n: "Linen Blend Blazer", v: "Sand / L", q: 1, p: 38.42 },
      { n: "Shipping Protection", v: "Insurance", q: 1, p: 4.95, ins: true },
      { n: "Shipping", v: "Standard", q: 1, p: 5.95, ins: true },
    ],
  },
  AVERY5877LANE: {
    cust: "H. Whitcombe",
    cc: "UK",
    pay: "Credit Card",
    status: "Unfulfilled",
    days: null,
    items: [
      { n: "Gerbera Midi Dress", v: "Black / M", q: 1, p: 64.95 },
      { n: "Shipping Protection", v: "Insurance", q: 1, p: 4.95, ins: true },
      { n: "Shipping", v: "Standard", q: 1, p: 5.95, ins: true },
    ],
  },
  LOIVON2691: {
    cust: "E. Sandberg",
    cc: "SE",
    pay: "PayPal",
    status: "Delivered",
    days: 6,
    items: [
      { n: "Herrshorts Linne", v: "Beige / L", q: 1, p: 549 },
      { n: "Kortärmad Skjorta", v: "Vit / M", q: 2, p: 399 },
      { n: "Fraktskydd", v: "Insurance", q: 1, p: 59, ins: true },
      { n: "Shipping", v: "Standard", q: 1, p: 69, ins: true },
    ],
  },
  WYNN1274BOUTIQUE: {
    cust: "D. Okafor",
    cc: "US",
    pay: "PayPal",
    status: "Unfulfilled",
    days: null,
    items: [
      { n: "Ribbed Knit Cardigan", v: "Cream / S", q: 1, p: 58 },
      { n: "Shipping Protection", v: "Insurance", q: 1, p: 4.95, ins: true },
      { n: "Shipping", v: "Standard", q: 1, p: 5.95, ins: true },
    ],
  },
  BAIDUGE6301: {
    cust: "A. Castro",
    cc: "PT",
    pay: "Credit Card",
    status: "Delivered",
    days: 44,
    items: [
      { n: "Ceramic Diffuser Set", v: "Sage", q: 1, p: 42 },
      { n: "Shipping Protection", v: "Insurance", q: 1, p: 4.95, ins: true },
      { n: "Shipping", v: "Standard", q: 1, p: 5.95, ins: true },
    ],
  },
  BAIDUGE6252: {
    cust: "M. Ferreira",
    cc: "PT",
    pay: "Credit Card",
    status: "Delivered",
    days: 11,
    items: [
      { n: "Ceramic Diffuser Set", v: "Sage", q: 1, p: 42 },
      { n: "Cotton Waffle Throw", v: "Grey", q: 1, p: 29.5 },
      { n: "Shipping Protection", v: "Insurance", q: 1, p: 4.95, ins: true },
      { n: "Shipping", v: "Standard", q: 1, p: 5.95, ins: true },
    ],
  },
};
export const POOL = [
  ["Wrap Midi Dress", "Navy / M", 54.95],
  ["Quilted Jacket", "Black / L", 72.5],
  ["Knit Cardigan", "Oat / S", 44.0],
  ["Linen Trousers", "Sand / 38", 49.95],
  ["Waffle Throw", "Grey", 29.5],
  ["Ankle Boots", "Tan / 39", 68.0],
  ["Pleated Skirt", "Olive / M", 39.95],
  ["Diffuser Set", "Sage", 42.0],
];
export const NAMES = [
  "J. Persson",
  "A. Nowak",
  "K. Bergström",
  "L. Meijer",
  "R. Andersen",
  "T. Kowalski",
  "S. Haugen",
  "C. de Vries",
];
export const STATUSES = ["Unfulfilled", "Fulfilled", "In Transit", "Delivered"];
