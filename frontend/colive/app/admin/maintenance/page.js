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

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const Badge = ({ meta }) => (
  <span style={{
    display: "inline-block", padding: "0.2rem 0.65rem",
    borderRadius: "999px", fontSize: "0.75rem", fontWeight: "600",
    color: meta.color, background: meta.bg, textTransform: "capitalize",
  }}>
    {meta.label}
  </span>
);

export default function ManageMaintenancePage() {
  const router = useRouter();
  const [user, setUser]         = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [filter, setFilter]     = useState("all");   // all | pending | in_progress | resolved

  // Per-card action state
  const [actionCard, setActionCard]         = useState(null);  // request._id
  const [techInput, setTechInput]           = useState("");
  const [actionLoading, setActionLoading]   = useState(false);
  const [actionError, setActionError]       = useState("");
  const [successMsg, setSuccessMsg]         = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    if (!["owner", "admin"].includes(u.role)) { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  const fetchRequests = useCallback(async (role) => {
    setLoading(true);
    setError("");
    try {
      const data = role === "admin"
        ? await maintenanceAPI.getAll()
        : await maintenanceAPI.getProperty();
      setRequests(data.requests ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchRequests(user.role);
  }, [user, fetchRequests]);

  const handleStatusChange = async (id, status) => {
    setActionLoading(true);
    setActionError("");
    try {
      await maintenanceAPI.updateStatus(id, status);
      setSuccessMsg("Status updated.");
      setActionCard(null);
      fetchRequests(user.role);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async (id) => {
    if (!techInput.trim()) { setActionError("Please enter a technician name."); return; }
    setActionLoading(true);
    setActionError("");
    try {
      await maintenanceAPI.assignTechnician(id, techInput.trim());
      setSuccessMsg("Technician assigned.");
      setTechInput("");
      setActionCard(null);
      fetchRequests(user.role);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) return null;

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

  const counts = {
    all:         requests.length,
    pending:     requests.filter(r => r.status === "pending").length,
    in_progress: requests.filter(r => r.status === "in_progress").length,
    resolved:    requests.filter(r => r.status === "resolved").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <Navbar />

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827", margin: 0 }}>
            Maintenance Management
          </h2>
          <p style={{ color: "#6b7280", marginTop: "0.25rem", fontSize: "0.9375rem" }}>
            {user.role === "admin" ? "All properties" : "Your properties"} · Assign technicians and update statuses
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.875rem", marginBottom: "2rem" }}>
          {[
            { key: "all",         label: "Total",       color: "#111827" },
            { key: "pending",     label: "Pending",     color: "#b45309" },
            { key: "in_progress", label: "In Progress", color: "#1d4ed8" },
            { key: "resolved",    label: "Resolved",    color: "#15803d" },
          ].map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)} style={{
              background: filter === s.key ? "#111827" : "#ffffff",
              color: filter === s.key ? "#ffffff" : "#374151",
              border: `1px solid ${filter === s.key ? "#111827" : "#e5e7eb"}`,
              borderRadius: "10px", padding: "1rem", textAlign: "center",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              <div style={{ fontSize: "1.625rem", fontWeight: "700", color: filter === s.key ? "#ffffff" : s.color }}>
                {counts[s.key]}
              </div>
              <div style={{ fontSize: "0.8125rem", marginTop: "0.2rem", fontWeight: "500" }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Success */}
        {successMsg && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #86efac",
            borderRadius: "8px", padding: "0.875rem 1.25rem",
            marginBottom: "1.5rem", color: "#15803d", fontSize: "0.875rem", fontWeight: "500",
          }}>
            ✓ {successMsg}
          </div>
        )}

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>Loading...</div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#dc2626" }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div style={{
              background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px",
              padding: "3rem", textAlign: "center", color: "#9ca3af",
            }}>
              No requests in this category.
            </div>
          ) : filtered.map(r => (
            <div key={r._id} style={{
              background: "#ffffff", border: "1px solid #e5e7eb",
              borderRadius: "12px", overflow: "hidden",
            }}>
              {/* Card body */}
              <div style={{ padding: "1.25rem 1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                      <h4 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: "600", color: "#111827" }}>{r.title}</h4>
                      <Badge meta={STATUS_META[r.status] ?? STATUS_META.pending} />
                      <Badge meta={PRIORITY_META[r.priority] ?? PRIORITY_META.medium} />
                    </div>
                    <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>{r.description}</p>
                    <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", fontSize: "0.8125rem", color: "#9ca3af" }}>
                      <span>👤 {r.createdBy?.name ?? "—"} · {r.createdBy?.email ?? ""}</span>
                      <span>📍 {r.propertyId?.title ?? "—"}</span>
                      <span>🚪 {r.roomId?.label ?? "—"}</span>
                      <span>🏷 {r.category}</span>
                      <span>📅 {fmtDate(r.createdAt)}</span>
                      {r.technicianName && <span>🔧 {r.technicianName}</span>}
                    </div>
                  </div>

                  {/* Action toggle */}
                  {r.status !== "resolved" && (
                    <button
                      onClick={() => {
                        setActionCard(actionCard === r._id ? null : r._id);
                        setActionError("");
                        setTechInput("");
                      }}
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
                <div style={{
                  borderTop: "1px solid #f3f4f6",
                  background: "#fafafa",
                  padding: "1.25rem 1.5rem",
                  display: "flex", flexDirection: "column", gap: "1rem",
                }}>
                  {actionError && (
                    <div style={{
                      background: "#fef2f2", border: "1px solid #fca5a5",
                      borderRadius: "8px", padding: "0.625rem 1rem",
                      color: "#dc2626", fontSize: "0.8125rem",
                    }}>
                      {actionError}
                    </div>
                  )}

                  {/* Status buttons */}
                  <div>
                    <p style={{ margin: "0 0 0.625rem", fontSize: "0.8125rem", fontWeight: "600", color: "#374151" }}>
                      Update Status
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {["pending", "in_progress", "resolved"].map(s => (
                        <button
                          key={s}
                          disabled={actionLoading || r.status === s}
                          onClick={() => handleStatusChange(r._id, s)}
                          style={{
                            padding: "0.45rem 1rem",
                            borderRadius: "8px",
                            border: `1px solid ${r.status === s ? "#111827" : "#d1d5db"}`,
                            background: r.status === s ? "#111827" : "#ffffff",
                            color: r.status === s ? "#ffffff" : "#374151",
                            fontSize: "0.8125rem", fontWeight: "600",
                            cursor: r.status === s ? "default" : "pointer",
                            opacity: actionLoading ? 0.6 : 1,
                            textTransform: "capitalize",
                          }}
                        >
                          {STATUS_META[s].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Assign technician */}
                  <div>
                    <p style={{ margin: "0 0 0.625rem", fontSize: "0.8125rem", fontWeight: "600", color: "#374151" }}>
                      Assign Technician
                    </p>
                    <div style={{ display: "flex", gap: "0.625rem" }}>
                      <input
                        value={techInput}
                        onChange={(e) => { setTechInput(e.target.value); setActionError(""); }}
                        placeholder={r.technicianName ? `Current: ${r.technicianName}` : "Technician name..."}
                        style={{
                          flex: 1, padding: "0.5rem 0.875rem",
                          border: "1px solid #d1d5db", borderRadius: "8px",
                          fontSize: "0.875rem", outline: "none",
                        }}
                      />
                      <button
                        onClick={() => handleAssign(r._id)}
                        disabled={actionLoading}
                        style={{
                          padding: "0.5rem 1rem", borderRadius: "8px",
                          background: "#1d4ed8", color: "#ffffff", border: "none",
                          fontWeight: "600", fontSize: "0.8125rem",
                          cursor: "pointer", opacity: actionLoading ? 0.6 : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {actionLoading ? "Saving..." : "Assign"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}