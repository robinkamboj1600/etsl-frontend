/**
 * The in-memory database the prototype runs on.
 *
 * Cases are stored as csQueueApi Tasks (v1-rev8.yaml) — see data/demo.js.
 * Everything the real backend will store lives here: the cases, the
 * sequences behind the case id and the case number, and the incoming
 * feed that stands in for the AI reading Re:amaze and Zendesk.
 *
 * Replace this file and mock/api.js with real HTTP calls and nothing
 * else in the app has to change.
 */
import { SEED_CASES, INCOMING } from "@/data/demo";

const db = {
  cases: SEED_CASES.map((c) => ({ ...c, evidence: { ...c.evidence } })),
  seq: 11,
  refSeq: 10400,
  injected: 0,
};

/**
 * Case numbers are issued once and never reused — including when a case
 * moves between queues. In production this is a database sequence, never
 * generated in the browser, or two people get the same number.
 */
export function nextRef() {
  db.refSeq += 1;
  return `ETS-${db.refSeq}`;
}

export function caseRef(c) {
  if (!c.ref) c.ref = nextRef();
  return c.ref;
}

/** Task.id is int64 per the API contract — no "c"-prefixed strings. */
export function nextId() {
  db.seq += 1;
  return db.seq;
}

/* The cases that are already there get their number in the order they
   came in. */
db.cases
  .slice()
  .reverse()
  .forEach((c) => caseRef(c));

export function allCases() {
  return db.cases;
}

export function setCases(next) {
  db.cases = next;
}

export function findCase(id) {
  return db.cases.find((c) => c.id === id) || null;
}

export function incoming() {
  return INCOMING;
}

export function injectedCount() {
  return db.injected;
}

export function bumpInjected() {
  db.injected += 1;
  return db.injected;
}

export default db;
