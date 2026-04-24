"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { propertyAPI } from "../../lib/api";

export default function AdvancedSearchPage() {
  const [properties, setProperties]   = useState([]);
  const [city, setCity]               = useState("");
  const [minRent, setMinRent]         = useState("");
  const [maxRent, setMaxRent]         = useState("");
  const [bedrooms, setBedrooms]       = useState("");
  const [furnished, setFurnished]     = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [searched, setSearched]       = useState(false);
  const [error, setError]             = useState("");

  // Initial load
  useEffect(() => { handleSearch(true); }, []);

  const buildQuery = () => {
    const p = new URLSearchParams();
    if (city)      p.append("city", city);
    if (minRent)   p.append("minRent", minRent);
    if (maxRent)   p.append("maxRent", maxRent);
    if (bedrooms)  p.append("bedrooms", bedrooms);
    if (furnished) p.append("furnished", "true");
    return p.toString() ? `?${p}` : "";
  };

  const handleSearch = async (isInitial = false) => {
    setError("");
    if (!isInitial && city && /^\d+$/.test(city.trim())) {
      setError("Enter a city name, not a number.");
      return;
    }
    setLoading(true);
    try {
      const data = await propertyAPI.advSearch(isInitial ? "" : buildQuery());
      setProperties(data.properties || []);
      setSearched(true);
    } catch (e) {
      setError("Search failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "var(--color-neutral-50)", minHeight: "100vh" }}>
      <Navbar />

      {/* Page Header */}
      <header style={{
        background:    "linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%)",
        padding:       "3rem 1.5rem 4rem",
        textAlign:     "center",
        color:         "#fff",
        position:      "relative",
        overflow:      "hidden",
      }}>
        <div style={{ position:"absolute",top:0,left:0,right:0,bottom:0,opacity:0.08,
          backgroundImage:"radial-gradient(#fff 1px,transparent 1px)",backgroundSize:"20px 20px" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",
            width:"56px",height:"56px",borderRadius:"14px",background:"rgba(255,255,255,0.15)",
            fontSize:"1.75rem",marginBottom:"1rem" }}>🗺️</div>
          <h1 style={{ color:"#fff",fontSize:"2.25rem",fontWeight:"800",marginBottom:"0.5rem",letterSpacing:"-0.5px" }}>
            Advanced Property Search
          </h1>
          <p style={{ color:"rgba(255,255,255,0.8)",fontSize:"1.1rem",maxWidth:"500px",margin:"0 auto" }}>
            Filter by location, budget, and amenities — powered by Google Maps
          </p>
        </div>
      </header>

      <main className="page-container" style={{ marginTop: "-2.5rem", position: "relative", zIndex: 10 }}>

        {/* Search Panel */}
        <div className="card" style={{ padding:"1.5rem",borderRadius:"16px",marginBottom:"2.5rem",
          boxShadow:"0 20px 40px rgba(0,0,0,0.08)" }}>
          <div style={{ display:"flex",gap:"1rem",flexWrap:"wrap",alignItems:"center" }}>
            <div style={{ flex:"1 1 280px",position:"relative" }}>
              <span style={{ position:"absolute",left:"0.875rem",top:"50%",transform:"translateY(-50%)",
                color:"var(--color-neutral-400)",fontSize:"1.1rem" }}>📍</span>
              <input
                type="text" className="input"
                placeholder="City (e.g. Dhaka, Sylhet)"
                value={city} onChange={e => setCity(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                style={{ paddingLeft:"2.75rem",height:"50px",borderRadius:"10px",fontSize:"0.95rem" }}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary"
              style={{ height:"50px",padding:"0 1.25rem",borderRadius:"10px",whiteSpace:"nowrap" }}
            >
              ⚙️ Filters {showFilters ? "▲" : "▼"}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleSearch()}
              disabled={loading}
              style={{ height:"50px",padding:"0 2rem",borderRadius:"10px",minWidth:"140px",fontSize:"0.95rem" }}
            >
              {loading ? "Searching…" : "🔍 Search"}
            </button>
          </div>

          {/* Filter drawer */}
          {showFilters && (
            <div style={{ marginTop:"1.25rem",paddingTop:"1.25rem",
              borderTop:"1px solid var(--color-neutral-100)",
              display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"1rem" }}>
              <div>
                <label className="input-label">Min Budget (TK)</label>
                <input type="number" className="input" placeholder="e.g. 2000"
                  value={minRent} onChange={e => setMinRent(e.target.value)} />
              </div>
              <div>
                <label className="input-label">Max Budget (TK)</label>
                <input type="number" className="input" placeholder="e.g. 8000"
                  value={maxRent} onChange={e => setMaxRent(e.target.value)} />
              </div>
              <div>
                <label className="input-label">Available Rooms</label>
                <select className="input" value={bedrooms} onChange={e => setBedrooms(e.target.value)}>
                  <option value="">Any</option>
                  <option value="1">1+ Rooms</option>
                  <option value="2">2+ Rooms</option>
                  <option value="3">3+ Rooms</option>
                </select>
              </div>
              <div style={{ display:"flex",alignItems:"flex-end",paddingBottom:"0.25rem" }}>
                <label style={{ display:"flex",alignItems:"center",gap:"0.5rem",cursor:"pointer",
                  fontWeight:"500",color:"var(--color-neutral-700)",fontSize:"0.875rem" }}>
                  <input type="checkbox" checked={furnished} onChange={e => setFurnished(e.target.checked)}
                    style={{ width:"18px",height:"18px",accentColor:"var(--color-primary-500)" }} />
                  Furnished Only
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="badge badge-error" style={{ marginTop:"1rem",padding:"0.5rem 1rem",borderRadius:"8px",display:"flex",gap:"0.5rem" }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Results header */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem" }}>
          <h2 style={{ fontSize:"1.5rem",fontWeight:"700",margin:0 }}>
            {searched && city ? `Results in ${city}` : "All Listings"}
            <span style={{ fontSize:"0.9rem",fontWeight:"500",color:"var(--color-neutral-400)",marginLeft:"0.75rem" }}>
              {properties.length} found
            </span>
          </h2>
        </div>

        {/* Property Grid */}
        {loading ? (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"1.5rem" }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="card" style={{ padding:0,overflow:"hidden" }}>
                <div style={{ height:"180px",background:"var(--color-neutral-200)",
                  animation:"pulse 1.5s infinite ease-in-out" }} />
                <div style={{ padding:"1.25rem" }}>
                  <div style={{ height:"20px",background:"var(--color-neutral-200)",borderRadius:"6px",marginBottom:"0.75rem",
                    animation:"pulse 1.5s infinite ease-in-out" }} />
                  <div style={{ height:"14px",background:"var(--color-neutral-100)",borderRadius:"6px",
                    animation:"pulse 1.5s infinite ease-in-out" }} />
                </div>
              </div>
            ))}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
          </div>
        ) : properties.length === 0 ? (
          <div style={{ textAlign:"center",padding:"5rem 2rem",background:"#fff",borderRadius:"16px",
            border:"1px dashed var(--color-neutral-300)" }}>
            <div style={{ fontSize:"3rem",marginBottom:"1rem" }}>🔍</div>
            <h3>No properties found</h3>
            <p style={{ color:"var(--color-neutral-500)",maxWidth:"360px",margin:"0 auto" }}>
              Try a different city or adjust your filters.
            </p>
          </div>
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"1.5rem" }}>
            {properties.map((p, i) => (
              <Link key={p._id || i} href={`/property/${p._id}`} style={{ textDecoration:"none",color:"inherit" }}>
                <div className="card" style={{ padding:0,overflow:"hidden",transition:"all 0.3s ease",cursor:"pointer",
                  border:"1px solid var(--color-neutral-200)",borderRadius:"14px" }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-5px)";
                    e.currentTarget.style.boxShadow="0 16px 32px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)";
                    e.currentTarget.style.boxShadow="var(--shadow-md)"; }}>

                  {/* Map thumbnail */}
                  <div style={{ height:"180px",background:"var(--color-neutral-200)",position:"relative",overflow:"hidden" }}>
                    {p.staticMapUrl ? (
                      <img src={p.staticMapUrl} alt="Map"
                        style={{ width:"100%",height:"100%",objectFit:"cover" }}
                        onError={e => { e.target.style.display="none"; }} />
                    ) : (
                      <div style={{ height:"100%",display:"flex",alignItems:"center",justifyContent:"center",
                        background:"linear-gradient(135deg,var(--color-primary-100),var(--color-primary-50))",
                        color:"var(--color-primary-400)",fontSize:"2.5rem" }}>🗺️</div>
                    )}
                    <div style={{ position:"absolute",top:"0.75rem",right:"0.75rem",
                      background:"rgba(255,255,255,0.92)",backdropFilter:"blur(4px)",
                      padding:"0.25rem 0.625rem",borderRadius:"20px",fontWeight:"700",
                      fontSize:"0.8125rem",color:"var(--color-primary-700)" }}>
                      TK {p.rentRange?.min}–{p.rentRange?.max}
                    </div>
                  </div>

                  <div style={{ padding:"1.25rem" }}>
                    <h4 style={{ margin:"0 0 0.375rem",fontSize:"1.05rem",color:"var(--color-neutral-800)",
                      fontWeight:"700",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                      {p.title}
                    </h4>
                    <p style={{ fontSize:"0.8125rem",color:"var(--color-neutral-500)",
                      margin:"0 0 0.875rem",display:"flex",alignItems:"center",gap:"0.25rem" }}>
                      📍 {p.address}, {p.city}
                    </p>
                    <div style={{ display:"flex",gap:"0.5rem",flexWrap:"wrap" }}>
                      <span className="badge badge-info">🛏️ {p.availableRooms || "?"} Rooms</span>
                      {p.amenities?.slice(0,2).map((am,idx) => (
                        <span key={idx} className="badge badge-neutral">{am}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
