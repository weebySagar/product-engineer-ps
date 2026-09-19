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
    keywords: ["live in", "moved to", "hometown", "based in"],
    correction: ["moved to", "now live", "relocated", "moved back"],
  },
  {
    topic: "location",
    subject: "country",
    keywords: ["citizen", "nationality", "country"],
    correction: [],
  },
  {
    topic: "location",
    subject: "office",
    keywords: ["office"],
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
    keywords: ["favorite food", "favourite dish", "favorite dish", "love eating"],
    correction: ["no longer like", "now prefer"],
  },
  {
    topic: "preference",
    subject: "band",
    keywords: ["favorite band"],
    correction: [],
  },
  {
    topic: "preference",
    subject: "music",
    keywords: ["listen to", "favorite music"],
    correction: [],
  },
  {
    topic: "pet",
    subject: "pet",
    keywords: ["dog", "cat", "puppy", "kitten", "pet"],
    correction: ["no longer have", "gave away"],
  },
  {
    topic: "hobby",
    subject: "sport",
    keywords: ["football", "cricket", "tennis"],
    correction: ["stopped playing"],
  },
  {
    topic: "hobby",
    subject: "activity",
    keywords: ["hobby", "painting", "reading", "gardening"],
    correction: [],
  },
  {
    topic: "education",
    subject: "degree",
    keywords: ["degree", "graduated", "bachelor", "master"],
    correction: [],
  },
  {
    topic: "education",
    subject: "school",
    keywords: ["studied at", "college", "university"],
    correction: [],
  },
  {
    topic: "health",
    subject: "exercise",
    keywords: ["gym", "exercise", "workout", "running"],
    correction: [],
  },
  {
    topic: "health",
    subject: "diet",
    keywords: ["diet", "vegetarian", "vegan", "allergic"],
    correction: ["now vegetarian", "no longer vegetarian", "no longer allergic"],
  },
  {
    topic: "language",
    subject: "language",
    keywords: ["speak", "language"],
    correction: [],
  },
  {
    topic: "finance",
    subject: "salary",
    keywords: ["salary", "earn", "income"],
    correction: ["now earn"],
  },
  {
    topic: "travel",
    subject: "favorite-place",
    keywords: ["favorite place", "visited", "travelled"],
    correction: [],
  },
  {
    topic: "residence",
    subject: "home",
    keywords: ["home", "apartment", "house", "rent"],
    correction: ["moved house"],
  },
  {
    topic: "vehicle",
    subject: "car",
    keywords: ["car", "drive", "bike", "motorcycle"],
    correction: ["sold my car", "no longer drive"],
  },
];
