import { Memory } from "./models/Memory.js";

// Persistence layer. The Mongoose schema/model lives in models/Memory.js so the
// domain shape and the persistence helpers stay separate concerns.

export async function findActiveMemories() {
  return Memory.find({ state: "active" }).lean();
}

export async function findMemoryById(id) {
  return Memory.findById(id);
}

// A memory with its supersession/conflict links populated for inspection.
export async function findMemoryWithLinks(id) {
  return Memory.findById(id)
    .populate("supersedes")
    .populate("supersededBy")
    .populate("conflictsWith");
}

export async function createMemory(fields) {
  return Memory.create(fields);
}

// Explicit correction: old becomes superseded, new becomes active, linked both ways.
export async function supersede(oldId, newFields) {
  const created = await Memory.create({ ...newFields, supersedes: oldId });
  const old = await Memory.findByIdAndUpdate(
    oldId,
    { state: "superseded", supersededBy: created._id },
    { new: true }
  );
  return { old, new: created };
}

export async function softDelete(id) {
  return Memory.findByIdAndUpdate(id, { state: "deleted" }, { new: true });
}

// Link two active memories as conflicting (both carry each other's id).
export async function addConflict(aId, bId) {
  await Memory.findByIdAndUpdate(aId, { $addToSet: { conflictsWith: bId } });
  await Memory.findByIdAndUpdate(bId, { $addToSet: { conflictsWith: aId } });
}
