"use client";
import { useState, useEffect } from "react";
import { LoadingSpinner, ErrorState } from "../../components/LoadingState";
import DataTable from "../../components/DataTable";
import { mealAPI, propertyAPI } from "../../lib/api";

// ── Daily menu generator ───────────────────────────────────
// Deterministic per date so all users see the same menu each day
const getDailyMenu = () => {
  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  const mains = ["Fish Curry", "Beef Curry", "Chicken Curry", "Egg Bhuna (Dim)"];
  const sides  = ["Lentils (Dal)", "Aloo Bhorta", "Mixed Vegetables", "Begun Bhaja", "Korola Bhaji"];
  return [
    "Rice (Default)",
    mains[Math.abs(hash) % mains.length],
    sides[Math.abs(hash) % sides.length],
  ];
};

const MenuDisplay = () => {
  const menu = getDailyMenu();
  return (
    <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: "8px", padding: "1.25rem", marginBottom: "1.5rem" }}>
      <h4 style={{ margin: "0 0 0.75rem", color: "#854d0e" }}>🍲 Today&apos;s Menu</h4>
      <ul style={{ margin: 0, paddingLeft: "1.5rem", color: "#a16207", fontSize: "0.9375rem", lineHeight: "1.8" }}>
        {menu.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
};

// ── Tenant View ────────────────────────────────────────────
export function TenantMealSection({ onBack }) {
  const [optedIn,  setOptedIn]  = useState(true);
  const [loading,  setLoading]  = useState(true);
  const [hasRoom,  setHasRoom]  = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const date = new Date().toISOString().split("T")[0];

  useEffect(() => {
    mealAPI.getMyPreference(date)
      .then(res => { setOptedIn(res.optedIn); setHasRoom(res.hasRoom ?? true); setLoading(false); })
      .catch(() => setLoading(false));
  }, [date]);

  const handleToggle = async (val) => {
    setErrorMsg("");
    const prev = optedIn;
    setOptedIn(val);
    try {
      await mealAPI.toggleMyMeal(date, val);
    } catch (e) {
      setOptedIn(prev);
      setErrorMsg(e.message || "Failed to update preference.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "0.875rem", marginBottom: "1.5rem", alignItems: "center" }}>
        <button onClick={onBack} style={backBtnStyle}>← Back</button>
        <h3 style={{ margin: 0 }}>Daily Meal</h3>
      </div>
      <MenuDisplay />
      {errorMsg && <div style={errorBannerStyle}>{errorMsg}</div>}
      {!hasRoom && (
        <div style={{ background: "var(--color-warning-50)", border: "1px solid var(--color-warning-300)", borderRadius: "8px", padding: "1rem 1.25rem", marginBottom: "1.25rem", color: "var(--color-warning-700)", fontSize: "0.875rem" }}>
          You don&apos;t have an active room booking yet. Your meal preference will be saved once you are assigned a room.
        </div>
      )}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontWeight: "600", fontSize: "1.125rem", margin: "0 0 0.25rem" }}>Do you want today&apos;s meal?</p>
          <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-500)", margin: 0 }}>By default, meals are prepared for everyone.</p>
        </div>
        {loading ? <LoadingSpinner /> : (
          <div style={{ display: "flex", background: "#f3f4f6", borderRadius: "8px", overflow: "hidden", border: "1px solid #d1d5db" }}>
            <button onClick={() => handleToggle(true)}
              style={{ flex: 1, padding: "0.6rem 2rem", background: optedIn ? "#15803d" : "transparent", color: optedIn ? "#fff" : "#374151", border: "none", fontWeight: "700", fontSize: "1rem", cursor: "pointer", transition: "background 0.2s" }}>
              YES
            </button>
            <button onClick={() => handleToggle(false)}
              style={{ flex: 1, padding: "0.6rem 2rem", background: !optedIn ? "#dc2626" : "transparent", color: !optedIn ? "#fff" : "#374151", border: "none", fontWeight: "700", fontSize: "1rem", cursor: "pointer", transition: "background 0.2s" }}>
              NO
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Owner View ─────────────────────────────────────────────
export function OwnerMealSection({ onBack }) {
  const [properties,   setProperties]   = useState([]);
  const [selectedProp, setSelectedProp] = useState("");
  const [yesList,      setYesList]      = useState([]);
  const [noList,       setNoList]       = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const date = new Date().toISOString().split("T")[0];

  useEffect(() => {
    propertyAPI.getMy().then(d => {
      const props = d.properties ?? [];
      setProperties(props);
      if (props.length > 0) setSelectedProp(props[0]._id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProp) return;
    setLoading(true); setError("");
    mealAPI.getPropertyMeals(selectedProp, date)
      .then(res => { setYesList(res.yesList ?? []); setNoList(res.noList ?? []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedProp, date]);

  return (
    <div>
      <div style={{ display: "flex", gap: "0.875rem", marginBottom: "1.5rem", alignItems: "center" }}>
        <button onClick={onBack} style={backBtnStyle}>← Back</button>
        <div>
          <h3 style={{ margin: 0 }}>Daily Meal Management</h3>
          <p style={{ color: "var(--color-neutral-500)", fontSize: "0.875rem", marginTop: "0.125rem" }}>Track tenant meal preferences for today.</p>
        </div>
      </div>
      <MenuDisplay />

      {properties.length > 1 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={labelStyle}>Select Property</label>
          <select value={selectedProp} onChange={e => setSelectedProp(e.target.value)}
            style={{ width: "100%", maxWidth: "320px", padding: "0.625rem 0.875rem", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.875rem", background: "#ffffff", outline: "none" }}>
            {properties.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
          </select>
        </div>
      )}

      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className="card" style={{ borderTop: "4px solid #15803d" }}>
            <h4 style={{ color: "#15803d", marginBottom: "1rem" }}>✅ Eating Today (YES) — {yesList.length}</h4>
            <DataTable headers={["Tenant Name", "Room", "Phone"]} emptyMessage="No one has opted in for today."
              rows={yesList.map(t => [t.name, t.roomLabel ?? "—", t.phone ?? "—"])} />
          </div>
          <div className="card" style={{ borderTop: "4px solid #dc2626" }}>
            <h4 style={{ color: "#dc2626", marginBottom: "1rem" }}>❌ Skipping Today (NO) — {noList.length}</h4>
            <DataTable headers={["Tenant Name", "Room", "Phone"]} emptyMessage="No one has skipped today."
              rows={noList.map(t => [t.name, t.roomLabel ?? "—", t.phone ?? "—"])} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin View ─────────────────────────────────────────────
export function AdminMealSection({ onBack }) {
  const [allProperties, setAllProperties] = useState([]);
  const [search,        setSearch]        = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProp,  setSelectedProp]  = useState(null);
  const [yesList,       setYesList]       = useState([]);
  const [noList,        setNoList]        = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const date = new Date().toISOString().split("T")[0];

  useEffect(() => {
    import("../../lib/api").then(({ adminAPI }) => {
      adminAPI.getProperties()
        .then(d => setAllProperties(d.properties ?? []))
        .catch(() => {});
    });
  }, []);

  const handleSelect = (p) => {
    setSelectedProp(p); setSearch(`${p.title} — ${p.city}`); setShowSuggestions(false);
    setLoading(true); setError("");
    mealAPI.getPropertyMeals(p._id, date)
      .then(res => { setYesList(res.yesList ?? []); setNoList(res.noList ?? []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  const filteredProps = search.trim().length >= 1
    ? allProperties.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || (p.city ?? "").toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div>
      <div style={{ display: "flex", gap: "0.875rem", marginBottom: "1.5rem", alignItems: "center" }}>
        <button onClick={onBack} style={backBtnStyle}>← Back</button>
        <div>
          <h3 style={{ margin: 0 }}>Daily Meal Overview</h3>
          <p style={{ color: "var(--color-neutral-500)", fontSize: "0.875rem", marginTop: "0.125rem" }}>Search a property to view today&apos;s meal lists.</p>
        </div>
      </div>
      <MenuDisplay />

      {/* Property search */}
      <div style={{ position: "relative", marginBottom: "2rem" }}>
        <label style={labelStyle}>Search Property *</label>
        <input value={search}
          onChange={e => { setSearch(e.target.value); setSelectedProp(null); setShowSuggestions(true); }}
          onFocus={() => search.trim() && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="🔍 Type property name..."
          style={{ width: "100%", padding: "0.625rem 1rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", background: "#ffffff" }} />
        {showSuggestions && filteredProps.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginTop: "4px", overflow: "hidden" }}>
            {filteredProps.map(p => (
              <div key={p._id} onMouseDown={() => handleSelect(p)}
                style={{ padding: "0.625rem 0.875rem", cursor: "pointer", borderBottom: "1px solid #f3f4f6", fontSize: "0.875rem" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}>
                <span style={{ fontWeight: "600" }}>{p.title}</span>
                <span style={{ color: "#6b7280", marginLeft: "0.5rem" }}>— {p.ownerId?.name ?? ""} · {p.city}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!selectedProp ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-neutral-400)" }}>
          Select a property above to view today&apos;s meal lists.
        </div>
      ) : loading ? <LoadingSpinner /> : error ? <ErrorState message={error} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className="card" style={{ borderTop: "4px solid #15803d" }}>
            <h4 style={{ color: "#15803d", marginBottom: "1rem" }}>✅ Eating Today (YES) — {yesList.length}</h4>
            <DataTable headers={["Tenant Name", "Room", "Phone"]} emptyMessage="No one has opted in for today."
              rows={yesList.map(t => [t.name, t.roomLabel ?? "—", t.phone ?? "—"])} />
          </div>
          <div className="card" style={{ borderTop: "4px solid #dc2626" }}>
            <h4 style={{ color: "#dc2626", marginBottom: "1rem" }}>❌ Skipping Today (NO) — {noList.length}</h4>
            <DataTable headers={["Tenant Name", "Room", "Phone"]} emptyMessage="No one has skipped today."
              rows={noList.map(t => [t.name, t.roomLabel ?? "—", t.phone ?? "—"])} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────
const backBtnStyle   = { background: "#f3f4f6", border: "none", borderRadius: "8px", padding: "0.4rem 0.875rem", fontSize: "0.8125rem", fontWeight: "600", color: "#374151", cursor: "pointer" };
const errorBannerStyle = { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", color: "#dc2626", fontSize: "0.875rem" };
const labelStyle     = { display: "block", fontSize: "0.8125rem", fontWeight: "600", color: "#374151", marginBottom: "0.375rem" };