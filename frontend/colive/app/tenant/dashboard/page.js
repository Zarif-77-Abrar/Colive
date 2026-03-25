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
import { getUser, bookingAPI, paymentAPI, maintenanceAPI } from "../../../lib/api";

const TABS = [
  { key: "overview",    label: "Overview"    },
  { key: "bookings",    label: "My Bookings" },
  { key: "payments",    label: "My Payments" },
  { key: "maintenance", label: "Maintenance" },
  { key: "messages",    label: "Messages"    },
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtMoney = (n) => n != null ? `BDT ${Number(n).toLocaleString()}` : "—";

export default function TenantDashboard() {
  const router = useRouter();
  const [user, setUser]     = useState(null);
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "tenant") { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  const bookings    = useApi(bookingAPI.getMy);
  const payments    = useApi(paymentAPI.getMy);
  const maintenance = useApi(maintenanceAPI.getMy);

  if (!user) return null;

  const pendingBookings  = bookings.data?.bookings?.filter(b => b.status === "pending").length  ?? 0;
  const paidThisMonth    = payments.data?.payments?.filter(p => p.paymentStatus === "paid" && new Date(p.paidAt).getMonth() === new Date().getMonth()).length ?? 0;
  const openMaintenance  = maintenance.data?.requests?.filter(r => r.status !== "resolved").length ?? 0;

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
              <StatCard label="Booking requests"   value={bookings.data?.count    ?? "—"} sub={`${pendingBookings} pending`}  accent="primary" />
              <StatCard label="Payments this month" value={paidThisMonth}                 sub="paid"                          accent="success" />
              <StatCard label="Open maintenance"    value={openMaintenance}               sub="unresolved requests"           accent="error"   />
            </div>

            {/* Recent bookings */}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <h4 style={{ marginBottom: "1rem" }}>Recent booking requests</h4>
              {bookings.loading ? <LoadingSpinner /> : bookings.error ? <ErrorState message={bookings.error} /> : (
                <DataTable
                  headers={["Property", "Room", "Rent", "Status", "Requested"]}
                  emptyMessage="You have not made any booking requests yet."
                  rows={(bookings.data?.bookings ?? []).slice(0, 5).map(b => [
                    b.propertyId?.title ?? "—",
                    b.roomId?.label     ?? "—",
                    fmtMoney(b.roomId?.rent),
                    b.status,
                    fmtDate(b.createdAt),
                  ])}
                />
              )}
            </div>

            {/* Compatibility tip if preferences empty */}
            {!user.preferences?.sleepSchedule && (
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
                    p.month             ?? "—",
                    p.propertyId?.title ?? "—",
                    p.roomId?.label     ?? "—",
                    fmtMoney(p.amount),
                    p.paymentStatus,
                    fmtDate(p.paidAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Maintenance ────────────────────────────────── */}
        {active === "maintenance" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3>Maintenance requests</h3>
              <button className="btn btn-primary btn-sm">+ New request</button>
            </div>
            <div className="card">
              {maintenance.loading ? <LoadingSpinner /> : maintenance.error ? <ErrorState message={maintenance.error} /> : (
                <DataTable
                  headers={["Title", "Category", "Property", "Room", "Status", "Submitted"]}
                  emptyMessage="No maintenance requests submitted yet."
                  rows={(maintenance.data?.requests ?? []).map(r => [
                    r.title,
                    r.category,
                    r.propertyId?.title ?? "—",
                    r.roomId?.label     ?? "—",
                    r.status,
                    fmtDate(r.createdAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Messages ────────────────────────────────── */}
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
