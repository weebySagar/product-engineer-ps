import { RULES } from "./rules.js";

/**
 * Turn a source message into a structured memory candidate, or return null
 * when the message contains no useful fact.
 *
 * Returns: { topic, subject, content, kind, source } | null
 *   - kind is "correction" when a correction keyword matches, else "statement".
 *   - source carries provenance back to the originating message.
 */
export function extractFact(text, source = {}) {
  const raw = String(text ?? "");
  const lower = raw.toLowerCase();

  for (const rule of RULES) {
    const matched = rule.keywords.some((k) => lower.includes(k));
    if (!matched) continue;

    const isCorrection = rule.correction.some((k) => lower.includes(k));
    return {
      topic: rule.topic,
      subject: rule.subject,
      content: raw.trim(),
      kind: isCorrection ? "correction" : "statement",
      source: {
        messageId: source.messageId,
        text: raw,
        createdAt: source.createdAt,
      },
    };
  }

  return null;
}
