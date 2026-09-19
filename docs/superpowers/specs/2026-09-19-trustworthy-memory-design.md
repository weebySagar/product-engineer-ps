# Trustworthy Long-Term Memory — Design Spec

**Date:** 2026-09-19
**Problem:** Caygnus Problem 4 — Trustworthy Long-Term Memory
**Stack:** Node.js + Express + MongoDB (Mongoose) + EJS

## 1. Context and goal

A persistent conversational companion becomes useful when it remembers facts over
time — and untrustworthy when it repeats outdated facts, cannot show where a memory
came from, or keeps information the user asked to forget.

This exercise builds the **memory engine**: the source-of-truth layer that stores
facts with provenance, retrieves relevant current context, and correctly handles
corrections, contradictions, and deletion. It is explicitly **not** a chat app and
**not** an LLM/embedding exercise. There is no model dependency.

Success = the six acceptance scenarios pass, retrieval is deterministic and
bounded, correction chains are inspectable, and a version-controlled fixture
benchmark reproduces the expected behavior.

## 2. Key product decision: no model, deterministic extraction

The brief permits "structured memory candidates or a deterministic extractor." We
use a **deterministic keyword map** to derive a `topic` (and a `correction` signal)
from a source message. This is honest, testable, and clearly separated so a real
LLM extractor can replace it in production without touching anything downstream.

## 3. Architecture

```
source message ──► extractor ──► reconciler ──► store (MongoDB)
                                      ▲
query ──► retriever (reads store) ────┘
```

| Module | Responsibility | Dependencies |
| --- | --- | --- |
| `extractor` | Keyword map → `{ topic, content, kind, subject }` | none (pure) |
| `reconciler` | Decide state transitions for a new candidate vs existing memories | none (pure) |
| `retriever` | Rank and return bounded relevant active memories with evidence | none (pure) |
| `store` | Mongoose models + persistence (the only Mongo touchpoint) | MongoDB |
| `server`/`routes`/`views` | Express REST API + EJS demo pages | store + pure modules |

The three core modules are **pure functions**, testable with zero database. `store`
is the only component that talks to Mongo. EJS views are a thin presentation layer
for the demo; the REST API is the real deliverable.

## 4. Data model

```js
Memory {
  _id,                       // stable identity
  topic: string,             // e.g. "location"
  subject: string,           // entity key, e.g. "user-city"; defaults to topic
  content: string,           // normalized fact, e.g. "User lives in Mumbai"
  kind: "statement" | "correction",
  source: { messageId, text, createdAt },   // provenance
  state: "active" | "superseded" | "deleted",
  supersedes: ObjectId | null,
  supersededBy: ObjectId | null,
  conflictsWith: [ObjectId],
  createdAt: Date,
  updatedAt: Date,
}
```

## 5. Extractor

A small keyword table yields both `topic` and a correction signal.

```js
const RULES = [
  {
    topic: "location",
    keywords: ["live in", "city", "based in", "hometown", "location"],
    correction: ["moved to", "no longer live", "now live", "relocated"],
  },
  // ... job, family, preferences, etc.
];
```

- `topic` = first rule whose `keywords` match.
- `kind: "correction"` if a `correction` keyword matches, else `"statement"`.
- `subject` is derived from the matched topic (or passed explicitly).
- No rule match → not a useful fact → not stored.

The extractor is deliberately naive and documented as such; it is the seam where a
model would be substituted in production.

## 6. Reconciler (state transitions)

Given a new candidate and the set of existing **active** memories:

1. **No existing active memory shares `(topic, subject)`** → store as `active`.
2. **Shared `(topic, subject)` + `kind: "correction"`** (or explicit supersede call)
   → old becomes `superseded`, new becomes `active`, linked via
   `supersedes`/`supersededBy`. (AC3)
3. **Shared `(topic, subject)` + `kind: "statement"`** (no correction signal) →
   conservative conflict: both remain `active`, linked via `conflictsWith`.
   Nothing is silently destroyed. (AC4)

Deterministic rule: correction signal → supersede; no signal → flag conflict.

## 7. Retriever

- Only `state: "active"` memories are candidates.
- Bounded `top-K`, default **K = 5**.
- Deterministic score = exact `topic` match (high weight) + token overlap between
  query and `content` (low weight).
- Each result carries `evidence: { matchedTopic, matchedTerms, score }`.
- Superseded and deleted memories are excluded by default.

## 8. Deletion

Soft delete: `state → "deleted"`. Excluded from retrieval; document and its chain
remain inspectable (preserves "history must remain understandable").

## 9. API and UI

```
POST   /memories               store a fact (extractor + reconciler)
GET    /memories/:id           inspect provenance + lifecycle + links
GET    /retrieve?query=...&k=5 bounded relevant active memories + evidence
POST   /memories/:id/supersede explicit correction
POST   /memories/:id/delete    soft delete
```

EJS views: a single page to add a fact, query for context, and correct/delete —
sufficient for the demo video, nothing more.

## 10. Testing

Pure-function tests for extractor, reconciler (supersede + conflict), and retriever
(bounded + exclusion), plus DB-backed integration tests using
`mongodb-memory-server` (no external Mongo, no paid service). The six brief-required
tests map 1:1:

1. Storage and provenance
2. Bounded relevant retrieval
3. Explicit correction and supersession
4. Exclusion of superseded facts
5. Deletion from current retrieval
6. An ambiguous / non-replacement case

## 11. Verification benchmark

Version-controlled `fixtures/benchmark.json`:
- ≥30 memories across several topics
- ≥5 correction/supersession chains
- ≥2 ambiguous potential conflicts
- ≥20 queries, each with expected `include`/`exclude` lists

`npm run benchmark` runs the fixture, compares results to expected
inclusions/exclusions, **fails** when an expected memory is missing or a
superseded/deleted memory leaks in as current, and prints per-query + overall pass
count. This is the reproducible benchmark evidence required by the scorecard.

## 12. Decisions and trade-offs

- **MongoDB over SQL/JSON:** document model maps 1:1 to versioned facts with links;
  fits the MERN role. Trade-off: reviewer needs a running Mongo (documented in setup;
  tests avoid it via mongodb-memory-server).
- **EJS over React SPA:** no build step/CORS/proxy, one `npm start`, visual demo.
  Trade-off: less "modern SPA" signal, which is acceptable because the graded work is
  the backend engine.
- **Keyword extractor over model:** deterministic, testable, no cost. Trade-off:
  naive topic detection; documented and isolated behind the extractor boundary.
- **Soft delete over hard:** preserves provenance and correction history; hard delete
  is a documented production follow-up.

## 13. Assumptions and limitations

- One fact per topic+subject is "current"; ambiguity handled conservatively.
- Extractor topic list is small and deliberately naive.
- No auth, multi-tenancy, embeddings, or vector search (out of scope per brief).
- Retrieval is keyword/topic based, not semantic.

## 14. Out of scope

Per the brief: a chat application, a live model dependency, production embeddings,
automatic extraction of every fact, image/audio/document memories, multi-user
sharing, and a polished memory-management UI.
