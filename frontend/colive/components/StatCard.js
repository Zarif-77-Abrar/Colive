export default function StatCard({ label, value, sub, accent }) {
  const accents = {
    primary: "var(--color-primary-500)",
    warning: "var(--color-warning-500)",
    success: "var(--color-success-500)",
    error:   "var(--color-error-500)",
    neutral: "var(--color-neutral-400)",
  };
  const color = accents[accent] || accents.primary;

  return (
    <div style={{
      background: "#fff",
      border: "0.5px solid var(--color-neutral-200)",
      borderRadius: "var(--radius-lg)",
      padding: "1.25rem 1.5rem",
      borderTop: `3px solid ${color}`,
    }}>
      <p style={{
        fontSize: "0.8125rem",
        color: "var(--color-neutral-500)",
        marginBottom: "0.5rem",
      }}>
        {label}
      </p>
      <p style={{
        fontSize: "1.75rem",
        fontWeight: "700",
        color: "var(--color-neutral-900)",
        lineHeight: "1",
      }}>
        {value}
      </p>
      {sub && (
        <p style={{
          fontSize: "0.75rem",
          color: "var(--color-neutral-400)",
          marginTop: "0.375rem",
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}
