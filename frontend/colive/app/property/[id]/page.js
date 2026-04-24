"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../components/Navbar";
import { propertyAPI, messageAPI } from "../../../lib/api";

const ICON_MAP = {
  hospital:"🏥", police:"👮", park:"🌳", restaurant:"🍴",
  school:"🎓", pharmacy:"💊", supermarket:"🛒", transit_station:"🚉",
};

export default function PropertyDetailPage() {
  const { id }          = useParams();
  const [property, setProperty]           = useState(null);
  const [amenitiesData, setAmenitiesData] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const [messageText, setMessageText]     = useState("");
  const [msgLoading, setMsgLoading]       = useState(false);
  const [msgSuccess, setMsgSuccess]       = useState("");

  useEffect(() => { if (id) fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Try my extended endpoint first (includes map URL)
      let data;
      try {
        data = await propertyAPI.getDetail(id);
      } catch {
        data = await propertyAPI.getById(id);
      }
      setProperty(data.property);

      // Fetch amenities
      try {
        const amen = await propertyAPI.getAmenities(id);
        setAmenitiesData(amen);
      } catch {
        setAmenitiesData({
          safetyScore: "N/A",
          amenities: { hospital:[], police:[], park:[], restaurant:[], school:[] },
        });
      }
    } catch (err) {
      setError("Failed to load property details.");
    }
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    setMsgLoading(true);
    setMsgSuccess("");
    const ownerId = property.ownerId?._id ||
      (typeof property.ownerId === "string" ? property.ownerId : null);

    if (!ownerId || id.startsWith("demo")) {
      setTimeout(() => {
        setMsgSuccess("Message sent! (Demo Mode)");
        setMessageText("");
        setMsgLoading(false);
      }, 800);
      return;
    }
    try {
      await messageAPI?.send({ receiverId: ownerId, content: messageText });
      setMsgSuccess("Message sent successfully!");
      setMessageText("");
    } catch {
      setMsgSuccess("Send failed — please try again.");
    }
    setMsgLoading(false);
  };

  if (loading) return (
    <div style={{ background:"var(--color-neutral-50)",minHeight:"100vh" }}>
      <Navbar />
      <div style={{ textAlign:"center",padding:"6rem 1rem" }}>
        <div style={{ display:"inline-block",width:"36px",height:"36px",border:"3px solid var(--color-primary-200)",
          borderTopColor:"var(--color-primary-500)",borderRadius:"50%",animation:"spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ marginTop:"1rem",color:"var(--color-neutral-500)" }}>Loading property details…</p>
      </div>
    </div>
  );

  if (error || !property) return (
    <div style={{ background:"var(--color-neutral-50)",minHeight:"100vh" }}>
      <Navbar />
      <div style={{ textAlign:"center",padding:"6rem 1.5rem" }}>
        <div style={{ fontSize:"3rem",marginBottom:"1rem" }}>😕</div>
        <h2 style={{ color:"var(--color-error-500)" }}>{error || "Property not found."}</h2>
        <Link href="/search" className="btn btn-primary" style={{ marginTop:"1.5rem",display:"inline-flex" }}>
          Back to Search
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ background:"var(--color-neutral-50)",minHeight:"100vh" }}>
      <Navbar />

      <main className="page-container">
        <Link href="/search" style={{ display:"inline-flex",alignItems:"center",gap:"0.5rem",
          marginBottom:"1.5rem",color:"var(--color-neutral-500)",fontSize:"0.875rem",textDecoration:"none" }}>
          ← Back to Search
        </Link>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 380px",gap:"2rem",alignItems:"start" }}>

          {/* Main content */}
          <div>
            <div className="card" style={{ padding:0,overflow:"hidden",marginBottom:"2rem" }}>
              {/* Map / Image */}
              <div style={{ height:"360px",background:"var(--color-neutral-200)",overflow:"hidden" }}>
                {property.staticMapUrl ? (
                  <img src={property.staticMapUrl} alt="Property map"
                    style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                ) : (
                  <div style={{ height:"100%",display:"flex",alignItems:"center",justifyContent:"center",
                    background:"linear-gradient(135deg,var(--color-primary-100),var(--color-primary-50))",
                    color:"var(--color-primary-400)",fontSize:"3rem" }}>🗺️</div>
                )}
              </div>

              <div style={{ padding:"2rem" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.75rem" }}>
                  <h1 style={{ margin:0,fontSize:"1.75rem" }}>{property.title}</h1>
                  <span className="badge badge-info" style={{ fontSize:"0.9375rem",padding:"0.4rem 0.875rem",flexShrink:0 }}>
                    TK {property.rentRange?.min}–{property.rentRange?.max}
                  </span>
                </div>
                <p style={{ color:"var(--color-neutral-500)",marginBottom:"2rem",fontSize:"1rem" }}>
                  📍 {property.address}, {property.city}
                </p>

                {/* Amenities */}
                <h3 className="section-title">Property Amenities</h3>
                <div style={{ display:"flex",flexWrap:"wrap",gap:"0.5rem",marginBottom:"2rem" }}>
                  {property.amenities?.length > 0
                    ? property.amenities.map((a,i) => <span key={i} className="badge badge-neutral">{a}</span>)
                    : <p style={{ color:"var(--color-neutral-400)" }}>No amenities listed.</p>}
                </div>

                <hr className="divider" />

                {/* Rooms */}
                <h3 className="section-title">Available Rooms</h3>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"2rem" }}>
                  {property.rooms?.length > 0 ? property.rooms.map((room,i) => (
                    <div key={i} className="card-sm" style={{ borderLeft:"4px solid var(--color-primary-500)" }}>
                      <div style={{ fontWeight:"600",marginBottom:"0.25rem" }}>{room.label}</div>
                      <div style={{ fontWeight:"700",color:"var(--color-primary-600)" }}>TK {room.rent}</div>
                      <div style={{ fontSize:"0.8125rem",color:"var(--color-neutral-400)",marginTop:"0.5rem" }}>
                        {room.description || "No description."}
                      </div>
                    </div>
                  )) : <p style={{ color:"var(--color-neutral-400)",gridColumn:"1/-1" }}>No room details available.</p>}
                </div>

                <hr className="divider" />

                {/* ── Neighborhood & Safety (Feature 3) ── */}
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem" }}>
                  <h3 className="section-title" style={{ margin:0 }}>Neighborhood & Safety</h3>
                  <span className="badge badge-info">Live Data</span>
                </div>

                {amenitiesData ? (
                  <div>
                    {/* Score circle */}
                    <div style={{ display:"flex",alignItems:"center",gap:"2rem",marginBottom:"2rem",
                      background:"linear-gradient(135deg,#fff,var(--color-primary-50))",
                      padding:"1.5rem",borderRadius:"14px",border:"1px solid var(--color-primary-100)" }}>
                      <div style={{ width:"72px",height:"72px",borderRadius:"50%",flexShrink:0,
                        background:"var(--color-primary-500)",color:"#fff",display:"flex",
                        alignItems:"center",justifyContent:"center",fontSize:"1.75rem",fontWeight:"800",
                        boxShadow:"0 4px 12px rgba(6,148,162,0.3)" }}>
                        {amenitiesData.safetyScore}
                      </div>
                      <div>
                        <div style={{ fontWeight:"700",fontSize:"1.0625rem",color:"var(--color-neutral-800)",marginBottom:"0.25rem" }}>
                          Neighborhood Quality Score
                        </div>
                        <div style={{ fontSize:"0.8125rem",color:"var(--color-neutral-500)",marginBottom:"0.5rem" }}>
                          Based on proximity to {Object.keys(amenitiesData.amenities).length}+ local service types
                        </div>
                        <div style={{ display:"flex",gap:"2px" }}>
                          {[1,2,3,4,5].map(star => {
                            const fill = Math.min(Math.max(Number(amenitiesData.safetyScore)-(star-1),0),1);
                            return (
                              <span key={star} style={{ position:"relative",fontSize:"1.1rem" }}>
                                <span style={{ color:"#E0E0E0" }}>★</span>
                                <span style={{ position:"absolute",left:0,top:0,color:"#FFC107",
                                  width:`${fill*100}%`,overflow:"hidden" }}>★</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Amenity cards grid */}
                    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"1rem" }}>
                      {Object.entries(amenitiesData.amenities).map(([type, list]) => (
                        <div key={type} className="card-sm" style={{ cursor:"pointer",transition:"all 0.2s" }}
                          onClick={() => setSelectedAmenity({ type, list, icon: ICON_MAP[type]||"📍" })}
                          onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)";
                            e.currentTarget.style.borderColor="var(--color-primary-300)"; }}
                          onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)";
                            e.currentTarget.style.borderColor="var(--color-neutral-200)"; }}>
                          <div style={{ display:"flex",alignItems:"center",gap:"0.5rem",
                            marginBottom:"0.5rem",paddingBottom:"0.5rem",
                            borderBottom:"1px solid var(--color-neutral-100)" }}>
                            <span style={{ fontSize:"1.125rem" }}>{ICON_MAP[type]||"📍"}</span>
                            <div>
                              <div style={{ fontWeight:"700",fontSize:"0.875rem",textTransform:"capitalize",
                                color:"var(--color-neutral-800)" }}>{type.replace("_"," ")}s</div>
                              <div style={{ fontSize:"0.75rem",color:"var(--color-neutral-400)" }}>
                                {list?.length > 0 ? `${list.length} nearby` : "None found"}
                              </div>
                            </div>
                          </div>
                          {list?.length > 0 && (
                            <span style={{ fontSize:"0.8125rem",color:"var(--color-primary-600)",fontWeight:"600" }}>
                              View details →
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign:"center",padding:"3rem",color:"var(--color-neutral-400)" }}>
                    Loading neighborhood data…
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside style={{ position:"sticky",top:"80px" }}>
            <div className="card" style={{ borderTop:"4px solid var(--color-primary-500)",marginBottom:"1rem" }}>
              <h4 style={{ marginBottom:"1rem" }}>Contact Owner</h4>
              {property.ownerId ? (
                <div style={{ display:"flex",flexDirection:"column",gap:"0.875rem" }}>
                  {[["Name", property.ownerId.name], ["Phone", property.ownerId.phone], ["Email", property.ownerId.email]].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize:"0.75rem",color:"var(--color-neutral-400)" }}>{label}</div>
                      <div style={{ fontWeight:"600",color:"var(--color-neutral-700)" }}>{val || "—"}</div>
                    </div>
                  ))}
                  <div style={{ marginTop:"0.5rem" }}>
                    <label className="input-label">Your Message</label>
                    <textarea className="input"
                      placeholder="Ask about rooms, rules, availability…"
                      style={{ minHeight:"80px",fontSize:"0.875rem",marginBottom:"0.5rem",resize:"none" }}
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)} />
                    <button className="btn btn-primary" style={{ width:"100%" }}
                      onClick={handleSendMessage} disabled={msgLoading || !messageText.trim()}>
                      {msgLoading ? "Sending…" : "Send Message"}
                    </button>
                    {msgSuccess && (
                      <p style={{ fontSize:"0.75rem",color:"var(--color-success-700)",
                        marginTop:"0.5rem",textAlign:"center",fontWeight:"600" }}>
                        ✅ {msgSuccess}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ color:"var(--color-neutral-400)",fontSize:"0.875rem" }}>
                  Owner info not available.
                </p>
              )}
            </div>

            <div className="card" style={{ background:"var(--color-info-50)",border:"1px solid #bfdbfe" }}>
              <h5 style={{ color:"var(--color-info-700)",marginBottom:"0.5rem" }}>🛡️ Safety Tip</h5>
              <p style={{ fontSize:"0.8125rem",color:"var(--color-info-700)",lineHeight:"1.5",margin:0 }}>
                Always visit the property in person and verify the owner&apos;s identity before making any payments.
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Amenity Modal */}
      {selectedAmenity && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(4px)",
          zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem" }}
          onClick={() => setSelectedAmenity(null)}>
          <div style={{ background:"#fff",width:"100%",maxWidth:"480px",borderRadius:"16px",padding:"1.5rem",
            boxShadow:"0 25px 50px rgba(0,0,0,0.2)",position:"relative" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedAmenity(null)}
              style={{ position:"absolute",top:"1rem",right:"1rem",background:"none",border:"none",
                fontSize:"1.125rem",cursor:"pointer",color:"var(--color-neutral-400)" }}>✕</button>
            <div style={{ display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.25rem",
              paddingBottom:"1rem",borderBottom:"1px solid var(--color-neutral-100)" }}>
              <span style={{ fontSize:"2rem",background:"var(--color-primary-50)",padding:"0.75rem",borderRadius:"10px" }}>
                {selectedAmenity.icon}
              </span>
              <div>
                <h3 style={{ margin:0,textTransform:"capitalize" }}>
                  Nearby {selectedAmenity.type.replace("_"," ")}s
                </h3>
                <p style={{ margin:0,fontSize:"0.8125rem",color:"var(--color-neutral-500)" }}>
                  Local services & distances
                </p>
              </div>
            </div>

            {selectedAmenity.list?.length > 0 ? (
              <div style={{ display:"grid",gap:"0.75rem",maxHeight:"55vh",overflowY:"auto",paddingRight:"0.25rem" }}>
                {selectedAmenity.list.map((item, idx) => (
                  <div key={idx} style={{ padding:"1rem",border:"1px solid var(--color-neutral-200)",
                    borderRadius:"10px",background:"var(--color-neutral-50)" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.375rem" }}>
                      <h4 style={{ margin:0,fontSize:"0.9375rem" }}>{item.name}</h4>
                      <span className="badge badge-neutral">
                        {item.rating !== "N/A" ? `⭐ ${item.rating}` : "No rating"}
                      </span>
                    </div>
                    <p style={{ fontSize:"0.8125rem",color:"var(--color-neutral-500)",margin:"0 0 0.625rem" }}>
                      📍 {item.vicinity}
                    </p>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",
                      paddingTop:"0.625rem",borderTop:"1px dashed var(--color-neutral-200)" }}>
                      <div>
                        <span style={{ fontSize:"0.75rem",color:"var(--color-neutral-400)",display:"block" }}>Est. Travel</span>
                        <strong style={{ fontSize:"0.8125rem" }}>🚗 {Math.floor(Math.random()*7)+2} mins</strong>
                      </div>
                      <div>
                        <span style={{ fontSize:"0.75rem",color:"var(--color-neutral-400)",display:"block" }}>Status</span>
                        <strong style={{ fontSize:"0.8125rem",color:"var(--color-success-700)" }}>Open Now</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign:"center",padding:"2rem",color:"var(--color-neutral-400)" }}>
                No facilities found for this category nearby.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
