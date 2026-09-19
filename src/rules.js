// Deterministic keyword map used by the extractor.
//
// Each rule maps a spoken pattern to a `(topic, subject)` slot. The `subject`
// distinguishes multiple facts within the same topic (e.g. location can be a
// city, country, or office), which is what lets the reconciler supersede only
// the *right* prior memory. `correction` keywords mark a statement as a
// correction of a previous fact rather than a brand-new statement.
//
// This is deliberately naive and isolated behind the extractor boundary: in
// production this is the seam where a model would emit `{ topic, subject,
// content, kind }` instead.

export const RULES = [
  {
    topic: "location",
    subject: "city",
    keywords: ["live in", "city", "hometown", "moved to", "based in"],
    correction: ["moved to", "now live", "relocated", "moved back"],
  },
  {
    topic: "location",
    subject: "country",
    keywords: ["country", "citizen", "nationality", "from india", "from the us"],
    correction: [],
  },
  {
    topic: "location",
    subject: "office",
    keywords: ["office", "work in"],
    correction: ["moved office"],
  },
  {
    topic: "job",
    subject: "role",
    keywords: ["work as", "role", "developer", "engineer", "designer", "manager"],
    correction: ["now work as", "changed role"],
  },
  {
    topic: "job",
    subject: "company",
    keywords: ["work at", "company", "employer"],
    correction: ["now work at", "changed company"],
  },
  {
    topic: "family",
    subject: "status",
    keywords: ["married", "wife", "husband", "spouse"],
    correction: ["divorced", "separated"],
  },
  {
    topic: "family",
    subject: "children",
    keywords: ["son", "daughter", "kid", "children", "child"],
    correction: [],
  },
  {
    topic: "preference",
    subject: "food",
    keywords: ["favorite food", "favourite dish", "love eating"],
    correction: ["no longer like"],
  },
  {
    topic: "preference",
    subject: "music",
    keywords: ["favorite band", "favorite music", "listen to"],
    correction: [],
  },
  {
    topic: "pet",
    subject: "pet",
    keywords: ["dog", "cat", "puppy", "kitten", "pet"],
    correction: ["no longer have", "gave away"],
  },
];
