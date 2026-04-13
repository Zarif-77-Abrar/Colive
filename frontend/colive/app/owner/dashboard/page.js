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
import { getUser, propertyAPI, bookingAPI, maintenanceAPI, noticeAPI, guestLogAPI } from "../../../lib/api";
import useFCM from "../../../lib/useFCM";

const TABS = [
  { key: "overview",    label: "Overview"      },
  { key: "properties",  label: "My Properties" },
  { key: "bookings",    label: "Bookings"       },
  { key: "maintenance", label: "Maintenance"    },
  { key: "notices",     label: "Notices"        },
  { key: "messages",    label: "Messages"       },
  { key: "others",      label: "Others"        },
];

const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtMoney = (n) => n != null ? `BDT ${Number(n).toLocaleString()}` : "—";

const DEFAULT_TECHNICIAN = {
  electrical: "Electrical Technician", plumbing: "Plumber",
  gas: "Gas Technician", appliance: "Appliance Technician",
  structural: "Structural Technician", pest_control: "Pest Control Technician",
  internet: "Internet Technician", cleaning: "Cleaning Staff",
  security: "Security Technician", other: "General Technician",
};
const TECHNICIAN_OPTIONS = [
  "Electrical Technician","Plumber","Gas Technician","Appliance Technician",
  "Structural Technician","Pest Control Technician","Internet Technician",
  "Cleaning Staff","Security Staff","General Technician",
];

const MSTATUS_META = {
  pending:     { label: "Pending",     color: "#b45309", bg: "#fef3c7" },
  in_progress: { label: "In Progress", color: "#1d4ed8", bg: "#dbeafe" },
  resolved:    { label: "Resolved",    color: "#15803d", bg: "#dcfce7" },
};
const PRIORITY_META = {
  low:    { label: "Low",    color: "#6b7280", bg: "#f3f4f6" },
  medium: { label: "Medium", color: "#b45309", bg: "#fef3c7" },
  high:   { label: "High",   color: "#dc2626", bg: "#fee2e2" },
};
const GSTATUS_META = {
  pending:  { label: "Pending",  color: "#b45309", bg: "#fef3c7" },
  approved: { label: "Approved", color: "#15803d", bg: "#dcfce7" },
  rejected: { label: "Rejected", color: "#dc2626", bg: "#fee2e2" },
};

const Badge = ({ meta }) => (
  <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "600", color: meta.color, background: meta.bg }}>
    {meta.label}
  </span>
);

