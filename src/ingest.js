import { extractFact } from "./extractor.js";
import { reconcile } from "./reconciler.js";
import {
  findActiveMemories,
  createMemory,
  supersede,
  addConflict,
} from "./store.js";

/**
 * Run a raw message through the full ingest pipeline — extractor → reconciler
 * → store — and return the outcome. Shared by the HTTP API and the benchmark
 * runner so both exercise identical logic.
 *
 * Returns:
 *   null                                      no recognizable fact
 *   { memory }                                new fact created
 *   { memory, superseded }                    correction superseded a fact
 *   { memory, conflictsWith: [ids] }          ambiguous conflict recorded
 */
export async function ingestFact(text, source = {}) {
  const fact = extractFact(text, { messageId: source.messageId, text });
  if (!fact) return null;

  const active = await findActiveMemories();
  const action = reconcile(fact, active);

  if (action.type === "create") {
    return { memory: await createMemory(fact) };
  }

  if (action.type === "supersede") {
    const { old, new: created } = await supersede(action.supersededId, fact);
    return { memory: created, superseded: old._id };
  }

  // conflict: keep the new fact active and link it to its conflicting peers.
  const created = await createMemory(fact);
  for (const id of action.conflictingIds) {
    await addConflict(created._id, id);
  }
  return { memory: created, conflictsWith: action.conflictingIds };
}
