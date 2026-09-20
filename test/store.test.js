import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Memory } from "../src/models/Memory.js";
import {
  createMemory,
  findActiveMemories,
  supersede,
  softDelete,
} from "../src/store.js";

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Memory.deleteMany({});
});

describe("store", () => {
  it("createMemory persists a memory with provenance and active state", async () => {
    const doc = await createMemory({
      topic: "location",
      subject: "city",
      content: "I live in Pune",
      kind: "statement",
      source: { messageId: "m1", text: "I live in Pune" },
    });

    expect(doc.state).toBe("active");
    expect(doc.topic).toBe("location");
    expect(doc.source.messageId).toBe("m1");

    const active = await findActiveMemories();
    expect(active).toHaveLength(1);
  });

  it("supersede links old and new memories in both directions", async () => {
    const old = await createMemory({
      topic: "location",
      subject: "city",
      content: "I live in Pune",
      kind: "statement",
    });

    const { old: updatedOld, new: created } = await supersede(old._id, {
      topic: "location",
      subject: "city",
      content: "I moved to Mumbai",
      kind: "correction",
    });

    expect(updatedOld.state).toBe("superseded");
    expect(updatedOld.supersededBy.toString()).toBe(created._id.toString());
    expect(created.supersedes.toString()).toBe(old._id.toString());
    expect(created.state).toBe("active");
  });

  it("softDelete flips state to deleted and excludes from active", async () => {
    const doc = await createMemory({
      topic: "pet",
      subject: "pet",
      content: "I have a dog",
      kind: "statement",
    });

    const updated = await softDelete(doc._id);
    expect(updated.state).toBe("deleted");

    const active = await findActiveMemories();
    expect(active).toHaveLength(0);
  });
});
