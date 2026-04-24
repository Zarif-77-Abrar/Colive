"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import { getUser, propertyAPI, compatibilityAPI, conversationAPI, bookingAPI } from "../../../lib/api";

// ── Score ring component ───────────────────────────────────
function ScoreRing({ score, size = 80, strokeWidth = 7 }) {
  const radius      = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset      = circumference - (score / 100) * circumference;

  const color =
    score >= 75 ? "var(--color-success-500)" :
    score >= 50 ? "var(--color-warning-500)" :
                  "var(--color-error-500)";

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--color-neutral-200)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x="50%" y="50%" textAnchor="middle"
        dominantBaseline="central"
        style={{
          transform: "rotate(90deg)",
          transformOrigin: "center",
          fontSize: size < 70 ? "0.75rem" : "1rem",
          fontWeight: "700",
          fill: color,
        }}>
        {score}%
      </text>
    </svg>
  );
}

// ── Match badge ────────────────────────────────────────────
function MatchBadge({ match }) {
  const styles = {
    full:    { bg: "var(--color-success-50)",  color: "var(--color-success-700)",  label: "Match"    },
    partial: { bg: "var(--color-warning-50)",  color: "var(--color-warning-700)",  label: "Partial"  },
    none:    { bg: "var(--color-error-50)",    color: "var(--color-error-700)",    label: "Mismatch" },
    missing: { bg: "var(--color-neutral-100)", color: "var(--color-neutral-500)",  label: "—"        },
  };
  const s = styles[match] || styles.missing;
  return (
    <span style={{
      fontSize: "0.7rem", fontWeight: "600",
      padding: "0.15rem 0.5rem", borderRadius: "9999px",
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

// ── Amenity pill ───────────────────────────────────────────
function AmenityPill({ label }) {
  return (
    <span style={{
      fontSize: "0.8125rem", padding: "0.3rem 0.75rem",
      borderRadius: "9999px",
      background: "var(--color-primary-50)",
      color: "var(--color-primary-700)",
      border: "1px solid var(--color-primary-200)",
    }}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

export default function RoomDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const [user,          setUser]          = useState(null);
  const [room,          setRoom]          = useState(null);
  const [property,      setProperty]      = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [activeTab,     setActiveTab]     = useState("overview");
  const [messagingUser, setMessagingUser] = useState(null);
  const [booking,     setBooking]     = useState(false);
  const [bookingMsg,  setBookingMsg]  = useState({ text: "", type: "" });

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        // Fetch property which includes all its rooms
        const propData = await propertyAPI.getById(id);
        const p = propData.property || propData;
        
        // id here is the property id — we show all rooms of this property
        setProperty(p);

        // If tenant, also fetch compatibility for each room
        const u = getUser();
        if (u?.role === "tenant" && p.rooms?.length > 0) {
          // Fetch compatibility for first available room by default
          // The user can switch between rooms
          const firstRoom = p.rooms[0];
          setRoom(firstRoom);
          try {
            const compData = await compatibilityAPI.getForRoom(firstRoom._id);
            setCompatibility(compData);
          } catch {
            // Tenant may not have preferences set
            setCompatibility(null);
          }
        } else if (p.rooms?.length > 0) {
          setRoom(p.rooms[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleRoomSelect = async (selectedRoom) => {
    setRoom(selectedRoom);
    setCompatibility(null);
    if (user?.role === "tenant") {
      try {
        const compData = await compatibilityAPI.getForRoom(selectedRoom._id);
        setCompatibility(compData);
      } catch {
        setCompatibility(null);
      }
    }
  };

  const handleMessageFlatmate = async (flatmate) => {
    try {
      setMessagingUser(flatmate.id);
      // Create or get conversation with this flatmate
      const convData = await conversationAPI.create([user._id, flatmate.id], room._id);
      // Navigate to messages page with this conversation
      router.push(`/messages?conversationId=${convData.conversation._id}`);
    } catch (err) {
      console.error("Failed to start conversation:", err.message);
      alert("Failed to start messaging. Please try again.");
      setMessagingUser(null);
    }
  };

  const handleBooking = async () => {
    if (!room || !property) return;
    setBooking(true);
    setBookingMsg({ text: "", type: "" });
    try {
      await bookingAPI.create({
        roomId:             room._id,
        propertyId:         property._id,
        ownerId:            property.ownerId?._id,
        compatibilityScore: compatibility?.averageScore ?? null,
      });
      setBookingMsg({ text: "Booking request sent! The owner will review it shortly.", type: "success" });
    } catch (err) {
      setBookingMsg({ text: err.message, type: "error" });
    } finally {
      setBooking(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-neutral-400)" }}>
        Loading room details...
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />
      <div style={{ maxWidth: "680px", margin: "2rem auto", padding: "0 1.5rem" }}>
        <div style={{
          background: "var(--color-error-50)", border: "1px solid var(--color-error-500)",
          borderRadius: "var(--radius-md)", padding: "1rem", color: "var(--color-error-700)",
        }}>
          {error}
        </div>
      </div>
    </div>
  );

  if (!property) return null;

  const owner = property.ownerId;

  const tabStyle = (key) => ({
    padding: "0.75rem 1.25rem",
    fontSize: "0.875rem",
    fontWeight: activeTab === key ? "600" : "400",
    color: activeTab === key ? "var(--color-primary-500)" : "var(--color-neutral-500)",
    background: "none",
    border: "none",
    borderBottom: `2px solid ${activeTab === key ? "var(--color-primary-500)" : "transparent"}`,
    cursor: "pointer",
    transition: "all 0.15s",
    marginBottom: "-1px",
    whiteSpace: "nowrap",
  });

  const scoreColor = (s) =>
    s >= 75 ? "var(--color-success-500)" :
    s >= 50 ? "var(--color-warning-500)" :
              "var(--color-error-500)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-neutral-50)" }}>
      <Navbar />

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Back link */}
        <Link href="/tenant/dashboard" style={{
          fontSize: "0.875rem", color: "var(--color-neutral-500)",
          textDecoration: "none", display: "inline-flex",
          alignItems: "center", gap: "0.375rem", marginBottom: "1.5rem",
        }}>
          ← Back to dashboard
        </Link>

        {/* Property header */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2 style={{ marginBottom: "0.375rem" }}>{property.title}</h2>
              <p style={{ color: "var(--color-neutral-500)", fontSize: "0.9375rem" }}>
                {property.address}, {property.city}
              </p>
              {property.amenities?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.875rem" }}>
                  {property.amenities.map((a) => <AmenityPill key={a} label={a} />)}
                </div>
              )}
            </div>

            {/* Owner info */}
            <div style={{
              background: "var(--color-neutral-50)",
              border: "1px solid var(--color-neutral-200)",
              borderRadius: "var(--radius-md)",
              padding: "0.875rem 1.125rem",
              minWidth: "200px",
            }}>
              <p style={{ fontSize: "0.75rem", color: "var(--color-neutral-400)", marginBottom: "0.375rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Property owner
              </p>
              <p style={{ fontWeight: "600", marginBottom: "0.25rem" }}>{owner?.name ?? "—"}</p>
              {owner?.phone && (
                <p style={{ fontSize: "0.8125rem", color: "var(--color-neutral-600)" }}>{owner.phone}</p>
              )}
              {owner?.email && (
                <p style={{ fontSize: "0.8125rem", color: "var(--color-primary-500)" }}>{owner.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Room selector */}
        {property.rooms?.length > 1 && (
          <div style={{ marginBottom: "1.25rem" }}>
            <p className="input-label" style={{ marginBottom: "0.625rem" }}>Select a room</p>
            <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
              {property.rooms.map((r) => (
                <button key={r._id} onClick={() => handleRoomSelect(r)}
                  style={{
                    padding: "0.625rem 1.125rem",
                    borderRadius: "var(--radius-md)",
                    border: `2px solid ${room?._id === r._id
                      ? "var(--color-primary-500)"
                      : "var(--color-neutral-200)"}`,
                    background: room?._id === r._id ? "var(--color-primary-50)" : "#fff",
                    color: room?._id === r._id ? "var(--color-primary-700)" : "var(--color-neutral-700)",
                    fontSize: "0.875rem",
                    fontWeight: room?._id === r._id ? "600" : "400",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}>
                  {r.label}
                  <span style={{
                    marginLeft: "0.5rem", fontSize: "0.7rem", fontWeight: "500",
                    padding: "0.1rem 0.4rem", borderRadius: "9999px",
                    background: r.status === "available" ? "var(--color-success-50)" : "var(--color-neutral-100)",
                    color: r.status === "available" ? "var(--color-success-700)" : "var(--color-neutral-500)",
                  }}>
                    {r.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {room && (
          <>
            {/* Room stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Monthly rent",  value: `BDT ${room.rent?.toLocaleString()}` },
                { label: "Capacity",      value: `${room.currentTenants?.length ?? 0} / ${room.capacity} tenants` },
                { label: "Availability",  value: room.status },
              ].map((s) => (
                <div key={s.label} style={{
                  background: "#fff", borderRadius: "var(--radius-lg)",
                  border: "0.5px solid var(--color-neutral-200)",
                  padding: "1rem 1.25rem",
                }}>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-neutral-500)", marginBottom: "0.375rem" }}>{s.label}</p>
                  <p style={{ fontSize: "1.125rem", fontWeight: "700", color: "var(--color-neutral-900)" }}>
                    {s.value.replace(/_/g, " ")}
                  </p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{
              display: "flex", borderBottom: "1px solid var(--color-neutral-200)",
              background: "#fff", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
              padding: "0 1rem", overflowX: "auto",
            }}>
              <button style={tabStyle("overview")} onClick={() => setActiveTab("overview")}>Overview</button>
              {user?.role === "tenant" && (
                <button style={tabStyle("compatibility")} onClick={() => setActiveTab("compatibility")}>
                  Compatibility
                  {compatibility?.averageScore != null && (
                    <span style={{
                      marginLeft: "0.5rem", fontSize: "0.75rem", fontWeight: "600",
                      color: scoreColor(compatibility.averageScore),
                    }}>
                      {compatibility.averageScore}%
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Overview tab */}
            {activeTab === "overview" && (
              <div className="card" style={{ borderRadius: "0 0 var(--radius-xl) var(--radius-xl)", borderTop: "none" }}>
                <h4 style={{ marginBottom: "1rem" }}>About this room</h4>
                <p style={{ color: "var(--color-neutral-600)", marginBottom: "1.5rem" }}>
                  {property.description ?? "No description provided."}
                </p>

                {/* Current flatmates preview */}
                {room.currentTenants?.length > 0 && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <p style={{ fontWeight: "600", marginBottom: "0.75rem" }}>
                      Current flatmates ({room.currentTenants.length})
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                      {room.currentTenants.map((t) => (
                        <div key={t._id} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "0.75rem 1rem",
                          background: "var(--color-neutral-50)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--color-neutral-200)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{
                              width: "36px", height: "36px", borderRadius: "50%",
                              background: "var(--color-primary-100)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.875rem", fontWeight: "700",
                              color: "var(--color-primary-700)",
                            }}>
                              {t.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontWeight: "600", fontSize: "0.9375rem" }}>{t.name}</p>
                              <p style={{ fontSize: "0.8125rem", color: "var(--color-neutral-500)" }}>
                                {t.university ? t.university.replace("seed_colive_v1", "RUET") : "—"}
                                {t.gender ? ` · ${t.gender}` : ""}
                              </p>
                            </div>
                          </div>
                          {user?.role === "tenant" && compatibility && (
                            <button
                              onClick={() => setActiveTab("compatibility")}
                              style={{
                                fontSize: "0.8125rem", color: "var(--color-primary-500)",
                                background: "none", border: "none", cursor: "pointer",
                                fontWeight: "500",
                              }}>
                              See compatibility →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {room.currentTenants?.length === 0 && (
                  <div style={{
                    padding: "1rem", borderRadius: "var(--radius-md)",
                    background: "var(--color-success-50)",
                    border: "1px solid var(--color-success-500)",
                    marginBottom: "1.5rem",
                  }}>
                    <p style={{ fontWeight: "600", color: "var(--color-success-700)", marginBottom: "0.25rem" }}>
                      No current flatmates
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "var(--color-success-700)" }}>
                      You would be the first tenant in this room.
                    </p>
                  </div>
                )}

                {/* Book button */}
                
                {bookingMsg.text && (
                <div style={{
                  padding: "0.75rem 1rem", borderRadius: "var(--radius-md)",
                  marginBottom: "1rem", fontSize: "0.875rem",
                  background: bookingMsg.type === "success" ? "var(--color-success-50)" : "var(--color-error-50)",
                  border: `1px solid ${bookingMsg.type === "success" ? "var(--color-success-500)" : "var(--color-error-500)"}`,
                  color: bookingMsg.type === "success" ? "var(--color-success-700)" : "var(--color-error-700)",
                }}>
                  {bookingMsg.text}
                </div>
              )}
              {user?.role === "tenant" && room.status === "available" && (
                <button
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={handleBooking}
                  disabled={booking}
                >
                  {booking ? "Sending request..." : "Request to book this room"}
                </button>
              )}
              {room.status !== "available" && (
                <button className="btn btn-ghost" disabled style={{ width: "100%", opacity: 0.5 }}>
                  This room is currently {room.status}
                </button>
              )}
              </div>
            )}

            {/* Compatibility tab */}
            {activeTab === "compatibility" && user?.role === "tenant" && (
              <div className="card" style={{ borderRadius: "0 0 var(--radius-xl) var(--radius-xl)", borderTop: "none" }}>

                {!compatibility && (
                  <div style={{
                    background: "var(--color-warning-50)", border: "1px solid var(--color-warning-500)",
                    borderRadius: "var(--radius-md)", padding: "1rem",
                    color: "var(--color-warning-700)", fontSize: "0.875rem",
                  }}>
                    Please complete your lifestyle preferences to see compatibility scores.
                  </div>
                )}

                {compatibility?.flatmateCount === 0 && (
                  <p style={{ color: "var(--color-neutral-500)" }}>
                    No current flatmates to compare with. You would be the first tenant.
                  </p>
                )}

                {compatibility && compatibility.flatmateCount > 0 && (
                  <>
                    {/* Average score */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: "1.5rem",
                      padding: "1.25rem", borderRadius: "var(--radius-lg)",
                      background: "var(--color-neutral-50)",
                      border: "1px solid var(--color-neutral-200)",
                      marginBottom: "1.5rem",
                    }}>
                      <ScoreRing score={compatibility.averageScore} size={90} />
                      <div>
                        <p style={{ fontWeight: "700", fontSize: "1.125rem", color: "var(--color-neutral-900)" }}>
                          Average compatibility
                        </p>
                        <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-500)", marginTop: "0.25rem" }}>
                          Based on {compatibility.flatmateCount} flatmate{compatibility.flatmateCount > 1 ? "s" : ""} in this room
                        </p>
                        <p style={{
                          marginTop: "0.5rem", fontSize: "0.875rem", fontWeight: "600",
                          color: scoreColor(compatibility.averageScore),
                        }}>
                          {compatibility.averageScore >= 75 ? "Great match" :
                           compatibility.averageScore >= 50 ? "Decent match" :
                           "Low compatibility"}
                        </p>
                      </div>
                    </div>

                    {/* Per flatmate */}
                    {compatibility.flatmates.map((flatmate, fi) => (
                      <div key={flatmate.id} style={{
                        marginBottom: fi < compatibility.flatmates.length - 1 ? "1.5rem" : 0,
                        paddingBottom: fi < compatibility.flatmates.length - 1 ? "1.5rem" : 0,
                        borderBottom: fi < compatibility.flatmates.length - 1
                          ? "1px solid var(--color-neutral-200)" : "none",
                      }}>
                        {/* Flatmate header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{
                              width: "40px", height: "40px", borderRadius: "50%",
                              background: "var(--color-primary-100)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "1rem", fontWeight: "700", color: "var(--color-primary-700)",
                            }}>
                              {flatmate.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontWeight: "600" }}>{flatmate.name}</p>
                              <p style={{ fontSize: "0.8125rem", color: "var(--color-neutral-500)" }}>
                                {flatmate.university
                                  ? flatmate.university.replace("seed_colive_v1", "RUET")
                                  : "—"}
                                {flatmate.gender ? ` · ${flatmate.gender}` : ""}
                              </p>
                            </div>
                          </div>
                          <ScoreRing score={flatmate.score} size={64} strokeWidth={6} />
                        </div>

                        {/* Breakdown table */}
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid var(--color-neutral-200)" }}>
                                {["Category", "You", "Flatmate", "Match"].map((h) => (
                                  <th key={h} style={{
                                    textAlign: "left", padding: "0.5rem 0.625rem",
                                    fontSize: "0.7rem", fontWeight: "600",
                                    color: "var(--color-neutral-400)",
                                    textTransform: "uppercase", letterSpacing: "0.04em",
                                  }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {flatmate.breakdown.map((row) => (
                                <tr key={row.field} style={{ borderBottom: "1px solid var(--color-neutral-100)" }}>
                                  <td style={{ padding: "0.5rem 0.625rem", fontWeight: "500", color: "var(--color-neutral-700)" }}>
                                    {row.label}
                                  </td>
                                  <td style={{ padding: "0.5rem 0.625rem", color: "var(--color-neutral-600)", textTransform: "capitalize" }}>
                                    {row.yourValue ?? "—"}
                                  </td>
                                  <td style={{ padding: "0.5rem 0.625rem", color: "var(--color-neutral-600)", textTransform: "capitalize" }}>
                                    {row.flatmateValue ?? "—"}
                                  </td>
                                  <td style={{ padding: "0.5rem 0.625rem" }}>
                                    <MatchBadge match={row.match} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Message button */}
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ marginTop: "0.875rem" }}
                          onClick={() => handleMessageFlatmate(flatmate)}
                          disabled={messagingUser === flatmate.id}
                        >
                          {messagingUser === flatmate.id ? "Starting..." : `Message ${flatmate.name.split(" ")[0]}`}
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
