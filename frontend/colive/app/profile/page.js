"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { getUser, saveUser, userAPI } from "../../lib/api";

const PREFERENCE_OPTIONS = {
  sleepSchedule: {
    label: "Sleep schedule",
    options: [
      { value: "early_bird",  label: "Early bird"  },
      { value: "night_owl",   label: "Night owl"   },
      { value: "flexible",    label: "Flexible"    },
    ],
  },
  smoking: {
    label: "Smoking",
    options: [
      { value: "non_smoker",   label: "Non-smoker"   },
      { value: "outdoor_only", label: "Outdoor only" },
      { value: "smoker",       label: "Smoker"       },
    ],
  },
  drinking: {
    label: "Drinking",
    options: [
      { value: "no",           label: "No"           },
      { value: "occasionally", label: "Occasionally" },
      { value: "yes",          label: "Yes"          },
    ],
  },
  noiseTolerance: {
    label: "Noise tolerance",
    options: [
      { value: "quiet",    label: "Quiet"    },
      { value: "moderate", label: "Moderate" },
      { value: "loud",     label: "Loud"     },
    ],
  },
  guestPolicy: {
    label: "Guests at home",
    options: [
      { value: "no_guests",    label: "No guests"    },
      { value: "occasionally", label: "Occasionally" },
      { value: "frequently",   label: "Frequently"   },
    ],
  },
  cleanliness: {
    label: "Cleanliness",
    options: [
      { value: "very_clean", label: "Very clean" },
      { value: "moderate",   label: "Moderate"   },
      { value: "relaxed",    label: "Relaxed"    },
    ],
  },
  studyHabits: {
    label: "Study habits",
    options: [
      { value: "home_studier", label: "At home"  },
      { value: "library",      label: "Library"  },
      { value: "mixed",        label: "Mixed"    },
    ],
  },
  dietaryHabit: {
    label: "Dietary habit",
    options: [
      { value: "non_vegetarian", label: "Non-vegetarian" },
      { value: "vegetarian",     label: "Vegetarian"     },
      { value: "vegan",          label: "Vegan"          },
    ],
  },
  genderPreference: {
    label: "Flatmate gender preference",
    options: [
      { value: "any",              label: "Any gender"       },
      { value: "same_gender_only", label: "Same gender only" },
    ],
  },
};

