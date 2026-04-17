"use client";
import { useState, useEffect, useCallback } from "react";
import { LoadingSpinner, ErrorState } from "../../components/LoadingState";
import { noticeAPI, propertyAPI } from "../../lib/api";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// ── Owner Notice Section ───────────────────────────────────
export function OwnerNoticeSection({ onBack }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [properties, setProperties] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchNotices = useCallback(async () => {
    setLoading(true); setError("");
    try { const d = await noticeAPI.getMy(); setNotices(d.notices ?? []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  const fetchProperties = useCallback(async () => {
    try { const d = await propertyAPI.getMy(); setProperties(d.properties ?? []); } catch (_) {}
  }, []);

  useEffect(() => { fetchNotices(); fetchProperties(); }, [fetchNotices, fetchProperties]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) { setFormError("Title and message are required."); return; }
    if (!propertyId) { setFormError("Please select a property."); return; }
    setSubmitting(true); setFormError("");
    try {
      await noticeAPI.create({ title: title.trim(), message: message.trim(), propertyId });
      setSuccess("Notice posted and tenants notified by email!");
      setTitle(""); setMessage(""); setPropertyId(""); setShowForm(false);
      fetchNotices(); setTimeout(() => setSuccess(""), 5000);
    } catch (err) { setFormError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <button onClick={onBack} style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "0.4rem 0.875rem", fontSize: "0.8125rem", fontWeight: "600", color: "#374151", cursor: "pointer" }}>← Back</button>
          <div>
            <h3 style={{ margin: 0 }}>Notices</h3>
            <p style={{ color: "var(--color-neutral-500)", fontSize: "0.875rem", marginTop: "0.125rem" }}>Your properties only · Tenants are notified by email.</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(!showForm); setFormError(""); setTitle(""); setMessage(""); setPropertyId(""); }}
          style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: showForm ? "#f3f4f6" : "#111827", color: showForm ? "#374151" : "#ffffff", border: "none", borderRadius: "8px", padding: "0.625rem 1.25rem", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer" }}>
          {showForm ? "✕ Cancel" : "+ Post Notice"}
        </button>
      </div>
      {success && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "0.875rem 1.25rem", marginBottom: "1.25rem", color: "#15803d", fontSize: "0.875rem", fontWeight: "500" }}>✓ {success}</div>}
      
      {showForm && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ marginBottom: "1.25rem" }}>Post a new notice</h4>
          {formError && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", color: "#dc2626", fontSize: "0.875rem" }}>{formError}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={labelStyle}>Property *</label>
                <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={inputStyle}>
                  <option value="">— Select a property —</option>
                  {properties.map(p => <option key={p._id} value={p._id}>{p.title} — {p.city}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Title *</label>
                <input value={title} onChange={e => { setTitle(e.target.value); setFormError(""); }} placeholder="e.g. Water supply maintenance" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Message *</label>
                <textarea value={message} onChange={e => { setMessage(e.target.value); setFormError(""); }} placeholder="Write your notice here..." rows={5} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setShowForm(false); setTitle(""); setMessage(""); setPropertyId(""); }} style={{ padding: "0.625rem 1.25rem", borderRadius: "8px", border: "none", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer", background: "#f3f4f6", color: "#374151" }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{ padding: "0.625rem 1.25rem", borderRadius: "8px", border: "none", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer", background: "#111827", color: "#ffffff", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Posting..." : "Post Notice"}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} /> : notices.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-neutral-400)" }}>No notices posted yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {notices.map(n => (
            <div key={n._id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <p style={{ fontWeight: "600", color: "#111827" }}>{n.title}</p>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-neutral-400)" }}>{fmtDate(n.createdAt)}</span>
                  <span style={{ fontSize: "0.75rem", background: "var(--color-info-50)", color: "var(--color-info-700)", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>{n.propertyId?.title ?? "—"}</span>
                </div>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-700)", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admin Notice Section ───────────────────────────────────
export function AdminNoticeSection({ onBack }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [properties, setProperties] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchNotices = useCallback(async () => {
    setLoading(true); setError("");
    try { const d = await noticeAPI.getAll(); setNotices(d.notices ?? []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  const fetchProperties = useCallback(async () => {
    try {
      const { adminAPI } = await import("../../lib/api");
      const d = await adminAPI.getProperties();
      setProperties(d.properties ?? []);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchNotices(); fetchProperties(); }, [fetchNotices, fetchProperties]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) { setFormError("Title and message are required."); return; }
    setSubmitting(true); setFormError("");
    try {
      await noticeAPI.create({ title: title.trim(), message: message.trim(), propertyId: propertyId || undefined });
      setSuccess(propertyId ? "Notice posted to property and tenants notified by email!" : "Platform-wide notice posted and all users notified by email!");
      setTitle(""); setMessage(""); setPropertyId(""); setShowForm(false); fetchNotices(); setTimeout(() => setSuccess(""), 5000);
    } catch (err) { setFormError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <button onClick={onBack} style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "0.4rem 0.875rem", fontSize: "0.8125rem", fontWeight: "600", color: "#374151", cursor: "pointer" }}>← Back</button>
          <div>
            <h3 style={{ margin: 0 }}>Notices</h3>
            <p style={{ color: "var(--color-neutral-500)", fontSize: "0.875rem", marginTop: "0.125rem" }}>All properties · Leave blank for platform-wide.</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(!showForm); setFormError(""); setTitle(""); setMessage(""); setPropertyId(""); }}
          style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: showForm ? "#f3f4f6" : "#111827", color: showForm ? "#374151" : "#ffffff", border: "none", borderRadius: "8px", padding: "0.625rem 1.25rem", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer" }}>
          {showForm ? "✕ Cancel" : "+ Post Notice"}
        </button>
      </div>
      {success && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "0.875rem 1.25rem", marginBottom: "1.25rem", color: "#15803d", fontSize: "0.875rem", fontWeight: "500" }}>✓ {success}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ marginBottom: "1.25rem" }}>Post a new notice</h4>
          {formError && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", color: "#dc2626", fontSize: "0.875rem" }}>{formError}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={labelStyle}>Property <span style={{ color: "#9ca3af", fontWeight: "400" }}>(leave blank for platform-wide)</span></label>
                <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={inputStyle}>
                  <option value="">— Platform-wide (all users) —</option>
                  {properties.map(p => <option key={p._id} value={p._id}>{p.title} — {p.city}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Title *</label>
                <input value={title} onChange={e => { setTitle(e.target.value); setFormError(""); }} placeholder="e.g. Scheduled maintenance downtime" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Message *</label>
                <textarea value={message} onChange={e => { setMessage(e.target.value); setFormError(""); }} placeholder="Write your notice here..." rows={5} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setShowForm(false); setTitle(""); setMessage(""); setPropertyId(""); }} style={{ padding: "0.625rem 1.25rem", borderRadius: "8px", border: "none", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer", background: "#f3f4f6", color: "#374151" }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{ padding: "0.625rem 1.25rem", borderRadius: "8px", border: "none", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer", background: "#111827", color: "#ffffff", opacity: submitting ? 0.7 : 1 }}>{submitting ? "Posting..." : "Post Notice"}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} /> : notices.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-neutral-400)" }}>No notices posted yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {notices.map(n => (
            <div key={n._id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <p style={{ fontWeight: "600", color: "#111827" }}>{n.title}</p>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-neutral-400)" }}>{fmtDate(n.createdAt)}</span>
                  <span style={{ fontSize: "0.75rem", background: n.isGlobal ? "#fef3c7" : "var(--color-info-50)", color: n.isGlobal ? "#b45309" : "var(--color-info-700)", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>{n.isGlobal ? "Platform-wide" : (n.propertyId?.title ?? "—")}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-neutral-500)" }}>by {n.createdBy?.name ?? "—"}</span>
                </div>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-700)", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tenant Notice Section ──────────────────────────────────
export function TenantNoticeSection({ onBack }) {
  const [notices, setNotices] = useState([]);
  const [unreadCount, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(new Set()); 

  const fetchNotices = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const d = await noticeAPI.getTenant();
      setNotices(d.notices ?? []);
      setUnread(d.unreadCount ?? 0);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const handleOpen = async (noticeId, isRead) => {
    if (isRead || opened.has(noticeId)) return;
    setOpened(prev => new Set([...prev, noticeId]));
    try {
      await noticeAPI.markAsRead(noticeId);
      setNotices(prev => prev.map(n => n._id === noticeId ? { ...n, isRead: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const handleMarkAll = async () => {
    try {
      await noticeAPI.markAllRead();
      setNotices(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch (_) {}
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <button onClick={onBack} style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "0.4rem 0.875rem", fontSize: "0.8125rem", fontWeight: "600", color: "#374151", cursor: "pointer" }}>← Back</button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <h3 style={{ margin: 0 }}>Notices</h3>
              {unreadCount > 0 && <span style={{ background: "#dc2626", color: "#ffffff", borderRadius: "999px", fontSize: "0.7rem", fontWeight: "700", padding: "0.1rem 0.5rem", minWidth: "18px", textAlign: "center" }}>{unreadCount}</span>}
            </div>
            <p style={{ color: "var(--color-neutral-500)", fontSize: "0.875rem", marginTop: "0.125rem" }}>Notices from your property owner and platform admin.</p>
          </div>
        </div>
        {unreadCount > 0 && <button onClick={handleMarkAll} style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.8125rem", fontWeight: "600", color: "#374151", cursor: "pointer" }}>Mark all as read</button>}
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} /> : notices.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-neutral-400)" }}>No notices yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {notices.map(n => {
            const isUnread = !n.isRead && !opened.has(n._id);
            return (
              <div key={n._id} className="card" onClick={() => handleOpen(n._id, n.isRead)}
                style={{ cursor: isUnread ? "pointer" : "default", borderLeft: isUnread ? "3px solid #dc2626" : "none", borderRadius: isUnread ? "0 var(--radius-xl) var(--radius-xl) 0" : undefined, transition: "border 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {isUnread && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#dc2626", flexShrink: 0, display: "inline-block" }} />}
                    <p style={{ fontWeight: isUnread ? "700" : "600", color: "#111827", margin: 0 }}>{n.title}</p>
                  </div>
                  <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-neutral-400)" }}>{fmtDate(n.createdAt)}</span>
                    <span style={{ fontSize: "0.75rem", background: n.isGlobal ? "#fef3c7" : "var(--color-info-50)", color: n.isGlobal ? "#b45309" : "var(--color-info-700)", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>{n.isGlobal ? "Platform-wide" : (n.propertyId?.title ?? "—")}</span>
                  </div>
                </div>
                <p style={{ fontSize: "0.875rem", color: isUnread ? "#374151" : "var(--color-neutral-600)", fontWeight: isUnread ? "500" : "400", lineHeight: "1.6", whiteSpace: "pre-wrap", margin: 0 }}>{n.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", fontSize: "0.8125rem", fontWeight: "600", color: "#374151", marginBottom: "0.375rem" };
const inputStyle = { width: "100%", padding: "0.625rem 0.875rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", color: "#111827", background: "#ffffff", outline: "none", boxSizing: "border-box" };