/**
 * Decide what should happen when a new memory candidate arrives, given the
 * currently active memories. Pure function — no database access.
 *
 * Returns one of:
 *   { type: "create",    memory }                          no conflict
 *   { type: "supersede", memory, supersededId }            clear correction
 *   { type: "conflict",  memory, conflictingIds: [id] }    ambiguous
 */
export function reconcile(candidate, activeMemories) {
  const matching = activeMemories.filter(
    (m) => m.topic === candidate.topic && m.subject === candidate.subject
  );

  if (matching.length === 0) {
    return { type: "create", memory: candidate };
  }

  if (candidate.kind === "correction") {
    // A correction replaces the most recent matching active memory.
    const supersededId = mostRecent(matching)._id;
    return { type: "supersede", memory: candidate, supersededId };
  }

  // Same slot, no correction signal: conservative — keep both, flag conflict.
  return {
    type: "conflict",
    memory: candidate,
    conflictingIds: matching.map((m) => m._id),
  };
}

function mostRecent(memories) {
  return [...memories].sort(
    (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)
  )[0];
}
