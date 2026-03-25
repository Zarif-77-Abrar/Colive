"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authAPI } from "../../lib/api";

const ROLES = [
  { value: "tenant", label: "Tenant", description: "Looking for a room or flat" },
  { value: "owner",  label: "Owner",  description: "Listing a property for rent" },
];

const GENDERS = [
  { value: "male",              label: "Male" },
  { value: "female",            label: "Female" },
  { value: "other",             label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name:       "",
    email:      "",
    password:   "",
    confirm:    "",
    role:       "tenant",
    gender:     "",
    university: "",
    phone:      "",
  });

  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setApiError("");
  };

  // ── Client-side validation ─────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())
      e.name = "Name is required.";
    else if (form.name.trim().length < 2)
      e.name = "Name must be at least 2 characters.";

    if (!form.email.trim())
      e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      e.email = "Please enter a valid email.";

    if (!form.password)
      e.password = "Password is required.";
    else if (form.password.length < 8)
      e.password = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(form.password))
      e.password = "Password must contain at least one uppercase letter.";
    else if (!/[0-9]/.test(form.password))
      e.password = "Password must contain at least one number.";

    if (!form.confirm)
      e.confirm = "Please confirm your password.";
    else if (form.confirm !== form.password)
      e.confirm = "Passwords do not match.";

    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const { confirm, ...payload } = form;
      // Remove empty optional fields before sending
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });

      await authAPI.register(payload);
      // Tenants go to onboarding to set preferences
      // Owners go straight to login
      if (payload.role === "tenant") {
        router.push("/login?next=onboarding");
      } else {
        router.push("/login?registered=true");
      }

    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "var(--color-neutral-50)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem 1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{
            fontSize: "1.875rem",
            fontWeight: "700",
            color: "var(--color-primary-500)",
          }}>
            CoLive
          </h1>
          <p style={{
            fontSize: "0.9375rem",
            color: "var(--color-neutral-500)",
            marginTop: "0.25rem",
          }}>
            Create your account
          </p>
        </div>

        <div className="card">

          {/* API error banner */}
          {apiError && (
            <div style={{
              background: "var(--color-error-50)",
              border: "1px solid var(--color-error-500)",
              borderRadius: "var(--radius-md)",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              fontSize: "0.875rem",
              color: "var(--color-error-700)",
            }}>
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>

            {/* Role selector */}
            <div>
              <label className="input-label">I am a</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {ROLES.map((r) => (
                  <label key={r.value} style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "0.875rem",
                    borderRadius: "var(--radius-md)",
                    border: `2px solid ${form.role === r.value
                      ? "var(--color-primary-500)"
                      : "var(--color-neutral-200)"}`,
                    background: form.role === r.value
                      ? "var(--color-primary-50)"
                      : "#fff",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}>
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={form.role === r.value}
                      onChange={handleChange}
                      style={{ display: "none" }}
                    />
                    <span style={{
                      fontWeight: "600",
                      fontSize: "0.9375rem",
                      color: form.role === r.value
                        ? "var(--color-primary-700)"
                        : "var(--color-neutral-800)",
                    }}>
                      {r.label}
                    </span>
                    <span style={{
                      fontSize: "0.75rem",
                      color: "var(--color-neutral-500)",
                      marginTop: "0.25rem",
                    }}>
                      {r.description}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="input-label" htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                className={`input ${errors.name ? "input-error" : ""}`}
                placeholder="Your full name"
                value={form.name}
                onChange={handleChange}
              />
              {errors.name && <span className="input-error-msg">{errors.name}</span>}
            </div>

            {/* Email */}
            <div>
              <label className="input-label" htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className={`input ${errors.email ? "input-error" : ""}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
              {errors.email && <span className="input-error-msg">{errors.email}</span>}
            </div>

            {/* Password */}
            <div>
              <label className="input-label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                className={`input ${errors.password ? "input-error" : ""}`}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={form.password}
                onChange={handleChange}
              />
              {errors.password && <span className="input-error-msg">{errors.password}</span>}
            </div>

            {/* Confirm password */}
            <div>
              <label className="input-label" htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                className={`input ${errors.confirm ? "input-error" : ""}`}
                placeholder="Re-enter your password"
                value={form.confirm}
                onChange={handleChange}
              />
              {errors.confirm && <span className="input-error-msg">{errors.confirm}</span>}
            </div>

            {/* University */}
            <div>
              <label className="input-label" htmlFor="university">
                University <span style={{ color: "var(--color-neutral-400)", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="university"
                name="university"
                type="text"
                className="input"
                placeholder="e.g. RUET, BUET, SUST"
                value={form.university}
                onChange={handleChange}
              />
            </div>

            {/* Gender */}
            <div>
              <label className="input-label" htmlFor="gender">
                Gender <span style={{ color: "var(--color-neutral-400)", fontWeight: 400 }}>(optional)</span>
              </label>
              <select
                id="gender"
                name="gender"
                className="input"
                value={form.gender}
                onChange={handleChange}
              >
                <option value="">Select gender</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="input-label" htmlFor="phone">
                Phone <span style={{ color: "var(--color-neutral-400)", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="input"
                placeholder="e.g. 01XXXXXXXXX"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

          </form>

          <hr className="divider" />

          <p style={{
            textAlign: "center",
            fontSize: "0.875rem",
            color: "var(--color-neutral-500)",
          }}>
            Already have an account?{" "}
            <Link href="/login" style={{
              color: "var(--color-primary-500)",
              fontWeight: "500",
            }}>
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}
