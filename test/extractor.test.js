import { describe, it, expect } from "vitest";
import { extractFact } from "../src/extractor.js";

describe("extractFact", () => {
  it("extracts a location statement with topic, subject, and provenance", () => {
    const fact = extractFact("I live in Pune", {
      messageId: "m1",
      text: "I live in Pune",
    });
    expect(fact).toMatchObject({
      topic: "location",
      subject: "city",
      kind: "statement",
      content: "I live in Pune",
    });
    expect(fact.source.messageId).toBe("m1");
    expect(fact.source.text).toBe("I live in Pune");
  });

  it("flags a correction signal for a moved location", () => {
    const fact = extractFact("I moved to Mumbai", { messageId: "m2" });
    expect(fact.kind).toBe("correction");
    expect(fact.topic).toBe("location");
    expect(fact.subject).toBe("city");
  });

  it("returns null for unrelated text", () => {
    expect(extractFact("The weather is nice today", {})).toBeNull();
  });

  it("extracts a job/company fact into a distinct subject", () => {
    const fact = extractFact("I work at Google", {});
    expect(fact.topic).toBe("job");
    expect(fact.subject).toBe("company");
  });

  it("is case-insensitive", () => {
    const fact = extractFact("I LIVE IN Pune", {});
    expect(fact.topic).toBe("location");
  });
});
