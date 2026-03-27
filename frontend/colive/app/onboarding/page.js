"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, saveUser, userAPI } from "../../lib/api";

const STEPS = [
  { key: "lifestyle",  label: "Lifestyle"   },
  { key: "habits",     label: "Habits"      },
  { key: "preferences",label: "Preferences" },
  { key: "budget",     label: "Budget"      },
];

const FIELDS = {
  sleepSchedule: {
    label: "Sleep schedule",
    options: [
      { value: "early_bird",  label: "Early bird",  sub: "Asleep by 10pm" },
      { value: "night_owl",   label: "Night owl",   sub: "Up past midnight" },
      { value: "flexible",    label: "Flexible",    sub: "No strong preference" },
    ],
  },
  smoking: {
    label: "Smoking",
    options: [
      { value: "non_smoker",    label: "Non-smoker",     sub: "I don't smoke" },
      { value: "outdoor_only",  label: "Outdoor only",   sub: "I smoke outside" },
      { value: "smoker",        label: "Smoker",         sub: "I smoke indoors" },
    ],
  },
  drinking: {
    label: "Drinking",
    options: [
      { value: "no",           label: "No",           sub: "I don't drink" },
      { value: "occasionally", label: "Occasionally", sub: "Social drinker" },
      { value: "yes",          label: "Yes",          sub: "I drink regularly" },
    ],
  },
  noiseTolerance: {
    label: "Noise tolerance",
    options: [
      { value: "quiet",    label: "Quiet",    sub: "I need silence to focus" },
      { value: "moderate", label: "Moderate", sub: "Some noise is fine" },
      { value: "loud",     label: "Loud",     sub: "Noise doesn't bother me" },
    ],
  },
  guestPolicy: {
    label: "Guests at home",
    options: [
      { value: "no_guests",    label: "No guests",    sub: "I prefer no visitors" },
      { value: "occasionally", label: "Occasionally", sub: "Guests now and then" },
      { value: "frequently",   label: "Frequently",   sub: "Friends visit often" },
    ],
  },
  cleanliness: {
    label: "Cleanliness",
    options: [
      { value: "very_clean", label: "Very clean", sub: "I clean regularly" },
      { value: "moderate",   label: "Moderate",   sub: "Reasonably tidy" },
      { value: "relaxed",    label: "Relaxed",    sub: "Mess doesn't bother me" },
    ],
  },
  studyHabits: {
    label: "Study habits",
    options: [
      { value: "home_studier", label: "At home",  sub: "I study in my room" },
      { value: "library",      label: "Library",  sub: "I prefer studying out" },
      { value: "mixed",        label: "Mixed",    sub: "Both depending on mood" },
    ],
  },
  dietaryHabit: {
    label: "Dietary habit",
    options: [
      { value: "non_vegetarian", label: "Non-vegetarian", sub: "I eat meat" },
      { value: "vegetarian",     label: "Vegetarian",     sub: "No meat" },
      { value: "vegan",          label: "Vegan",          sub: "No animal products" },
    ],
  },
  genderPreference: {
    label: "Flatmate gender preference",
    options: [
      { value: "any",              label: "Any gender",       sub: "No preference" },
      { value: "same_gender_only", label: "Same gender only", sub: "I prefer same gender" },
    ],
  },
};

const STEP_FIELDS = {
  lifestyle:   ["sleepSchedule", "noiseTolerance", "guestPolicy"],
  habits:      ["smoking", "drinking", "dietaryHabit"],
  preferences: ["cleanliness", "studyHabits", "genderPreference"],
  budget:      [],
};

