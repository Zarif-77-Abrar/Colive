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
import useFCM from "../../../lib/useFCM";
import { getUser, bookingAPI, paymentAPI, maintenanceAPI, userAPI, propertyAPI, guestLogAPI } from "../../../lib/api";

const TABS = [
  { key: "overview",    label: "Overview"    },
  { key: "bookings",    label: "My Bookings" },
  { key: "payments",    label: "My Payments" },
  { key: "maintenance", label: "Maintenance" },
  { key: "messages",    label: "Messages"    },
  { key: "others",      label: "Others"      },
];

const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtMoney = (n) => n != null ? `BDT ${Number(n).toLocaleString()}` : "—";

const CATEGORIES = ["electrical","plumbing","gas","appliance","structural","pest_control","internet","cleaning","security","other"];

const STATUS_META = {
  pending:  { label: "Pending",  color: "#b45309", bg: "#fef3c7" },
  approved: { label: "Approved", color: "#15803d", bg: "#dcfce7" },
  rejected: { label: "Rejected", color: "#dc2626", bg: "#fee2e2" },
};

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

const Badge = ({ meta }) => (
  <span style={{
    display: "inline-block", padding: "0.2rem 0.6rem",
    borderRadius: "999px", fontSize: "0.75rem", fontWeight: "600",
    color: meta.color, background: meta.bg,
  }}>{meta.label}</span>
);

// ── Maintenance form constants ─────────────────────────────
const EMPTY_MFORM = { title: "", description: "", category: "other", priority: "medium", propertyId: "", roomId: "" };

// ── Guest log form constants ───────────────────────────────
const EMPTY_GFORM = {
  guestName: "", relationship: "", purpose: "", propertyId: "",
  visitDate: "", hour: "10", minute: "00", ampm: "AM",
};

