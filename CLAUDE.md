# etsl-dashboard-react — frontend guide for Claude

This is the **frontend** of the ETSL customer-service dashboard. The full project guide, the rules, the gotchas and the
current status are in the sibling repo: `../etsl-dashboard-backend/CLAUDE.md` and `../etsl-dashboard-backend/docs/HANDOFF.md`.
Read those first. The user writes Hinglish; reply to the user in Hinglish.

## Run
`npm install`, `.env` containing `VITE_API_BASE_URL=/api`, then `npx vite --host` (port 5173). The Vite dev server proxies
`/api` to the backend on `localhost:4000`, so the browser only ever talks to one origin (this also lets an ngrok tunnel to
5173 work). Check a change with `npx vite build` and delete `dist/` afterwards. There is no test runner or ESLint config.

## Layout (`src`)
- `App.jsx` — hand-rolled routing: a `view` string, `resolveView()` decides what the person may open.
- `views/` — `Intake` (Submit a case; order modification with per-option variant dropdowns, quantity and address fields),
  `QueueList` (case queues; `TaskQueue` for the Re:amaze ticket queues), `Stores`, `Access`, `Overview` and `DisputeBoard`
  (real case counts from `/cases/stats/*`; no rates until Shopify order counts exist), `SearchResults` (backend search), `Sop`, `Templates`.
- `api/` — one file per backend area (`cases`, `orders`, `quotes`, `tasks`, `stores`, `adminUsers`, `auth`) on `http.js`.
  Adapters (`toCaseView`, `toOrderView`, `toStoreView`) turn backend rows into the short-key shapes older components read.
- `components/cases/` — `RealCasePanel` (database cases), `TaskPanel` (Re:amaze tasks), `OrderContents`; `components/ui` is shadcn.
  `Button` has a `loading` prop (spinner over an invisible label — the size never changes); use it on every async action,
  never swap the label to "Saving…". `StableLabel` keeps Copy/Copied buttons the same width.
- `lib/rules/` — shared rule helpers. The amounts shown in the form come from the server (`api/quotes.js`), not from here.
- `store/app.jsx` — one React context: current view, which case/task is open (`openId` + `openReal`, `openTaskId`), filters.
  It holds no case data; every list reads the backend.
- `lib/rules/variants.js` mirrors the backend one-option rule for "Change size" / "Change color".
- **No dummy data.** `mock/`, `data/demo|orders|stores|people|helpdesk|disputes.js`, `lib/metrics.js`, `lib/rules/signals.js`,
  `lib/rules/index.js`, `lib/processMessage.js`, `components/cases/CasePanel.jsx` are dead prototype files that nothing imports;
  never import them again. Still-used `data/` files are config, not data: departments, reasons, policy, geo, returnForms,
  signatures, templates, sops.

## Conventions
- Plain JS/JSX, Tailwind, Radix/shadcn components, `sonner` toasts. Keep comments minimal.
- A frontend check is never the rule: the backend enforces permissions and money rules; the UI only hides what would be refused.
- Database case ids and old mock ids both start at 1 — always say which system an id belongs to (`openReal`, `openTaskId`).
- Counts in the sidebar and page header come from the backend; call `notifyCasesChanged()` (`lib/casesChanged.js`) after an
  action that changes them.
