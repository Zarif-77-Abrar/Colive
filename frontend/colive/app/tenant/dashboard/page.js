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
import { getUser, bookingAPI, paymentAPI, maintenanceAPI , propertyAPI, userAPI} from "../../../lib/api";

const TABS = [
  { key: "overview",    label: "Overview"    },
  { key: "bookings",    label: "My Bookings" },
  { key: "payments",    label: "My Payments" },
  { key: "maintenance", label: "Maintenance" },
  { key: "messages",    label: "Messages"    },
];

const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtMoney = (n) => n != null ? `BDT ${Number(n).toLocaleString()}` : "—";

const CATEGORIES = ["electrical","plumbing","gas","appliance","structural","pest_control","internet","cleaning","security","other"];

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

const EMPTY_FORM = { title: "", description: "", category: "other", priority: "medium", propertyId: "", roomId: "" };

const labelStyle = {
  display: "block",
  marginBottom: "0.375rem",
  fontSize: "0.8125rem",
  fontWeight: "600",
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "0.625rem 0.75rem",
  fontSize: "0.875rem",
  color: "#111827",
  background: "#ffffff",
  outline: "none",
};

const btnStyle = {
  border: "none",
  borderRadius: "8px",
  padding: "0.625rem 1.25rem",
  fontWeight: "600",
  fontSize: "0.875rem",
  cursor: "pointer",
};

