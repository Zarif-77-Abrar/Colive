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
import { getUser, propertyAPI, bookingAPI, maintenanceAPI, noticeAPI } from "../../../lib/api";
import useFCM from "../../../lib/useFCM";

const TABS = [
  { key: "overview",    label: "Overview"      },
  { key: "properties",  label: "My Properties" },
  { key: "bookings",    label: "Bookings"       },
  { key: "maintenance", label: "Maintenance"    },
  { key: "notices",     label: "Notices"        },
  { key: "messages",    label: "Messages"       },
];

const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtMoney = (n) => n != null ? `BDT ${Number(n).toLocaleString()}` : "—";

export default function OwnerDashboard() {
  const router = useRouter();
  const [user, setUser]     = useState(null);
  const [active, setActive] = useState("overview");
  const [actionLoading, setActionLoading] = useState(null);
  const [actionMsg,     setActionMsg]     = useState("");  

  // useFCM();

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

  const properties  = useApi(propertyAPI.getMy);
  const bookings    = useApi(bookingAPI.getReceived);
  const maintenance = useApi(maintenanceAPI.getProperty);
  const notices     = useApi(noticeAPI.getMy);

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
              {/* {bookings.loading ? <LoadingSpinner /> : bookings.error ? <ErrorState message={bookings.error} /> : (
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
              )} */}
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

      </div>
    </div>
  );
}
