"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
];

const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtMoney = (n) => n != null ? `BDT ${Number(n).toLocaleString()}` : "—";

export default function OwnerDashboard() {
  const router = useRouter();
  const [user, setUser]     = useState(null);
  const [active, setActive] = useState("overview");
  
  // Add Property Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [newProp, setNewProp] = useState({
    title: "", address: "", city: "", postalCode: "", description: "", propertyType: "apartment", minRent: "", maxRent: "", amenities: ""
  });

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "owner") { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  const properties  = useApi(propertyAPI.getMy);
  const bookings    = useApi(bookingAPI.getReceived);
  const maintenance = useApi(maintenanceAPI.getProperty);
  const notices     = useApi(noticeAPI.getMy);

  const handleAddProperty = async (e) => {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    try {
      const payload = { ...newProp, rentRange: { min: Number(newProp.minRent), max: Number(newProp.maxRent) }, amenities: newProp.amenities.split(",").map(a => a.trim()).filter(a => a) };
      await propertyAPI.create(payload);
      setShowAddModal(false);
      setNewProp({ title: "", address: "", city: "", postalCode: "", description: "", propertyType: "apartment", minRent: "", maxRent: "", amenities: "" });
      properties.mutate(); // refresh properties list
    } catch (err) {
      setAddError(err.message || "Failed to create property");
    } finally {
      setAdding(false);
    }
  };

  if (!user) return null;

  const totalRooms     = properties.data?.properties?.reduce((s, p) => s + (p.rooms?.length ?? 0), 0) ?? 0;
  const availableRooms = properties.data?.properties?.reduce((s, p) => s + (p.rooms?.filter(r => r.status === "available").length ?? 0), 0) ?? 0;
  const pendingBookings = bookings.data?.bookings?.filter(b => b.status === "pending").length ?? 0;
  const openMaintenance = maintenance.data?.requests?.filter(r => r.status !== "resolved").length ?? 0;

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
              <StatCard label="Total properties"  value={properties.data?.count ?? "—"} sub={`${totalRooms} rooms total`}        accent="primary" />
              <StatCard label="Available rooms"   value={availableRooms}                sub="across all properties"              accent="success" />
              <StatCard label="Pending bookings"  value={pendingBookings}               sub="awaiting your response"             accent="warning" />
              <StatCard label="Open maintenance"  value={openMaintenance}               sub="unresolved requests"                accent="error"   />
            </div>

            {/* Pending bookings preview */}
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
                    b.tenantId?.name    ?? "—",
                    b.propertyId?.title ?? "—",
                    b.roomId?.label     ?? "—",
                    b.compatibilityScore != null ? `${b.compatibilityScore}%` : "—",
                    fmtDate(b.createdAt),
                  ])}
                />
              )}
            </div>

            {/* Open maintenance preview */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4>Open maintenance requests</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setActive("maintenance")}>View all</button>
              </div>
              {maintenance.loading ? <LoadingSpinner /> : maintenance.error ? <ErrorState message={maintenance.error} /> : (
                <DataTable
                  headers={["Title", "Category", "Property", "Room", "Status"]}
                  emptyMessage="No open maintenance requests."
                  rows={(maintenance.data?.requests ?? []).filter(r => r.status !== "resolved").slice(0, 5).map(r => [
                    r.title,
                    r.category,
                    r.propertyId?.title ?? "—",
                    r.roomId?.label     ?? "—",
                    r.status,
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
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>+ Add property</button>
            </div>
            {properties.loading ? <LoadingSpinner /> : properties.error ? <ErrorState message={properties.error} /> :
              properties.data?.properties?.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                  <p style={{ color: "var(--color-neutral-500)", marginBottom: "1rem" }}>You have not listed any properties yet.</p>
                  <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add your first property</button>
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
                          <span style={{ fontSize: "0.875rem", color: "var(--color-neutral-600)" }}>
                            {avail}/{p.rooms?.length ?? 0} available
                          </span>
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
                    b.tenantId?.name    ?? "—",
                    b.propertyId?.title ?? "—",
                    b.roomId?.label     ?? "—",
                    fmtMoney(b.roomId?.rent),
                    b.compatibilityScore != null ? `${b.compatibilityScore}%` : "—",
                    b.status,
                    fmtDate(b.createdAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Maintenance ────────────────────────────────── */}
        {active === "maintenance" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>Maintenance requests</h3>
            <div className="card">
              {maintenance.loading ? <LoadingSpinner /> : maintenance.error ? <ErrorState message={maintenance.error} /> : (
                <DataTable
                  headers={["Title", "Category", "Property", "Room", "Submitted by", "Status", "Date"]}
                  emptyMessage="No maintenance requests for your properties yet."
                  rows={(maintenance.data?.requests ?? []).map(r => [
                    r.title,
                    r.category,
                    r.propertyId?.title ?? "—",
                    r.roomId?.label     ?? "—",
                    r.createdBy?.name   ?? "—",
                    r.status,
                    fmtDate(r.createdAt),
                  ])}
                />
              )}
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

      </div>

      {/* ── Add Property Modal ──────────────────────────────── */}
      {showAddModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem"
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: "1.5rem" }}>Add New Property</h3>
            {addError && <div style={{ color: "red", marginBottom: "1rem" }}>{addError}</div>}
            <form onSubmit={handleAddProperty} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="input-label">Title</label>
                <input required className="input" value={newProp.title} onChange={e => setNewProp({...newProp, title: e.target.value})} placeholder="e.g. Sunny Apartment in Downtown" />
              </div>
              <div>
                <label className="input-label">Address</label>
                <input required className="input" value={newProp.address} onChange={e => setNewProp({...newProp, address: e.target.value})} placeholder="e.g. 123 Main St" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="input-label">City</label>
                  <input required className="input" value={newProp.city} onChange={e => setNewProp({...newProp, city: e.target.value})} placeholder="e.g. Dhaka" />
                </div>
                <div>
                  <label className="input-label">Postal Code</label>
                  <input required className="input" value={newProp.postalCode} onChange={e => setNewProp({...newProp, postalCode: e.target.value})} placeholder="e.g. 1000" />
                </div>
              </div>
              <div>
                <label className="input-label">Property Type</label>
                <select className="input" value={newProp.propertyType} onChange={e => setNewProp({...newProp, propertyType: e.target.value})}>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="pg">PG</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="input-label">Min Rent (BDT)</label>
                  <input required type="number" className="input" value={newProp.minRent} onChange={e => setNewProp({...newProp, minRent: e.target.value})} placeholder="e.g. 10000" />
                </div>
                <div>
                  <label className="input-label">Max Rent (BDT)</label>
                  <input required type="number" className="input" value={newProp.maxRent} onChange={e => setNewProp({...newProp, maxRent: e.target.value})} placeholder="e.g. 25000" />
                </div>
              </div>
              <div>
                <label className="input-label">Amenities (comma separated)</label>
                <input className="input" value={newProp.amenities} onChange={e => setNewProp({...newProp, amenities: e.target.value})} placeholder="e.g. WiFi, Gym, Pool" />
              </div>
              <div>
                <label className="input-label">Description</label>
                <textarea required className="input" rows="3" value={newProp.description} onChange={e => setNewProp({...newProp, description: e.target.value})} placeholder="Write a brief description..." />
              </div>
              
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={adding}>
                  {adding ? "Saving..." : "Add Property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
