"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import TabBar from "../../../components/TabBar";
import StatCard from "../../../components/StatCard";
import DataTable from "../../../components/DataTable";
import { LoadingSpinner, ErrorState } from "../../../components/LoadingState";
import useApi from "../../../lib/useApi";
import {
  getUser,
  propertyAPI,
  bookingAPI,
  maintenanceAPI,
  noticeAPI,
  paymentAPI,
} from "../../../lib/api";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "properties", label: "My Properties" },
  { key: "bookings", label: "Bookings" },
  { key: "maintenance", label: "Maintenance" },
  { key: "notices", label: "Notices" },
  { key: "payments", label: "Payments" },
];

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtMoney = (n) =>
  n != null ? `BDT ${Number(n).toLocaleString()}` : "—";

export default function OwnerDashboard() {
  const router = useRouter();
  const user = getUser();
  const [active, setActive] = useState("overview");
  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "owner") {
      router.push("/login");
      return;
    }
  }, [router, user]);

  const properties = useApi(propertyAPI.getMy);
  const bookings = useApi(bookingAPI.getReceived);
  const maintenance = useApi(maintenanceAPI.getProperty);
  const notices = useApi(noticeAPI.getMy);

  // unfiltered payments for overview cards
  const allPaymentsRes = useApi(() => paymentAPI.getProperty(""));

  // filtered payments for Payments tab only
  const filteredPaymentsRes = useApi(
    () =>
      paymentAPI.getProperty(
        `?month=${encodeURIComponent(monthFilter)}&status=${encodeURIComponent(
          statusFilter
        )}`
      ),
    [monthFilter, statusFilter]
  );

  const propertyList = properties.data?.properties ?? [];
  const bookingList = bookings.data?.bookings ?? [];
  const maintenanceList = maintenance.data?.requests ?? [];
  const noticeList = notices.data?.notices ?? [];
  const allOwnerPayments = allPaymentsRes.data?.payments ?? [];
  const filteredPayments = filteredPaymentsRes.data?.payments ?? [];

  const availableRooms = propertyList.reduce(
    (sum, p) => sum + (p.availableRooms ?? 0),
    0
  );

  const totalRooms = propertyList.reduce(
    (sum, p) => sum + (p.rooms?.length ?? 0),
    0
  );

  const pendingBookings = bookingList.filter((b) => b.status === "pending").length;

  const openMaintenance = maintenanceList.filter(
    (m) => m.status !== "resolved"
  ).length;

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const paymentsThisMonth = allOwnerPayments.filter(
    (p) => p.month === currentMonth && p.paymentStatus === "paid"
  ).length;

  const totalCollected = allOwnerPayments
    .filter((p) => p.paymentStatus === "paid")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <TabBar tabs={TABS} active={active} onChange={setActive} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {active === "overview" && (
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>Owner Dashboard</h2>
            <p
              style={{
                color: "var(--color-neutral-500)",
                marginBottom: "2rem",
                fontSize: "0.9375rem",
              }}
            >
              Manage your properties, tenants, bookings, and payments.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <StatCard
                label="Total properties"
                value={propertyList.length}
                sub={`${totalRooms} rooms total`}
                accent="primary"
              />
              <StatCard
                label="Available rooms"
                value={availableRooms}
                sub="across all properties"
                accent="success"
              />
              <StatCard
                label="Pending bookings"
                value={pendingBookings}
                sub="awaiting your response"
                accent="warning"
              />
              <StatCard
                label="Open maintenance"
                value={openMaintenance}
                sub="unresolved requests"
                accent="error"
              />
              <StatCard
                label="Payments this month"
                value={paymentsThisMonth}
                sub="successful payments"
                accent="success"
              />
              <StatCard
                label="Total collected"
                value={fmtMoney(totalCollected)}
                sub="from paid rent records"
                accent="primary"
              />
            </div>

            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h4>Pending booking requests</h4>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActive("bookings")}
                >
                  View all
                </button>
              </div>

              {bookings.loading ? (
                <LoadingSpinner />
              ) : bookings.error ? (
                <ErrorState message={bookings.error} />
              ) : (
                <DataTable
                  headers={["Tenant", "Property", "Room", "Status", "Requested"]}
                  emptyMessage="No pending booking requests."
                  rows={bookingList
                    .filter((b) => b.status === "pending")
                    .slice(0, 5)
                    .map((b) => [
                      b.tenantId?.name ?? "—",
                      b.propertyId?.title ?? "—",
                      b.roomId?.label ?? "—",
                      b.status,
                      fmtDate(b.createdAt),
                    ])}
                />
              )}
            </div>

            <div className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h4>Recent rent payments</h4>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActive("payments")}
                >
                  View all
                </button>
              </div>

              {allPaymentsRes.loading ? (
                <LoadingSpinner />
              ) : allPaymentsRes.error ? (
                <ErrorState message={allPaymentsRes.error} />
              ) : (
                <DataTable
                  headers={["Tenant", "Property", "Room", "Amount", "Month", "Status"]}
                  emptyMessage="No rent payments recorded yet."
                  rows={allOwnerPayments.slice(0, 5).map((p) => [
                    p.tenantId?.name ?? "—",
                    p.propertyId?.title ?? "—",
                    p.roomId?.label ?? "—",
                    fmtMoney(p.amount),
                    p.month ?? "—",
                    p.paymentStatus,
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {active === "properties" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>My properties</h3>
            <div className="card">
              {properties.loading ? (
                <LoadingSpinner />
              ) : properties.error ? (
                <ErrorState message={properties.error} />
              ) : (
                <DataTable
                  headers={[
                    "Title",
                    "City",
                    "Available rooms",
                    "Min rent",
                    "Max rent",
                  ]}
                  emptyMessage="No properties found."
                  rows={propertyList.map((p) => [
                    p.title,
                    p.city,
                    p.availableRooms ?? 0,
                    fmtMoney(p.rentRange?.min),
                    fmtMoney(p.rentRange?.max),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {active === "bookings" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>Booking requests</h3>
            <div className="card">
              {bookings.loading ? (
                <LoadingSpinner />
              ) : bookings.error ? (
                <ErrorState message={bookings.error} />
              ) : (
                <DataTable
                  headers={[
                    "Tenant",
                    "Email",
                    "Property",
                    "Room",
                    "Compatibility",
                    "Status",
                    "Requested",
                  ]}
                  emptyMessage="No booking requests received yet."
                  rows={bookingList.map((b) => [
                    b.tenantId?.name ?? "—",
                    b.tenantId?.email ?? "—",
                    b.propertyId?.title ?? "—",
                    b.roomId?.label ?? "—",
                    b.compatibilityScore != null
                      ? `${b.compatibilityScore}%`
                      : "—",
                    b.status,
                    fmtDate(b.createdAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {active === "maintenance" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>Maintenance requests</h3>
            <div className="card">
              {maintenance.loading ? (
                <LoadingSpinner />
              ) : maintenance.error ? (
                <ErrorState message={maintenance.error} />
              ) : (
                <DataTable
                  headers={[
                    "Title",
                    "Category",
                    "Property",
                    "Room",
                    "Status",
                    "Submitted",
                  ]}
                  emptyMessage="No maintenance requests found."
                  rows={maintenanceList.map((m) => [
                    m.title,
                    m.category,
                    m.propertyId?.title ?? "—",
                    m.roomId?.label ?? "—",
                    m.status,
                    fmtDate(m.createdAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {active === "notices" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>Notices</h3>
            <div className="card">
              {notices.loading ? (
                <LoadingSpinner />
              ) : notices.error ? (
                <ErrorState message={notices.error} />
              ) : (
                <DataTable
                  headers={["Title", "Audience", "Property", "Published"]}
                  emptyMessage="No notices available."
                  rows={noticeList.map((n) => [
                    n.title,
                    n.audience ?? "—",
                    n.propertyId?.title ?? "All properties",
                    fmtDate(n.createdAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {active === "payments" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <h3>Rent payment tracking</h3>
            </div>

            <div
              className="card"
              style={{
                marginBottom: "1rem",
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                alignItems: "end",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    marginBottom: "0.35rem",
                    color: "var(--color-neutral-600)",
                  }}
                >
                  Filter by month
                </label>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    marginBottom: "0.35rem",
                    color: "var(--color-neutral-600)",
                  }}
                >
                  Filter by status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input"
                >
                  <option value="">All</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <button
                className="btn btn-ghost"
                onClick={() => {
                  setMonthFilter("");
                  setStatusFilter("");
                }}
              >
                Reset filters
              </button>
            </div>

            <div className="card">
              {filteredPaymentsRes.loading ? (
                <LoadingSpinner />
              ) : filteredPaymentsRes.error ? (
                <ErrorState message={filteredPaymentsRes.error} />
              ) : (
                <DataTable
                  headers={[
                    "Tenant",
                    "Email",
                    "Property",
                    "Room",
                    "Amount",
                    "Month",
                    "Status",
                    "Paid on",
                  ]}
                  emptyMessage="No payment records found."
                  rows={filteredPayments.map((p) => [
                    p.tenantId?.name ?? "—",
                    p.tenantId?.email ?? "—",
                    p.propertyId?.title ?? "—",
                    p.roomId?.label ?? "—",
                    fmtMoney(p.amount),
                    p.month ?? "—",
                    p.paymentStatus,
                    fmtDate(p.paidAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}