"use client";
import { useEffect, useState } from "react";
import { getUser } from "../lib/api";

export default function NotificationPrompt() {
  const [activeAlerts, setActiveAlerts] = useState([]);

  // Queue an unblockable, custom DOM alert
  const fireAlert = (title, message, type) => {
    setActiveAlerts((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), title, message, type }
    ]);
  };

  const dismissAlert = (id) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ── Global Push Alert Polling (Background process to enforce alerts) ──
    const fetchLatest = async () => {
      try {
        const user = getUser();
        if (!user) return; // Wait until they log in
        
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9209/api";
        const token = localStorage.getItem("token");
        const cacheBuster = `?t=${Date.now()}`;

        // 1. ALL USERS EXCEPT OWNER: Alert on new listed properties
        if (user.role !== "owner") {
          const res = await fetch(baseUrl + "/properties" + cacheBuster);
          if (res.ok) {
            const data = await res.json();
            if (data && data.properties && data.properties.length > 0) {
              const latest = data.properties[0];
              const lastSeenId = localStorage.getItem("colive_last_seen_prop_id_v3");
              if (lastSeenId !== latest._id) {
                 localStorage.setItem("colive_last_seen_prop_id_v3", latest._id);
                 fireAlert(`🔔 Push Alert!`, `A new property was just listed:\n${latest.title} in ${latest.city}`, 'property');
              }
            }
          }
        }

        // 2. OWNERS: Alert on new bookings received
        if (user.role === "owner" && token) {
          const res = await fetch(baseUrl + "/bookings/received" + cacheBuster, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.bookings && data.bookings.length > 0) {
              const latest = data.bookings[0];
              const lastSeenId = localStorage.getItem("colive_last_seen_booking_id_v3");
              if (lastSeenId !== latest._id) {
                 localStorage.setItem("colive_last_seen_booking_id_v3", latest._id);
                 const tenantName = latest.tenantId?.name || "A tenant";
                 const propTitle = latest.propertyId?.title || "your property";
                 fireAlert(`🔔 Booking Alert!`, `${tenantName} just requested to book a room at ${propTitle}!`, 'booking');
              }
            }
          }
        }
        
        // 3. ANY USER: Alert on new messages received
        if (token) {
          const msgRes = await fetch(baseUrl + "/messages/received" + cacheBuster, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (msgRes.ok) {
            const mData = await msgRes.json();
            if (mData && mData.messages && mData.messages.length > 0) {
              const latestMsg = mData.messages[0];
              const lastSeenMsgId = localStorage.getItem("colive_last_seen_msg_id_v3");
              if (lastSeenMsgId !== latestMsg._id) {
                 localStorage.setItem("colive_last_seen_msg_id_v3", latestMsg._id);
                 const senderName = latestMsg.senderId?.name || "Someone";
                 fireAlert(`💬 Message Alert!`, `${senderName} sent you a message:\n\n"${latestMsg.content}"`, 'message');
              }
            }
          }
        }
      } catch (err) {}
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, 4000);
    return () => clearInterval(interval);

  }, []);

  if (activeAlerts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      zIndex: 999999,
      pointerEvents: "none",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: "4rem",
      gap: "1rem"
    }}>
      {activeAlerts.map(alert => (
        <div key={alert.id} style={{
          pointerEvents: "auto",
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
          border: "2px solid var(--color-primary-500)",
          width: "90%",
          maxWidth: "420px",
          overflow: "hidden",
          animation: "slideInDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        }}>
          <style>{`
            @keyframes slideInDown {
              from { transform: translateY(-30px) scale(0.9); opacity: 0; }
              to { transform: translateY(0) scale(1); opacity: 1; }
            }
          `}</style>
          
          <div style={{
            background: "linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700))",
            padding: "1rem 1.25rem",
            color: "#fff",
            fontWeight: "700",
            fontSize: "1.1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>{alert.title}</span>
            <button onClick={() => dismissAlert(alert.id)} style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem"
            }}>✕</button>
          </div>
          
          <div style={{ padding: "1.5rem", whiteSpace: "pre-wrap", color: "var(--color-neutral-700)", fontSize: "0.95rem", lineHeight: "1.5" }}>
            {alert.message}
          </div>
          
          <div style={{ padding: "0 1.5rem 1.5rem" }}>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.75rem", fontSize: "1rem" }}
            >
              Acknowledge
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
