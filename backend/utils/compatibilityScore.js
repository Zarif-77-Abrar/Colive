// ── Compatibility Scoring Algorithm ───────────────────────
// Compares two tenants' preferences and returns a 0-100 score.
// Higher = more compatible.

const WEIGHTS = {
  smoking:          15,
  noiseTolerance:   15,
  sleepSchedule:    12,
  cleanliness:      12,
  guestPolicy:      10,
  drinking:          8,
  genderPreference:  8,
  studyHabits:       8,
  dietaryHabit:      7,
  budgetRange:       5,
};

// Fields where adjacent values get half points
const PARTIAL_MATCHES = {
  sleepSchedule: {
    early_bird: ["flexible"],
    night_owl:  ["flexible"],
    flexible:   ["early_bird", "night_owl"],
  },
  noiseTolerance: {
    quiet:    ["moderate"],
    moderate: ["quiet", "loud"],
    loud:     ["moderate"],
  },
  cleanliness: {
    very_clean: ["moderate"],
    moderate:   ["very_clean", "relaxed"],
    relaxed:    ["moderate"],
  },
  guestPolicy: {
    no_guests:    ["occasionally"],
    occasionally: ["no_guests", "frequently"],
    frequently:   ["occasionally"],
  },
  drinking: {
    no:           ["occasionally"],
    occasionally: ["no", "yes"],
    yes:          ["occasionally"],
  },
  studyHabits: {
    home_studier: ["mixed"],
    library:      ["mixed"],
    mixed:        ["home_studier", "library"],
  },
};

// Gender preference — "any" is always compatible
const scoreGenderPreference = (a, b) => {
  if (a === "any" || b === "any") return WEIGHTS.genderPreference;
  if (a === b) return WEIGHTS.genderPreference;
  return 0;
};

// Budget range — score proportional to overlap
const scoreBudgetRange = (a, b) => {
  if (!a?.min || !a?.max || !b?.min || !b?.max) return 0;
  const overlapMin = Math.max(a.min, b.min);
  const overlapMax = Math.min(a.max, b.max);
  if (overlapMin > overlapMax) return 0;
  const overlapSize = overlapMax - overlapMin;
  const unionSize   = Math.max(a.max, b.max) - Math.min(a.min, b.min);
  const ratio       = unionSize > 0 ? overlapSize / unionSize : 0;
  return Math.round(WEIGHTS.budgetRange * ratio);
};

// Score a single field
const scoreField = (field, valA, valB) => {
  if (!valA || !valB) return 0;
  if (field === "genderPreference") return scoreGenderPreference(valA, valB);
  if (field === "budgetRange")      return scoreBudgetRange(valA, valB);
  if (valA === valB) return WEIGHTS[field];
  const partials = PARTIAL_MATCHES[field];
  if (partials && partials[valA]?.includes(valB)) {
    return Math.round(WEIGHTS[field] * 0.5);
  }
  return 0;
};

// ── Main export ────────────────────────────────────────────
export const calculateScore = (prefsA, prefsB) => {
  if (!prefsA || !prefsB) return 0;

  let earned   = 0;
  let possible = 0;

  for (const field of Object.keys(WEIGHTS)) {
    const valA = prefsA[field];
    const valB = prefsB[field];

    const bothHaveValue =
      field === "budgetRange"
        ? valA?.min && valB?.min
        : valA && valB;

    if (bothHaveValue) {
      earned   += scoreField(field, valA, valB);
      possible += WEIGHTS[field];
    }
  }

  if (possible === 0) return 0;
  return Math.round((earned / possible) * 100);
};
