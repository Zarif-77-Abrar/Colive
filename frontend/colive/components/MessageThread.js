"use client";

import { useEffect, useRef } from "react";

export default function MessageThread({ messages, currentUserId, isLoading }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", color: "var(--color-neutral-400)",
        flexDirection: "column", gap: "0.75rem",
      }}>
        <p style={{ fontSize: "0.9375rem", margin: 0 }}>No messages yet</p>
        <p style={{ fontSize: "0.8125rem", margin: 0, color: "var(--color-neutral-500)" }}>
          Start a conversation!
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "1rem",
      padding: "1rem", overflowY: "auto", flexGrow: 1,
    }}>
      {messages.map((msg) => {
        const isSent = msg.senderId._id === currentUserId;

        return (
          <div
            key={msg._id}
            style={{
              display: "flex", justifyContent: isSent ? "flex-end" : "flex-start",
              gap: "0.75rem",
            }}
          >
            {/* Sender avatar (when received) */}
            {!isSent && (
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: "var(--color-primary-100)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.8125rem", fontWeight: "700",
                color: "var(--color-primary-700)", flexShrink: 0,
              }}>
                {msg.senderId.name?.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Message bubble */}
            <div style={{
              display: "flex", flexDirection: "column", gap: "0.25rem",
              maxWidth: "60%",
            }}>
              {/* Sender name (when received) */}
              {!isSent && (
                <p style={{
                  margin: 0, fontSize: "0.75rem", fontWeight: "600",
                  color: "var(--color-neutral-500)",
                  paddingLeft: "0.5rem",
                }}>
                  {msg.senderId.name}
                </p>
              )}

              {/* Message content */}
              <div style={{
                background: isSent ? "var(--color-primary-500)" : "var(--color-neutral-100)",
                color: isSent ? "#fff" : "var(--color-neutral-900)",
                padding: "0.75rem 1rem", borderRadius: "0.75rem",
                wordWrap: "break-word", whiteSpace: "pre-wrap",
                fontSize: "0.9375rem", lineHeight: "1.4",
              }}>
                {msg.content}
              </div>

              {/* Timestamp */}
              <p style={{
                margin: 0, fontSize: "0.75rem",
                color: "var(--color-neutral-400)",
                paddingLeft: isSent ? "0.5rem" : "0",
                paddingRight: isSent ? "0" : "0.5rem",
                textAlign: isSent ? "right" : "left",
              }}>
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div style={{
          textAlign: "center", fontSize: "0.875rem",
          color: "var(--color-neutral-400)", margin: "1rem 0",
        }}>
          Loading...
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
