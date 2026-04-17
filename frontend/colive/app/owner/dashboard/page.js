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

// Using your exact api.js exports!
import { getUser, propertyAPI, bookingAPI, maintenanceAPI, guestLogAPI } from "../../../lib/api";
import { OwnerNoticeSection } from "../../notices/NoticeSection";
import { OwnerMealSection } from "../../meals/MealSection";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtMoney = (n) => n != null ? `BDT ${Number(n).toLocaleString()}` : "—";

export default function OwnerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [active, setActive] = useState("overview");
  const [othersSection, setOthersSection] = useState(null);

  // Mapped perfectly to your api.js
  const properties = useApi(propertyAPI.getMy);
  const bookings = useApi(bookingAPI.getReceived);
  const maintenance = useApi(maintenanceAPI.getProperty);
  const guests = useApi(guestLogAPI.getProperty);

  const TABS = [
    { key: "overview",    label: "Overview" },
    { key: "properties",  label: "My Properties" },
    { key: "bookings",    label: "Bookings" },
    { key: "maintenance", label: "Maintenance" },
    { key: "messages",    label: "Messages" },
    { key: "others",      label: "Others" },
  ];

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "owner") {
      router.push("/login");
      return;
    }
    setUser(u);
  }, [router]);

  if (!user) return null;

  const totalProperties = properties.data?.properties?.length || 0;
  const pendingBookings = bookings.data?.bookings?.filter(b => b.status === "pending").length || 0;
  const openMaintenance = maintenance.data?.requests?.filter(r => r.status !== "resolved").length || 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <TabBar tabs={TABS} active={active} onChange={setActive} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        
        {/* ── OVERVIEW ─────────────────────────────────────── */}
        {active === "overview" && (
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>Welcome back, {user.name}</h2>
            <p style={{ color: "var(--color-neutral-500)", marginBottom: "2rem" }}>
              Manage your properties and tenants.
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <StatCard label="My Properties" value={totalProperties} sub="active listings" accent="primary" />
              <StatCard label="Pending Bookings" value={pendingBookings} sub="awaiting approval" accent="warning" />
              <StatCard label="Open Maintenance" value={openMaintenance} sub="unresolved requests" accent="error" />
            </div>

            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <h4 style={{ marginBottom: "1rem" }}>Recent Booking Requests</h4>
              {bookings.loading ? <LoadingSpinner /> : bookings.error ? <ErrorState message={bookings.error} /> : (
                <DataTable 
                  headers={["Property", "Tenant", "Rent", "Status", "Requested"]} 
                  emptyMessage="No recent booking requests."
                  rows={(bookings.data?.bookings ?? []).slice(0, 5).map(b => [
                    b.propertyId?.title ?? "—", 
                    b.tenantId?.name ?? "—", 
                    fmtMoney(b.roomId?.rent), 
                    b.status, 
                    fmtDate(b.createdAt)
                  ])} 
                />
              )}
            </div>
          </div>
        )}

        {/* ── PROPERTIES ───────────────────────────────────── */}
        {active === "properties" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <h3 style={{ margin: 0 }}>My Properties</h3>
              <Link href="/properties/new" className="btn btn-primary">+ Add Property</Link>
            </div>
            <div className="card">
              {properties.loading ? <LoadingSpinner /> : properties.error ? <ErrorState message={properties.error} /> : (
                <DataTable 
                  headers={["Title", "City", "Type", "Status"]} 
                  emptyMessage="You have not listed any properties yet."
                  rows={(properties.data?.properties ?? []).map(p => [
                    p.title, p.city, p.propertyType, "Active"
                  ])} 
                />
              )}
            </div>
          </div>
        )}

        {/* ── BOOKINGS ─────────────────────────────────────── */}
        {active === "bookings" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>Booking Requests</h3>
            <div className="card">
              {bookings.loading ? <LoadingSpinner /> : bookings.error ? <ErrorState message={bookings.error} /> : (
                <DataTable 
                  headers={["Property", "Tenant", "Rent/mo", "Status", "Requested"]} 
                  emptyMessage="No booking requests yet."
                  rows={(bookings.data?.bookings ?? []).map(b => [
                    b.propertyId?.title ?? "—", 
                    b.tenantId?.name ?? "—", 
                    fmtMoney(b.roomId?.rent), 
                    b.status, 
                    fmtDate(b.createdAt)
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
                View and manage your conversations with tenants.
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
            {othersSection === "meal" && <OwnerMealSection onBack={() => setOthersSection(null)} />}
            {othersSection === "notice" && <OwnerNoticeSection onBack={() => setOthersSection(null)} />}
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