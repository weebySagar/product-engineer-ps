import { describe, it, expect } from "vitest";
import { reconcile } from "../src/reconciler.js";

const candidate = (topic, subject, kind) => ({
  topic,
  subject,
  content: "x",
  kind,
});

describe("reconcile", () => {
  it("creates when no active memory shares topic+subject", () => {
    const result = reconcile(candidate("location", "city", "statement"), []);
    expect(result.type).toBe("create");
  });

  it("supersedes when a correction matches topic+subject", () => {
    const existing = [
      { _id: "m1", topic: "location", subject: "city", createdAt: "2026-01-01" },
    ];
    const result = reconcile(candidate("location", "city", "correction"), existing);
    expect(result.type).toBe("supersede");
    expect(result.supersededId).toBe("m1");
  });

  it("flags a conflict when a statement matches topic+subject without correction", () => {
    const existing = [{ _id: "m1", topic: "location", subject: "city" }];
    const result = reconcile(candidate("location", "city", "statement"), existing);
    expect(result.type).toBe("conflict");
    expect(result.conflictingIds).toEqual(["m1"]);
  });

  it("does not match across different subjects", () => {
    const existing = [{ _id: "m1", topic: "location", subject: "country" }];
    const result = reconcile(candidate("location", "city", "statement"), existing);
    expect(result.type).toBe("create");
  });

  it("supersedes the most recent of multiple matching active memories", () => {
    const existing = [
      { _id: "m1", topic: "location", subject: "city", createdAt: "2026-01-01" },
      { _id: "m2", topic: "location", subject: "city", createdAt: "2026-02-01" },
    ];
    const result = reconcile(candidate("location", "city", "correction"), existing);
    expect(result.supersededId).toBe("m2");
  });
});