// Generate arrays for time dropdowns
const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export default function TenantDashboard() {
  const router = useRouter();
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [active,  setActive]  = useState("overview");

  // useFCM();

  // ── Others sub-section ─────────────────────────────────
  const [othersSection, setOthersSection] = useState(null); // null | "guest"

  // ── Maintenance state ──────────────────────────────────
  const [mRequests, setMRequests]   = useState([]);
  const [mLoading, setMLoading]     = useState(false);
  const [mError, setMError]         = useState("");
  const [showMForm, setShowMForm]   = useState(false);
  const [mForm, setMForm]           = useState(EMPTY_MFORM);
  const [mSubmitting, setMSubmitting] = useState(false);
  const [mFormError, setMFormError] = useState("");
  const [mSuccess, setMSuccess]     = useState("");
  const [allProperties, setAllProperties]       = useState([]);
  const [propertySearch, setPropertySearch]     = useState("");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showSuggestions, setShowSuggestions]   = useState(false);

  // ── Guest log state ────────────────────────────────────
  const [gLogs, setGLogs]           = useState([]);
  const [gLoading, setGLoading]     = useState(false);
  const [gError, setGError]         = useState("");
  const [showGForm, setShowGForm]   = useState(false);
  const [gForm, setGForm]           = useState(EMPTY_GFORM);
  const [gSubmitting, setGSubmitting] = useState(false);
  const [gFormError, setGFormError] = useState("");
  const [gSuccess, setGSuccess]     = useState("");
  const [gPropertySearch, setGPropertySearch]     = useState("");
  const [gSelectedProperty, setGSelectedProperty] = useState(null);
  const [showGSuggestions, setShowGSuggestions]   = useState(false);

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
    try { const d = await maintenanceAPI.getMy(); setMRequests(d.requests ?? []); }
    catch (e) { setMError(e.message); } finally { setMLoading(false); }
  }, []);

  const fetchGuestLogs = useCallback(async () => {
    setGLoading(true); setGError("");
    try { const d = await guestLogAPI.getMy(); setGLogs(d.logs ?? []); }
    catch (e) { setGError(e.message); } finally { setGLoading(false); }
  }, []);

  const fetchProperties = useCallback(async () => {
    try { const d = await propertyAPI.getAll(); setAllProperties(d.properties ?? []); }
    catch (_) {}
  }, []);

  useEffect(() => {
    if (user) { fetchMaintenance(); fetchProperties(); fetchGuestLogs(); }
  }, [user, fetchMaintenance, fetchProperties, fetchGuestLogs]);

  // ── Maintenance property search ────────────────────────
  const handlePropertySearch = (e) => {
    setPropertySearch(e.target.value); setSelectedProperty(null);
    setMForm({ ...mForm, propertyId: "" }); setShowSuggestions(true);
  };
  const handleSelectProperty = (p) => {
    setSelectedProperty(p); setPropertySearch(p.title + " — " + p.city);
    setMForm({ ...mForm, propertyId: p._id, roomId: "" }); setShowSuggestions(false); setMFormError("");
  };
  const filteredMProps = propertySearch.trim().length >= 1
    ? allProperties.filter(p =>
        p.title.toLowerCase().includes(propertySearch.toLowerCase()) ||
        p.city.toLowerCase().includes(propertySearch.toLowerCase())
      ).slice(0, 6) : [];

  // ── Guest log property search ──────────────────────────
  const handleGPropertySearch = (e) => {
    setGPropertySearch(e.target.value); setGSelectedProperty(null);
    setGForm({ ...gForm, propertyId: "" }); setShowGSuggestions(true);
  };
  const handleSelectGProperty = (p) => {
    setGSelectedProperty(p); setGPropertySearch(p.title + " — " + p.city);
    setGForm({ ...gForm, propertyId: p._id }); setShowGSuggestions(false); setGFormError("");
  };
  const filteredGProps = gPropertySearch.trim().length >= 1
    ? allProperties.filter(p =>
        p.title.toLowerCase().includes(gPropertySearch.toLowerCase()) ||
        p.city.toLowerCase().includes(gPropertySearch.toLowerCase())
      ).slice(0, 6) : [];

  // ── Maintenance submit ─────────────────────────────────
  const handleMSubmit = async (e) => {
    e.preventDefault();
    if (!mForm.title.trim() || !mForm.description.trim() || !mForm.propertyId) {
      setMFormError("Title, description, and Property are required."); return;
    }
    setMSubmitting(true); setMFormError("");
    try {
      await maintenanceAPI.create({
        title: mForm.title.trim(), description: mForm.description.trim(),
        category: mForm.category, priority: mForm.priority,
        propertyId: mForm.propertyId, roomLabel: mForm.roomId.trim() || undefined,
      });
      setMSuccess("Request submitted!"); setMForm(EMPTY_MFORM);
      setPropertySearch(""); setSelectedProperty(null); setShowMForm(false);
      fetchMaintenance(); setTimeout(() => setMSuccess(""), 4000);
    } catch (err) { setMFormError(err.message); }
    finally { setMSubmitting(false); }
  };

  // ── Guest log submit ───────────────────────────────────
  const handleGSubmit = async (e) => {
    e.preventDefault();
    if (!gForm.guestName.trim() || !gForm.purpose.trim() || !gForm.propertyId || !gForm.visitDate) {
      setGFormError("Guest name, purpose, property, and visit date are required."); return;
    }
    const visitTime = `${gForm.hour}:${gForm.minute} ${gForm.ampm}`;
    setGSubmitting(true); setGFormError("");
    try {
      await guestLogAPI.create({
        guestName:    gForm.guestName.trim(),
        relationship: gForm.relationship.trim(),
        purpose:      gForm.purpose.trim(),
        propertyId:   gForm.propertyId,
        visitDate:    gForm.visitDate,
        visitTime,
      });
      setGSuccess("Guest entry submitted!"); setGForm(EMPTY_GFORM);
      setGPropertySearch(""); setGSelectedProperty(null); setShowGForm(false);
      fetchGuestLogs(); setTimeout(() => setGSuccess(""), 4000);
    } catch (err) { setGFormError(err.message); }
    finally { setGSubmitting(false); }
  };

  if (!user) return null;

  const hasPreferences    = !!profile?.preferences?.sleepSchedule;
  const acceptedBooking   = bookings.data?.bookings?.find(b => b.status === "accepted");
  const hasActiveRoom     = !!acceptedBooking;
  const pendingBookings   = bookings.data?.bookings?.filter(b => b.status === "pending").length ?? 0;
  const paidThisMonth    =  payments.data?.payments?.filter(p => p.paymentStatus === "paid" && new Date(p.paidAt).getMonth() === new Date().getMonth()).length ?? 0;
  const openMaintenance = mRequests.filter(r => r.status !== "resolved").length;
  // const openMaintenance   = maintenance.data?.requests?.filter(r => r.status !== "resolved").length ?? 0;

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

            {/* ── Preferences incomplete warning ─────────── */}
            {profile && !hasPreferences && (
              <div style={{
                background: "var(--color-warning-50)",
                border: "1px solid var(--color-warning-500)",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem 1.5rem",
                marginBottom: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}>
                <div>
                  <p style={{ fontWeight: "600", color: "var(--color-warning-700)", marginBottom: "0.25rem" }}>
                    Your lifestyle preferences are not set
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "var(--color-warning-700)" }}>
                    You need to complete your preferences before you can search for rooms or be matched with flatmates.
                  </p>
                </div>
                <Link href="/onboarding" className="btn btn-primary btn-sm"
                  style={{ whiteSpace: "nowrap" }}>
                  Set preferences
                </Link>
              </div>
            )}

            {/* ── Primary action — search or manage ─────── */}
            {bookings.loading ? null : (
              <div className="card" style={{ marginBottom: "1.5rem" }}>
                {hasActiveRoom ? (
                  /* Tenant has an accepted booking — show room info + manage button */
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <p style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--color-neutral-400)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.375rem" }}>
                        Your current room
                      </p>
                      <p style={{ fontWeight: "700", fontSize: "1.125rem", color: "var(--color-neutral-900)", marginBottom: "0.25rem" }}>
                        {acceptedBooking.propertyId?.title ?? "—"} — {acceptedBooking.roomId?.label ?? "—"}
                      </p>
                      <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-500)" }}>
                        {fmtMoney(acceptedBooking.roomId?.rent)}/month · Booking accepted {fmtDate(acceptedBooking.resolvedAt)}
                      </p>
                    </div>
                    <Link
                      href={`/rooms/${acceptedBooking.propertyId?._id}`}
                      className="btn btn-primary"
                    >
                      Manage Room
                    </Link>
                  </div>
                ) : (
                  /* No accepted booking — prompt to search */
                  <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
                    <p style={{ fontWeight: "600", fontSize: "1.125rem", color: "var(--color-neutral-900)", marginBottom: "0.5rem" }}>
                      You are not in a room yet
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-500)", marginBottom: "1.25rem" }}>
                      Browse available properties and check your compatibility with potential flatmates.
                    </p>
                    <Link
                      href="/rooms"
                      className="btn btn-primary"
                      style={{
                        pointerEvents: hasPreferences ? "auto" : "none",
                        opacity: hasPreferences ? 1 : 0.5,
                      }}
                      title={!hasPreferences ? "Set your preferences first" : ""}
                    >
                      Search Rooms
                    </Link>
                    {!hasPreferences && (
                      <p style={{ fontSize: "0.8125rem", color: "var(--color-neutral-400)", marginTop: "0.625rem" }}>
                        Set your preferences above to unlock room search.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Stat cards ────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <StatCard label="Booking requests"    value={bookings.data?.count ?? "—"} sub={`${pendingBookings} pending`} accent="primary" />
              <StatCard label="Payments this month" value={paidThisMonth}               sub="paid"                         accent="success" />
              <StatCard label="Open maintenance"    value={openMaintenance}             sub="unresolved requests"          accent="error"   />
            </div>
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
            {!user.preferences?.sleepSchedule && (
              <div style={{ background: "var(--color-primary-50)", border: "1px solid var(--color-primary-200)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem" }}>
                <p style={{ fontWeight: "600", color: "var(--color-primary-700)", marginBottom: "0.25rem" }}>Complete your lifestyle preferences</p>
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
                    b.propertyId?.title ?? "—", b.roomId?.label ?? "—", fmtMoney(b.roomId?.rent),
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ margin: 0 }}>Maintenance Requests</h3>
                <p style={{ color: "var(--color-neutral-500)", fontSize: "0.875rem", marginTop: "0.25rem" }}>Report issues and track their progress.</p>
              </div>
              <button onClick={() => { setShowMForm(!showMForm); setMFormError(""); setMForm(EMPTY_MFORM); setPropertySearch(""); setSelectedProperty(null); }}
                style={{ background: showMForm ? "#f3f4f6" : "#111827", color: showMForm ? "#374151" : "#ffffff", border: "none", borderRadius: "8px", padding: "0.625rem 1.25rem", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer" }}>
                {showMForm ? "✕ Cancel" : "+ New Request"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Total",    value: mRequests.length,                                      color: "#111827" },
                { label: "Open",     value: mRequests.filter(r => r.status !== "resolved").length, color: "#b45309" },
                { label: "Resolved", value: mRequests.filter(r => r.status === "resolved").length, color: "#15803d" },
              ].map(s => (
                <div key={s.label} className="card" style={{ textAlign: "center", padding: "1.25rem" }}>
                  <div style={{ fontSize: "1.75rem", fontWeight: "700", color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--color-neutral-500)", marginTop: "0.25rem" }}>{s.label}</div>
                </div>
              ))}
            </div>
            {mSuccess && <div style={successBannerStyle}>✓ {mSuccess}</div>}
            {showMForm && (
              <div className="card" style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ marginBottom: "1.25rem" }}>Submit a new request</h4>
                {mFormError && <div style={errorBannerStyle}>{mFormError}</div>}
                <form onSubmit={handleMSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Title *</label>
                      <input name="title" value={mForm.title} onChange={e => { setMForm({ ...mForm, title: e.target.value }); setMFormError(""); }} placeholder="e.g. Leaking tap in bathroom" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Category</label>
                      <select name="category" value={mForm.category} onChange={e => setMForm({ ...mForm, category: e.target.value })} style={inputStyle}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Priority</label>
                      <select name="priority" value={mForm.priority} onChange={e => setMForm({ ...mForm, priority: e.target.value })} style={inputStyle}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div style={{ position: "relative" }}>
                      <label style={labelStyle}>Property *</label>
                      <input value={propertySearch} onChange={handlePropertySearch}
                        onFocus={() => propertySearch.trim().length >= 1 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder="Type to search properties..." autoComplete="off"
                        style={{ ...inputStyle, borderColor: selectedProperty ? "#6ee7b7" : "#d1d5db" }} />
                      {showSuggestions && filteredMProps.length > 0 && (
                        <div style={suggestionBoxStyle}>
                          {filteredMProps.map(p => (
                            <div key={p._id} onMouseDown={() => handleSelectProperty(p)} style={suggestionItemStyle}
                              onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                              onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}>
                              <span style={{ fontWeight: "600" }}>{p.title}</span>
                              <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>— {p.city}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {showSuggestions && propertySearch.trim().length >= 1 && filteredMProps.length === 0 && (
                        <div style={{ ...suggestionBoxStyle, padding: "0.75rem 1rem", color: "#9ca3af", fontSize: "0.875rem" }}>
                          No properties found for &quot;{propertySearch}&quot;
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Room Label <span style={{ color: "#9ca3af", fontWeight: "400" }}>(optional)</span></label>
                      <input name="roomId" value={mForm.roomId} onChange={e => setMForm({ ...mForm, roomId: e.target.value })} placeholder="e.g. Room 3A" style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Description *</label>
                      <textarea name="description" value={mForm.description} onChange={e => { setMForm({ ...mForm, description: e.target.value }); setMFormError(""); }}
                        placeholder="Describe the issue in detail..." rows={4} style={{ ...inputStyle, resize: "vertical" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => { setShowMForm(false); setMForm(EMPTY_MFORM); setPropertySearch(""); setSelectedProperty(null); }}
                      style={{ ...btnStyle, background: "#f3f4f6", color: "#374151" }}>Cancel</button>
                    <button type="submit" disabled={mSubmitting}
                      style={{ ...btnStyle, background: "#111827", color: "#ffffff", opacity: mSubmitting ? 0.7 : 1 }}>
                      {mSubmitting ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </form>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {mLoading ? <LoadingSpinner /> : mError ? <ErrorState message={mError} /> :
                mRequests.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-neutral-400)" }}>
                    No maintenance requests yet. Click <strong>+ New Request</strong> to submit one.
                  </div>
                ) : mRequests.map(r => (
                  <div key={r._id} className="card">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: "600", fontSize: "0.9375rem", color: "#111827" }}>{r.title}</span>
                      <Badge meta={MSTATUS_META[r.status] ?? MSTATUS_META.pending} />
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
                ))
              }
            </div>
          </div>
        )}

        {/* ── Others ─────────────────────────────────────── */}
        {active === "others" && (
          <div>
            {/* Hub — shown when no section is selected */}
            {!othersSection && (
              <div>
                <h3 style={{ marginBottom: "0.25rem" }}>Others</h3>
                <p style={{ color: "var(--color-neutral-500)", fontSize: "0.9375rem", marginBottom: "2rem" }}>
                  Manage guest visits and other housing services.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
                  {/* Guest Entry Log — functional */}
                  <button onClick={() => setOthersSection("guest")} style={hubBtnStyle}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🚪</div>
                    <div style={{ fontWeight: "700", fontSize: "1rem", color: "#111827", marginBottom: "0.375rem" }}>Guest Entry Log</div>
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: "1.5" }}>
                      Register visitors and track their visit status.
                    </div>
                  </button>

                  {/* Daily Meal — placeholder */}
                  <div style={{ ...hubBtnStyle, opacity: 0.5, cursor: "not-allowed" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🍽️</div>
                    <div style={{ fontWeight: "700", fontSize: "1rem", color: "#111827", marginBottom: "0.375rem" }}>Daily Meal</div>
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: "1.5" }}>
                      Coming soon.
                    </div>
                  </div>

                  {/* Check Notice — placeholder */}
                  <div style={{ ...hubBtnStyle, opacity: 0.5, cursor: "not-allowed" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📢</div>
                    <div style={{ fontWeight: "700", fontSize: "1rem", color: "#111827", marginBottom: "0.375rem" }}>Check Notice</div>
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: "1.5" }}>
                      Coming soon.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Guest Entry Log section */}
            {othersSection === "guest" && (
              <div>
                {/* Back + header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                    <button onClick={() => { setOthersSection(null); setShowGForm(false); setGForm(EMPTY_GFORM); setGPropertySearch(""); setGSelectedProperty(null); }}
                      style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "0.4rem 0.875rem", fontSize: "0.8125rem", fontWeight: "600", color: "#374151", cursor: "pointer" }}>
                      ← Back
                    </button>
                    <div>
                      <h3 style={{ margin: 0 }}>Guest Entry Log</h3>
                      <p style={{ color: "var(--color-neutral-500)", fontSize: "0.875rem", marginTop: "0.125rem" }}>Register and track your visitors.</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowGForm(!showGForm); setGFormError(""); setGForm(EMPTY_GFORM); setGPropertySearch(""); setGSelectedProperty(null); }}
                    style={{ background: showGForm ? "#f3f4f6" : "#111827", color: showGForm ? "#374151" : "#ffffff", border: "none", borderRadius: "8px", padding: "0.625rem 1.25rem", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer" }}>
                    {showGForm ? "✕ Cancel" : "+ Register Guest"}
                  </button>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                  {[
                    { label: "Total",    value: gLogs.length,                                       color: "#111827" },
                    { label: "Pending",  value: gLogs.filter(g => g.status === "pending").length,   color: "#b45309" },
                    { label: "Approved", value: gLogs.filter(g => g.status === "approved").length,  color: "#15803d" },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ textAlign: "center", padding: "1.25rem" }}>
                      <div style={{ fontSize: "1.75rem", fontWeight: "700", color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-neutral-500)", marginTop: "0.25rem" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {gSuccess && <div style={successBannerStyle}>✓ {gSuccess}</div>}

                {/* Guest form */}
                {showGForm && (
                  <div className="card" style={{ marginBottom: "1.5rem" }}>
                    <h4 style={{ marginBottom: "1.25rem" }}>Register a guest</h4>
                    {gFormError && <div style={errorBannerStyle}>{gFormError}</div>}
                    <form onSubmit={handleGSubmit}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>

                        {/* Guest name */}
                        <div>
                          <label style={labelStyle}>Guest Name *</label>
                          <input value={gForm.guestName} onChange={e => { setGForm({ ...gForm, guestName: e.target.value }); setGFormError(""); }}
                            placeholder="Full name of guest" style={inputStyle} />
                        </div>

                        {/* Relationship */}
                        <div>
                          <label style={labelStyle}>Relationship</label>
                          <input value={gForm.relationship} onChange={e => setGForm({ ...gForm, relationship: e.target.value })}
                            placeholder="e.g. Friend, Parent, Sibling" style={inputStyle} />
                        </div>

                        {/* Purpose */}
                        <div>
                          <label style={labelStyle}>Purpose of Visit *</label>
                          <input value={gForm.purpose} onChange={e => { setGForm({ ...gForm, purpose: e.target.value }); setGFormError(""); }}
                            placeholder="e.g. Family visit, Study" style={inputStyle} />
                        </div>

                        {/* Property search — right of Purpose */}
                        <div style={{ position: "relative" }}>
                          <label style={labelStyle}>Property *</label>
                          <input value={gPropertySearch} onChange={handleGPropertySearch}
                            onFocus={() => gPropertySearch.trim().length >= 1 && setShowGSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowGSuggestions(false), 150)}
                            placeholder="Type to search properties..." autoComplete="off"
                            style={{ ...inputStyle, borderColor: gSelectedProperty ? "#6ee7b7" : "#d1d5db" }} />
                          {showGSuggestions && filteredGProps.length > 0 && (
                            <div style={suggestionBoxStyle}>
                              {filteredGProps.map(p => (
                                <div key={p._id} onMouseDown={() => handleSelectGProperty(p)} style={suggestionItemStyle}
                                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                                  onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}>
                                  <span style={{ fontWeight: "600" }}>{p.title}</span>
                                  <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>— {p.city}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {showGSuggestions && gPropertySearch.trim().length >= 1 && filteredGProps.length === 0 && (
                            <div style={{ ...suggestionBoxStyle, padding: "0.75rem 1rem", color: "#9ca3af", fontSize: "0.875rem" }}>
                              No properties found for &quot;{gPropertySearch}&quot;
                            </div>
                          )}
                        </div>

                        {/* Visit date */}
                        <div>
                          <label style={labelStyle}>Visit Date *</label>
                          <input type="date" value={gForm.visitDate}
                            onChange={e => { setGForm({ ...gForm, visitDate: e.target.value }); setGFormError(""); }}
                            style={inputStyle} />
                        </div>

                        {/* Visit time */}
                        <div>
                          <label style={labelStyle}>Visit Time *</label>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <select value={gForm.hour} onChange={e => setGForm({ ...gForm, hour: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
                              {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <select value={gForm.minute} onChange={e => setGForm({ ...gForm, minute: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
                              {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select value={gForm.ampm} onChange={e => setGForm({ ...gForm, ampm: e.target.value })} style={{ ...inputStyle, flex: "0 0 5rem" }}>
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>

                      </div>
                      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => { setShowGForm(false); setGForm(EMPTY_GFORM); setGPropertySearch(""); setGSelectedProperty(null); }}
                          style={{ ...btnStyle, background: "#f3f4f6", color: "#374151" }}>Cancel</button>
                        <button type="submit" disabled={gSubmitting}
                          style={{ ...btnStyle, background: "#111827", color: "#ffffff", opacity: gSubmitting ? 0.7 : 1 }}>
                          {gSubmitting ? "Submitting..." : "Submit Entry"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Guest logs list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {gLoading ? <LoadingSpinner /> : gError ? <ErrorState message={gError} /> :
                    gLogs.length === 0 ? (
                      <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-neutral-400)" }}>
                        No guest entries yet. Click <strong>+ Register Guest</strong> to add one.
                      </div>
                    ) : gLogs.map(g => (
                      <div key={g._id} className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem" }}>
                              <span style={{ fontWeight: "600", fontSize: "0.9375rem", color: "#111827" }}>👤 {g.guestName}</span>
                              <Badge meta={STATUS_META[g.status] ?? STATUS_META.pending} />
                            </div>
                            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "#9ca3af" }}>
                              <span>🎯 {g.purpose}</span>
                              {g.relationship && <span>🤝 {g.relationship}</span>}
                              <span>📍 {g.propertyId?.title ?? "—"}</span>
                              <span>📅 {fmtDate(g.visitDate)}</span>
                              <span>🕐 {g.visitTime}</span>
                              <span>🗓 Submitted {fmtDate(g.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
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

// ── Shared styles ──────────────────────────────────────────
const labelStyle = {
  display: "block", fontSize: "0.8125rem", fontWeight: "600",
  color: "#374151", marginBottom: "0.375rem",
};
const inputStyle = {
  width: "100%", padding: "0.625rem 0.875rem",
  border: "1px solid #d1d5db", borderRadius: "8px",
  fontSize: "0.875rem", color: "#111827", background: "#ffffff",
  outline: "none", boxSizing: "border-box",
};
const btnStyle = {
  padding: "0.625rem 1.25rem", borderRadius: "8px",
  border: "none", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer",
};
const hubBtnStyle = {
  background: "#ffffff", border: "1px solid #e5e7eb",
  borderRadius: "16px", padding: "2rem 1.5rem",
  textAlign: "center", cursor: "pointer",
  transition: "box-shadow 0.15s, border-color 0.15s",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};
const successBannerStyle = {
  background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px",
  padding: "0.875rem 1.25rem", marginBottom: "1.25rem",
  color: "#15803d", fontSize: "0.875rem", fontWeight: "500",
};
const errorBannerStyle = {
  background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px",
  padding: "0.75rem 1rem", marginBottom: "1rem",
  color: "#dc2626", fontSize: "0.875rem",
};
const suggestionBoxStyle = {
  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
  background: "#ffffff", border: "1px solid #e5e7eb",
  borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  marginTop: "4px", overflow: "hidden",
};
const suggestionItemStyle = {
  padding: "0.625rem 0.875rem", cursor: "pointer",
  fontSize: "0.875rem", color: "#111827",
  borderBottom: "1px solid #f3f4f6",
};
