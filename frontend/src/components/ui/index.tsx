import React from "react";
import clsx from "clsx";

// ============================================================
// BUTTON
// ============================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "blue";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx("btn", `btn-${variant}`, `btn-${size}`, className)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        fontFamily: "var(--font-body)",
        fontWeight: 500,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.55 : 1,
        border: "none",
        borderRadius: "var(--radius)",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        ...getVariantStyle(variant),
        ...getSizeStyle(size),
      }}
      {...props}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}

function getVariantStyle(v: string) {
  switch (v) {
    case "primary":
      return { background: "var(--accent)", color: "var(--accent-text)" };
    case "blue":
      return { background: "var(--blue)", color: "#fff" };
    case "danger":
      return {
        background: "var(--red-dim)",
        color: "var(--red)",
        border: "1px solid var(--red-dim)",
      };
    case "ghost":
      return {
        background: "transparent",
        color: "var(--text-secondary)",
        border: "1px solid var(--border)",
      };
    default:
      return {
        background: "var(--bg-card)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
      };
  }
}

function getSizeStyle(s: string) {
  switch (s) {
    case "sm":
      return { padding: "6px 14px", fontSize: "12px" };
    case "lg":
      return { padding: "13px 28px", fontSize: "15px" };
    default:
      return { padding: "9px 18px", fontSize: "14px" };
  }
}

// ============================================================
// BADGE
// ============================================================
interface BadgeProps {
  variant?: "green" | "blue" | "amber" | "red" | "gray" | "violet";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "gray", children, className }: BadgeProps) {
  const styles: Record<string, React.CSSProperties> = {
    green: { background: "var(--accent-dim)", color: "var(--accent)" },
    blue: { background: "var(--blue-dim)", color: "var(--blue-light)" },
    amber: { background: "var(--amber-dim)", color: "var(--amber)" },
    red: { background: "var(--red-dim)", color: "var(--red)" },
    gray: {
      background: "var(--bg-card)",
      color: "var(--text-secondary)",
      border: "1px solid var(--border)",
    },
    violet: { background: "var(--violet-dim)", color: "var(--violet)" },
  };

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: 500,
        whiteSpace: "nowrap",
        fontFamily: "var(--font-mono)",
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
}

// ============================================================
// CARD
// ============================================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({
  children,
  className,
  accent,
  style,
  onClick,
}: CardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${accent ? "rgba(0,214,143,0.25)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        boxShadow: accent ? "var(--shadow-accent)" : "var(--shadow-sm)",
        cursor: onClick ? "pointer" : undefined,
        transition: "border-color 0.2s, box-shadow 0.2s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================
// SPINNER
// ============================================================
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        border: "2px solid var(--border)",
        borderTopColor: "var(--accent)",
        borderRadius: "50%",
        display: "inline-block",
        flexShrink: 0,
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

// ============================================================
// INPUT
// ============================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  className,
  style,
  ...props
}: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      {label && (
        <label
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {label}
        </label>
      )}
      <input
        {...props}
        style={{
          width: "100%",
          background: "var(--bg-input)",
          border: `1px solid ${error ? "var(--red)" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          padding: "10px 14px",
          color: "var(--text-primary)",
          fontFamily: "var(--font-body)",
          fontSize: "14px",
          outline: "none",
          transition: "border-color 0.15s",
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error
            ? "var(--red)"
            : "var(--accent)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error
            ? "var(--red)"
            : "var(--border)";
        }}
      />
      {error && (
        <span style={{ fontSize: "12px", color: "var(--red)" }}>{error}</span>
      )}
      {hint && !error && (
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

// ============================================================
// SELECT
// ============================================================
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, ...props }: SelectProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      {label && (
        <label
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {label}
        </label>
      )}
      <select
        {...props}
        style={{
          width: "100%",
          background: "var(--bg-input)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "10px 14px",
          color: "var(--text-primary)",
          fontFamily: "var(--font-body)",
          fontSize: "14px",
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================
// MODAL
// ============================================================
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 480,
}: ModalProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-xl)",
          padding: "32px",
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflowY: "auto",
          animation: "fadeIn 0.2s ease",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "22px",
              lineHeight: 1,
              padding: "2px 6px",
              borderRadius: "6px",
            }}
          >
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// DIVIDER
// ============================================================
export function Divider({ style }: { style?: React.CSSProperties }) {
  return <div style={{ height: 1, background: "var(--border)", ...style }} />;
}

// ============================================================
// LOADING PAGE
// ============================================================
export function LoadingPage() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "40vh",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Spinner size={32} />
      <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading...</p>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================
export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description?: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "60px 20px",
        color: "var(--text-muted)",
      }}
    >
      <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.4 }}>
        {icon}
      </div>
      <p
        style={{
          fontSize: "15px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginBottom: "6px",
        }}
      >
        {title}
      </p>
      {description && <p style={{ fontSize: "13px" }}>{description}</p>}
    </div>
  );
}

// ============================================================
// SECTION HEADER
// ============================================================
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: "24px",
        gap: "16px",
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "30px",
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: "15px",
              color: "var(--text-secondary)",
              marginTop: "3px",
              fontWeight: "bold",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================
export function StatCard({
  label,
  value,
  sub,
  color = "accent",
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "accent" | "blue" | "amber" | "red" | "violet";
  icon?: string;
}) {
  const colorMap: Record<string, string> = {
    accent: "var(--accent)",
    blue: "var(--blue-light)",
    amber: "var(--amber)",
    red: "var(--red)",
    violet: "var(--violet)",
  };
  const borderMap: Record<string, string> = {
    accent: "var(--accent)",
    blue: "var(--blue)",
    amber: "var(--amber)",
    red: "var(--red)",
    violet: "var(--violet)",
  };

  return (
    <Card style={{ borderTop: `2px solid ${borderMap[color]}` }}>
      {icon && (
        <div
          style={{ fontSize: "22px", marginBottom: "12px", fontWeight: "bold" }}
        >
          {icon}
        </div>
      )}
      <p
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "6px",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "26px",
          fontWeight: 600,
          color: colorMap[color],
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginTop: "4px",
          }}
        >
          {sub}
        </p>
      )}
    </Card>
  );
}
