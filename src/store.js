import mongoose from "mongoose";

const sourceSchema = new mongoose.Schema(
  {
    messageId: { type: String },
    text: { type: String },
    createdAt: { type: Date },
  },
  { _id: false }
);

const memorySchema = new mongoose.Schema(
  {
    topic: { type: String, required: true, index: true },
    subject: { type: String, required: true, index: true },
    content: { type: String, required: true },
    kind: {
      type: String,
      enum: ["statement", "correction"],
      default: "statement",
    },
    source: { type: sourceSchema },
    state: {
      type: String,
      enum: ["active", "superseded", "deleted"],
      default: "active",
      index: true,
    },
    supersedes: { type: mongoose.Schema.Types.ObjectId, ref: "Memory", default: null },
    supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: "Memory", default: null },
    conflictsWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "Memory" }],
  },
  { timestamps: true }
);

export const Memory = mongoose.model("Memory", memorySchema);

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
