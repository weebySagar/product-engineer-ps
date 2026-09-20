import mongoose from "mongoose";

// Source provenance — links a memory back to the originating message or fixture.
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
