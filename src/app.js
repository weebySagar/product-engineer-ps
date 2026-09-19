import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { extractFact } from "./extractor.js";
import { reconcile } from "./reconciler.js";
import { retrieve } from "./retriever.js";
import {
  findActiveMemories,
  findMemoryById,
  findMemoryWithLinks,
  createMemory,
  supersede,
  softDelete,
  addConflict,
} from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Browser form submissions carry an Accept: text/html header; API clients don't.
function wantsHtml(req) {
  return (req.headers.accept || "").includes("text/html");
}

export function createApp() {
  const app = express();
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "..", "views"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- Demo UI (server-rendered EJS) ---
  app.get("/", async (req, res, next) => {
    try {
      const query = req.query.query;
      const memories = await findActiveMemories();
      const results = query ? retrieve(query, memories, 5) : [];
      res.render("index", { query: query || "", results, memories });
    } catch (err) {
      next(err);
    }
  });

  // --- API ---

  // Store a fact: extractor -> reconciler -> store.
  app.post("/memories", async (req, res, next) => {
    try {
      const { text, messageId } = req.body ?? {};
      if (!text) {
        return wantsHtml(req)
          ? res.redirect("/")
          : res.status(400).json({ error: "text is required" });
      }

      const fact = extractFact(text, { messageId, text });
      if (!fact) {
        return wantsHtml(req)
          ? res.redirect("/")
          : res.status(422).json({ error: "no recognizable fact in message" });
      }

      const active = await findActiveMemories();
      const action = reconcile(fact, active);

      let status = 201;
      let body;

      if (action.type === "create") {
        body = await createMemory(fact);
      } else if (action.type === "supersede") {
        const { old, new: created } = await supersede(action.supersededId, fact);
        body = { memory: created, superseded: old._id };
      } else if (action.type === "conflict") {
        const created = await createMemory(fact);
        for (const cid of action.conflictingIds) {
          await addConflict(created._id, cid);
        }
        body = { memory: created, conflictsWith: action.conflictingIds };
      } else {
        return res.status(500).json({ error: "unhandled reconcile action" });
      }

      if (wantsHtml(req)) return res.redirect("/");
      return res.status(status).json(body);
    } catch (err) {
      next(err);
    }
  });

  // Inspect a memory (HTML page) or return it as JSON.
  app.get("/memories/:id", async (req, res, next) => {
    try {
      const memory = await findMemoryWithLinks(req.params.id);
      if (!memory) return res.status(404).send("Not found");
      res.format({
        html: () => res.render("memory", { memory }),
        json: () => res.json(memory),
        default: () => res.json(memory),
      });
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
      if (!fact) {
        return wantsHtml(req)
          ? res.redirect(`/memories/${req.params.id}`)
          : res.status(422).json({ error: "no recognizable fact" });
      }

      const { old, new: created } = await supersede(req.params.id, {
        ...fact,
        kind: "correction",
      });

      if (wantsHtml(req)) return res.redirect(`/memories/${created._id}`);
      return res.status(201).json({ memory: created, superseded: old._id });
    } catch (err) {
      next(err);
    }
  });

  // Soft delete: excluded from retrieval, but history stays inspectable.
  app.post("/memories/:id/delete", async (req, res, next) => {
    try {
      const memory = await softDelete(req.params.id);
      if (!memory) return res.status(404).json({ error: "not found" });
      if (wantsHtml(req)) return res.redirect("/");
      return res.json(memory);
    } catch (err) {
      next(err);
    }
  });

  app.use((err, req, res, _next) => {
    res.status(500).json({ error: err.message });
  });

  return app;
}
