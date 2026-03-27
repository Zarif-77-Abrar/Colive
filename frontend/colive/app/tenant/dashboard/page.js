"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../../../components/Navbar";
import TabBar from "../../../components/TabBar";
import StatCard from "../../../components/StatCard";
import DataTable from "../../../components/DataTable";
import { LoadingSpinner, ErrorState } from "../../../components/LoadingState";
import useApi from "../../../lib/useApi";
import {
  getUser,
  bookingAPI,
  paymentAPI,
  maintenanceAPI,
} from "../../../lib/api";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "bookings", label: "My Bookings" },
  { key: "payments", label: "My Payments" },
  { key: "maintenance", label: "Maintenance" },
];

// CURRENT TEST PAIR
const TEST_ROOM_ID = "69c36b3e81806780abcf3eb2";
const TEST_PROPERTY_ID = "69c36b3e81806780abcf3eaa";

// FOR NEXT TEST, you can switch to:
// const TEST_ROOM_ID = "69c36b3e81806780abcf3eb1";
// const TEST_PROPERTY_ID = "69c36b3e81806780abcf3eaa";

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

export default function TenantDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState(null);
  const [active, setActive] = useState("overview");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    if (u.role !== "tenant") {
      router.push("/login");
      return;
    }
    setUser(u);
  }, [router]);

  const bookings = useApi(bookingAPI.getMy);
  const payments = useApi(paymentAPI.getMy);
  const maintenance = useApi(maintenanceAPI.getMy);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const paymentQueryStatus = searchParams.get("payment");

  const alreadyPaidForTestRoom = useMemo(() => {
    const paymentList = payments.data?.payments ?? [];
    return paymentList.some(
      (p) =>
        p.roomId?._id === TEST_ROOM_ID &&
        p.propertyId?._id === TEST_PROPERTY_ID &&
        p.month === currentMonth &&
        p.paymentStatus === "paid"
    );
  }, [payments.data, currentMonth]);

  const handlePayNow = async () => {
    try {
      if (alreadyPaidForTestRoom) {
        alert("This room has already been paid for this month.");
        return;
      }

      setPaying(true);

      const data = await paymentAPI.createCheckoutSession({
        roomId: TEST_ROOM_ID,
        propertyId: TEST_PROPERTY_ID,
        month: currentMonth,
      });

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Stripe checkout URL not returned.");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setPaying(false);
    }
  };

  if (!user) return null;

  const pendingBookings =
    bookings.data?.bookings?.filter((b) => b.status === "pending").length ?? 0;

  const paidThisMonth =
    payments.data?.payments?.filter(
      (p) =>
        p.paymentStatus === "paid" &&
        p.paidAt &&
        new Date(p.paidAt).getMonth() === new Date().getMonth()
    ).length ?? 0;

  const openMaintenance =
    maintenance.data?.requests?.filter((r) => r.status !== "resolved").length ?? 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <TabBar tabs={TABS} active={active} onChange={setActive} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {active === "overview" && (
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>
              Welcome back, {user.name}
            </h2>
            <p
              style={{
                color: "var(--color-neutral-500)",
                marginBottom: "1.25rem",
                fontSize: "0.9375rem",
              }}
            >
              Here&apos;s a summary of your housing activity.
            </p>

            {paymentQueryStatus === "success" && (
              <div
                style={{
                  background: "var(--color-success-50)",
                  border: "1px solid var(--color-success-500)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.9rem 1rem",
                  marginBottom: "1.25rem",
                  color: "var(--color-success-700)",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                }}
              >
                Payment successful!
              </div>
            )}

            {paymentQueryStatus === "cancelled" && (
              <div
                style={{
                  background: "var(--color-warning-50)",
                  border: "1px solid var(--color-warning-500)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.9rem 1rem",
                  marginBottom: "1.25rem",
                  color: "var(--color-warning-700)",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                }}
              >
                Payment was cancelled.
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <StatCard
                label="Booking requests"
                value={bookings.data?.count ?? "—"}
                sub={`${pendingBookings} pending`}
                accent="primary"
              />
              <StatCard
                label="Payments this month"
                value={paidThisMonth}
                sub="paid"
                accent="success"
              />
              <StatCard
                label="Open maintenance"
                value={openMaintenance}
                sub="unresolved requests"
                accent="error"
              />
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <button
                className="btn btn-primary"
                onClick={handlePayNow}
                disabled={paying || alreadyPaidForTestRoom}
                style={{
                  opacity: paying || alreadyPaidForTestRoom ? 0.65 : 1,
                  cursor: paying || alreadyPaidForTestRoom ? "not-allowed" : "pointer",
                }}
              >
                {alreadyPaidForTestRoom
                  ? "Already Paid for This Month"
                  : paying
                  ? "Redirecting to Stripe..."
                  : "Pay Current Month Rent"}
              </button>
            </div>

            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <h4 style={{ marginBottom: "1rem" }}>Recent booking requests</h4>
              {bookings.loading ? (
                <LoadingSpinner />
              ) : bookings.error ? (
                <ErrorState message={bookings.error} />
              ) : (
                <DataTable
                  headers={["Property", "Room", "Rent", "Status", "Requested"]}
                  emptyMessage="You have not made any booking requests yet."
                  rows={(bookings.data?.bookings ?? []).slice(0, 5).map((b) => [
                    b.propertyId?.title ?? "—",
                    b.roomId?.label ?? "—",
                    fmtMoney(b.roomId?.rent),
                    b.status,
                    fmtDate(b.createdAt),
                  ])}
                />
              )}
            </div>

            {!user.preferences?.sleepSchedule && (
              <div
                style={{
                  background: "var(--color-primary-50)",
                  border: "1px solid var(--color-primary-200)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem 1.5rem",
                }}
              >
                <p
                  style={{
                    fontWeight: "600",
                    color: "var(--color-primary-700)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Complete your lifestyle preferences
                </p>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--color-primary-600)",
                  }}
                >
                  Adding your sleep schedule, noise tolerance, and habits
                  improves your compatibility score shown to potential flatmates.
                </p>
              </div>
            )}
          </div>
        )}

        {active === "bookings" && (
          <div>
            <h3 style={{ marginBottom: "1.5rem" }}>My booking requests</h3>
            <div className="card">
              {bookings.loading ? (
                <LoadingSpinner />
              ) : bookings.error ? (
                <ErrorState message={bookings.error} />
              ) : (
                <DataTable
                  headers={[
                    "Property",
                    "Room",
                    "Rent/mo",
                    "Compatibility",
                    "Status",
                    "Requested",
                  ]}
                  emptyMessage="You have not made any booking requests yet."
                  rows={(bookings.data?.bookings ?? []).map((b) => [
                    b.propertyId?.title ?? "—",
                    b.roomId?.label ?? "—",
                    fmtMoney(b.roomId?.rent),
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

        {active === "payments" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <h3>Payment history</h3>
              <button
                className="btn btn-primary btn-sm"
                onClick={handlePayNow}
                disabled={paying || alreadyPaidForTestRoom}
                style={{
                  opacity: paying || alreadyPaidForTestRoom ? 0.65 : 1,
                  cursor: paying || alreadyPaidForTestRoom ? "not-allowed" : "pointer",
                }}
              >
                {alreadyPaidForTestRoom
                  ? "Already Paid"
                  : paying
                  ? "Redirecting..."
                  : "Pay Now"}
              </button>
            </div>

            <div className="card">
              {payments.loading ? (
                <LoadingSpinner />
              ) : payments.error ? (
                <ErrorState message={payments.error} />
              ) : (
                <DataTable
                  headers={[
                    "Month",
                    "Property",
                    "Room",
                    "Amount",
                    "Status",
                    "Paid on",
                  ]}
                  emptyMessage="No payments recorded yet."
                  rows={(payments.data?.payments ?? []).map((p) => [
                    p.month ?? "—",
                    p.propertyId?.title ?? "—",
                    p.roomId?.label ?? "—",
                    fmtMoney(p.amount),
                    p.paymentStatus,
                    fmtDate(p.paidAt),
                  ])}
                />
              )}
            </div>
          </div>
        )}

        {active === "maintenance" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3>Maintenance requests</h3>
              <button className="btn btn-primary btn-sm">
                + New request
              </button>
            </div>
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
                  emptyMessage="No maintenance requests submitted yet."
                  rows={(maintenance.data?.requests ?? []).map((r) => [
                    r.title,
                    r.category,
                    r.propertyId?.title ?? "—",
                    r.roomId?.label ?? "—",
                    r.status,
                    fmtDate(r.createdAt),
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