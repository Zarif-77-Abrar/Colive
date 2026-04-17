"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser } from "../lib/api";
import { useRouter } from "next/navigation";

const FEATURES = [
  {
    icon: "🏠",
    title: "Browse Rooms",
    desc: "Search available rooms across verified properties near your university.",
  },
  {
    icon: "🤝",
    title: "Compatibility Matching",
    desc: "See how well you match with current flatmates before you book — based on lifestyle, habits, and budget.",
  },
  {
    icon: "💬",
    title: "Direct Messaging",
    desc: "Chat with property owners and potential flatmates directly on the platform.",
  },
  {
    icon: "📋",
    title: "Booking Requests",
    desc: "Send booking requests and get responses from owners — all in one place.",
  },
  {
    icon: "🔧",
    title: "Maintenance Tracking",
    desc: "Submit and track maintenance requests for your room without chasing anyone.",
  },
  {
    icon: "🛡️",
    title: "Safe Community",
    desc: "Admin moderation and blacklist system to keep the platform safe for everyone.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // If already logged in, redirect to their dashboard
    const user = getUser();
    if (user) {
      const dest = {
        tenant: "/tenant/dashboard",
        owner:  "/owner/dashboard",
        admin:  "/admin/dashboard",
      }[user.role] || "/login";
      router.replace(dest);
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "var(--font-sans)" }}>

      {/* ── Navbar ─────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#fff",
        borderBottom: "1px solid var(--color-neutral-200)",
        padding: "0 2rem", height: "60px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--color-primary-500)" }}>
          CoLive
        </span>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link href="/register" className="btn btn-primary btn-sm">Get started</Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <section style={{
        maxWidth: "780px", margin: "0 auto",
        padding: "6rem 1.5rem 5rem",
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-block",
          background: "var(--color-primary-50)",
          color: "var(--color-primary-600)",
          fontSize: "0.8125rem", fontWeight: "600",
          padding: "0.375rem 1rem", borderRadius: "9999px",
          marginBottom: "1.5rem",
          border: "1px solid var(--color-primary-200)",
        }}>
          Built for university students in Bangladesh
        </div>

        <h1 style={{
          fontSize: "clamp(2rem, 5vw, 3.25rem)",
          fontWeight: "700",
          color: "var(--color-neutral-900)",
          lineHeight: "1.15",
          marginBottom: "1.25rem",
        }}>
          Find a room.<br />
          <span style={{ color: "var(--color-primary-500)" }}>Find compatible flatmates.</span>
        </h1>

        <p style={{
          fontSize: "1.125rem",
          color: "var(--color-neutral-600)",
          lineHeight: "1.7",
          marginBottom: "2.5rem",
          maxWidth: "560px",
          margin: "0 auto 2.5rem",
        }}>
          CoLive connects students with shared housing options and helps you find flatmates
          who actually match your lifestyle — before you commit to living together.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" className="btn btn-primary btn-lg">
            Create an account
          </Link>
          <Link href="/login" className="btn btn-secondary btn-lg">
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Divider ────────────────────────────────────── */}
      <div style={{
        maxWidth: "900px", margin: "0 auto",
        borderTop: "1px solid var(--color-neutral-200)",
      }} />

      {/* ── Features ───────────────────────────────────── */}
      <section style={{
        maxWidth: "1100px", margin: "0 auto",
        padding: "5rem 1.5rem",
      }}>
        <h2 style={{
          textAlign: "center", fontSize: "1.75rem",
          fontWeight: "700", color: "var(--color-neutral-900)",
          marginBottom: "0.75rem",
        }}>
          Everything you need in one place
        </h2>
        <p style={{
          textAlign: "center", color: "var(--color-neutral-500)",
          fontSize: "1rem", marginBottom: "3rem",
        }}>
          From finding a room to managing your shared living — CoLive handles it all.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.25rem",
        }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              padding: "1.5rem",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--color-neutral-200)",
              background: "#fff",
              transition: "box-shadow 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
            >
              <div style={{ fontSize: "1.75rem", marginBottom: "0.875rem" }}>{f.icon}</div>
              <p style={{ fontWeight: "600", fontSize: "1rem", color: "var(--color-neutral-900)", marginBottom: "0.5rem" }}>
                {f.title}
              </p>
              <p style={{ fontSize: "0.9375rem", color: "var(--color-neutral-500)", lineHeight: "1.6" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────── */}
      <section style={{
        background: "var(--color-neutral-50)",
        borderTop: "1px solid var(--color-neutral-200)",
        borderBottom: "1px solid var(--color-neutral-200)",
        padding: "5rem 1.5rem",
      }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{
            fontSize: "1.75rem", fontWeight: "700",
            color: "var(--color-neutral-900)", marginBottom: "3rem",
          }}>
            How it works
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {[
              { step: "1", title: "Create an account", desc: "Sign up as a tenant and set your lifestyle preferences — sleep schedule, cleanliness, noise tolerance, and more." },
              { step: "2", title: "Browse available rooms", desc: "Search properties by city and budget. Each room shows current flatmates and your compatibility score with them." },
              { step: "3", title: "Send a booking request", desc: "Found a good match? Send a booking request to the owner. They review and accept or decline." },
              { step: "4", title: "Move in and manage", desc: "Once accepted, use CoLive to handle maintenance requests, communicate with owners, and stay on top of your shared living." },
            ].map((item) => (
              <div key={item.step} style={{
                display: "flex", gap: "1.25rem", alignItems: "flex-start", textAlign: "left",
              }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                  background: "var(--color-primary-500)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.875rem", fontWeight: "700", color: "#fff",
                }}>
                  {item.step}
                </div>
                <div>
                  <p style={{ fontWeight: "600", fontSize: "1rem", color: "var(--color-neutral-900)", marginBottom: "0.375rem" }}>
                    {item.title}
                  </p>
                  <p style={{ fontSize: "0.9375rem", color: "var(--color-neutral-500)", lineHeight: "1.6" }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section style={{
        textAlign: "center",
        padding: "5rem 1.5rem",
        maxWidth: "600px", margin: "0 auto",
      }}>
        <h2 style={{
          fontSize: "1.75rem", fontWeight: "700",
          color: "var(--color-neutral-900)", marginBottom: "0.75rem",
        }}>
          Ready to find your room?
        </h2>
        <p style={{
          color: "var(--color-neutral-500)", marginBottom: "2rem", fontSize: "1rem",
        }}>
          Join CoLive and find shared housing that actually fits your lifestyle.
        </p>
        <Link href="/register" className="btn btn-primary btn-lg">
          Get started for free
        </Link>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid var(--color-neutral-200)",
        padding: "1.5rem",
        textAlign: "center",
        fontSize: "0.8125rem",
        color: "var(--color-neutral-400)",
      }}>
        CoLive — Student Housing Platform · Built as an academic project
      </footer>

    </div>
  );
}
