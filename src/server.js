import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";

const PORT = process.env.PORT || 3000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/memory-engine";

async function main() {
  await mongoose.connect(MONGO_URI);
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Memory engine listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
