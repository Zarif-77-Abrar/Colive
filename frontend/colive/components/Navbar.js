"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, logout } from "../lib/api";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  const roleLabel = { tenant: "Tenant", owner: "Owner", admin: "Admin" };

  const roleColor = {
    tenant: { bg: "var(--color-primary-50)",  color: "var(--color-primary-700)"  },
    owner:  { bg: "var(--color-warning-50)",  color: "var(--color-warning-700)"  },
    admin:  { bg: "var(--color-error-50)",    color: "var(--color-error-700)"    },
  };

  if (!user) return null;

  const rc = roleColor[user.role] || roleColor.tenant;

  // Dashboard link based on role
  const dashboardHref = {
    tenant: "/tenant/dashboard",
    owner:  "/owner/dashboard",
    admin:  "/admin/dashboard",
  }[user.role] || "/";

  return (
    <nav style={{
      background: "#fff",
      borderBottom: "1px solid var(--color-neutral-200)",
      padding: "0 1.5rem",
      height: "60px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>

      {/* Brand */}
      <Link href={dashboardHref} style={{
        fontSize: "1.25rem",
        fontWeight: "700",
        color: "var(--color-primary-500)",
        textDecoration: "none",
      }}>
        CoLive
      </Link>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>

        {/* Role badge */}
        <span style={{
          fontSize: "0.75rem",
          fontWeight: "500",
          padding: "0.2rem 0.625rem",
          borderRadius: "9999px",
          background: rc.bg,
          color: rc.color,
        }}>
          {roleLabel[user.role]}
        </span>

        {/* Username — links to profile for tenants and owners, not admins */}
        {user.role !== "admin" ? (
          <Link href="/profile" style={{
            fontSize: "0.875rem",
            fontWeight: "500",
            color: "var(--color-neutral-700)",
            textDecoration: "none",
            borderBottom: "1px dashed var(--color-neutral-300)",
            paddingBottom: "1px",
          }}>
            {user.name}
          </Link>
        ) : (
          <span style={{
            fontSize: "0.875rem",
            fontWeight: "500",
            color: "var(--color-neutral-700)",
          }}>
            {user.name}
          </span>
        )}

        {/* Sign out */}
        <button onClick={logout} className="btn btn-ghost btn-sm"
          style={{ fontSize: "0.8125rem" }}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
