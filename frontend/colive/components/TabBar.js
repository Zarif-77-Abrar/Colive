"use client";

export default function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{
      display: "flex",
      gap: "0",
      borderBottom: "1px solid var(--color-neutral-200)",
      background: "#fff",
      padding: "0 1.5rem",
      overflowX: "auto",
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            padding: "0.875rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: active === tab.key ? "600" : "400",
            color: active === tab.key
              ? "var(--color-primary-500)"
              : "var(--color-neutral-500)",
            background: "none",
            border: "none",
            borderBottom: active === tab.key
              ? "2px solid var(--color-primary-500)"
              : "2px solid transparent",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.15s",
            marginBottom: "-1px",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
