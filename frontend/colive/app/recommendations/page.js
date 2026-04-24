"use client";
import { useState } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { propertyAPI } from "../../lib/api";

const QUICK_PROMPTS = [
  "Budget room near BUET under 5000 TK in Dhaka",
  "Quiet furnished studio for med students in Sylhet",
  "Shared house for 2 friends in Chittagong under 4000 TK",
];

export default function RecommendationsPage() {
  const [userInput, setUserInput]             = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [aiMessage, setAiMessage]             = useState("");
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");

  const fetchRecs = async (prompt) => {
    const text = prompt || userInput;
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setRecommendations([]);
    setAiMessage("");
    if (prompt) setUserInput(prompt);

    try {
      const data = await propertyAPI.recommend({ userPreferences: text });
      setRecommendations(data.recommendations || []);
      setAiMessage(data.message || "");
    } catch (e) {
      setError("Could not reach the AI service. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "var(--color-neutral-50)", minHeight: "100vh" }}>
      <Navbar />

      {/* Header */}
      <header style={{
        background:  "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-800))",
        padding:     "3rem 1.5rem 4rem",
        textAlign:   "center",
        color:       "#fff",
        position:    "relative",
        overflow:    "hidden",
      }}>
        <div style={{ position:"absolute",top:0,left:0,right:0,bottom:0,opacity:0.08,
          backgroundImage:"radial-gradient(#fff 1px,transparent 1px)",backgroundSize:"20px 20px" }} />
        <div style={{ position:"relative",zIndex:1 }}>
          <div style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",
            width:"56px",height:"56px",borderRadius:"14px",background:"rgba(255,255,255,0.15)",
            fontSize:"1.75rem",marginBottom:"1rem" }}>✨</div>
          <h1 style={{ color:"#fff",fontSize:"2.25rem",fontWeight:"800",marginBottom:"0.5rem",letterSpacing:"-0.5px" }}>
            AI Property Matchmaker
          </h1>
          <p style={{ color:"rgba(255,255,255,0.8)",fontSize:"1.1rem",maxWidth:"520px",margin:"0 auto" }}>
            Describe your ideal living situation and our AI finds your perfect match
          </p>
        </div>
      </header>

      <main className="page-container" style={{ marginTop:"-2.5rem",position:"relative",zIndex:10,maxWidth:"860px" }}>

        {/* Input Card */}
        <div className="card" style={{ padding:"2rem",borderRadius:"20px",marginBottom:"2rem",
          boxShadow:"0 20px 40px rgba(0,0,0,0.08)" }}>
          <div style={{ position:"relative",marginBottom:"1rem" }}>
            <textarea
              className="input"
              rows={4}
              placeholder="E.g. I'm a quiet student looking for a furnished room near BUET under 5000 TK..."
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              style={{ resize:"none",lineHeight:"1.6",fontSize:"0.9375rem",padding:"1.25rem",borderRadius:"12px",
                paddingBottom:"3.5rem" }}
              onFocus={e => e.target.style.borderColor = "var(--color-primary-400)"}
              onBlur={e => e.target.style.borderColor = "var(--color-neutral-300)"}
            />
            <button
              className="btn btn-primary"
              onClick={() => fetchRecs()}
              disabled={loading || !userInput.trim()}
              style={{ position:"absolute",bottom:"1rem",right:"1rem",borderRadius:"10px",
                fontSize:"0.875rem",padding:"0.5rem 1.25rem",zIndex:2 }}
            >
              {loading ? (
                <span style={{ display:"flex",alignItems:"center",gap:"0.5rem" }}>
                  <span className="spinner" style={{ width:"14px",height:"14px",border:"2px solid rgba(255,255,255,0.3)",
                    borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite" }} />
                  Analyzing…
                </span>
              ) : "Find My Match →"}
            </button>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>

          {/* Quick prompts */}
          <div style={{ display:"flex",gap:"0.625rem",flexWrap:"wrap",alignItems:"center" }}>
            <span style={{ fontSize:"0.8125rem",color:"var(--color-neutral-400)" }}>Try:</span>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button key={i} onClick={() => fetchRecs(prompt)}
                style={{ background:"#fff",border:"1px solid var(--color-primary-200)",
                  padding:"0.325rem 0.875rem",borderRadius:"20px",fontSize:"0.8125rem",
                  color:"var(--color-primary-700)",cursor:"pointer",transition:"all 0.2s",
                  fontFamily:"var(--font-sans)" }}
                onMouseEnter={e => e.target.style.background = "var(--color-primary-50)"}
                onMouseLeave={e => e.target.style.background = "#fff"}>
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="badge badge-error" style={{ display:"flex",gap:"0.5rem",padding:"0.75rem 1rem",
            borderRadius:"10px",marginBottom:"1.5rem",width:"100%" }}>
            ⚠️ {error}
          </div>
        )}

        {/* AI Message */}
        {aiMessage && (
          <div style={{ display:"flex",gap:"1rem",padding:"1.25rem",background:"var(--color-info-50)",
            borderLeft:"4px solid var(--color-info-500)",borderRadius:"0 12px 12px 0",
            marginBottom:"1.5rem",alignItems:"flex-start" }}>
            <span style={{ fontSize:"1.5rem" }}>🤖</span>
            <p style={{ fontSize:"0.9375rem",lineHeight:"1.6",color:"var(--color-neutral-700)",margin:0 }}>
              {aiMessage}
            </p>
          </div>
        )}

        {/* Results */}
        {recommendations.length > 0 && (
          <div>
            <h3 className="section-title">Top Matches For You</h3>
            <div style={{ display:"grid",gap:"1rem" }}>
              {recommendations.map((rec, i) => (
                <Link key={i} href={`/property/${rec.propertyId}`}
                  style={{ textDecoration:"none",color:"inherit" }}>
                  <div style={{ display:"flex",gap:"1.25rem",padding:"1.5rem",background:"#fff",
                    borderRadius:"14px",border:"1px solid var(--color-primary-100)",
                    transition:"all 0.25s ease",cursor:"pointer" }}
                    onMouseEnter={e => { e.currentTarget.style.transform="translateX(6px)";
                      e.currentTarget.style.borderColor="var(--color-primary-400)";
                      e.currentTarget.style.boxShadow="0 8px 20px rgba(6,148,162,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform="translateX(0)";
                      e.currentTarget.style.borderColor="var(--color-primary-100)";
                      e.currentTarget.style.boxShadow="none"; }}>

                    <div style={{ width:"48px",height:"48px",flexShrink:0,borderRadius:"12px",
                      background:"var(--color-primary-50)",color:"var(--color-primary-600)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontWeight:"800",fontSize:"1.1rem" }}>
                      #{i + 1}
                    </div>

                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",
                        alignItems:"flex-start",marginBottom:"0.375rem" }}>
                        <h4 style={{ margin:0,fontWeight:"700",color:"var(--color-neutral-800)",
                          fontSize:"1rem" }}>
                          {rec.title || "Perfect Match Found"}
                        </h4>
                        {rec.city && (
                          <span className="badge badge-info" style={{ fontSize:"0.75rem" }}>
                            📍 {rec.city}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize:"0.875rem",color:"var(--color-neutral-600)",
                        margin:"0 0 0.625rem",lineHeight:"1.5" }}>
                        {rec.reason}
                      </p>
                      {rec.rentRange && (
                        <span style={{ fontSize:"0.8125rem",fontWeight:"700",
                          color:"var(--color-primary-600)" }}>
                          TK {rec.rentRange.min}–{rec.rentRange.max} / month
                        </span>
                      )}
                    </div>

                    <div style={{ alignSelf:"center",color:"var(--color-primary-400)",
                      fontSize:"1.25rem",flexShrink:0 }}>→</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state after search */}
        {!loading && !error && recommendations.length === 0 && aiMessage === "" && (
          <div style={{ textAlign:"center",padding:"4rem 2rem",color:"var(--color-neutral-400)" }}>
            <div style={{ fontSize:"4rem",marginBottom:"1rem" }}>🤖</div>
            <p style={{ fontSize:"1.05rem" }}>
              Describe what you're looking for above and let AI find your perfect match!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
