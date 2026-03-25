"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authAPI, saveToken, saveUser } from "../../lib/api";

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [form,    setForm]    = useState({ email: "", password: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [notice,  setNotice]  = useState("");

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setNotice("Account created! Please sign in.");
    }
    if (searchParams.get("next") === "onboarding") {
      setNotice("Account created! Sign in to complete your profile setup.");
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authAPI.login(form);
      saveToken(data.token);
      saveUser(data.user);

      const role = data.user.role;
      const next = searchParams.get("next");

      if (role === "admin") {
        router.push("/admin/dashboard");
      } else if (role === "owner") {
        router.push("/owner/dashboard");
      } else {
        // Fetch full profile to check if preferences are set
        const profile = await authAPI.getMe();
        saveUser(profile.user);
        const hasPrefs = profile.user.preferences?.sleepSchedule;
        if (!hasPrefs || next === "onboarding") {
          router.push("/onboarding");
        } else {
          router.push("/tenant/dashboard");
        }
      }
    } catch (err) {
      setError(err.message);
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
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--color-primary-500)" }}>
            CoLive
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-neutral-500)", marginTop: "0.25rem" }}>
            Sign in to your account
          </p>
        </div>

        <div className="card">

          {/* Notice banner */}
          {notice && (
            <div style={{
              background: "var(--color-success-50)",
              border: "1px solid var(--color-success-500)",
              borderRadius: "var(--radius-md)",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              fontSize: "0.875rem",
              color: "var(--color-success-700)",
            }}>
              {notice}
            </div>
          )}

          {/* Error banner */}
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

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            <div>
              <label className="input-label" htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email"
                required className="input" placeholder="you@example.com"
                value={form.email} onChange={handleChange} />
            </div>

            <div>
              <label className="input-label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password"
                required className="input" placeholder="Enter your password"
                value={form.password} onChange={handleChange} />
            </div>

            <button type="submit" className="btn btn-primary"
              disabled={loading} style={{ width: "100%", marginTop: "0.5rem" }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>

          </form>

          <hr className="divider" />

          <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--color-neutral-500)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "var(--color-primary-500)", fontWeight: "500" }}>
              Create one
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}
