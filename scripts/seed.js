// Load the benchmark fixture into a running MongoDB so the demo UI has data.
//
// Usage: npm run seed   (requires a MongoDB at MONGO_URI, see .env.example)

import "dotenv/config";
import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import { ingestFact } from "../src/ingest.js";
import { Memory } from "../src/store.js";

const fixturePath = new URL("../fixtures/benchmark.json", import.meta.url);

async function main() {
  const { memories } = JSON.parse(await readFile(fixturePath, "utf8"));
  const uri =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/memory-engine";

  await mongoose.connect(uri);
  await Memory.deleteMany({});

  let created = 0;
  for (const m of memories) {
    const result = await ingestFact(m.text, { messageId: m.messageId });
    if (result) created += 1;
  }

  console.log(`Seeded ${created}/${memories.length} memories into ${uri}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
