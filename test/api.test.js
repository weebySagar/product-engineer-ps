import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { Memory } from "../src/store.js";

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Memory.deleteMany({});
});

describe("memory API", () => {
  it("stores a fact with provenance (AC1)", async () => {
    const res = await request(app)
      .post("/memories")
      .send({ text: "I live in Pune", messageId: "m1" });

    expect(res.status).toBe(201);
    expect(res.body.topic).toBe("location");
    expect(res.body.state).toBe("active");
    expect(res.body.source.messageId).toBe("m1");
  });

  it("auto-supersedes on a correction and excludes the old fact (AC3)", async () => {
    const first = await request(app)
      .post("/memories")
      .send({ text: "I live in Pune" });

    const res = await request(app)
      .post("/memories")
      .send({ text: "I moved to Mumbai" });

    expect(res.status).toBe(201);
    expect(res.body.superseded).toBe(first.body._id);

    const r = await request(app)
      .get("/retrieve")
      .query({ query: "which city does the user live in" });
    const contents = r.body.results.map((x) => x.memory.content);
    expect(contents).toContain("I moved to Mumbai");
    expect(contents).not.toContain("I live in Pune");
  });

  it("returns only relevant active memories (AC2)", async () => {
    await request(app).post("/memories").send({ text: "I work at Google" });
    await request(app).post("/memories").send({ text: "I have a dog" });

    const r = await request(app)
      .get("/retrieve")
      .query({ query: "which company does the user work at" });

    const topics = r.body.results.map((x) => x.memory.topic);
    expect(topics).toEqual(["job"]);
  });

  it("soft-deletes and excludes from retrieval (AC5)", async () => {
    const created = await request(app)
      .post("/memories")
      .send({ text: "I have a dog" });

    await request(app).post(`/memories/${created.body._id}/delete`);

    const r = await request(app).get("/retrieve").query({ query: "pet" });
    expect(r.body.results).toHaveLength(0);
  });

  it("flags an ambiguous conflict instead of destroying (AC4)", async () => {
    const a = await request(app)
      .post("/memories")
      .send({ text: "I live in Pune" });
    const b = await request(app)
      .post("/memories")
      .send({ text: "I live in Mumbai" });

    expect(b.body.conflictsWith).toContain(a.body._id);

    const active = await Memory.find({
      state: "active",
      topic: "location",
      subject: "city",
    });
    expect(active).toHaveLength(2);
  });

  it("explicit supersede endpoint replaces a named memory (AC3)", async () => {
    const first = await request(app)
      .post("/memories")
      .send({ text: "I live in Pune" });

    const res = await request(app)
      .post(`/memories/${first.body._id}/supersede`)
      .send({ text: "I moved to Mumbai" });

    expect(res.status).toBe(201);

    const old = await Memory.findById(first.body._id);
    expect(old.state).toBe("superseded");
    expect(old.supersededBy.toString()).toBe(res.body.memory._id);
  });
});
