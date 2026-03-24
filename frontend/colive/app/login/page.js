"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authAPI, saveToken, saveUser } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      // Redirect based on role
      const role = data.user.role;
      if (role === "admin")  router.push("/admin/dashboard");
      else if (role === "owner") router.push("/owner/dashboard");
      else router.push("/tenant/dashboard");

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

        {/* Logo / brand */}
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
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="card">

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

            {/* Email */}
            <div>
              <label className="input-label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div>
              <label className="input-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                placeholder="Enter your password"
                value={form.password}
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
              {loading ? "Signing in..." : "Sign in"}
            </button>

          </form>

          {/* Divider */}
          <hr className="divider" />

          {/* Register link */}
          <p style={{
            textAlign: "center",
            fontSize: "0.875rem",
            color: "var(--color-neutral-500)",
          }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{
              color: "var(--color-primary-500)",
              fontWeight: "500",
            }}>
              Create one
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}
