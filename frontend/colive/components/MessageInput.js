"use client";

import { useState } from "react";

export default function MessageInput({ onSend, disabled = false, isLoading = false }) {
  const [content, setContent] = useState("");

  const handleSend = async () => {
    if (!content.trim()) return;

    await onSend(content);
    setContent("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = content.length;
  const maxChars = 500;

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "0.5rem",
      padding: "1rem", borderTop: "1px solid var(--color-neutral-200)",
      background: "#fff",
    }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, maxChars))}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled || isLoading}
        style={{
          width: "100%", padding: "0.75rem", borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-neutral-200)", fontSize: "0.9375rem",
          fontFamily: "inherit", resize: "none", minHeight: "80px",
          boxSizing: "border-box", opacity: disabled || isLoading ? 0.5 : 1,
          transition: "opacity 0.15s",
        }}
      />

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: "0.8125rem", color: "var(--color-neutral-500)",
      }}>
        <span>{charCount} / {maxChars}</span>
        <button
          onClick={handleSend}
          disabled={disabled || isLoading || !content.trim()}
          className="btn btn-primary btn-sm"
          style={{
            opacity: (disabled || isLoading || !content.trim()) ? 0.5 : 1,
          }}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
