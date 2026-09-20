# Product Engineering Challenge Submission

## Candidate

- **Name:** Sagar Moriya
- **Email:** sagarmaurya814@gmail.com
- **GitHub:** [weebySagar](https://github.com/weebySagar/product-engineer-ps)
- **Selected problem:** Problem 4 — Trustworthy Long-Term Memory
- **Demo video:** [Paste your 3–5 minute demo video link here]

> Fill in the fields above and paste your demo video link before submitting.

## Run the project

**Prerequisites:** Node.js ≥ 18 and a local MongoDB (or an Atlas connection string). Tests and the benchmark do **not** need MongoDB — they use an in-memory MongoDB automatically.

```text
# 1. Install dependencies
npm install

# 2. Create your environment file (edit MONGO_URI if not using the default)
cp .env.example .env

# 3. Start the API + demo UI (requires MongoDB running)
npm start
```

Open http://localhost:3000 — it renders a small server-rendered UI where you can store facts, query for context, inspect a memory's source and lifecycle, supersede, and delete.

**Trigger the successful scenario:** store `I live in Pune`, then `I moved to Mumbai`, then run the query `which city does the user live in` — it returns only Mumbai.

**Trigger the failure/recovery scenario (supersession + deletion):** after the above, inspect Pune's page — it shows `Superseded by` Mumbai. Then delete Mumbai (or Pune) and confirm it disappears from retrieval.

## Run the tests

```text
npm test
```

26 tests pass across five files: `extractor`, `reconciler`, `retriever`, `store`, and the API integration suite (supertest + in-memory MongoDB). The API suite maps 1:1 to acceptance scenarios AC1–AC5 plus two HTML smoke tests.

## Acceptance scenarios and verification

All six acceptance scenarios are implemented and covered by automated tests:

- **AC1 Store with provenance** — `POST /memories` persists `topic`, `subject`, `content`, `kind`, and a `source` subdocument (`messageId`, `text`, `createdAt`). Test: `stores a fact with provenance (AC1)`.
- **AC2 Relevant retrieval** — `GET /retrieve?query=…` returns a bounded, ranked set of active memories with per-result evidence. Test: `returns only relevant active memories (AC2)`.
- **AC3 Explicit correction** — a correction supersedes the current memory, links `supersedes`/`supersededBy`, and the old fact leaves current retrieval. Tests: `auto-supersedes…` and `explicit supersede endpoint…`.
- **AC4 Uncertain contradiction** — a same-slot statement with no correction signal is kept active and linked via `conflictsWith` (conservative; nothing destroyed). Test: `flags an ambiguous conflict instead of destroying (AC4)`.
- **AC5 Deletion** — soft delete (`state: "deleted"`), excluded from retrieval but still inspectable. Test: `soft-deletes and excludes from retrieval (AC5)`.
- **AC6 Stable evaluation** — the fixture benchmark below is fully deterministic and uses no paid service.

**Verification benchmark command:**

```text
npm run benchmark
```

**Observed result:**

```text
PASS  which city does the user live in
PASS  what is the user's hometown
PASS  what is the user's nationality
PASS  what country is the user from
PASS  where is the user's office
PASS  what is the user's role
PASS  which company does the user work at
PASS  is the user married
PASS  does the user have children
PASS  what is the user's favorite food
PASS  what is the user's favorite band
PASS  what music does the user listen to
PASS  does the user have a dog
PASS  does the user play football
PASS  what is the user's hobby
PASS  what is the user's degree
PASS  which university did the user attend
PASS  does the user exercise
PASS  what language does the user speak
PASS  what is the user's salary
PASS  where has the user travelled
PASS  where does the user rent
PASS  which car does the user drive

23/23 passed
```

The fixture (`fixtures/benchmark.json`) contains 30 memories across 12 topics, 6 explicit correction/supersession chains (including one three-link chain Pune → Mumbai → Delhi), 2 ambiguous conflicts (country, music), and 23 queries each with version-controlled `include`/`exclude` lists. The runner seeds into in-memory MongoDB, runs each query through the exact `retrieve()` the API uses, and exits non-zero on any mismatch.

**Failure/recovery scenario for the video:** store `I live in Pune` → `I moved to Mumbai` → query "which city" shows only Mumbai (Pune is superseded, not current) → inspect Pune's page to see the `Superseded by` link → delete a memory and confirm it leaves retrieval. This demonstrates correction history, exclusion of outdated facts, and deletion.

## Architecture and data flow

Four pure modules behind a thin Express layer:

```
message ──▶ extractor ──▶ reconciler ──▶ store (MongoDB)
                │              │
                │ (topic, subject, kind)
                │
retrieve ◀── store ◀── query (topic+subject + token overlap)
```

- **extractor** (`src/extractor.js`, `src/rules.js`) — turns a raw message into a structured fact `{ topic, subject, content, kind, source }` via a deterministic keyword map, or returns `null` for unrelated text. `kind` is `correction` when a correction keyword matches.
- **reconciler** (`src/reconciler.js`) — a pure function deciding the lifecycle action: `create`, `supersede`, or `conflict`, matched on `(topic, subject)`.
- **model + store** (`src/models/Memory.js` + `src/store.js`) — the Mongoose `Memory` schema (with `topic`, `subject`, `content`, `kind`, `source`, `state` (`active` | `superseded` | `deleted`), and ObjectId links `supersedes` / `supersededBy` / `conflictsWith`) lives in its own model file; `store.js` is the persistence layer over it, exposing `findActiveMemories`, `createMemory`, `supersede`, `softDelete`, `addConflict`.
- **ingest** (`src/ingest.js`) — `ingestFact(text, source)` runs extract → reconcile → store. The HTTP API and the benchmark both call this, so the benchmark exercises the same code path as the server.
- **retriever** (`src/retriever.js`) — scores active memories by topic+subject match (weight 15) plus stopword-filtered token overlap, sorts, and bounds to `k` (default 5). Every result carries `evidence: { matchedTopic, matchedTerms, score }`.
- **app** (`src/app.js`) — REST endpoints + EJS views, selected by content negotiation (`Accept: text/html`).

A memory is identified by a MongoDB ObjectId; reconciliation (whether a new fact replaces or conflicts with an old one) keys on `(topic, subject)`.

## Technology choices

- **Node.js + Express + MongoDB/Mongoose** — the MERN stack is the environment I know best, and the problem is fundamentally about data modelling and lifecycle state, which maps naturally to a document store.
- **Deterministic keyword map instead of an LLM/embeddings** — the brief is explicit that this is "not a model-training or vector-database exercise" and that tests must be deterministic and free of paid services. The extractor boundary is documented as the seam where a model would go in production.
- **EJS server-rendered views instead of a React SPA** — a demo UI with zero build step and no CORS setup; content negotiation serves JSON to API clients and HTML to browsers.
- **vitest + supertest + mongodb-memory-server** — fast, deterministic tests that never touch a running database or a paid API.

## Important decisions

1. **A `subject` dimension within `topic`.** The brief's fixture needs "30 memories across several topics" but "only five correction chains" — meaning a single topic must hold several independent facts. Splitting `topic` into `(topic, subject)` (e.g. location → city / country / office) lets a correction supersede only the right prior memory instead of everything about "location". This is also what makes the follow-up case work: after Pune → Mumbai, saying "I moved back to Pune" is a city *correction* that supersedes Mumbai, leaving the full chain inspectable.

2. **Explicit corrections vs. uncertain contradictions are distinguished by a signal, not by understanding.** A `correction` keyword (e.g. "moved to", "now work at") triggers supersession of the most recent same-slot memory. A same-slot `statement` with no correction signal is treated *conservatively*: both stay active and are linked via `conflictsWith`, so history is never silently destroyed and the ambiguity is surfaced rather than resolved arbitrarily.

3. **Soft delete.** `state` is flipped to `deleted` rather than removing the row, because provenance and lifecycle must remain inspectable (the brief's "understandable history") even after the user asks to forget something. Supersession is likewise a state change, never a destructive edit.

4. **Retrieval evidence is first-class.** Every result exposes `matchedTopic`, `matchedTerms`, and `score`, so the "why this result" question (brief behaviour #7) is answerable without reading opaque prose.

## Assumptions and limitations

- No LLM or embeddings; extraction is a naive substring keyword map, so it only recognises the documented slots and can mis-route ambiguous phrasing. This is an accepted, documented simplification behind the extractor seam.
- Single-user, single-tenant; no auth or multi-tenancy (explicitly out of scope).
- "Ambiguous conflict" is defined mechanically as "two same-slot statements with no correction signal". The engine flags them as potentially conflicting rather than deciding which is true — it can over-flag two facts that are actually both true in the same slot (e.g. "I have a son" and "I have a daughter"), which is a documented trade-off of deterministic reconciliation.
- Tests and benchmark run against `mongodb-memory-server`; `npm start`/`npm run seed` require a real MongoDB at `MONGO_URI`.

## Production and scale

What I would change first (proposals, not shipped):

- Replace the keyword extractor with a model (or a classification step) that emits `{ topic, subject, content, kind }` into the same pipeline, so extraction generalises beyond the documented slots without touching reconciliation, storage, or retrieval.
- Add a per-user tenant key and index `(user, topic, subject, state)`; the current schema is single-tenant.
- Move relevance from in-memory token overlap to indexed search (e.g. an Atlas search/vector index) once the memory set is large, and add candidate pre-filtering before scoring.
- Treat sensitive/high-risk memories specially in production: flag sensitive subjects (health, finance, location) for explicit user confirmation before long-term retention, and apply retention/expiry policies and audit logging on deletion. The current prototype stores everything in the same model and keeps soft-deleted rows forever.

## AI usage

I used **Claude Code** to design the architecture, scaffold the project, and draft the modules and tests, working test-first. I reviewed every generated module and adjusted the design where the generator's first pass was wrong (e.g. making the extractor route corrections like "I no longer like pizza" to their slot, and scoping retrieval to topic+subject so "which city" doesn't also return office/country). All behaviour is verified by the automated suite and the fixture benchmark, which I ran and inspected myself.

## Credibility note

[Describe one product or system you previously helped ship: the problem it solved, your personal contribution, the scale or operational complexity involved, and one difficult engineering or product decision. Anonymize confidential details and use approximate figures. Add a public link or other evidence where available.]
