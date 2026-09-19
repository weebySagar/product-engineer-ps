import { describe, it, expect } from "vitest";
import { retrieve } from "../src/retriever.js";

const memories = [
  { _id: "m1", topic: "location", subject: "city", content: "I live in Mumbai", state: "active" },
  { _id: "m2", topic: "location", subject: "city", content: "I live in Pune", state: "superseded" },
  { _id: "m3", topic: "job", subject: "company", content: "I work at Google", state: "active" },
  { _id: "m4", topic: "pet", subject: "pet", content: "I have a dog", state: "deleted" },
];

describe("retrieve", () => {
  it("returns only active memories relevant to the query", () => {
    const results = retrieve("which city does the user live in", memories);
    expect(results.map((r) => r.memory._id)).toEqual(["m1"]);
  });

  it("excludes superseded and deleted memories", () => {
    const results = retrieve("which city does the user live in", memories);
    const ids = results.map((r) => r.memory._id);
    expect(ids).not.toContain("m2");
    expect(ids).not.toContain("m4");
  });

  it("is bounded by k", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      _id: `x${i}`,
      topic: "location",
      subject: "city",
      content: "I live in Mumbai",
      state: "active",
    }));
    const results = retrieve("which city does the user live in", many, 3);
    expect(results).toHaveLength(3);
  });

  it("ranks topic matches above token-only overlap", () => {
    const mixed = [
      { _id: "topic", topic: "job", subject: "company", content: "I work at Google", state: "active" },
      { _id: "token", topic: "preference", subject: "food", content: "work food Google", state: "active" },
    ];
    const results = retrieve("which company does the user work at", mixed);
    expect(results[0].memory._id).toBe("topic");
    expect(results[0].evidence.matchedTopic).toBe(true);
  });

  it("carries selection evidence", () => {
    const results = retrieve("which city does the user live in", memories);
    expect(results[0].evidence).toMatchObject({
      matchedTopic: true,
      score: expect.any(Number),
    });
  });
});
