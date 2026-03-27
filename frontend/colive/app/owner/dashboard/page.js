"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import TabBar from "../../../components/TabBar";
import StatCard from "../../../components/StatCard";
import DataTable from "../../../components/DataTable";
import { LoadingSpinner, ErrorState } from "../../../components/LoadingState";
import useApi from "../../../lib/useApi";
import { getUser, propertyAPI, bookingAPI, maintenanceAPI, noticeAPI } from "../../../lib/api";

const TABS = [
  { key: "overview",    label: "Overview"      },
  { key: "properties",  label: "My Properties" },
  { key: "bookings",    label: "Bookings"       },
  { key: "maintenance", label: "Maintenance"    },
  { key: "notices",     label: "Notices"        },
  { key: "messages",    label: "Messages"       },
];

const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtMoney = (n) => n != null ? `BDT ${Number(n).toLocaleString()}` : "—";

const DEFAULT_TECHNICIAN = {
  electrical:   "Electrical Technician",
  plumbing:     "Plumber",
  gas:          "Gas Technician",
  appliance:    "Appliance Technician",
  structural:   "Structural Technician",
  pest_control: "Pest Control Technician",
  internet:     "Internet Technician",
  cleaning:     "Cleaning Staff",
  security:     "Security Technician",
  other:        "General Technician",
};

// Dropdown options for the technician assignment
const TECHNICIAN_OPTIONS = [
  { label: "Plumber",                 value: "Plumber" },
  { label: "Gas Technician",          value: "Gas Technician" },
  { label: "Appliance Technician",    value: "Appliance Technician" },
  { label: "Structural Technician",   value: "Structural Technician" },
  { label: "Pest Control Technician", value: "Pest Control Technician" },
  { label: "Internet Technician",     value: "Internet Technician" },
  { label: "Cleaning Staff",          value: "Cleaning Staff" },
  { label: "Security Staff",          value: "Security Staff" },
  { label: "General Technician",      value: "General Technician" },
  { label: "Electrical Technician",   value: "Electrical Technician" },
];

const STATUS_META = {
  pending:     { label: "Pending",     color: "#b45309", bg: "#fef3c7" },
  in_progress: { label: "In Progress", color: "#1d4ed8", bg: "#dbeafe" },
  resolved:    { label: "Resolved",    color: "#15803d", bg: "#dcfce7" },
};
const PRIORITY_META = {
  low:    { label: "Low",    color: "#6b7280", bg: "#f3f4f6" },
  medium: { label: "Medium", color: "#b45309", bg: "#fef3c7" },
  high:   { label: "High",   color: "#dc2626", bg: "#fee2e2" },
};

const Badge = ({ meta }) => (
  <span style={{
    display: "inline-block", padding: "0.2rem 0.6rem",
    borderRadius: "999px", fontSize: "0.75rem", fontWeight: "600",
    color: meta.color, background: meta.bg,
  }}>{meta.label}</span>
);

