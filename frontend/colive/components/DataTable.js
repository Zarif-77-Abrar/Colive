export default function DataTable({ headers, rows, emptyMessage = "No data yet." }) {
  const statusStyles = {
    pending:     { bg: "var(--color-warning-50)",  color: "var(--color-warning-700)"  },
    accepted:    { bg: "var(--color-success-50)",  color: "var(--color-success-700)"  },
    paid:        { bg: "var(--color-success-50)",  color: "var(--color-success-700)"  },
    rejected:    { bg: "var(--color-error-50)",    color: "var(--color-error-700)"    },
    in_progress: { bg: "var(--color-info-50)",     color: "var(--color-info-700)"     },
    resolved:    { bg: "var(--color-neutral-100)", color: "var(--color-neutral-600)"  },
    available:   { bg: "var(--color-success-50)",  color: "var(--color-success-700)"  },
    occupied:    { bg: "var(--color-neutral-100)", color: "var(--color-neutral-600)"  },
    reserved:    { bg: "var(--color-warning-50)",  color: "var(--color-warning-700)"  },
    unpaid:      { bg: "var(--color-error-50)",    color: "var(--color-error-700)"    },
    failed:      { bg: "var(--color-error-50)",    color: "var(--color-error-700)"    },
    refunded:    { bg: "var(--color-neutral-100)", color: "var(--color-neutral-600)"  },
    tenant:      { bg: "var(--color-primary-50)",  color: "var(--color-primary-700)"  },
    owner:       { bg: "var(--color-warning-50)",  color: "var(--color-warning-700)"  },
    admin:       { bg: "var(--color-error-50)",    color: "var(--color-error-700)"    },
    withdrawn:   { bg: "var(--color-neutral-100)", color: "var(--color-neutral-600)"  },
  };

  const isStatus = (val) => typeof val === "string" && statusStyles[val];

  const fmt = (val) => {
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return String(val);
  };

  if (!rows || rows.length === 0) {
    return (
      <p style={{ color: "var(--color-neutral-400)", padding: "1.5rem 0", fontSize: "0.875rem" }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-neutral-200)" }}>
            {headers.map((h) => (
              <th key={h} style={{
                textAlign: "left", padding: "0.625rem 0.75rem",
                fontSize: "0.75rem", fontWeight: "600",
                color: "var(--color-neutral-500)",
                textTransform: "uppercase", letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--color-neutral-100)" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "0.75rem", color: "var(--color-neutral-700)" }}>
                  {isStatus(cell) ? (
                    <span style={{
                      display: "inline-flex", padding: "0.2rem 0.625rem",
                      borderRadius: "9999px", fontSize: "0.75rem", fontWeight: "500",
                      background: statusStyles[cell].bg,
                      color: statusStyles[cell].color,
                    }}>
                      {cell.replace(/_/g, " ")}
                    </span>
                  ) : fmt(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
