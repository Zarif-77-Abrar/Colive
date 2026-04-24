"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, logout } from "../lib/api";
import { useNotifications } from "../lib/NotificationContext";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const { notifications, unreadCount, setShowDropdown, showDropdown, markAsRead, clearAll } = useNotifications();

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
      {/* Left side: Brand and Feature Links */}
      <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
        {/* Brand */}
        <Link href="/" style={{
          fontSize: "1.25rem",
          fontWeight: "700",
          color: "var(--color-primary-500)",
          textDecoration: "none",
        }}>
          CoLive
        </Link>

        {/* Feature Links */}
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link href="/search" style={{
            fontSize: "0.875rem", fontWeight: "500", color: "var(--color-neutral-600)", textDecoration: "none"
          }}>
            Advanced Search
          </Link>
          <Link href="/recommendations" style={{
            fontSize: "0.875rem", fontWeight: "500", color: "var(--color-neutral-600)", textDecoration: "none"
          }}>
            AI Matchmaker
          </Link>
          
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              fontSize: "0.875rem", 
              fontWeight: "500", 
              color: unreadCount > 0 ? "var(--color-primary-600)" : "var(--color-neutral-600)", 
              textDecoration: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem",
              borderRadius: "8px",
              transition: "all 0.2s"
            }}
            className="hover:bg-gray-100"
          >
            Alerts
            {unreadCount > 0 && (
              <span style={{
                background: "var(--color-primary-500)",
                color: "#fff",
                fontSize: "0.7rem",
                fontWeight: "700",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}>
                {unreadCount}
              </span>
            )}
          </button>
          
          {showDropdown && (
            <div style={{
              position: "absolute",
              top: "60px",
              left: "15rem",
              width: "380px",
              maxHeight: "500px",
              background: "#fff",
              borderRadius: "16px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
              border: "1px solid var(--color-neutral-200)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}>
              <div style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--color-neutral-100)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fafafa"
              }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: "var(--color-neutral-900)" }}>
                  Notifications
                </h3>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button 
                    onClick={clearAll}
                    style={{ background: "none", border: "none", color: "var(--color-primary-500)", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
                  >
                    Clear All
                  </button>
                  <button 
                    onClick={() => setShowDropdown(false)}
                    style={{ background: "none", border: "none", color: "var(--color-neutral-500)", fontSize: "1rem", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--color-neutral-400)" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔔</div>
                    <p style={{ margin: 0, fontSize: "0.9rem" }}>No new alerts yet</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        style={{
                          padding: "1rem",
                          borderRadius: "12px",
                          background: notification.read ? "transparent" : "var(--color-primary-50)",
                          border: notification.read ? "1px solid var(--color-neutral-100)" : "1px solid var(--color-primary-100)",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                          <span style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--color-neutral-900)" }}>
                            {notification.title}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-neutral-500)" }}>
                            {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.875rem", color: "var(--color-neutral-600)", lineHeight: "1.4" }}>
                          {notification.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
