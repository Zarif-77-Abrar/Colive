"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../../components/Navbar";
import { getUser, propertyAPI, alertAPI } from "../../../../lib/api";

export default function ManagePropertyPage() {
  const router    = useRouter();
  const { id }    = useParams();
  const [user,     setUser]     = useState(null);
  const [property, setProperty] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  // Alert state per tenant
  const [alertLoading, setAlertLoading] = useState(null);
  const [alertResults, setAlertResults] = useState({});

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "owner") { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await propertyAPI.getById(id);
        setProperty(data.property);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleEmergencyAlert = async (tenantId, tenantName) => {
    setAlertLoading(tenantId);
    setAlertResults({ ...alertResults, [tenantId]: null });
    try {
      const data = await alertAPI.sendEmergency(tenantId);
      setAlertResults({
        ...alertResults,
        [tenantId]: {
          type: "success",
          text: data.emailSent
            ? `Alert sent. In-app message delivered and email sent to emergency contact.`
            : `Alert sent as in-app message. ${data.noEmailReason ?? "No email sent."}`,
        },
      });
    } catch (err) {
      setAlertResults({
        ...alertResults,
        [tenantId]: { type: "error", text: err.message },
      });
    } finally {
      setAlertLoading(null);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-neutral-400)" }}>
        Loading property...
      </div>
    </div>
  );

  if (error || !property) return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <div style={{ maxWidth: "680px", margin: "2rem auto", padding: "0 1.5rem" }}>
        <div style={{
          background: "var(--color-error-50)", border: "1px solid var(--color-error-500)",
          borderRadius: "var(--radius-md)", padding: "1rem", color: "var(--color-error-700)",
        }}>
          {error || "Property not found."}
        </div>
      </div>
    </div>
  );

  const totalTenants = property.rooms?.flatMap(r => r.currentTenants ?? []).length ?? 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Back link */}
        <Link href="/owner/dashboard" style={{
          fontSize: "0.875rem", color: "var(--color-neutral-500)",
          textDecoration: "none", display: "inline-flex",
          alignItems: "center", gap: "0.375rem", marginBottom: "1.5rem",
        }}>
          ← Back to dashboard
        </Link>

        {/* Property header */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2 style={{ marginBottom: "0.375rem" }}>{property.title}</h2>
              <p style={{ color: "var(--color-neutral-500)", fontSize: "0.9375rem" }}>
                {property.address}, {property.city}
              </p>
            </div>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {[
                { label: "Total rooms",  value: property.rooms?.length ?? 0 },
                { label: "Available",    value: property.availableRooms ?? 0 },
                { label: "Tenants",      value: totalTenants },
              ].map((s) => (
                <div key={s.label} style={{
                  textAlign: "center", padding: "0.75rem 1.25rem",
                  background: "var(--color-neutral-50)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-neutral-200)",
                }}>
                  <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--color-primary-500)", lineHeight: 1 }}>
                    {s.value}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--color-neutral-500)", marginTop: "0.25rem" }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rooms and tenants */}
        <h3 style={{ marginBottom: "1.25rem" }}>Rooms & Tenants</h3>

        {property.rooms?.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--color-neutral-500)" }}>No rooms added to this property yet.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {(property.rooms ?? []).map((room) => (
            <div key={room._id} className="card">

              {/* Room header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <p style={{ fontWeight: "600", fontSize: "1rem" }}>{room.label}</p>
                  <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-500)" }}>
                    BDT {room.rent?.toLocaleString()}/mo · {room.currentTenants?.length ?? 0}/{room.capacity} tenants
                  </p>
                </div>
                <span style={{
                  fontSize: "0.75rem", fontWeight: "600",
                  padding: "0.2rem 0.625rem", borderRadius: "9999px",
                  background: room.status === "available" ? "var(--color-success-50)" : "var(--color-neutral-100)",
                  color: room.status === "available" ? "var(--color-success-700)" : "var(--color-neutral-600)",
                }}>
                  {room.status}
                </span>
              </div>

              {/* Tenants */}
              {room.currentTenants?.length === 0 ? (
                <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-400)", fontStyle: "italic" }}>
                  No tenants in this room.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {room.currentTenants.map((tenant) => (
                    <div key={tenant._id} style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", flexWrap: "wrap", gap: "1rem",
                      padding: "0.875rem 1rem",
                      background: "var(--color-neutral-50)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-neutral-200)",
                    }}>
                      {/* Tenant info */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{
                          width: "38px", height: "38px", borderRadius: "50%",
                          background: "var(--color-primary-100)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "1rem", fontWeight: "700", color: "var(--color-primary-700)",
                          flexShrink: 0,
                        }}>
                          {tenant.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontWeight: "600", fontSize: "0.9375rem" }}>{tenant.name}</p>
                          <p style={{ fontSize: "0.8125rem", color: "var(--color-neutral-500)" }}>
                            {tenant.email}
                            {tenant.gender ? ` · ${tenant.gender}` : ""}
                            {tenant.university ? ` · ${tenant.university}` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={alertLoading === tenant._id}
                          onClick={() => handleEmergencyAlert(tenant._id, tenant.name)}
                          style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
                        >
                          🚨 {alertLoading === tenant._id ? "Sending..." : "Emergency Alert"}
                        </button>

                        {/* Result message */}
                        {alertResults[tenant._id] && (
                          <p style={{
                            fontSize: "0.8125rem", maxWidth: "280px", textAlign: "right",
                            color: alertResults[tenant._id].type === "success"
                              ? "var(--color-success-700)"
                              : "var(--color-error-700)",
                          }}>
                            {alertResults[tenant._id].text}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Note about emergency contacts */}
        <div style={{
          marginTop: "1.5rem",
          background: "var(--color-warning-50)",
          border: "1px solid var(--color-warning-500)",
          borderRadius: "var(--radius-lg)",
          padding: "1rem 1.25rem",
          fontSize: "0.875rem",
          color: "var(--color-warning-700)",
        }}>
          <strong>Note:</strong> Emergency alerts send an in-app message to the tenant and an email to their registered emergency contact.
          If a tenant has not set an emergency contact email, only the in-app message will be sent.
        </div>
      </div>
    </div>
  );
}