const GENDERS = [
  { value: "male",              label: "Male"              },
  { value: "female",            label: "Female"            },
  { value: "other",             label: "Other"             },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user,        setUser]        = useState(null);
  const [activeTab,   setActiveTab]   = useState("info");
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", university: "", gender: "" });
  const [prefForm,    setPrefForm]    = useState({
    sleepSchedule: "", smoking: "", drinking: "", noiseTolerance: "",
    guestPolicy: "", cleanliness: "", studyHabits: "", dietaryHabit: "",
    genderPreference: "", budgetRange: { min: "", max: "" },
  });
  const [profileMsg, setProfileMsg] = useState({ text: "", type: "" });
  const [prefMsg,    setPrefMsg]    = useState({ text: "", type: "" });
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);
    setProfileForm({
      name:       u.name       ?? "",
      phone:      u.phone      ?? "",
      university: u.university ?? "",
      gender:     u.gender     ?? "",
    });
    setPrefForm({
      sleepSchedule:    u.preferences?.sleepSchedule    ?? "",
      smoking:          u.preferences?.smoking          ?? "",
      drinking:         u.preferences?.drinking         ?? "",
      noiseTolerance:   u.preferences?.noiseTolerance   ?? "",
      guestPolicy:      u.preferences?.guestPolicy      ?? "",
      cleanliness:      u.preferences?.cleanliness      ?? "",
      studyHabits:      u.preferences?.studyHabits      ?? "",
      dietaryHabit:     u.preferences?.dietaryHabit     ?? "",
      genderPreference: u.preferences?.genderPreference ?? "",
      budgetRange: {
        min: u.preferences?.budgetRange?.min ?? "",
        max: u.preferences?.budgetRange?.max ?? "",
      },
    });
  }, [router]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg({ text: "", type: "" });
    try {
      const data = await userAPI.updateProfile(profileForm);
      saveUser(data.user);
      setUser(data.user);
      setProfileMsg({ text: "Profile updated successfully.", type: "success" });
    } catch (err) {
      setProfileMsg({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handlePrefSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setPrefMsg({ text: "", type: "" });
    try {
      const payload = {
        ...prefForm,
        budgetRange: {
          min: Number(prefForm.budgetRange.min),
          max: Number(prefForm.budgetRange.max),
        },
      };
      const data = await userAPI.updatePreferences(payload);
      saveUser(data.user);
      setUser(data.user);
      setPrefMsg({ text: "Preferences updated successfully.", type: "success" });
    } catch (err) {
      setPrefMsg({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const msgStyle = (type) => ({
    padding: "0.75rem 1rem",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    marginBottom: "1.25rem",
    background: type === "success" ? "var(--color-success-50)" : "var(--color-error-50)",
    border: `1px solid ${type === "success" ? "var(--color-success-500)" : "var(--color-error-500)"}`,
    color: type === "success" ? "var(--color-success-700)" : "var(--color-error-700)",
  });

  const tabStyle = (key) => ({
    padding: "0.75rem 1.25rem",
    fontSize: "0.875rem",
    fontWeight: activeTab === key ? "600" : "400",
    color: activeTab === key ? "var(--color-primary-500)" : "var(--color-neutral-500)",
    background: "none",
    border: "none",
    borderBottom: `2px solid ${activeTab === key ? "var(--color-primary-500)" : "transparent"}`,
    cursor: "pointer",
    transition: "all 0.15s",
    marginBottom: "-1px",
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ marginBottom: "0.25rem" }}>My Profile</h2>
          <p style={{ color: "var(--color-neutral-500)", fontSize: "0.9375rem" }}>
            Manage your personal info and lifestyle preferences.
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid var(--color-neutral-200)",
          marginBottom: "1.5rem",
          background: "#fff",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          padding: "0 1rem",
        }}>
          <button style={tabStyle("info")}       onClick={() => setActiveTab("info")}>Personal info</button>
          {user.role === "tenant" && (
            <button style={tabStyle("preferences")} onClick={() => setActiveTab("preferences")}>Lifestyle preferences</button>
          )}
        </div>

        {/* Personal info tab */}
        {activeTab === "info" && (
          <div className="card">
            {profileMsg.text && <div style={msgStyle(profileMsg.type)}>{profileMsg.text}</div>}
            <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>

              <div>
                <label className="input-label" htmlFor="name">Full name</label>
                <input id="name" className="input" value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
              </div>

              <div>
                <label className="input-label" htmlFor="email">Email address</label>
                <input id="email" className="input" value={user.email} disabled
                  style={{ opacity: 0.6, cursor: "not-allowed" }} />
                <span className="input-hint">Email cannot be changed.</span>
              </div>

              <div>
                <label className="input-label" htmlFor="phone">Phone</label>
                <input id="phone" className="input" placeholder="01XXXXXXXXX"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              </div>

              <div>
                <label className="input-label" htmlFor="university">University</label>
                <input id="university" className="input" placeholder="e.g. RUET, BUET"
                  value={profileForm.university}
                  onChange={(e) => setProfileForm({ ...profileForm, university: e.target.value })} />
              </div>

              <div>
                <label className="input-label" htmlFor="gender">Gender</label>
                <select id="gender" className="input" value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}>
                  <option value="">Select gender</option>
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving}
                style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </form>
          </div>
        )}

        {/* Preferences tab */}
        {activeTab === "preferences" && user.role === "tenant" && (
          <div className="card">
            {prefMsg.text && <div style={msgStyle(prefMsg.type)}>{prefMsg.text}</div>}
            <form onSubmit={handlePrefSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              {Object.entries(PREFERENCE_OPTIONS).map(([key, field]) => (
                <div key={key}>
                  <label className="input-label" style={{ marginBottom: "0.5rem" }}>{field.label}</label>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {field.options.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPrefForm({ ...prefForm, [key]: opt.value })}
                        style={{
                          padding: "0.5rem 1rem",
                          borderRadius: "var(--radius-md)",
                          border: `1.5px solid ${prefForm[key] === opt.value
                            ? "var(--color-primary-500)"
                            : "var(--color-neutral-200)"}`,
                          background: prefForm[key] === opt.value
                            ? "var(--color-primary-50)"
                            : "#fff",
                          color: prefForm[key] === opt.value
                            ? "var(--color-primary-700)"
                            : "var(--color-neutral-700)",
                          fontSize: "0.875rem",
                          fontWeight: prefForm[key] === opt.value ? "600" : "400",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Budget */}
              <div>
                <label className="input-label" style={{ marginBottom: "0.5rem" }}>Monthly budget (BDT)</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label className="input-label" htmlFor="minBudget" style={{ fontSize: "0.75rem" }}>Minimum</label>
                    <input id="minBudget" type="number" className="input" placeholder="e.g. 3000"
                      value={prefForm.budgetRange.min}
                      onChange={(e) => setPrefForm({ ...prefForm, budgetRange: { ...prefForm.budgetRange, min: e.target.value } })} />
                  </div>
                  <div>
                    <label className="input-label" htmlFor="maxBudget" style={{ fontSize: "0.75rem" }}>Maximum</label>
                    <input id="maxBudget" type="number" className="input" placeholder="e.g. 8000"
                      value={prefForm.budgetRange.max}
                      onChange={(e) => setPrefForm({ ...prefForm, budgetRange: { ...prefForm.budgetRange, max: e.target.value } })} />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving}
                style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}>
                {saving ? "Saving..." : "Save preferences"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
