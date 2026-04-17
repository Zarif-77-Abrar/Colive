"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import TabBar from "../../../components/TabBar";
import StatCard from "../../../components/StatCard";
import DataTable from "../../../components/DataTable";
import { LoadingSpinner, ErrorState } from "../../../components/LoadingState";
import useApi from "../../../lib/useApi";

// Using your exact api.js admin module exports!
import { getUser, adminAPI, maintenanceAPI, guestLogAPI } from "../../../lib/api";
import { AdminNoticeSection } from "../../notices/NoticeSection";
import { AdminMealSection } from "../../meals/MealSection";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [active, setActive] = useState("overview");
  const [othersSection, setOthersSection] = useState(null);

  // Mapped perfectly to your api.js adminAPI object
  const users = useApi(adminAPI.getUsers);
  const properties = useApi(adminAPI.getProperties);
  const maintenance = useApi(adminAPI.getMaintenance);
  const guests = useApi(guestLogAPI.getAll);

  const TABS = [
    { key: "overview",    label: "Overview" },
    { key: "users",       label: "Users" },
    { key: "properties",  label: "Properties" },
    { key: "maintenance", label: "Maintenance" },
    { key: "messages",    label: "Messages" },
    { key: "others",      label: "Others" },
  ];

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "admin") {
      router.push("/login");
      return;
    }
    setUser(u);
  }, [router]);

  if (!user) return null;

  const totalUsers = users.data?.users?.length || 0;
  const totalProperties = properties.data?.properties?.length || 0;
  const openMaintenance = maintenance.data?.requests?.filter(r => r.status !== "resolved").length || 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <TabBar tabs={TABS} active={active} onChange={setActive} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        
        {/* ── OVERVIEW ─────────────────────────────────────── */}
        {active === "overview" && (
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>System Administrator</h2>
            <p style={{ color: "var(--color-neutral-500)", marginBottom: "2rem" }}>
              Platform overview and global management.
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <StatCard label="Total Users" value={totalUsers} sub="active accounts" accent="primary" />
              <StatCard label="Total Properties" value={totalProperties} sub="platform-wide" accent="success" />
              <StatCard label="Open Maintenance" value={openMaintenance} sub="unresolved requests" accent="error" />
            </div>
          </div>
        )}

        {/* ── USERS ────────────────────────────────────────── */}
        {active === "users" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>Platform Users</h3>
            <div className="card">
              {users.loading ? <LoadingSpinner /> : users.error ? <ErrorState message={users.error} /> : (
                <DataTable 
                  headers={["Name", "Email", "Role", "Joined"]} 
                  emptyMessage="No users found."
                  rows={(users.data?.users ?? []).map(u => [
                    u.name, u.email, u.role, fmtDate(u.createdAt)
                  ])} 
                />
              )}
            </div>
          </div>
        )}

        {/* ── PROPERTIES ───────────────────────────────────── */}
        {active === "properties" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>Platform Properties</h3>
            <div className="card">
              {properties.loading ? <LoadingSpinner /> : properties.error ? <ErrorState message={properties.error} /> : (
                <DataTable 
                  headers={["Title", "City", "Owner", "Status"]} 
                  emptyMessage="No properties registered yet."
                  rows={(properties.data?.properties ?? []).map(p => [
                    p.title, p.city, p.ownerId?.name ?? "—", "Active"
                  ])} 
                />
              )}
            </div>
          </div>
        )}

        {/* ── MAINTENANCE ──────────────────────────────────── */}
        {active === "maintenance" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>Maintenance Requests</h3>
            <div className="card">
              {maintenance.loading ? <LoadingSpinner /> : maintenance.error ? <ErrorState message={maintenance.error} /> : (
                <DataTable 
                  headers={["Property", "Issue", "Priority", "Status", "Date", "Action"]} 
                  emptyMessage="No maintenance requests."
                  rows={(maintenance.data?.requests ?? []).map(r => [
                    r.propertyId?.title ?? "—", 
                    r.title, 
                    <span key={`pri-${r._id}`} style={{ textTransform: "capitalize", fontWeight: "600", color: r.priority === "high" ? "#dc2626" : r.priority === "medium" ? "#b45309" : "#6b7280" }}>{r.priority}</span>,
                    
                    /* Interactive Status Dropdown */
                    <select 
                      key={`stat-${r._id}`}
                      defaultValue={r.status} 
                      onChange={async (e) => {
                        try {
                          await maintenanceAPI.updateStatus(r._id, e.target.value);
                          alert("Status updated successfully!");
                        } catch (err) { alert("Failed to update status."); }
                      }}
                      style={{ padding: "0.25rem", borderRadius: "4px", border: "1px solid #d1d5db", fontSize: "0.875rem", background: "#f9fafb" }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>, 
                    
                    fmtDate(r.createdAt),
                    
                    /* The Manage Button */
                    <button 
                      key={`btn-${r._id}`}
                      onClick={async () => {
                        const tech = prompt("Enter technician name to assign (or leave blank to cancel):", r.technicianName || "");
                        if (tech) {
                          try {
                            await maintenanceAPI.assignTechnician(r._id, tech);
                            alert("Technician assigned successfully!");
                          } catch (err) { alert("Failed to assign technician."); }
                        }
                      }} 
                      className="btn btn-primary" 
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                    >
                      Manage
                    </button>
                  ])} 
                />
              )}
            </div>
          </div>
        )}

        {/* ── MESSAGES ─────────────────────────────────────── */}
        {active === "messages" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>Messages</h3>
            <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
              <p style={{ color: "var(--color-neutral-600)", marginBottom: "1rem" }}>
                Monitor system messages.
              </p>
              <Link href="/messages" className="btn btn-primary">Go to messages</Link>
            </div>
          </div>
        )}

        {/* ── OTHERS (MEALS, NOTICES, GUESTS) ─────────────────────── */}
        {active === "others" && (
          <div>
            {!othersSection && (
              <div>
                <h3 style={{ marginBottom: "0.25rem" }}>Others</h3>
                <p style={{ color: "var(--color-neutral-500)", fontSize: "0.9375rem", marginBottom: "2rem" }}>
                  Manage notices, guests, and daily meal counts.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
                  
                  {/* Guest Log Button */}
                  <button onClick={() => setOthersSection("guest")} style={hubBtnStyle}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🚪</div>
                    <div style={{ fontWeight: "700", fontSize: "1rem", color: "#111827", marginBottom: "0.375rem" }}>Guest Entry Log</div>
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: "1.5" }}>Review and manage visitor requests.</div>
                  </button>

                  <button onClick={() => setOthersSection("meal")} style={hubBtnStyle}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🍽️</div>
                    <div style={{ fontWeight: "700", fontSize: "1rem", color: "#111827", marginBottom: "0.375rem" }}>Daily Meal</div>
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: "1.5" }}>View today's menu and manage tenant meal counts.</div>
                  </button>

                  <button onClick={() => setOthersSection("notice")} style={hubBtnStyle}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📢</div>
                    <div style={{ fontWeight: "700", fontSize: "1rem", color: "#111827", marginBottom: "0.375rem" }}>Property Notices</div>
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: "1.5" }}>Post updates and send emails to your tenants.</div>
                  </button>
                </div>
              </div>
            )}
            
            {/* ── GUEST SECTION UI ── */}
            {othersSection === "guest" && (
              <div>
                <div style={{ display: "flex", gap: "0.875rem", marginBottom: "1.5rem", alignItems: "center" }}>
                  <button onClick={() => setOthersSection(null)} style={{ background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "0.4rem 0.875rem", fontSize: "0.8125rem", fontWeight: "600", cursor: "pointer" }}>← Back</button>
                  <h3 style={{ margin: 0 }}>Guest Entry Log</h3>
                </div>
                <div className="card">
                  {guests?.loading ? <LoadingSpinner /> : guests?.error ? <ErrorState message={guests.error} /> : (
                    <DataTable 
                      headers={["Guest", "Tenant", "Property", "Visit Date", "Action"]} 
                      emptyMessage="No guest entries."
                      rows={(guests?.data?.logs ?? []).map(g => [
                        g.guestName, 
                        g.tenantId?.name ?? "—",
                        g.propertyId?.title ?? "—", 
                        fmtDate(g.visitDate),
                        
                        /* Interactive Guest Status Dropdown */
                        <select 
                          key={g._id}
                          defaultValue={g.status}
                          onChange={async (e) => {
                            try {
                              await guestLogAPI.updateStatus(g._id, e.target.value);
                              alert("Guest status updated!");
                            } catch (err) { alert("Failed to update status."); }
                          }}
                          style={{ padding: "0.25rem", borderRadius: "4px", border: "1px solid #d1d5db", fontSize: "0.875rem", background: "#f9fafb" }}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      ])} 
                    />
                  )}
                </div>
              </div>
            )}

            {/* Change 'Owner' to 'Admin' for the Admin dashboard! */}
            {othersSection === "meal" && <AdminMealSectionMealSection onBack={() => setOthersSection(null)} />}
            {othersSection === "notice" && <AdminNoticeSection onBack={() => setOthersSection(null)} />}
          </div>
        )}

      </div>
    </div>
  );
}

const hubBtnStyle = { 
  background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "16px", 
  padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", 
  transition: "box-shadow 0.15s, border-color 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" 
};