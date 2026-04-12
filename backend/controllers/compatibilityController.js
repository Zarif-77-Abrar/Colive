import Room from "../models/Room.js";
import User from "../models/User.js";
import { calculateScore } from "../utils/compatibilityScore.js";

// ── GET /api/compatibility/:roomId ─────────────────────────
// Returns compatibility scores between the requesting tenant
// Also returns the average score across all flatmates.

export const getRoomCompatibility = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate("propertyId", "title city address rentRange amenities images")
      .populate({
        path:   "currentTenants",
        select: "name gender university preferences",
      });

    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    // Get the requesting tenant's full preferences
    const requestingTenant = await User.findById(req.user.id)
      .select("preferences gender");

    if (!requestingTenant) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!requestingTenant.preferences?.sleepSchedule) {
      return res.status(400).json({
        message: "Please complete your lifestyle preferences before checking compatibility.",
      });
    }

    // No flatmates yet — room is empty
    if (room.currentTenants.length === 0) {
      return res.status(200).json({
        roomId:           room._id,
        averageScore:     null,
        flatmateCount:    0,
        flatmates:        [],
        message:          "No current flatmates. You would be the first tenant in this room.",
      });
    }

    // Calculate score against each flatmate
    const flatmates = room.currentTenants.map((flatmate) => {
      const score = calculateScore(
        requestingTenant.preferences,
        flatmate.preferences
      );

      return {
        id:         flatmate._id,
        name:       flatmate.name,
        gender:     flatmate.gender     ?? null,
        university: flatmate.university ?? null,
        score,
        breakdown:  getBreakdown(requestingTenant.preferences, flatmate.preferences),
      };
    });

    // Average score across all flatmates
    const averageScore = Math.round(
      flatmates.reduce((sum, f) => sum + f.score, 0) / flatmates.length
    );

    return res.status(200).json({
      roomId:        room._id,
      averageScore,
      flatmateCount: flatmates.length,
      flatmates,
    });

  } catch (err) {
    console.error("getRoomCompatibility error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── Breakdown helper ───────────────────────────────────────
// Returns a per-field breakdown so the UI can show
// which areas match and which don't.
const FIELD_LABELS = {
  smoking:          "Smoking",
  noiseTolerance:   "Noise tolerance",
  sleepSchedule:    "Sleep schedule",
  cleanliness:      "Cleanliness",
  guestPolicy:      "Guest policy",
  drinking:         "Drinking",
  genderPreference: "Gender preference",
  studyHabits:      "Study habits",
  dietaryHabit:     "Dietary habit",
  budgetRange:      "Budget range",
};

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

const getBreakdown = (prefsA, prefsB) => {
  return Object.keys(FIELD_LABELS).map((field) => {
    const valA = prefsA?.[field];
    const valB = prefsB?.[field];

    let match = "missing";
    if (valA && valB) {
      if (field === "budgetRange") {
        const overlapMin = Math.max(valA.min, valB.min);
        const overlapMax = Math.min(valA.max, valB.max);
        match = overlapMin <= overlapMax ? "full" : "none";
      } else if (valA === valB) {
        match = "full";
      } else {
        // Check partial
        const PARTIAL_MATCHES = {
          sleepSchedule:  { early_bird: ["flexible"], night_owl: ["flexible"], flexible: ["early_bird","night_owl"] },
          noiseTolerance: { quiet: ["moderate"], moderate: ["quiet","loud"], loud: ["moderate"] },
          cleanliness:    { very_clean: ["moderate"], moderate: ["very_clean","relaxed"], relaxed: ["moderate"] },
          guestPolicy:    { no_guests: ["occasionally"], occasionally: ["no_guests","frequently"], frequently: ["occasionally"] },
          drinking:       { no: ["occasionally"], occasionally: ["no","yes"], yes: ["occasionally"] },
          studyHabits:    { home_studier: ["mixed"], library: ["mixed"], mixed: ["home_studier","library"] },
        };
        match = PARTIAL_MATCHES[field]?.[valA]?.includes(valB) ? "partial" : "none";
      }
    }

    return {
      field,
      label:  FIELD_LABELS[field],
      weight: WEIGHTS[field],
      yourValue:     formatValue(field, valA),
      flatmateValue: formatValue(field, valB),
      match,
    };
  });
};

const formatValue = (field, val) => {
  if (!val) return null;
  if (field === "budgetRange") return `BDT ${val.min?.toLocaleString()} – ${val.max?.toLocaleString()}`;
  return val.replace(/_/g, " ");
};
