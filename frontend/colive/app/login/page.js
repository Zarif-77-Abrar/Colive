"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authAPI, saveToken, saveUser } from "../../lib/api";

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [form,      setForm]      = useState({ email: "", password: "" });
  const [error,     setError]     = useState("");
  const [blacklisted, setBlacklisted] = useState(null); // { message, reason }
  const [loading,   setLoading]   = useState(false);
  const [notice,    setNotice]    = useState("");

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
    setBlacklisted(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBlacklisted(null);
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
        const profile  = await authAPI.getMe();
        saveUser(profile.user);
        const hasPrefs = profile.user.preferences?.sleepSchedule;
        if (!hasPrefs || next === "onboarding") {
          router.push("/onboarding");
        } else {
          router.push("/tenant/dashboard");
        }
      }
    } catch (err) {
      if (err.code === "BLACKLISTED") {
        setBlacklisted({ message: err.message, reason: err.reason });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Blacklisted screen ─────────────────────────────────
  if (blacklisted) {
    return (
      <main style={{
        minHeight: "100vh", background: "var(--color-neutral-50)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1.5rem",
      }}>
        <div style={{ width: "100%", maxWidth: "420px", textAlign: "center" }}>
          <div style={{
            background: "var(--color-error-50)",
            border: "1px solid var(--color-error-500)",
            borderRadius: "var(--radius-xl)",
            padding: "2rem 1.5rem",
          }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%",
              background: "var(--color-error-500)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
              fontSize: "1.5rem", color: "#fff",
            }}>
              ✕
            </div>
            <h2 style={{ color: "var(--color-error-700)", marginBottom: "0.75rem" }}>
              Account suspended
            </h2>
            <p style={{ color: "var(--color-error-700)", marginBottom: "0.5rem", fontSize: "0.9375rem" }}>
              {blacklisted.message}
            </p>
            <p style={{
              color: "var(--color-error-600)", fontSize: "0.875rem",
              background: "var(--color-error-100)",
              borderRadius: "var(--radius-md)",
              padding: "0.75rem", marginTop: "1rem",
            }}>
              Reason: {blacklisted.reason}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-neutral-500)", marginTop: "1.25rem" }}>
              If you believe this is a mistake, please contact the CoLive administrator.
            </p>
            <button
              onClick={() => setBlacklisted(null)}
              className="btn btn-ghost btn-sm"
              style={{ marginTop: "1rem" }}
            >
              ← Back to sign in
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh", background: "var(--color-neutral-50)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--color-primary-500)" }}>
            CoLive
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-neutral-500)", marginTop: "0.25rem" }}>
            Sign in to your account
          </p>
        </div>

        <div className="card">
          {notice && (
            <div style={{
              background: "var(--color-success-50)", border: "1px solid var(--color-success-500)",
              borderRadius: "var(--radius-md)", padding: "0.75rem 1rem",
              marginBottom: "1.25rem", fontSize: "0.875rem", color: "var(--color-success-700)",
            }}>
              {notice}
            </div>
          )}
          {error && (
            <div style={{
              background: "var(--color-error-50)", border: "1px solid var(--color-error-500)",
              borderRadius: "var(--radius-md)", padding: "0.75rem 1rem",
              marginBottom: "1.25rem", fontSize: "0.875rem", color: "var(--color-error-700)",
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
