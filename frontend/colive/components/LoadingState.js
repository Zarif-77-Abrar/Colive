export function LoadingSpinner() {
  return (
    <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-neutral-400)", fontSize: "0.875rem" }}>
      Loading...
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div style={{
      background: "var(--color-error-50)", border: "1px solid var(--color-error-500)",
      borderRadius: "var(--radius-md)", padding: "1rem", fontSize: "0.875rem",
      color: "var(--color-error-700)",
    }}>
      {message || "Something went wrong. Please try again."}
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
      <p style={{ fontWeight: "600", color: "var(--color-neutral-600)", marginBottom: "0.25rem" }}>{title}</p>
      {description && (
        <p style={{ fontSize: "0.875rem", color: "var(--color-neutral-400)" }}>{description}</p>
      )}
    </div>
  );
}
