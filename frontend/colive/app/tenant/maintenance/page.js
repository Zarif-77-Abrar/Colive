"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../../components/Navbar";
import { getUser, maintenanceAPI } from "../../../../lib/api";

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

const CATEGORIES = ["plumbing", "electrical", "appliance", "structural", "cleaning", "other"];

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const Badge = ({ meta }) => (
  <span style={{
    display: "inline-block",
    padding: "0.2rem 0.65rem",
    borderRadius: "999px",
    fontSize: "0.75rem",
    fontWeight: "600",
    color: meta.color,
    background: meta.bg,
    textTransform: "capitalize",
  }}>
    {meta.label}
  </span>
);

const EMPTY_FORM = {
  title: "", description: "", category: "other",
  priority: "medium", propertyId: "", roomId: "",
};

export default function TenantMaintenancePage() {
  const router = useRouter();
  const [user, setUser]         = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState("");
  const [success, setSuccess]       = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "tenant") { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await maintenanceAPI.getMy();
      setRequests(data.requests ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchRequests();
  }, [user, fetchRequests]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.propertyId.trim()) {
      setFormError("Title, description, and Property ID are required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await maintenanceAPI.create({
        title:       form.title.trim(),
        description: form.description.trim(),
        category:    form.category,
        priority:    form.priority,
        propertyId:  form.propertyId.trim(),
        roomId:      form.roomId.trim() || undefined,
      });
      setSuccess("Maintenance request submitted successfully!");
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchRequests();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const open     = requests.filter(r => r.status !== "resolved").length;
  const resolved = requests.filter(r => r.status === "resolved").length;

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <Navbar />

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827", margin: 0 }}>
              Maintenance Requests
            </h2>
            <p style={{ color: "#6b7280", marginTop: "0.25rem", fontSize: "0.9375rem" }}>
              Report issues and track their progress
            </p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setFormError(""); }}
            style={{
              background: showForm ? "#f3f4f6" : "#111827",
              color: showForm ? "#374151" : "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "0.625rem 1.25rem",
              fontWeight: "600",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            {showForm ? "✕ Cancel" : "+ New Request"}
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Total",    value: requests.length, color: "#111827" },
            { label: "Open",     value: open,            color: "#b45309" },
            { label: "Resolved", value: resolved,        color: "#15803d" },
          ].map(s => (
            <div key={s.label} style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "1.25rem 1.5rem",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "1.875rem", fontWeight: "700", color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.25rem" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Success banner */}
        {success && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #86efac",
            borderRadius: "8px", padding: "0.875rem 1.25rem",
            marginBottom: "1.5rem", color: "#15803d", fontSize: "0.875rem", fontWeight: "500",
          }}>
            ✓ {success}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div style={{
            background: "#ffffff", border: "1px solid #e5e7eb",
            borderRadius: "12px", padding: "1.75rem",
            marginBottom: "2rem",
          }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#111827", marginBottom: "1.5rem" }}>
              Submit a new request
            </h3>

            {formError && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fca5a5",
                borderRadius: "8px", padding: "0.75rem 1rem",
                marginBottom: "1.25rem", color: "#dc2626", fontSize: "0.875rem",
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                {/* Title */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Title *</label>
                  <input
                    name="title" value={form.title} onChange={handleChange}
                    placeholder="e.g. Leaking tap in bathroom"
                    style={inputStyle}
                  />
                </div>

                {/* Category */}
                <div>
                  <label style={labelStyle}>Category</label>
                  <select name="category" value={form.category} onChange={handleChange} style={inputStyle}>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select name="priority" value={form.priority} onChange={handleChange} style={inputStyle}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Property ID */}
                <div>
                  <label style={labelStyle}>Property ID *</label>
                  <input
                    name="propertyId" value={form.propertyId} onChange={handleChange}
                    placeholder="Paste your Property ID"
                    style={inputStyle}
                  />
                </div>

                {/* Room ID */}
                <div>
                  <label style={labelStyle}>Room ID <span style={{ color: "#9ca3af" }}>(optional)</span></label>
                  <input
                    name="roomId" value={form.roomId} onChange={handleChange}
                    placeholder="Paste your Room ID"
                    style={inputStyle}
                  />
                </div>

                {/* Description */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Description *</label>
                  <textarea
                    name="description" value={form.description} onChange={handleChange}
                    placeholder="Describe the issue in detail..."
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
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
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>Loading...</div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#dc2626" }}>{error}</div>
          ) : requests.length === 0 ? (
            <div style={{
              background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px",
              padding: "3rem", textAlign: "center", color: "#9ca3af",
            }}>
              No maintenance requests yet. Click <strong>+ New Request</strong> to submit one.
            </div>
          ) : requests.map(r => (
            <div key={r._id} style={{
              background: "#ffffff", border: "1px solid #e5e7eb",
              borderRadius: "12px", padding: "1.25rem 1.5rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                    <h4 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: "600", color: "#111827" }}>{r.title}</h4>
                    <Badge meta={STATUS_META[r.status] ?? STATUS_META.pending} />
                    <Badge meta={PRIORITY_META[r.priority] ?? PRIORITY_META.medium} />
                  </div>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>{r.description}</p>
                  <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "#9ca3af" }}>
                    <span>📍 {r.propertyId?.title ?? "—"}</span>
                    <span>🚪 {r.roomId?.label ?? "—"}</span>
                    <span>🏷 {r.category}</span>
                    <span>📅 {fmtDate(r.createdAt)}</span>
                    {r.technicianName && <span>🔧 {r.technicianName}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: "0.8125rem", fontWeight: "600",
  color: "#374151", marginBottom: "0.375rem",
};

const inputStyle = {
  width: "100%", padding: "0.625rem 0.875rem",
  border: "1px solid #d1d5db", borderRadius: "8px",
  fontSize: "0.875rem", color: "#111827",
  background: "#ffffff", outline: "none",
  boxSizing: "border-box",
};

const btnStyle = {
  padding: "0.625rem 1.25rem", borderRadius: "8px",
  border: "none", fontWeight: "600", fontSize: "0.875rem",
  cursor: "pointer",
};
