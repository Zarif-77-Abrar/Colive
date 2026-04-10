"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import TabBar from "../../../components/TabBar";
import StatCard from "../../../components/StatCard";
import DataTable from "../../../components/DataTable";
import { LoadingSpinner, ErrorState } from "../../../components/LoadingState";
import useApi from "../../../lib/useApi";
import { getUser, adminAPI, maintenanceAPI, guestLogAPI } from "../../../lib/api";

const TABS = [
  { key: "overview",    label: "Overview"    },
  { key: "users",       label: "Users"       },
  { key: "properties",  label: "Properties"  },
  { key: "bookings",    label: "Bookings"    },
  { key: "maintenance", label: "Maintenance" },
  { key: "notices",     label: "Notices"     },
  { key: "others",      label: "Others"      },
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

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser]     = useState(null);
  const [active, setActive] = useState("overview");
  const [othersSection, setOthersSection] = useState(null);

  // Maintenance state
  const [mRequests, setMRequests]         = useState([]);
  const [mLoading, setMLoading]           = useState(false);
  const [mError, setMError]               = useState("");
  const [mFilter, setMFilter]             = useState("all");
  const [mSearch, setMSearch]             = useState("");
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
  const [gSearch, setGSearch]           = useState("");
  const [gActionCard, setGActionCard]   = useState(null);
  const [gStatusInput, setGStatusInput] = useState("pending");
  const [gActionLoading, setGActionLoading] = useState(false);
  const [gActionError, setGActionError] = useState("");
  const [gSuccess, setGSuccess]         = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "admin") { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  const stats      = useApi(adminAPI.getStats);
  const users      = useApi(adminAPI.getUsers);
  const properties = useApi(adminAPI.getProperties);
  const bookings   = useApi(adminAPI.getBookings);
  const notices    = useApi(adminAPI.getNotices);

  const fetchMaintenance = useCallback(async () => {
    setMLoading(true); setMError("");
    try { const d = await maintenanceAPI.getAll(); setMRequests(d.requests ?? []); }
    catch (e) { setMError(e.message); } finally { setMLoading(false); }
  }, []);

  const fetchGuestLogs = useCallback(async () => {
    setGLoading(true); setGError("");
    try { const d = await guestLogAPI.getAll(); setGLogs(d.logs ?? []); }
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

  const s = stats.data?.stats;

  // Maintenance filtering: status + property search
  const mFiltered = mRequests
    .filter(r => mFilter === "all" || r.status === mFilter)
    .filter(r => {
      if (!mSearch.trim()) return true;
      const q = mSearch.toLowerCase();
      return (r.propertyId?.title ?? "").toLowerCase().includes(q) ||
             (r.propertyId?._id  ?? "").toLowerCase().includes(q);
    });
  const mCounts = { all: mRequests.length, pending: mRequests.filter(r => r.status === "pending").length, in_progress: mRequests.filter(r => r.status === "in_progress").length, resolved: mRequests.filter(r => r.status === "resolved").length };

  // Guest log filtering: status + property search
  const gFiltered = gLogs
    .filter(g => gFilter === "all" || g.status === gFilter)
    .filter(g => {
      if (!gSearch.trim()) return true;
      const q = gSearch.toLowerCase();
      return (g.propertyId?.title ?? "").toLowerCase().includes(q) ||
             (g.propertyId?._id  ?? "").toLowerCase().includes(q);
    });
  const gCounts = { all: gLogs.length, pending: gLogs.filter(g => g.status === "pending").length, approved: gLogs.filter(g => g.status === "approved").length, rejected: gLogs.filter(g => g.status === "rejected").length };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <TabBar tabs={TABS} active={active} onChange={setActive} />

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── Overview ───────────────────────────────────── */}
        {active === "overview" && (
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>Admin Dashboard</h2>
            <p style={{ color: "var(--color-neutral-500)", marginBottom: "2rem", fontSize: "0.9375rem" }}>Platform-wide monitoring and moderation.</p>
            {stats.loading ? <LoadingSpinner /> : stats.error ? <ErrorState message={stats.error} /> : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <StatCard label="Total users"       value={s?.totalUsers      ?? "—"} sub={`${s?.totalTenants ?? 0} tenants · ${s?.totalOwners ?? 0} owners`} accent="primary" />
                <StatCard label="Active properties" value={s?.totalProperties ?? "—"} sub={`${s?.totalRooms ?? 0} rooms total`}    accent="success" />
                <StatCard label="Available rooms"   value={s?.availableRooms  ?? "—"} sub="across platform"                        accent="success" />
                <StatCard label="Pending bookings"  value={s?.pendingBookings ?? "—"} sub="awaiting owner response"                accent="warning" />
                <StatCard label="Open maintenance"  value={s?.openMaintenance ?? "—"} sub="unresolved requests"                    accent="error"   />
              </div>
            )}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4>Recently joined users</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setActive("users")}>View all</button>
              </div>
              {users.loading ? <LoadingSpinner /> : users.error ? <ErrorState message={users.error} /> : (
                <DataTable headers={["Name", "Email", "Role", "University", "Joined"]} emptyMessage="No users yet."
                  rows={(users.data?.users ?? []).slice(0, 5).map(u => [u.name, u.email, u.role, u.university ?? "—", fmtDate(u.createdAt)])} />
              )}
            </div>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4>Recent maintenance requests</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setActive("maintenance")}>View all</button>
              </div>
              {mLoading ? <LoadingSpinner /> : mError ? <ErrorState message={mError} /> : (
                <DataTable headers={["Title", "Category", "Property", "Submitted by", "Status", "Date"]} emptyMessage="No maintenance requests yet."
                  rows={mRequests.slice(0, 5).map(r => [r.title, r.category, r.propertyId?.title ?? "—", r.createdBy?.name ?? "—", r.status, fmtDate(r.createdAt)])} />
              )}
            </div>
          </div>
        )}

        {/* ── Users ──────────────────────────────────────── */}
        {active === "users" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>All users</h3>
            <div className="card">
              {users.loading ? <LoadingSpinner /> : users.error ? <ErrorState message={users.error} /> : (
                <DataTable headers={["Name", "Email", "Role", "University", "Phone", "Joined"]} emptyMessage="No users registered yet."
                  rows={(users.data?.users ?? []).map(u => [u.name, u.email, u.role, u.university ?? "—", u.phone ?? "—", fmtDate(u.createdAt)])} />
              )}
            </div>
          </div>
        )}

        {/* ── Properties ─────────────────────────────────── */}
        {active === "properties" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>All properties</h3>
            <div className="card">
              {properties.loading ? <LoadingSpinner /> : properties.error ? <ErrorState message={properties.error} /> : (
                <DataTable headers={["Title", "Owner", "City", "Rent range", "Available rooms", "Listed on"]} emptyMessage="No properties listed yet."
                  rows={(properties.data?.properties ?? []).map(p => [
                    p.title, p.ownerId?.name ?? "—", p.city,
                    p.rentRange?.min != null ? `${fmtMoney(p.rentRange.min)} – ${fmtMoney(p.rentRange.max)}` : "—",
                    p.availableRooms ?? "—", fmtDate(p.createdAt),
                  ])} />
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
                <DataTable headers={["Tenant", "Owner", "Property", "Room", "Compatibility", "Status", "Date"]} emptyMessage="No booking requests yet."
                  rows={(bookings.data?.bookings ?? []).map(b => [
                    b.tenantId?.name ?? "—", b.ownerId?.name ?? "—", b.propertyId?.title ?? "—", b.roomId?.label ?? "—",
                    b.compatibilityScore != null ? `${b.compatibilityScore}%` : "—", b.status, fmtDate(b.createdAt),
                  ])} />
              )}
            </div>
          </div>
        )}

        {/* ── Maintenance ────────────────────────────────── */}
        {active === "maintenance" && (
          <div>
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0 }}>Maintenance Management</h3>
              <p style={{ color: "var(--color-neutral-500)", fontSize: "0.875rem", marginTop: "0.25rem" }}>All properties · Assign technicians and update statuses.</p>
            </div>

            {/* Property search */}
            <div style={{ marginBottom: "1.25rem" }}>
              <input value={mSearch} onChange={e => setMSearch(e.target.value)}
                placeholder="🔍  Search by property name or ID..."
                style={{ width: "100%", padding: "0.625rem 1rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", background: "#ffffff" }} />
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
                mFiltered.length === 0 ? <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-neutral-400)" }}>No requests found.</div>
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
                            <span>👤 {r.createdBy?.name ?? "—"} · {r.createdBy?.email ?? ""}</span>
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
                  {(notices.data?.notices ?? []).map(n => (
                    <div key={n._id} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <p style={{ fontWeight: "600" }}>{n.title}</p>
                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-neutral-400)" }}>{fmtDate(n.createdAt)}</span>
                          <span style={{ fontSize: "0.75rem", background: "var(--color-info-50)", color: "var(--color-info-700)", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>{n.propertyId?.title ?? "Platform-wide"}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-neutral-500)" }}>by {n.createdBy?.name ?? "—"}</span>
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

        {/* ── Others ─────────────────────────────────────── */}
        {active === "others" && (
          <div>
            {/* Hub */}
            {!othersSection && (
              <div>
                <h3 style={{ marginBottom: "0.25rem" }}>Others</h3>
                <p style={{ color: "var(--color-neutral-500)", fontSize: "0.9375rem", marginBottom: "2rem" }}>Platform-wide management tools.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
                  <button onClick={() => setOthersSection("guest")} style={hubBtnStyle}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🚪</div>
                    <div style={{ fontWeight: "700", fontSize: "1rem", color: "#111827", marginBottom: "0.375rem" }}>Guest Entry Log</div>
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: "1.5" }}>Review and manage all guest visits across the platform.</div>
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
                    <p style={{ color: "var(--color-neutral-500)", fontSize: "0.875rem", marginTop: "0.125rem" }}>All properties · Approve or reject guest visits.</p>
                  </div>
                </div>

                {/* Property search */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <input value={gSearch} onChange={e => setGSearch(e.target.value)}
                    placeholder="🔍  Search by property name or ID..."
                    style={{ width: "100%", padding: "0.625rem 1rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", background: "#ffffff" }} />
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
                    gFiltered.length === 0 ? <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-neutral-400)" }}>No guest entries found.</div>
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
                              <span>🏠 {g.userId?.name ?? "—"} · {g.userId?.email ?? ""}</span>
                              <span>📍 {g.propertyId?.title ?? "—"}</span>
                              <span>🔑 Owner: {g.propertyId?.ownerId?.name ?? "—"}</span>
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