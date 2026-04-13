"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import TabBar from "../../../components/TabBar";
import StatCard from "../../../components/StatCard";
import DataTable from "../../../components/DataTable";
import { LoadingSpinner, ErrorState } from "../../../components/LoadingState";
import useApi from "../../../lib/useApi";
import { getUser, adminAPI } from "../../../lib/api";

const TABS = [
  { key: "overview",    label: "Overview"    },
  { key: "users",       label: "Users"       },
  { key: "properties",  label: "Properties"  },
  { key: "bookings",    label: "Bookings"    },
  { key: "maintenance", label: "Maintenance" },
  { key: "notices",     label: "Notices"     },
];

const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtMoney = (n) => n != null ? `BDT ${Number(n).toLocaleString()}` : "—";

export default function AdminDashboard() {
  const router = useRouter();
  const [user,   setUser]   = useState(null);
  const [active, setActive] = useState("overview");

  // Blacklist action state
  const [actionLoading, setActionLoading] = useState(null);
  const [actionMsg,     setActionMsg]     = useState({ text: "", type: "" });
  const [reasonInput,   setReasonInput]   = useState({});

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "admin") { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  const stats       = useApi(adminAPI.getStats);
  const users       = useApi(adminAPI.getUsers);
  const properties  = useApi(adminAPI.getProperties);
  const bookings    = useApi(adminAPI.getBookings);
  const maintenance = useApi(adminAPI.getMaintenance);
  const notices     = useApi(adminAPI.getNotices);

  if (!user) return null;

  const s = stats.data?.stats;

  const handleBlacklist = async (userId, userName) => {
    const reason = reasonInput[userId] || "Suspended by administrator.";
    setActionLoading(userId + "blacklist");
    setActionMsg({ text: "", type: "" });
    try {
      await adminAPI.blacklistUser(userId, reason);
      setActionMsg({ text: `${userName} has been blacklisted.`, type: "success" });
      setReasonInput({ ...reasonInput, [userId]: "" });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setActionMsg({ text: err.message, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblacklist = async (userId, userName) => {
    setActionLoading(userId + "unblacklist");
    setActionMsg({ text: "", type: "" });
    try {
      await adminAPI.unblacklistUser(userId);
      setActionMsg({ text: `${userName}'s account has been reinstated.`, type: "success" });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setActionMsg({ text: err.message, type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <TabBar tabs={TABS} active={active} onChange={setActive} />

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── Overview ───────────────────────────────────── */}
        {active === "overview" && (
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>Admin Dashboard</h2>
            <p style={{ color: "var(--color-neutral-500)", marginBottom: "2rem", fontSize: "0.9375rem" }}>
              Platform-wide monitoring and moderation.
            </p>

            {stats.loading ? <LoadingSpinner /> : stats.error ? <ErrorState message={stats.error} /> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <StatCard label="Total users"        value={s?.totalUsers      ?? "—"} sub={`${s?.totalTenants ?? 0} tenants · ${s?.totalOwners ?? 0} owners`} accent="primary" />
                <StatCard label="Active properties"  value={s?.totalProperties ?? "—"} sub={`${s?.totalRooms ?? 0} rooms total`}   accent="success" />
                <StatCard label="Available rooms"    value={s?.availableRooms  ?? "—"} sub="across platform"                       accent="success" />
                <StatCard label="Pending bookings"   value={s?.pendingBookings ?? "—"} sub="awaiting owner response"               accent="warning" />
                <StatCard label="Open maintenance"   value={s?.openMaintenance ?? "—"} sub="unresolved requests"                  accent="error"   />
                <StatCard label="Blacklisted users"  value={s?.blacklistedUsers ?? "—"} sub="suspended accounts"                  accent="error"   />
              </div>
            )}

            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4>Recently joined users</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setActive("users")}>View all</button>
              </div>
              {users.loading ? <LoadingSpinner /> : users.error ? <ErrorState message={users.error} /> : (
                <DataTable
                  headers={["Name", "Email", "Role", "University", "Joined"]}
                  emptyMessage="No users yet."
                  rows={(users.data?.users ?? []).slice(0, 5).map(u => [
                    u.name, u.email, u.role, u.university ?? "—", fmtDate(u.createdAt),
                  ])}
                />
              )}
            </div>

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4>Recent maintenance requests</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setActive("maintenance")}>View all</button>
              </div>
              {maintenance.loading ? <LoadingSpinner /> : maintenance.error ? <ErrorState message={maintenance.error} /> : (
                <DataTable
                  headers={["Title", "Category", "Property", "Submitted by", "Status", "Date"]}
                  emptyMessage="No maintenance requests yet."
                  rows={(maintenance.data?.requests ?? []).slice(0, 5).map(r => [
                    r.title, r.category, r.propertyId?.title ?? "—",
                    r.createdBy?.name ?? "—", r.status, fmtDate(r.createdAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Users ──────────────────────────────────────── */}
        {active === "users" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>All users</h3>

            {actionMsg.text && (
              <div style={{
                padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
                marginBottom: "1.25rem", fontSize: "0.875rem",
                background: actionMsg.type === "success" ? "var(--color-success-50)" : "var(--color-error-50)",
                border: `1px solid ${actionMsg.type === "success" ? "var(--color-success-500)" : "var(--color-error-500)"}`,
                color: actionMsg.type === "success" ? "var(--color-success-700)" : "var(--color-error-700)",
              }}>
                {actionMsg.text}
              </div>
            )}

            {users.loading ? <LoadingSpinner /> : users.error ? <ErrorState message={users.error} /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {(users.data?.users ?? []).map((u) => (
                  <div key={u._id} className="card" style={{
                    borderLeft: u.isBlacklisted ? "4px solid var(--color-error-500)" : "none",
                    borderRadius: u.isBlacklisted ? "0 var(--radius-xl) var(--radius-xl) 0" : undefined,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem" }}>
                          <p style={{ fontWeight: "600", fontSize: "1rem" }}>{u.name}</p>
                          <span style={{
                            fontSize: "0.7rem", fontWeight: "600",
                            padding: "0.15rem 0.5rem", borderRadius: "9999px",
                            background: u.role === "admin" ? "var(--color-error-50)"
                              : u.role === "owner" ? "var(--color-warning-50)"
                              : "var(--color-primary-50)",
                            color: u.role === "admin" ? "var(--color-error-700)"
                              : u.role === "owner" ? "var(--color-warning-700)"
                              : "var(--color-primary-700)",
                          }}>
                            {u.role}
                          </span>
                          {u.isBlacklisted && (
                            <span style={{
                              fontSize: "0.7rem", fontWeight: "600",
                              padding: "0.15rem 0.5rem", borderRadius: "9999px",
                              background: "var(--color-error-50)", color: "var(--color-error-700)",
                              border: "1px solid var(--color-error-300)",
                            }}>
                              Blacklisted
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-500)", marginBottom: "0.25rem" }}>
                          {u.email} {u.university ? `· ${u.university}` : ""}
                        </p>
                        <p style={{ fontSize: "0.8125rem", color: "var(--color-neutral-400)" }}>
                          Joined {fmtDate(u.createdAt)}
                        </p>
                        {u.isBlacklisted && u.blacklistReason && (
                          <p style={{ fontSize: "0.8125rem", color: "var(--color-error-600)", marginTop: "0.375rem" }}>
                            Reason: {u.blacklistReason}
                          </p>
                        )}
                      </div>

                      {/* Actions — skip for admins */}
                      {u.role !== "admin" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                          {!u.isBlacklisted ? (
                            <>
                              <input
                                type="text"
                                className="input"
                                placeholder="Reason (optional)"
                                style={{ width: "220px", fontSize: "0.8125rem" }}
                                value={reasonInput[u._id] || ""}
                                onChange={(e) => setReasonInput({ ...reasonInput, [u._id]: e.target.value })}
                              />
                              <button
                                className="btn btn-danger btn-sm"
                                disabled={!!actionLoading}
                                onClick={() => handleBlacklist(u._id, u.name)}
                              >
                                {actionLoading === u._id + "blacklist" ? "..." : "Blacklist"}
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={!!actionLoading}
                              onClick={() => handleUnblacklist(u._id, u.name)}
                            >
                              {actionLoading === u._id + "unblacklist" ? "..." : "Reinstate"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Properties ─────────────────────────────────── */}
        {active === "properties" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>All properties</h3>
            <div className="card">
              {properties.loading ? <LoadingSpinner /> : properties.error ? <ErrorState message={properties.error} /> : (
                <DataTable
                  headers={["Title", "Owner", "City", "Rent range", "Available rooms", "Listed on"]}
                  emptyMessage="No properties listed yet."
                  rows={(properties.data?.properties ?? []).map(p => [
                    p.title, p.ownerId?.name ?? "—", p.city,
                    p.rentRange?.min != null ? `${fmtMoney(p.rentRange.min)} – ${fmtMoney(p.rentRange.max)}` : "—",
                    p.availableRooms ?? "—", fmtDate(p.createdAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Bookings ───────────────────────────────────── */}
        {active === "bookings" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>All booking requests</h3>
            <div className="card">
              {bookings.loading ? <LoadingSpinner /> : bookings.error ? <ErrorState message={bookings.error} /> : (
                <DataTable
                  headers={["Tenant", "Owner", "Property", "Room", "Compatibility", "Status", "Date"]}
                  emptyMessage="No booking requests yet."
                  rows={(bookings.data?.bookings ?? []).map(b => [
                    b.tenantId?.name ?? "—", b.ownerId?.name ?? "—",
                    b.propertyId?.title ?? "—", b.roomId?.label ?? "—",
                    b.compatibilityScore != null ? `${b.compatibilityScore}%` : "—",
                    b.status, fmtDate(b.createdAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Maintenance ────────────────────────────────── */}
        {active === "maintenance" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>All maintenance requests</h3>
            <div className="card">
              {maintenance.loading ? <LoadingSpinner /> : maintenance.error ? <ErrorState message={maintenance.error} /> : (
                <DataTable
                  headers={["Title", "Category", "Property", "Room", "Submitted by", "Status", "Date"]}
                  emptyMessage="No maintenance requests yet."
                  rows={(maintenance.data?.requests ?? []).map(r => [
                    r.title, r.category, r.propertyId?.title ?? "—",
                    r.roomId?.label ?? "—", r.createdBy?.name ?? "—",
                    r.status, fmtDate(r.createdAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Notices ────────────────────────────────────── */}
        {active === "notices" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3>All notices</h3>
              <button className="btn btn-primary btn-sm">+ Post notice</button>
            </div>
            {notices.loading ? <LoadingSpinner /> : notices.error ? <ErrorState message={notices.error} /> :
              notices.data?.notices?.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                  <p style={{ color: "var(--color-neutral-500)" }}>No notices posted yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {(notices.data?.notices ?? []).map((n) => (
                    <div key={n._id} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <p style={{ fontWeight: "600" }}>{n.title}</p>
                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-neutral-400)" }}>{fmtDate(n.createdAt)}</span>
                          <span style={{ fontSize: "0.75rem", background: "var(--color-info-50)", color: "var(--color-info-700)", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>
                            {n.propertyId?.title ?? "Platform-wide"}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-700)", lineHeight: "1.6" }}>{n.message}</p>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

      </div>
    </div>
  );
}
