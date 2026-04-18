"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../../../components/Navbar";
import { LoadingSpinner, ErrorState } from "../../../../components/LoadingState";
import { propertyAPI, userAPI, conversationAPI } from "../../../../lib/api";
import { getUser } from "../../../../lib/api";

export default function ManageProperty() {
  const router = useRouter();
  const params = useParams();
  const { id: propertyId } = params;

  const [user, setUser] = useState(null);
  const [property, setProperty] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alertStatus, setAlertStatus] = useState({});

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "owner") {
      router.push("/login");
    } else {
      setUser(u);
    }
  }, [router]);

  useEffect(() => {
    if (user && propertyId) {
      const fetchData = async () => {
        try {
          setLoading(true);
          const propData = await propertyAPI.get(propertyId);
          setProperty(propData.property);
          const tenantData = await userAPI.getTenantsByProperty(propertyId);
          setTenants(tenantData.tenants);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user, propertyId]);

  const handleSendAlert = async (tenantId) => {
    setAlertStatus({ ...alertStatus, [tenantId]: { sending: true, error: null, success: null } });
    try {
      await conversationAPI.sendEmergencyAlert({ tenantId });
      setAlertStatus({ ...alertStatus, [tenantId]: { sending: false, success: "Alert sent successfully!", error: null } });
    } catch (err) {
      setAlertStatus({ ...alertStatus, [tenantId]: { sending: false, error: err.message, success: null } });
    }
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}><Navbar /><div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><LoadingSpinner /></div></div>;
  if (error) return <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}><Navbar /><div style={{ padding: "2rem" }}><ErrorState message={error} /></div></div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <button onClick={() => router.back()} className="btn btn-ghost" style={{ marginBottom: '1rem' }}>
          &larr; Back to Dashboard
        </button>
        <h2 style={{ marginBottom: "0.5rem" }}>Manage {property?.title}</h2>
        <p style={{ color: "var(--color-neutral-500)", marginBottom: "2rem" }}>
          Manage tenants and send emergency alerts.
        </p>

        <div className="card">
          <h4 style={{ marginBottom: "1.5rem" }}>Tenants</h4>
          {tenants.length === 0 ? (
            <p>No tenants in this property.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {tenants.map((tenant) => (
                <div key={tenant._id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontWeight: "600" }}>{tenant.name}</p>
                    <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-500)" }}>
                      {tenant.email}
                    </p>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleSendAlert(tenant._id)}
                    disabled={alertStatus[tenant._id]?.sending}
                  >
                    {alertStatus[tenant._id]?.sending ? "Sending..." : "Send Emergency Alert"}
                  </button>
                </div>
              ))}
            </div>
          )}
           {Object.keys(alertStatus).map(tenantId => (
            <div key={tenantId}>
              {alertStatus[tenantId]?.error && <p style={{ color: 'red', marginTop: '0.5rem' }}>Error: {alertStatus[tenantId].error}</p>}
              {alertStatus[tenantId]?.success && <p style={{ color: 'green', marginTop: '0.5rem' }}>{alertStatus[tenantId].success}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
