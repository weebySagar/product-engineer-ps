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
    // A rule matches when a keyword OR a correction keyword appears. Matching
    // on correction keywords too means "I no longer like pizza" still routes
    // to the food slot even though it carries no food keyword.
    const hasKeyword = rule.keywords.some((k) => lower.includes(k));
    const hasCorrection = rule.correction.some((k) => lower.includes(k));
    if (!hasKeyword && !hasCorrection) continue;

    return {
      topic: rule.topic,
      subject: rule.subject,
      content: raw.trim(),
      kind: hasCorrection ? "correction" : "statement",
      source: {
        messageId: source.messageId,
        text: raw,
        createdAt: source.createdAt,
      },
    };
  }

  return null;
}
