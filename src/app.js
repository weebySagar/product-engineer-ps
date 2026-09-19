import express from "express";
import { extractFact } from "./extractor.js";
import { reconcile } from "./reconciler.js";
import { retrieve } from "./retriever.js";
import {
  findActiveMemories,
  findMemoryById,
  createMemory,
  supersede,
  softDelete,
  addConflict,
} from "./store.js";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Store a fact: extractor -> reconciler -> store.
  app.post("/memories", async (req, res, next) => {
    try {
      const { text, messageId } = req.body ?? {};
      if (!text) return res.status(400).json({ error: "text is required" });

      const fact = extractFact(text, { messageId, text });
      if (!fact) {
        return res.status(422).json({ error: "no recognizable fact in message" });
      }

      const active = await findActiveMemories();
      const action = reconcile(fact, active);

      if (action.type === "create") {
        const memory = await createMemory(fact);
        return res.status(201).json(memory);
      }
      if (action.type === "supersede") {
        const { old, new: created } = await supersede(action.supersededId, fact);
        return res.status(201).json({ memory: created, superseded: old._id });
      }
      if (action.type === "conflict") {
        const created = await createMemory(fact);
        for (const cid of action.conflictingIds) {
          await addConflict(created._id, cid);
        }
        return res
          .status(201)
          .json({ memory: created, conflictsWith: action.conflictingIds });
      }
      return res.status(500).json({ error: "unhandled reconcile action" });
    } catch (err) {
      next(err);
    }
  });

  // Inspect a single memory's provenance and lifecycle.
  app.get("/memories/:id", async (req, res, next) => {
    try {
      const memory = await findMemoryById(req.params.id);
      if (!memory) return res.status(404).json({ error: "not found" });
      res.json(memory);
    } catch (err) {
      next(err);
    }
  });

  // Retrieve bounded relevant active memories for a query.
  app.get("/retrieve", async (req, res, next) => {
    try {
      const query = req.query.query;
      const k = Number.parseInt(req.query.k, 10) || 5;
      const memories = await findActiveMemories();
      const results = retrieve(query, memories, k);
      res.json({ results });
    } catch (err) {
      next(err);
    }
  });

  // Explicit correction: replace a named memory with new content.
  app.post("/memories/:id/supersede", async (req, res, next) => {
    try {
      const { text, messageId } = req.body ?? {};
      const existing = await findMemoryById(req.params.id);
      if (!existing) return res.status(404).json({ error: "not found" });

      const fact = extractFact(text, { messageId, text });
      if (!fact) return res.status(422).json({ error: "no recognizable fact" });

      const { old, new: created } = await supersede(req.params.id, {
        ...fact,
        kind: "correction",
      });
      res.status(201).json({ memory: created, superseded: old._id });
    } catch (err) {
      next(err);
    }
  });

  // Soft delete: excluded from retrieval, but history stays inspectable.
  app.post("/memories/:id/delete", async (req, res, next) => {
    try {
      const memory = await softDelete(req.params.id);
      if (!memory) return res.status(404).json({ error: "not found" });
      res.json(memory);
    } catch (err) {
      next(err);
    }
  });

  app.use((err, req, res, _next) => {
    res.status(500).json({ error: err.message });
  });

  return app;
}
