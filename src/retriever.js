import { extractFact } from "./extractor.js";

const STOPWORDS = new Set([
  "the", "a", "an", "in", "on", "at", "to", "for", "of", "and", "or",
  "is", "are", "was", "were", "does", "do", "did", "what", "where",
  "which", "who", "how", "when", "why", "user", "they", "their", "he",
  "she", "i", "you", "we", "have", "has", "had", "not", "no", "yes",
  "that", "this", "it", "with", "from", "about",
]);

function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Return a bounded list of relevant active memories for a query, each with
 * selection evidence. Superseded and deleted memories are always excluded.
 *
 * Score = topic match (dominant) + token overlap between query and content.
 */
export function retrieve(query, memories, k = 5) {
  const queryFact = extractFact(query);
  const queryTopic = queryFact ? queryFact.topic : null;
  const querySubject = queryFact ? queryFact.subject : null;
  const queryTokens = new Set(tokenize(query));

  const results = [];

  for (const memory of memories) {
    if (memory.state && memory.state !== "active") continue;

    let topicScore = 0;
    if (queryTopic && memory.topic === queryTopic) {
      topicScore = 10;
      if (querySubject && memory.subject === querySubject) topicScore += 5;
    }

    const matchedTerms = tokenize(memory.content).filter((t) =>
      queryTokens.has(t)
    );
    const score = topicScore + matchedTerms.length;

    if (score > 0) {
      results.push({
        memory,
        evidence: {
          matchedTopic: topicScore > 0,
          matchedTerms: [...new Set(matchedTerms)],
          score,
        },
      });
    }
  }

  results.sort((a, b) => b.evidence.score - a.evidence.score);
  return results.slice(0, k);
}