export default function OwnerDashboard() {
  const router = useRouter();
  const [user, setUser]   = useState(null);
  const [active, setActive] = useState("overview");
  const [actionLoading, setActionLoading] = useState(null);
  const [actionMsg,     setActionMsg]     = useState("");  

  // useFCM();
  const [othersSection, setOthersSection] = useState(null);

  // Maintenance state
  const [mRequests, setMRequests]         = useState([]);
  const [mLoading, setMLoading]           = useState(false);
  const [mError, setMError]               = useState("");
  const [mFilter, setMFilter]             = useState("all");
  const [mActionCard, setMActionCard]     = useState(null);
  const [techInput, setTechInput]         = useState("");
  const [mStatusInput, setMStatusInput]   = useState("");
  const [mActionLoading, setMActionLoading] = useState(false);
  const [mActionError, setMActionError]   = useState("");
  const [mSuccess, setMSuccess]           = useState("");

  // Guest log state
  const [gLogs, setGLogs]               = useState([]);
  const [gLoading, setGLoading]         = useState(false);
  const [gError, setGError]             = useState("");
  const [gFilter, setGFilter]           = useState("all");
  const [gActionCard, setGActionCard]   = useState(null);
  const [gStatusInput, setGStatusInput] = useState("pending");
  const [gActionLoading, setGActionLoading] = useState(false);
  const [gActionError, setGActionError] = useState("");
  const [gSuccess, setGSuccess]         = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "owner") { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  const handleBookingAction = async (bookingId, action) => {
    setActionLoading(bookingId + action);
    setActionMsg("");
    try {
      await bookingAPI[action === "accept" ? "accept" : "reject"](bookingId);
      setActionMsg(`Booking ${action}ed successfully.`);
      // bookings.refetch?.();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const properties = useApi(propertyAPI.getMy);
  const bookings   = useApi(bookingAPI.getReceived);
  const notices    = useApi(noticeAPI.getMy);

  const fetchMaintenance = useCallback(async () => {
    setMLoading(true); setMError("");
    try { const d = await maintenanceAPI.getProperty(); setMRequests(d.requests ?? []); }
    catch (e) { setMError(e.message); } finally { setMLoading(false); }
  }, []);

  const fetchGuestLogs = useCallback(async () => {
    setGLoading(true); setGError("");
    try { const d = await guestLogAPI.getProperty(); setGLogs(d.logs ?? []); }
    catch (e) { setGError(e.message); } finally { setGLoading(false); }
  }, []);

  useEffect(() => {
    if (user) { fetchMaintenance(); fetchGuestLogs(); }
  }, [user, fetchMaintenance, fetchGuestLogs]);

  // Maintenance handlers
  const openMActionCard = (r) => {
    setMActionCard(r._id); setMStatusInput(r.status);
    setTechInput(r.technicianName || DEFAULT_TECHNICIAN[r.category] || "General Technician");
    setMActionError("");
  };
  const handleMSave = async (id) => {
    setMActionLoading(true); setMActionError("");
    try {
      await maintenanceAPI.updateStatus(id, mStatusInput);
      if (techInput.trim()) await maintenanceAPI.assignTechnician(id, techInput.trim());
      setMSuccess("Request updated."); setMActionCard(null); fetchMaintenance();
      setTimeout(() => setMSuccess(""), 3000);
    } catch (e) { setMActionError(e.message); } finally { setMActionLoading(false); }
  };

  // Guest log handlers
  const openGActionCard = (g) => {
    setGActionCard(g._id); setGStatusInput(g.status); setGActionError("");
  };
  const handleGSave = async (id) => {
    setGActionLoading(true); setGActionError("");
    try {
      await guestLogAPI.updateStatus(id, gStatusInput);
      setGSuccess("Status updated."); setGActionCard(null); fetchGuestLogs();
      setTimeout(() => setGSuccess(""), 3000);
    } catch (e) { setGActionError(e.message); } finally { setGActionLoading(false); }
  };

  if (!user) return null;

  const totalRooms      = properties.data?.properties?.reduce((s, p) => s + (p.rooms?.length ?? 0), 0) ?? 0;
  const availableRooms  = properties.data?.properties?.reduce((s, p) => s + (p.rooms?.filter(r => r.status === "available").length ?? 0), 0) ?? 0;
  const pendingBookings = bookings.data?.bookings?.filter(b => b.status === "pending").length ?? 0;
  const openMaintenance = mRequests.filter(r => r.status !== "resolved").length;

  const mFiltered = mFilter === "all" ? mRequests : mRequests.filter(r => r.status === mFilter);
  const mCounts   = { all: mRequests.length, pending: mRequests.filter(r => r.status === "pending").length, in_progress: mRequests.filter(r => r.status === "in_progress").length, resolved: mRequests.filter(r => r.status === "resolved").length };

  const gFiltered = gFilter === "all" ? gLogs : gLogs.filter(g => g.status === gFilter);
  const gCounts   = { all: gLogs.length, pending: gLogs.filter(g => g.status === "pending").length, approved: gLogs.filter(g => g.status === "approved").length, rejected: gLogs.filter(g => g.status === "rejected").length };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <TabBar tabs={TABS} active={active} onChange={setActive} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── Overview ───────────────────────────────────── */}
        {active === "overview" && (
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>Owner Dashboard</h2>
            <p style={{ color: "var(--color-neutral-500)", marginBottom: "2rem", fontSize: "0.9375rem" }}>Manage your properties, tenants, and bookings.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <StatCard label="Total properties" value={properties.data?.count ?? "—"} sub={`${totalRooms} rooms total`}    accent="primary" />
              <StatCard label="Available rooms"  value={availableRooms}               sub="across all properties"           accent="success" />
              <StatCard label="Pending bookings" value={pendingBookings}              sub="awaiting your response"           accent="warning" />
              <StatCard label="Open maintenance" value={openMaintenance}              sub="unresolved requests"              accent="error"   />
            </div>
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4>Pending booking requests</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setActive("bookings")}>View all</button>
              </div>
              {bookings.loading ? <LoadingSpinner /> : bookings.error ? <ErrorState message={bookings.error} /> : (
                <DataTable headers={["Tenant", "Property", "Room", "Compatibility", "Requested"]} emptyMessage="No pending booking requests."
                  rows={(bookings.data?.bookings ?? []).filter(b => b.status === "pending").slice(0, 5).map(b => [
                    b.tenantId?.name ?? "—", b.propertyId?.title ?? "—", b.roomId?.label ?? "—",
                    b.compatibilityScore != null ? `${b.compatibilityScore}%` : "—", fmtDate(b.createdAt),
                  ])} />
              )}
            </div>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4>Open maintenance requests</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setActive("maintenance")}>View all</button>
              </div>
              {mLoading ? <LoadingSpinner /> : mError ? <ErrorState message={mError} /> : (
                <DataTable headers={["Title", "Category", "Property", "Room", "Status"]} emptyMessage="No open maintenance requests."
                  rows={mRequests.filter(r => r.status !== "resolved").slice(0, 5).map(r => [
                    r.title, r.category, r.propertyId?.title ?? "—", r.roomId?.label ?? "—", r.status,
                  ])} />
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
                  {(properties.data?.properties ?? []).map(p => {
                    const avail = p.rooms?.filter(r => r.status === "available").length ?? 0;
                    return (
                      <div key={p._id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                        <div>
                          <p style={{ fontWeight: "600", fontSize: "1rem", marginBottom: "0.25rem" }}>{p.title}</p>
                          <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-500)" }}>{p.city} · {p.rooms?.length ?? 0} rooms · {fmtMoney(p.rentRange?.min)}–{fmtMoney(p.rentRange?.max)}/mo</p>
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
              
              {actionMsg && (
                <div style={{
                  padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
                  marginBottom: "1rem", fontSize: "0.875rem",
                  background: "var(--color-success-50)",
                  border: "1px solid var(--color-success-500)",
                  color: "var(--color-success-700)",
                }}>
                  {actionMsg}
                </div>
              )}
              {bookings.loading ? <LoadingSpinner /> : bookings.error ? <ErrorState message={bookings.error} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {bookings.data?.bookings?.length === 0 && (
                    <p style={{ color: "var(--color-neutral-400)", fontSize: "0.875rem" }}>No booking requests received yet.</p>
                  )}
                  {(bookings.data?.bookings ?? []).map((b) => (
                    <div key={b._id} style={{
                      padding: "1rem", borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-neutral-200)",
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", flexWrap: "wrap", gap: "1rem",
                    }}>
                      <div>
                        <p style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
                          {b.tenantId?.name ?? "—"} → {b.propertyId?.title ?? "—"}, {b.roomId?.label ?? "—"}
                        </p>
                        <p style={{ fontSize: "0.8125rem", color: "var(--color-neutral-500)" }}>
                          {fmtMoney(b.roomId?.rent)}/mo
                          {b.compatibilityScore != null ? ` · ${b.compatibilityScore}% compatibility` : ""}
                          {" · "}{fmtDate(b.createdAt)}
                        </p>
                        {b.message && (
                          <p style={{ fontSize: "0.8125rem", color: "var(--color-neutral-600)", marginTop: "0.25rem" }}>
                            &ldquo;{b.message}&rdquo;
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        {b.status === "pending" ? (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={!!actionLoading}
                              onClick={() => handleBookingAction(b._id, "accept")}
                            >
                              {actionLoading === b._id + "accept" ? "..." : "Accept"}
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={!!actionLoading}
                              onClick={() => handleBookingAction(b._id, "reject")}
                            >
                              {actionLoading === b._id + "reject" ? "..." : "Decline"}
                            </button>
                          </>
                        ) : (
                          <span style={{
                            fontSize: "0.75rem", fontWeight: "500",
                            padding: "0.2rem 0.625rem", borderRadius: "9999px",
                            background: b.status === "accepted" ? "var(--color-success-50)" : "var(--color-error-50)",
                            color: b.status === "accepted" ? "var(--color-success-700)" : "var(--color-error-700)",
                          }}>
                            {b.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}                
            </div>
          </div>
        )}

        {/* ── Maintenance ────────────────────────────────── */}
        {active === "maintenance" && (
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0 }}>Maintenance Management</h3>
              <p style={{ color: "var(--color-neutral-500)", fontSize: "0.875rem", marginTop: "0.25rem" }}>Assign technicians and update request statuses.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.875rem", marginBottom: "1.5rem" }}>
              {[{ key: "all", label: "Total", color: "#111827" }, { key: "pending", label: "Pending", color: "#b45309" }, { key: "in_progress", label: "In Progress", color: "#1d4ed8" }, { key: "resolved", label: "Resolved", color: "#15803d" }].map(s => (
                <button key={s.key} onClick={() => setMFilter(s.key)} style={{ background: mFilter === s.key ? "#111827" : "#ffffff", color: mFilter === s.key ? "#ffffff" : "#374151", border: `1px solid ${mFilter === s.key ? "#111827" : "#e5e7eb"}`, borderRadius: "10px", padding: "1rem", textAlign: "center", cursor: "pointer" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: mFilter === s.key ? "#ffffff" : s.color }}>{mCounts[s.key]}</div>
                  <div style={{ fontSize: "0.8125rem", marginTop: "0.2rem", fontWeight: "500" }}>{s.label}</div>
                </button>
              ))}
            </div>
            {mSuccess && <div style={successBannerStyle}>✓ {mSuccess}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {mLoading ? <LoadingSpinner /> : mError ? <ErrorState message={mError} /> :
                mFiltered.length === 0 ? <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-neutral-400)" }}>No requests in this category.</div>
                : mFiltered.map(r => (
                  <div key={r._id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "1.25rem 1.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                            <span style={{ fontWeight: "600", fontSize: "0.9375rem", color: "#111827" }}>{r.title}</span>
                            <Badge meta={MSTATUS_META[r.status] ?? MSTATUS_META.pending} />
                            <Badge meta={PRIORITY_META[r.priority] ?? PRIORITY_META.medium} />
                          </div>
                          <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>{r.description}</p>
                          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "#9ca3af" }}>
                            <span>👤 {r.createdBy?.name ?? "—"}</span>
                            <span>📍 {r.propertyId?.title ?? "—"}</span>
                            <span>🏷 {r.category}</span>
                            <span>📅 {fmtDate(r.createdAt)}</span>
                            {r.technicianName && <span>🔧 {r.technicianName}</span>}
                          </div>
                        </div>
                        <button onClick={() => mActionCard === r._id ? setMActionCard(null) : openMActionCard(r)}
                          style={{ background: mActionCard === r._id ? "#f3f4f6" : "#111827", color: mActionCard === r._id ? "#374151" : "#ffffff", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.8125rem", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}>
                          {mActionCard === r._id ? "✕ Close" : "Manage"}
                        </button>
                      </div>
                    </div>
                    {mActionCard === r._id && (
                      <div style={{ borderTop: "1px solid #f3f4f6", background: "#fafafa", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {mActionError && <div style={errorBannerStyle}>{mActionError}</div>}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignItems: "end" }}>
                          <div>
                            <p style={panelLabelStyle}>Status</p>
                            <select value={mStatusInput} onChange={e => setMStatusInput(e.target.value)} style={selectStyle}>
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                            </select>
                          </div>
                          <div>
                            <p style={panelLabelStyle}>Assigned Technician</p>
                            <select value={techInput} onChange={e => setTechInput(e.target.value)} style={selectStyle}>
                              {TECHNICIAN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button onClick={() => handleMSave(r._id)} disabled={mActionLoading}
                            style={{ ...saveBtnStyle, opacity: mActionLoading ? 0.6 : 1 }}>
                            {mActionLoading ? "Saving..." : "Save Changes"}
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
                  {(notices.data?.notices ?? []).map(n => (
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
        {/* ── Others ─────────────────────────────────────── */}
        {active === "others" && (
          <div>
            {/* Hub */}
            {!othersSection && (
              <div>
                <h3 style={{ marginBottom: "0.25rem" }}>Others</h3>
                <p style={{ color: "var(--color-neutral-500)", fontSize: "0.9375rem", marginBottom: "2rem" }}>Additional property management tools.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
                  <button onClick={() => setOthersSection("guest")} style={hubBtnStyle}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🚪</div>
                    <div style={{ fontWeight: "700", fontSize: "1rem", color: "#111827", marginBottom: "0.375rem" }}>Guest Entry Log</div>
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: "1.5" }}>Review and approve guest visits for your properties.</div>
                  </button>
                  <div style={{ ...hubBtnStyle, opacity: 0.5, cursor: "not-allowed" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🍽️</div>
                    <div style={{ fontWeight: "700", fontSize: "1rem", color: "#111827", marginBottom: "0.375rem" }}>Daily Meal</div>
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>Coming soon.</div>
                  </div>
                  <div style={{ ...hubBtnStyle, opacity: 0.5, cursor: "not-allowed" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📢</div>
                    <div style={{ fontWeight: "700", fontSize: "1rem", color: "#111827", marginBottom: "0.375rem" }}>Check Notice</div>
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>Coming soon.</div>
                  </div>
                </div>
              </div>
            )}

            {/* Guest Entry Log */}
            {othersSection === "guest" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1.5rem" }}>
                  <button onClick={() => setOthersSection(null)}
                    style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "0.4rem 0.875rem", fontSize: "0.8125rem", fontWeight: "600", color: "#374151", cursor: "pointer" }}>
                    ← Back
                  </button>
                  <div>
                    <h3 style={{ margin: 0 }}>Guest Entry Log</h3>
                    <p style={{ color: "var(--color-neutral-500)", fontSize: "0.875rem", marginTop: "0.125rem" }}>Your properties only · Approve or reject guest visits.</p>
                  </div>
                </div>

                {/* Filter buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.875rem", marginBottom: "1.5rem" }}>
                  {[{ key: "all", label: "Total", color: "#111827" }, { key: "pending", label: "Pending", color: "#b45309" }, { key: "approved", label: "Approved", color: "#15803d" }, { key: "rejected", label: "Rejected", color: "#dc2626" }].map(s => (
                    <button key={s.key} onClick={() => setGFilter(s.key)} style={{ background: gFilter === s.key ? "#111827" : "#ffffff", color: gFilter === s.key ? "#ffffff" : "#374151", border: `1px solid ${gFilter === s.key ? "#111827" : "#e5e7eb"}`, borderRadius: "10px", padding: "1rem", textAlign: "center", cursor: "pointer" }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: "700", color: gFilter === s.key ? "#ffffff" : s.color }}>{gCounts[s.key]}</div>
                      <div style={{ fontSize: "0.8125rem", marginTop: "0.2rem", fontWeight: "500" }}>{s.label}</div>
                    </button>
                  ))}
                </div>

                {gSuccess && <div style={successBannerStyle}>✓ {gSuccess}</div>}

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {gLoading ? <LoadingSpinner /> : gError ? <ErrorState message={gError} /> :
                    gFiltered.length === 0 ? <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-neutral-400)" }}>No guest entries in this category.</div>
                    : gFiltered.map(g => (
                      <div key={g._id} className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                              <span style={{ fontWeight: "600", fontSize: "0.9375rem", color: "#111827" }}>👤 {g.guestName}</span>
                              <Badge meta={GSTATUS_META[g.status] ?? GSTATUS_META.pending} />
                            </div>
                            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "#9ca3af" }}>
                              <span>🎯 {g.purpose}</span>
                              {g.relationship && <span>🤝 {g.relationship}</span>}
                              <span>🏠 {g.userId?.name ?? "—"}</span>
                              <span>📍 {g.propertyId?.title ?? "—"}</span>
                              <span>📅 {fmtDate(g.visitDate)}</span>
                              <span>🕐 {g.visitTime}</span>
                            </div>
                          </div>
                          <select
                            defaultValue={g.status}
                            onChange={async (e) => {
                              try {
                                await guestLogAPI.updateStatus(g._id, e.target.value);
                                setGSuccess("Status updated.");
                                fetchGuestLogs();
                                setTimeout(() => setGSuccess(""), 3000);
                              } catch (err) { setGActionError(err.message); }
                            }}
                            style={{
                              padding: "0.45rem 0.75rem",
                              border: `1px solid ${g.status === "approved" ? "#86efac" : g.status === "rejected" ? "#fca5a5" : "#d1d5db"}`,
                              borderRadius: "8px", fontSize: "0.8125rem", fontWeight: "600",
                              color: g.status === "approved" ? "#15803d" : g.status === "rejected" ? "#dc2626" : "#b45309",
                              background: g.status === "approved" ? "#f0fdf4" : g.status === "rejected" ? "#fef2f2" : "#fefce8",
                              outline: "none", cursor: "pointer",
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

const successBannerStyle = { background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "0.875rem 1.25rem", marginBottom: "1.25rem", color: "#15803d", fontSize: "0.875rem", fontWeight: "500" };
const errorBannerStyle   = { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.625rem 1rem", color: "#dc2626", fontSize: "0.8125rem" };
const panelLabelStyle    = { margin: "0 0 0.5rem", fontSize: "0.8125rem", fontWeight: "600", color: "#374151" };
const selectStyle        = { width: "100%", padding: "0.55rem 0.875rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827", background: "#ffffff", outline: "none", cursor: "pointer" };
const saveBtnStyle       = { padding: "0.55rem 1.5rem", borderRadius: "8px", background: "#111827", color: "#ffffff", border: "none", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer" };
const hubBtnStyle        = { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" };