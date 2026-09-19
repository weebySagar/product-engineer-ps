// Deterministic verification benchmark. Seeds the fixture into an in-memory
// MongoDB, runs every query through the *same* retrieve() the API uses, and
// compares the returned memories against the expected include/exclude lists.
//
// Exits non-zero on any mismatch so CI / a reviewer can trust a passing run.

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { readFile } from "node:fs/promises";
import { ingestFact } from "../src/ingest.js";
import { retrieve } from "../src/retriever.js";
import { findActiveMemories } from "../src/store.js";

const fixturePath = new URL("../fixtures/benchmark.json", import.meta.url);

async function main() {
  const { memories, queries } = JSON.parse(
    await readFile(fixturePath, "utf8")
  );

  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  // Ingest in order, recording the fixture id <-> stored ObjectId mapping so we
  // can translate retrieval results back to the ids the fixture names.
  const objectIdToId = new Map();
  for (const m of memories) {
    const result = await ingestFact(m.text, { messageId: m.messageId });
    if (!result) {
      console.error(`fixture memory ${m.id} ("${m.text}") produced no fact`);
      process.exit(1);
    }
    objectIdToId.set(result.memory._id.toString(), m.id);
  }

  const active = await findActiveMemories();
  let passed = 0;

  for (const q of queries) {
    const returned = retrieve(q.query, active, 5).map((r) =>
      objectIdToId.get(r.memory._id.toString())
    );

    const missing = q.include.filter((id) => !returned.includes(id));
    const unexpected = q.exclude.filter((id) => returned.includes(id));
    const ok = missing.length === 0 && unexpected.length === 0;

    if (ok) {
      passed += 1;
      console.log(`PASS  ${q.query}`);
    } else {
      console.log(`FAIL  ${q.query}`);
      if (missing.length)
        console.log(`      missing (expected include): ${missing.join(", ")}`);
      if (unexpected.length)
        console.log(`      unexpected (expected exclude): ${unexpected.join(", ")}`);
      console.log(`      returned: ${returned.join(", ") || "(none)"}`);
    }
  }

  console.log(`\n${passed}/${queries.length} passed`);

  await mongoose.disconnect();
  await mongo.stop();

  if (passed !== queries.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
