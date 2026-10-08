# Empire Trade Solutions — Backend Dashboard

React + Vite + Tailwind CSS + shadcn/ui. This is the customer service
backend for 145 active Shopify stores: one case per job, routed to the
right queue, with the business rules applied and a trail of who did what.

It runs entirely on mock data right now. Everything a real backend has to
provide sits behind one file (`src/mock/api.js`), so replacing it with
HTTP calls is the whole integration on the frontend side.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve that build
```

Node 18+. No environment variables, no backend, no database — it starts
with the mock data.

---

## What you are looking at

| Screen | What it does |
|---|---|
| Submit a case | The intake form. Picks the department, applies the rules, writes a refund straight into the queue that matches how the customer paid. |
| Cancellation / Order modification / Refund request / Replacement / Store voucher / Returned orders | The customer service queues. One table component, different columns and filters per queue. |
| Manual ticket / Spam ticket / Feedback for AI response | Ticket-only queues: a ticket and a note, no order and no money. |
| CS SOP / CS Templates | The flows the team follows and one example reply with the store's own signature. |
| Outreach / COG Refunds / CJ / DayOne | Supply chain. COG claims are opened by the dashboard itself when a refund or replacement is processed. |
| Dispute Dashboard / Dispute threat ticket | The chargeback and PayPal picture, and the queue with the evidence deadlines. |
| Overview Dashboard | Refund and chargeback rate per store. |
| Stores overview | The 145 stores as they stand in the backend pulse sheet, with return forms, helpdesk links and signatures. |
| Access | Who signs in and what each role sees. |

Switch user in the bottom left to see the dashboard as an agent, a lead,
a sheet checker, Lots (PayPal), or a supplier. In production this control
disappears: the Google account decides the role.

---

## Project layout

```
src/
  main.jsx            entry
  App.jsx             which screen is on (a router goes here)
  index.css           the design tokens, in shadcn's HSL-channel form

  data/               CONTENT, not logic — the part the backend replaces
    stores.js           the 145 stores from the backend pulse sheet
    people.js           who signs in, and their role
    departments.js      every queue: who sees it, what its action is called
    reasons.js          the reasons, and which department each routes to
    policy.js           refund window, refund ladders, evidence deadlines
    signatures.js       signature and confirmation text per language
    templates.js        supplier messages + one example customer reply
    returnForms.js      the 18 country return forms and their warehouse
    helpdesk.js         which Re:amaze brand belongs to which store
    sops.js             the CS SOP flows
    disputes.js         snapshot of the dispute monitoring sheet
    orders.js, demo.js  DEMO ONLY — orders and starting cases
    geo.js              countries, flags, which are EU

  lib/rules/          THE BUSINESS RULES — port these to the backend
    routing.js          order number → store → supplier, provider, helpdesk
    money.js            refund cap, what counts, what is already back
    permissions.js      who sees what, who may execute what
    filters.js          the filter per queue
    confirmations.js    the customer confirmation, in their own language
    links.js            Shopify / PayPal / Whop / helpdesk deep links
    signals.js          what is worth knowing before you act on a case
    format.js           money and number formatting
    session.js          who is looking

  mock/               THE SEAM
    db.js               in-memory store + the case-number sequence
    api.js              every endpoint the real backend will expose

  store/              React state (context + hooks)
  components/ui/      shadcn/ui components
  components/         layout, case panel, store panel, shared bits
  views/              one file per screen
```

---

## Replacing the mock backend

`src/mock/api.js` is the only file that talks to "the server". Each
exported function becomes one endpoint:

| Function | Becomes |
|---|---|
| `listCases()` | `GET /cases` (filtered and paged server-side) |
| `createCases(draft, session)` | `POST /cases` |
| `processCase(id, session)` | `POST /cases/:id/process` |
| `processMany(ids, session)` | `POST /cases/process` |
| `undoCase(id, session)` | `POST /cases/:id/undo` |
| `adjustCase(id, pct, reason, session)` | `POST /cases/:id/adjust` |
| `moveCase(id, dept, session)` | `POST /cases/:id/move` |
| `setCode` / `setCog` / `setTracking` / `setTurn` / `toggleNoFunds` / `claimCase` / `notSpam` / `addNote` / `setRespondedOn` / `setDisputeOutcome` | `PATCH /cases/:id` |
| `getOrder(number)` | Shopify Admin API |
| `pullNextFromHelpdesk()` | the webhook from Re:amaze / Zendesk |

Every function is already `async` and every caller already `await`s it,
so swapping in `fetch` changes this file and nothing else.

---

## The rules, and where they live

They are enforced twice on purpose: `src/lib/rules/` keeps the interface
honest (buttons disabled, warnings shown) and `src/mock/api.js` refuses
the action. **In production the API copy must move to the server** — the
browser copy is a courtesy, not a rule, because anyone can post straight
to the API.

- Never refund more than came in. Refunds, vouchers and cancellations on
  the same order are added up and checked against what was actually paid.
- Shipping and insurance only come back on a cancellation of an
  unfulfilled order. Once an order ships they are never refundable.
- No refund more than 30 days after delivery — that belongs in the
  dispute queue, which tracks the bank's own deadline.
- A cancellation or an order modification only while the order is
  unfulfilled.
- A refund percentage must be a step on that order's ladder (the ladder
  depends on the store's niche and the *customer's* country).
- PayPal refunds are executed by the PayPal account holder only — not
  even an admin may close one.
- Only a CS lead, Jane or Joris may execute a refund; sheet checkers see
  everything and process nothing.
- A supplier sees only their own stores — through the queue, through
  search, and by case id.
- One COG claim per order, opened automatically when a refund or a
  replacement is processed and the store has a supplier.
- A case number is issued once and never reused, including when a case
  moves between queues.

---

## What is real and what is sample data

- Real and worth carrying over: the stores, roles, departments, reasons,
  ladders, deadlines, signatures, templates, return forms, and the
  dispute figures (a snapshot of the monitoring sheet, 19 September).
- Sample only: `data/orders.js` and `data/demo.js` (the orders and the
  cases that are already in the queues), and `lib/metrics.js` (the
  per-store order volume on the Overview screen). Replace those three
  with Shopify and the case table and no screen has to change.

---

## Theming

The palette is defined once in `src/index.css` as HSL channels and
consumed through `tailwind.config.js`. Light is default, dark follows the
OS, and the toggle in the top bar sets `data-theme` on `<html>`.
Status colours (`good`, `warn`, `crit`) are extra tokens on top of the
shadcn set; every status also carries a word, so nothing depends on
colour alone.
