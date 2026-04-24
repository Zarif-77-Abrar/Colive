"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { getUser, propertyAPI } from "../../lib/api";

function PropertyCard({ property, onClick }) {
  const hasRooms = property.rooms && property.rooms.length > 0;
  
  const availableRooms = hasRooms
    ? property.rooms.filter(r => r.status === "available").length
    : (property.availableRooms || 0);

  const minRent = hasRooms
    ? Math.min(...property.rooms.map(r => r.rent))
    : (property.rentRange?.min || 0);

  const maxRent = hasRooms
    ? Math.max(...property.rooms.map(r => r.rent))
    : (property.rentRange?.max || 0);

  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", gap: "0.75rem",
      padding: "1.25rem", borderRadius: "var(--radius-lg)",
      background: "#fff", border: "1px solid var(--color-neutral-200)",
      cursor: "pointer", transition: "all 0.15s",
      textAlign: "left", width: "100%",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = "var(--color-primary-300)";
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = "var(--color-neutral-200)";
      e.currentTarget.style.boxShadow = "none";
    }}>

      {/* Title and city */}
      <div>
        <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.125rem", fontWeight: "600", color: "var(--color-neutral-900)" }}>
          {property.title}
        </h3>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-neutral-500)" }}>
          {property.address}, {property.city}
        </p>
      </div>

      {/* Rent range and availability */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.75rem", color: "var(--color-neutral-400)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Monthly rent
          </p>
          <p style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: "var(--color-neutral-900)" }}>
            BDT {minRent.toLocaleString()}
            {minRent !== maxRent && ` - ${maxRent.toLocaleString()}`}
          </p>
        </div>

        {/* Available rooms badge */}
        <div style={{
          padding: "0.5rem 0.875rem", borderRadius: "9999px",
          background: availableRooms > 0 ? "var(--color-success-50)" : "var(--color-neutral-100)",
          color: availableRooms > 0 ? "var(--color-success-700)" : "var(--color-neutral-500)",
          fontSize: "0.875rem", fontWeight: "600",
        }}>
          {availableRooms} room{availableRooms !== 1 ? "s" : ""} available
        </div>
      </div>

      {/* Room count */}
      {property.rooms && property.rooms.length > 0 && (
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8125rem", color: "var(--color-neutral-500)" }}>
          {property.rooms.length} room{property.rooms.length !== 1 ? "s" : ""} total
        </p>
      )}
    </button>
  );
}

export default function RoomsListingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterMinRent, setFilterMinRent] = useState("");
  const [filterMaxRent, setFilterMaxRent] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchProperties = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await propertyAPI.getAll();
        setProperties(data.properties || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [user]);

  // Filter properties
  const filteredProperties = properties.filter(prop => {
    if (filterCity && !prop.city.toLowerCase().includes(filterCity.toLowerCase())) {
      return false;
    }
    if (filterMinRent || filterMaxRent) {
      const minRent = prop.rooms && prop.rooms.length > 0 
        ? Math.min(...prop.rooms.map(r => r.rent)) 
        : (prop.rentRange?.min || Infinity);
        
      if (filterMinRent && minRent < parseInt(filterMinRent)) return false;
      if (filterMaxRent && minRent > parseInt(filterMaxRent)) return false;
    }
    return true;
  });

  const cities = [...new Set(properties.map(p => p.city).filter(Boolean))].sort();

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Back link */}
        {user && (
          <Link href={
            user.role === "tenant" ? "/tenant/dashboard" :
            user.role === "owner" ? "/owner/dashboard" :
            "/admin/dashboard"
          } style={{
            fontSize: "0.875rem", color: "var(--color-neutral-500)",
            textDecoration: "none", display: "inline-flex",
            alignItems: "center", gap: "0.375rem", marginBottom: "1.5rem",
          }}>
            ← Back to dashboard
          </Link>
        )}

        {/* Header */}
        <h1 style={{ marginBottom: "0.5rem", color: "var(--color-neutral-900)" }}>Available Rooms</h1>
        <p style={{ color: "var(--color-neutral-500)", marginBottom: "2rem" }}>
          Browse available rooms across our properties
        </p>

        {/* Filters */}
        <div className="card" style={{ marginBottom: "2rem", background: "#fff" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {/* City filter */}
            <div>
              <label className="input-label" style={{ marginBottom: "0.5rem" }}>City</label>
              <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} style={{
                width: "100%", padding: "0.75rem", borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-neutral-200)", fontSize: "0.875rem",
                fontFamily: "inherit",
              }}>
                <option value="">All cities</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Min rent filter */}
            <div>
              <label className="input-label" style={{ marginBottom: "0.5rem" }}>Min rent (BDT)</label>
              <input type="number" value={filterMinRent} onChange={(e) => setFilterMinRent(e.target.value)}
                placeholder="e.g., 10000" style={{
                  width: "100%", padding: "0.75rem", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-neutral-200)", fontSize: "0.875rem",
                  fontFamily: "inherit", boxSizing: "border-box",
                }} />
            </div>

            {/* Max rent filter */}
            <div>
              <label className="input-label" style={{ marginBottom: "0.5rem" }}>Max rent (BDT)</label>
              <input type="number" value={filterMaxRent} onChange={(e) => setFilterMaxRent(e.target.value)}
                placeholder="e.g., 50000" style={{
                  width: "100%", padding: "0.75rem", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-neutral-200)", fontSize: "0.875rem",
                  fontFamily: "inherit", boxSizing: "border-box",
                }} />
            </div>

            {/* Clear filters button */}
            {(filterCity || filterMinRent || filterMaxRent) && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button onClick={() => {
                  setFilterCity("");
                  setFilterMinRent("");
                  setFilterMaxRent("");
                }} className="btn btn-ghost" style={{ width: "100%", fontSize: "0.875rem" }}>
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-neutral-400)" }}>
            Loading properties...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{ maxWidth: "680px", margin: "2rem auto", padding: "0 1.5rem" }}>
            <div style={{
              background: "var(--color-error-50)", border: "1px solid var(--color-error-500)",
              borderRadius: "var(--radius-md)", padding: "1rem", color: "var(--color-error-700)",
            }}>
              {error}
            </div>
          </div>
        )}

        {/* No results */}
        {!loading && !error && filteredProperties.length === 0 && (
          <div style={{
            textAlign: "center", padding: "4rem", color: "var(--color-neutral-500)",
          }}>
            <p style={{ marginBottom: "1rem" }}>No properties found matching your filters.</p>
            {(filterCity || filterMinRent || filterMaxRent) && (
              <button onClick={() => {
                setFilterCity("");
                setFilterMinRent("");
                setFilterMaxRent("");
              }} className="btn btn-primary">
                Clear filters and try again
              </button>
            )}
          </div>
        )}

        {/* Properties grid */}
        {!loading && !error && filteredProperties.length > 0 && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "1.5rem",
          }}>
            {filteredProperties.map((prop) => (
              <PropertyCard
                key={prop._id}
                property={prop}
                onClick={() => router.push(`/rooms/${prop._id}`)}
              />
            ))}
          </div>
        )}

        {/* Results count */}
        {!loading && !error && filteredProperties.length > 0 && (
          <p style={{
            textAlign: "center", marginTop: "2rem",
            fontSize: "0.875rem", color: "var(--color-neutral-500)",
          }}>
            Showing {filteredProperties.length} of {properties.length} properties
          </p>
        )}
      </div>
    </div>
  );
}