export default function OwnerDashboard() {
  const router = useRouter();
  const [user, setUser]     = useState(null);
  const [active, setActive] = useState("overview");

  // Maintenance management state
  const [mRequests, setMRequests]       = useState([]);
  const [mLoading, setMLoading]         = useState(false);
  const [mError, setMError]             = useState("");
  const [mFilter, setMFilter]           = useState("all");
  const [actionCard, setActionCard]     = useState(null);
  const [techInput, setTechInput]       = useState("");
  const [statusInput, setStatusInput]   = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]   = useState("");
  const [successMsg, setSuccessMsg]     = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "owner") { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  const properties = useApi(propertyAPI.getMy);
  const bookings   = useApi(bookingAPI.getReceived);
  const notices    = useApi(noticeAPI.getMy);

  const fetchMaintenance = useCallback(async () => {
    setMLoading(true);
    setMError("");
    try {
      const data = await maintenanceAPI.getProperty();
      setMRequests(data.requests ?? []);
    } catch (err) {
      setMError(err.message);
    } finally {
      setMLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchMaintenance();
  }, [user, fetchMaintenance]);

  const openActionCard = (r) => {
    setActionCard(r._id);
    setStatusInput(r.status);
    setTechInput(r.technicianName || DEFAULT_TECHNICIAN[r.category] || "General Technician");
    setActionError("");
  };

  const handleSave = async (id) => {
    setActionLoading(true); setActionError("");
    try {
      await maintenanceAPI.updateStatus(id, statusInput);
      if (techInput.trim()) {
        await maintenanceAPI.assignTechnician(id, techInput.trim());
      }
      setSuccessMsg("Request updated successfully.");
      setActionCard(null);
      fetchMaintenance();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) return null;

  const totalRooms      = properties.data?.properties?.reduce((s, p) => s + (p.rooms?.length ?? 0), 0) ?? 0;
  const availableRooms  = properties.data?.properties?.reduce((s, p) => s + (p.rooms?.filter(r => r.status === "available").length ?? 0), 0) ?? 0;
  const pendingBookings = bookings.data?.bookings?.filter(b => b.status === "pending").length ?? 0;
  const openMaintenance = mRequests.filter(r => r.status !== "resolved").length;

  const filteredRequests = mFilter === "all" ? mRequests : mRequests.filter(r => r.status === mFilter);
  const mCounts = {
    all:         mRequests.length,
    pending:     mRequests.filter(r => r.status === "pending").length,
    in_progress: mRequests.filter(r => r.status === "in_progress").length,
    resolved:    mRequests.filter(r => r.status === "resolved").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <TabBar tabs={TABS} active={active} onChange={setActive} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── Overview ───────────────────────────────────── */}
        {active === "overview" && (
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>Owner Dashboard</h2>
            <p style={{ color: "var(--color-neutral-500)", marginBottom: "2rem", fontSize: "0.9375rem" }}>
              Manage your properties, tenants, and bookings.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <StatCard label="Total properties"  value={properties.data?.count ?? "—"} sub={`${totalRooms} rooms total`}    accent="primary" />
              <StatCard label="Available rooms"   value={availableRooms}                sub="across all properties"         accent="success" />
              <StatCard label="Pending bookings"  value={pendingBookings}               sub="awaiting your response"         accent="warning" />
              <StatCard label="Open maintenance"  value={openMaintenance}               sub="unresolved requests"            accent="error"   />
            </div>
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4>Pending booking requests</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setActive("bookings")}>View all</button>
              </div>
              {bookings.loading ? <LoadingSpinner /> : bookings.error ? <ErrorState message={bookings.error} /> : (
                <DataTable
                  headers={["Tenant", "Property", "Room", "Compatibility", "Requested"]}
                  emptyMessage="No pending booking requests."
                  rows={(bookings.data?.bookings ?? []).filter(b => b.status === "pending").slice(0, 5).map(b => [
                    b.tenantId?.name ?? "—", b.propertyId?.title ?? "—", b.roomId?.label ?? "—",
                    b.compatibilityScore != null ? `${b.compatibilityScore}%` : "—", fmtDate(b.createdAt),
                  ])}
                />
              )}
            </div>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4>Open maintenance requests</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setActive("maintenance")}>View all</button>
              </div>
              {mLoading ? <LoadingSpinner /> : mError ? <ErrorState message={mError} /> : (
                <DataTable
                  headers={["Title", "Category", "Property", "Room", "Status"]}
                  emptyMessage="No open maintenance requests."
                  rows={mRequests.filter(r => r.status !== "resolved").slice(0, 5).map(r => [
                    r.title, r.category, r.propertyId?.title ?? "—", r.roomId?.label ?? "—", r.status,
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {/* ── My Properties ──────────────────────────────── */}
        {active === "properties" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3>My properties</h3>
              <button className="btn btn-primary btn-sm">+ Add property</button>
            </div>
            {properties.loading ? <LoadingSpinner /> : properties.error ? <ErrorState message={properties.error} /> :
              properties.data?.properties?.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                  <p style={{ color: "var(--color-neutral-500)", marginBottom: "1rem" }}>You have not listed any properties yet.</p>
                  <button className="btn btn-primary">+ Add your first property</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {(properties.data?.properties ?? []).map((p) => {
                    const avail = p.rooms?.filter(r => r.status === "available").length ?? 0;
                    return (
                      <div key={p._id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                        <div>
                          <p style={{ fontWeight: "600", fontSize: "1rem", marginBottom: "0.25rem" }}>{p.title}</p>
                          <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-500)" }}>
                            {p.city} · {p.rooms?.length ?? 0} rooms · {fmtMoney(p.rentRange?.min)}–{fmtMoney(p.rentRange?.max)}/mo
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <span style={{ fontSize: "0.875rem", color: "var(--color-neutral-600)" }}>{avail}/{p.rooms?.length ?? 0} available</span>
                          <button className="btn btn-secondary btn-sm">Manage</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        )}

        {/* ── Bookings ───────────────────────────────────── */}
        {active === "bookings" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>All booking requests</h3>
            <div className="card">
              {bookings.loading ? <LoadingSpinner /> : bookings.error ? <ErrorState message={bookings.error} /> : (
                <DataTable
                  headers={["Tenant", "Property", "Room", "Rent", "Compatibility", "Status", "Date"]}
                  emptyMessage="No booking requests received yet."
                  rows={(bookings.data?.bookings ?? []).map(b => [
                    b.tenantId?.name ?? "—", b.propertyId?.title ?? "—", b.roomId?.label ?? "—",
                    fmtMoney(b.roomId?.rent),
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
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0 }}>Maintenance Management</h3>
              <p style={{ color: "var(--color-neutral-500)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                Assign technicians and update request statuses.
              </p>
            </div>

            {/* Filter stat buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.875rem", marginBottom: "1.5rem" }}>
              {[
                { key: "all",         label: "Total",       color: "#111827" },
                { key: "pending",     label: "Pending",     color: "#b45309" },
                { key: "in_progress", label: "In Progress", color: "#1d4ed8" },
                { key: "resolved",    label: "Resolved",    color: "#15803d" },
              ].map(s => (
                <button key={s.key} onClick={() => setMFilter(s.key)} style={{
                  background: mFilter === s.key ? "#111827" : "#ffffff",
                  color: mFilter === s.key ? "#ffffff" : "#374151",
                  border: `1px solid ${mFilter === s.key ? "#111827" : "#e5e7eb"}`,
                  borderRadius: "10px", padding: "1rem", textAlign: "center",
                  cursor: "pointer",
                }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: mFilter === s.key ? "#ffffff" : s.color }}>
                    {mCounts[s.key]}
                  </div>
                  <div style={{ fontSize: "0.8125rem", marginTop: "0.2rem", fontWeight: "500" }}>{s.label}</div>
                </button>
              ))}
            </div>

            {/* Success */}
            {successMsg && (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "0.875rem 1.25rem", marginBottom: "1.25rem", color: "#15803d", fontSize: "0.875rem", fontWeight: "500" }}>
                ✓ {successMsg}
              </div>
            )}

            {/* Requests */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {mLoading ? <LoadingSpinner /> : mError ? <ErrorState message={mError} /> :
                filteredRequests.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-neutral-400)" }}>
                    No requests in this category.
                  </div>
                ) : filteredRequests.map(r => (
                  <div key={r._id} className="card" style={{ padding: 0, overflow: "hidden" }}>

                    {/* Card body */}
                    <div style={{ padding: "1.25rem 1.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                            <span style={{ fontWeight: "600", fontSize: "0.9375rem", color: "#111827" }}>{r.title}</span>
                            <Badge meta={STATUS_META[r.status]    ?? STATUS_META.pending}  />
                            <Badge meta={PRIORITY_META[r.priority] ?? PRIORITY_META.medium} />
                          </div>
                          <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>{r.description}</p>
                          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "#9ca3af" }}>
                            <span>👤 {r.createdBy?.name ?? "—"}</span>
                            <span>📍 {r.propertyId?.title ?? "—"}</span>
                            <span>🚪 {r.roomId?.label ?? "—"}</span>
                            <span>🏷 {r.category}</span>
                            <span>📅 {fmtDate(r.createdAt)}</span>
                            {r.technicianName && <span>🔧 {r.technicianName}</span>}
                          </div>
                        </div>

                        {r.status !== "resolved" && (
                          <button
                            onClick={() => actionCard === r._id ? setActionCard(null) : openActionCard(r)}
                            style={{
                              background: actionCard === r._id ? "#f3f4f6" : "#111827",
                              color: actionCard === r._id ? "#374151" : "#ffffff",
                              border: "none", borderRadius: "8px",
                              padding: "0.5rem 1rem", fontSize: "0.8125rem",
                              fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap",
                            }}
                          >
                            {actionCard === r._id ? "✕ Close" : "Manage"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action panel */}
                    {actionCard === r._id && (
                      <div style={{ borderTop: "1px solid #f3f4f6", background: "#fafafa", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {actionError && (
                          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.625rem 1rem", color: "#dc2626", fontSize: "0.8125rem" }}>
                            {actionError}
                          </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignItems: "end" }}>
                          {/* Status dropdown */}
                          <div>
                            <p style={{ margin: "0 0 0.5rem", fontSize: "0.8125rem", fontWeight: "600", color: "#374151" }}>Status</p>
                            <select
                              value={statusInput}
                              onChange={(e) => setStatusInput(e.target.value)}
                              style={{
                                width: "100%", padding: "0.55rem 0.875rem",
                                border: "1px solid #d1d5db", borderRadius: "8px",
                                fontSize: "0.875rem", color: "#111827",
                                background: "#ffffff", outline: "none", cursor: "pointer",
                              }}
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                            </select>
                          </div>

                          {/* Technician dropdown */}
                          <div>
                            <p style={{ margin: "0 0 0.5rem", fontSize: "0.8125rem", fontWeight: "600", color: "#374151" }}>Assigned Technician</p>
                            <select
                              value={techInput}
                              onChange={(e) => { setTechInput(e.target.value); setActionError(""); }}
                              style={{
                                width: "100%", padding: "0.55rem 0.875rem",
                                border: "1px solid #d1d5db", borderRadius: "8px",
                                fontSize: "0.875rem", color: "#111827",
                                background: "#ffffff", outline: "none", cursor: "pointer",
                              }}
                            >
                              <option value="" disabled>Select a technician...</option>
                              {TECHNICIAN_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleSave(r._id)}
                            disabled={actionLoading}
                            style={{
                              padding: "0.55rem 1.5rem", borderRadius: "8px",
                              background: "#111827", color: "#ffffff", border: "none",
                              fontWeight: "600", fontSize: "0.875rem",
                              cursor: actionLoading ? "not-allowed" : "pointer",
                              opacity: actionLoading ? 0.6 : 1,
                            }}
                          >
                            {actionLoading ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ── Notices ────────────────────────────────────── */}
        {active === "notices" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3>Notices</h3>
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
                        <span style={{ fontSize: "0.75rem", color: "var(--color-neutral-400)" }}>{fmtDate(n.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: "0.8125rem", color: "var(--color-neutral-500)", marginBottom: "0.5rem" }}>{n.propertyId?.title ?? "—"}</p>
                      <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-700)" }}>{n.message}</p>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── Messages ────────────────────────────────────── */}
        {active === "messages" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>Messages</h3>
            <div className="card">
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: "var(--color-neutral-600)", marginBottom: "1rem" }}>
                  View and manage your conversations with tenants.
                </p>
                <Link href="/messages" className="btn btn-primary">
                  Go to messages
                </Link>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}