export default function TenantDashboard() {
  const router = useRouter();
  const [user, setUser]     = useState(null);
  const [profile, setProfile] = useState(null);
  const [active, setActive] = useState("overview");

  // Maintenance page state
  const [mRequests, setMRequests] = useState([]);
  const [mLoading, setMLoading] = useState(false);
  const [mError, setMError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Property search state for maintenance form
  const [allProperties, setAllProperties] = useState([]);
  const [propertySearch, setPropertySearch] = useState("");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "tenant") { router.push("/login"); return; }
    setUser(u);

    // Fetch full profile to get preferences (localStorage doesn't include them)
    userAPI.getProfile()
      .then((data) => setProfile(data.user))
      .catch(() => setProfile(null));
  }, [router]);

  const bookings = useApi(bookingAPI.getMy);
  const payments = useApi(paymentAPI.getMy);

  const fetchMaintenance = useCallback(async () => {
    setMLoading(true); setMError("");
    try {
      const data = await maintenanceAPI.getMy();
      setMRequests(data.requests ?? []);
    } catch (err) { setMError(err.message); }
    finally { setMLoading(false); }
  }, []);

  // Load all properties for the dropdown when the form is opened
  const fetchProperties = useCallback(async () => {
    try {
      const data = await propertyAPI.getAll();
      setAllProperties(data.properties ?? []);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (user) { fetchMaintenance(); fetchProperties(); }
  }, [user, fetchMaintenance, fetchProperties]);

  // Property search handlers
  const handlePropertySearch = (e) => {
    setPropertySearch(e.target.value);
    setSelectedProperty(null);
    setForm({ ...form, propertyId: "" });
    setShowSuggestions(true);
  };

  const handleSelectProperty = (p) => {
    setSelectedProperty(p);
    setPropertySearch(p.title + " — " + p.city);
    setForm({ ...form, propertyId: p._id, roomId: "" });
    setShowSuggestions(false);
    setFormError("");
  };

  const filteredProperties = propertySearch.trim().length >= 1
    ? allProperties.filter(p =>
        p.title.toLowerCase().includes(propertySearch.toLowerCase()) ||
        p.city.toLowerCase().includes(propertySearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.propertyId) {
      setFormError("Title, description, and Property are required.");
      return;
    }
    setSubmitting(true); setFormError("");
    try {
      await maintenanceAPI.create({
        title:       form.title.trim(),
        description: form.description.trim(),
        category:    form.category,
        priority:    form.priority,
        propertyId:  form.propertyId,
        roomLabel:   form.roomId.trim() || undefined,
      });
      setSuccessMsg("Request submitted successfully!");
      setForm(EMPTY_FORM);
      setPropertySearch("");
      setSelectedProperty(null);
      setShowForm(false);
      fetchMaintenance();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const pendingBookings  = bookings.data?.bookings?.filter(b => b.status === "pending").length  ?? 0;
  const paidThisMonth    = payments.data?.payments?.filter(p => p.paymentStatus === "paid" && new Date(p.paidAt).getMonth() === new Date().getMonth()).length ?? 0;
  const openMaintenance  = mRequests.filter(r => r.status !== "resolved").length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <TabBar tabs={TABS} active={active} onChange={setActive} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── Overview ───────────────────────────────────── */}
        {active === "overview" && (
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>Welcome back, {user.name}</h2>
            <p style={{ color: "var(--color-neutral-500)", marginBottom: "2rem", fontSize: "0.9375rem" }}>
              Here&apos;s a summary of your housing activity.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <StatCard label="Booking requests"    value={bookings.data?.count ?? "—"} sub={`${pendingBookings} pending`} accent="primary" />
              <StatCard label="Payments this month" value={paidThisMonth}               sub="paid"                         accent="success" />
              <StatCard label="Open maintenance"    value={openMaintenance}             sub="unresolved requests"          accent="error"   />
            </div>

            {/* Recent bookings */}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <h4 style={{ marginBottom: "1rem" }}>Recent booking requests</h4>
              {bookings.loading ? <LoadingSpinner /> : bookings.error ? <ErrorState message={bookings.error} /> : (
                <DataTable
                  headers={["Property", "Room", "Rent", "Status", "Requested"]}
                  emptyMessage="You have not made any booking requests yet."
                  rows={(bookings.data?.bookings ?? []).slice(0, 5).map(b => [
                    b.propertyId?.title ?? "—", b.roomId?.label ?? "—",
                    fmtMoney(b.roomId?.rent), b.status, fmtDate(b.createdAt),
                  ])}
                />
              )}
            </div>

            {/* Compatibility tip if preferences empty */}
            {!(profile?.preferences?.sleepSchedule || user.preferences?.sleepSchedule) && (
              <div style={{
                background: "var(--color-primary-50)", border: "1px solid var(--color-primary-200)",
                borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem",
              }}>
                <p style={{ fontWeight: "600", color: "var(--color-primary-700)", marginBottom: "0.25rem" }}>
                  Complete your lifestyle preferences
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--color-primary-600)" }}>
                  Adding your sleep schedule, noise tolerance, and habits improves your compatibility score shown to potential flatmates.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── My Bookings ────────────────────────────────── */}
        {active === "bookings" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>My booking requests</h3>
            <div className="card">
              {bookings.loading ? <LoadingSpinner /> : bookings.error ? <ErrorState message={bookings.error} /> : (
                <DataTable
                  headers={["Property", "Room", "Rent/mo", "Compatibility", "Status", "Requested"]}
                  emptyMessage="You have not made any booking requests yet."
                  rows={(bookings.data?.bookings ?? []).map(b => [
                    b.propertyId?.title ?? "—", b.roomId?.label ?? "—",
                    fmtMoney(b.roomId?.rent),
                    b.compatibilityScore != null ? `${b.compatibilityScore}%` : "—",
                    b.status, fmtDate(b.createdAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {/* ── My Payments ────────────────────────────────── */}
        {active === "payments" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>Payment history</h3>
            <div className="card">
              {payments.loading ? <LoadingSpinner /> : payments.error ? <ErrorState message={payments.error} /> : (
                <DataTable
                  headers={["Month", "Property", "Room", "Amount", "Status", "Paid on"]}
                  emptyMessage="No payments recorded yet."
                  rows={(payments.data?.payments ?? []).map(p => [
                    p.month ?? "—", p.propertyId?.title ?? "—", p.roomId?.label ?? "—",
                    fmtMoney(p.amount), p.paymentStatus, fmtDate(p.paidAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Maintenance ────────────────────────────────── */}
        {active === "maintenance" && (
          <div>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ margin: 0 }}>Maintenance Requests</h3>
                <p style={{ color: "var(--color-neutral-500)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                  Report issues and track their progress.
                </p>
              </div>
              <button
                onClick={() => { setShowForm(!showForm); setFormError(""); setForm(EMPTY_FORM); setPropertySearch(""); setSelectedProperty(null); }}
                style={{
                  background: showForm ? "#f3f4f6" : "#111827",
                  color: showForm ? "#374151" : "#ffffff",
                  border: "none", borderRadius: "8px",
                  padding: "0.625rem 1.25rem",
                  fontWeight: "600", fontSize: "0.875rem", cursor: "pointer",
                }}
              >
                {showForm ? "✕ Cancel" : "+ New Request"}
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Total",    value: mRequests.length,                                       color: "#111827" },
                { label: "Open",     value: mRequests.filter(r => r.status !== "resolved").length,  color: "#b45309" },
                { label: "Resolved", value: mRequests.filter(r => r.status === "resolved").length,  color: "#15803d" },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: "center", padding: "1.25rem" }}>
                  <div style={{ fontSize: "1.75rem", fontWeight: "700", color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--color-neutral-500)", marginTop: "0.25rem" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Success */}
            {successMsg && (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "0.875rem 1.25rem", marginBottom: "1.25rem", color: "#15803d", fontSize: "0.875rem", fontWeight: "500" }}>
                ✓ {successMsg}
              </div>
            )}

            {/* Create form */}
            {showForm && (
              <div className="card" style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ marginBottom: "1.25rem" }}>Submit a new request</h4>

                {formError && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", color: "#dc2626", fontSize: "0.875rem" }}>
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>

                    {/* Title */}
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Title *</label>
                      <input name="title" value={form.title} onChange={handleFormChange}
                        placeholder="e.g. Leaking tap in bathroom" style={inputStyle} />
                    </div>

                    {/* Category */}
                    <div>
                      <label style={labelStyle}>Category</label>
                      <select name="category" value={form.category} onChange={handleFormChange} style={inputStyle}>
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
                        ))}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label style={labelStyle}>Priority</label>
                      <select name="priority" value={form.priority} onChange={handleFormChange} style={inputStyle}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    {/* Property search */}
                    <div style={{ position: "relative" }}>
                      <label style={labelStyle}>Property *</label>
                      <input
                        value={propertySearch}
                        onChange={handlePropertySearch}
                        onFocus={() => propertySearch.trim().length >= 1 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder="Type to search properties..."
                        style={{
                          ...inputStyle,
                          borderColor: selectedProperty ? "#6ee7b7" : "#d1d5db",
                        }}
                        autoComplete="off"
                      />
                      {/* Suggestions dropdown */}
                      {showSuggestions && filteredProperties.length > 0 && (
                        <div style={{
                          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                          background: "#ffffff", border: "1px solid #e5e7eb",
                          borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          marginTop: "4px", overflow: "hidden",
                        }}>
                          {filteredProperties.map(p => (
                            <div
                              key={p._id}
                              onMouseDown={() => handleSelectProperty(p)}
                              style={{
                                padding: "0.625rem 0.875rem", cursor: "pointer",
                                fontSize: "0.875rem", color: "#111827",
                                borderBottom: "1px solid #f3f4f6",
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                              onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
                            >
                              <span style={{ fontWeight: "600" }}>{p.title}</span>
                              <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>— {p.city}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* No results hint */}
                      {showSuggestions && propertySearch.trim().length >= 1 && filteredProperties.length === 0 && (
                        <div style={{
                          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                          background: "#ffffff", border: "1px solid #e5e7eb",
                          borderRadius: "8px", padding: "0.75rem 1rem",
                          marginTop: "4px", fontSize: "0.875rem", color: "#9ca3af",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}>
                          No properties found for &quot;{propertySearch}&quot;
                        </div>
                      )}
                    </div>

                    {/* Room — plain text, optional */}
                    <div>
                      <label style={labelStyle}>
                        Room Label <span style={{ color: "#9ca3af", fontWeight: "400" }}>(optional)</span>
                      </label>
                      <input
                        name="roomId" value={form.roomId} onChange={handleFormChange}
                        placeholder="e.g. Room 3A"
                        style={inputStyle}
                      />
                    </div>

                    {/* Description */}
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Description *</label>
                      <textarea name="description" value={form.description} onChange={handleFormChange}
                        placeholder="Describe the issue in detail..." rows={4}
                        style={{ ...inputStyle, resize: "vertical" }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                    <button type="button"
                      onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setPropertySearch(""); setSelectedProperty(null); }}
                      style={{ ...btnStyle, background: "#f3f4f6", color: "#374151" }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={submitting}
                      style={{ ...btnStyle, background: "#111827", color: "#ffffff", opacity: submitting ? 0.7 : 1 }}>
                      {submitting ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Requests list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {mLoading ? <LoadingSpinner /> : mError ? <ErrorState message={mError} /> :
                mRequests.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-neutral-400)" }}>
                    No maintenance requests yet. Click <strong>+ New Request</strong> to submit one.
                  </div>
                ) : mRequests.map(r => (
                  <div key={r._id} className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                          <span style={{ fontWeight: "600", fontSize: "0.9375rem", color: "#111827" }}>{r.title}</span>
                          <Badge meta={STATUS_META[r.status]    ?? STATUS_META.pending}  />
                          <Badge meta={PRIORITY_META[r.priority] ?? PRIORITY_META.medium} />
                        </div>
                        <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>{r.description}</p>
                        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "#9ca3af" }}>
                          <span>📍 {r.propertyId?.title ?? "—"}</span>
                          <span>🚪 {r.roomLabel || r.roomId?.label || "—"}</span>
                          <span>🏷 {r.category}</span>
                          <span>📅 {fmtDate(r.createdAt)}</span>
                          {r.technicianName && <span>🔧 {r.technicianName}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ── Messages ───────────────────────────────────── */}
        {active === "messages" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>Messages</h3>
            <div className="card">
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: "var(--color-neutral-600)", marginBottom: "1rem" }}>
                  View and manage your conversations with owners and fellow tenants.
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