export default function OnboardingPage() {
  const router = useRouter();
  const [user,    setUser]    = useState(null);
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const [form, setForm] = useState({
    sleepSchedule:    "",
    smoking:          "",
    drinking:         "",
    noiseTolerance:   "",
    guestPolicy:      "",
    cleanliness:      "",
    studyHabits:      "",
    dietaryHabit:     "",
    genderPreference: "",
    budgetRange:      { min: "", max: "" },
  });

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "tenant") { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  const currentStep   = STEPS[step];
  const currentFields = STEP_FIELDS[currentStep.key];

  const isStepComplete = () => {
    if (currentStep.key === "budget") {
      return form.budgetRange.min !== "" && form.budgetRange.max !== "" &&
        Number(form.budgetRange.max) >= Number(form.budgetRange.min);
    }
    return currentFields.every((f) => form[f] !== "");
  };

  const handleSelect = (field, value) => {
    setForm({ ...form, [field]: value });
    setError("");
  };

  const handleBudget = (key, value) => {
    setForm({ ...form, budgetRange: { ...form.budgetRange, [key]: value } });
    setError("");
  };

  const handleNext = () => {
    if (!isStepComplete()) {
      setError("Please complete all fields before continuing.");
      return;
    }
    setError("");
    setStep(step + 1);
  };

  const handleBack = () => {
    setError("");
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!isStepComplete()) {
      setError("Please enter a valid budget range.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        budgetRange: {
          min: Number(form.budgetRange.min),
          max: Number(form.budgetRange.max),
        },
      };
      const data = await userAPI.updatePreferences(payload);
      saveUser(data.user);
      router.push("/tenant/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <main style={{
      minHeight: "100vh",
      background: "var(--color-neutral-50)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem 1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: "560px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--color-primary-500)" }}>
            CoLive
          </h1>
          <p style={{ color: "var(--color-neutral-500)", marginTop: "0.25rem" }}>
            Set your preferences to find compatible flatmates
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
          {STEPS.map((s, i) => (
            <div key={s.key} style={{ flex: 1 }}>
              <div style={{
                height: "4px",
                borderRadius: "2px",
                background: i <= step
                  ? "var(--color-primary-500)"
                  : "var(--color-neutral-200)",
                transition: "background 0.3s",
              }} />
              <p style={{
                fontSize: "0.7rem",
                color: i === step
                  ? "var(--color-primary-500)"
                  : "var(--color-neutral-400)",
                marginTop: "0.375rem",
                fontWeight: i === step ? "600" : "400",
              }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="card">
          {/* Error */}
          {error && (
            <div style={{
              background: "var(--color-error-50)",
              border: "1px solid var(--color-error-500)",
              borderRadius: "var(--radius-md)",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              fontSize: "0.875rem",
              color: "var(--color-error-700)",
            }}>
              {error}
            </div>
          )}

          {/* Step fields */}
          {currentStep.key !== "budget" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {currentFields.map((fieldKey) => {
                const field = FIELDS[fieldKey];
                return (
                  <div key={fieldKey}>
                    <label className="input-label" style={{ marginBottom: "0.625rem" }}>
                      {field.label}
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${field.options.length}, 1fr)`, gap: "0.625rem" }}>
                      {field.options.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelect(fieldKey, opt.value)}
                          style={{
                            padding: "0.75rem 0.5rem",
                            borderRadius: "var(--radius-md)",
                            border: `2px solid ${form[fieldKey] === opt.value
                              ? "var(--color-primary-500)"
                              : "var(--color-neutral-200)"}`,
                            background: form[fieldKey] === opt.value
                              ? "var(--color-primary-50)"
                              : "#fff",
                            cursor: "pointer",
                            textAlign: "center",
                            transition: "all 0.15s",
                          }}
                        >
                          <p style={{
                            fontSize: "0.875rem",
                            fontWeight: "600",
                            color: form[fieldKey] === opt.value
                              ? "var(--color-primary-700)"
                              : "var(--color-neutral-800)",
                            marginBottom: "0.2rem",
                          }}>
                            {opt.label}
                          </p>
                          <p style={{
                            fontSize: "0.7rem",
                            color: "var(--color-neutral-400)",
                            lineHeight: "1.3",
                          }}>
                            {opt.sub}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Budget step */}
          {currentStep.key === "budget" && (
            <div>
              <p style={{ color: "var(--color-neutral-600)", marginBottom: "1.5rem", fontSize: "0.9375rem" }}>
                Set your monthly rent budget. This helps match you with rooms in your range.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="input-label" htmlFor="minBudget">Minimum (BDT)</label>
                  <input
                    id="minBudget"
                    type="number"
                    className="input"
                    placeholder="e.g. 3000"
                    min="0"
                    value={form.budgetRange.min}
                    onChange={(e) => handleBudget("min", e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label" htmlFor="maxBudget">Maximum (BDT)</label>
                  <input
                    id="maxBudget"
                    type="number"
                    className="input"
                    placeholder="e.g. 8000"
                    min="0"
                    value={form.budgetRange.max}
                    onChange={(e) => handleBudget("max", e.target.value)}
                  />
                </div>
              </div>
              {form.budgetRange.min && form.budgetRange.max &&
                Number(form.budgetRange.max) < Number(form.budgetRange.min) && (
                <span className="input-error-msg">Maximum must be greater than minimum.</span>
              )}
            </div>
          )}

          {/* Navigation */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "2rem",
            gap: "0.75rem",
          }}>
            {step > 0 ? (
              <button className="btn btn-ghost" onClick={handleBack}>
                Back
              </button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={handleNext}>
                Continue
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Saving..." : "Finish setup"}
              </button>
            )}
          </div>
        </div>

        {/* Step count */}
        <p style={{
          textAlign: "center",
          fontSize: "0.8125rem",
          color: "var(--color-neutral-400)",
          marginTop: "1rem",
        }}>
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </main>
  );
}
