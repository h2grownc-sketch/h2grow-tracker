"use client";

export default function CheckItem({ item, checked, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 4px",
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
        background: checked ? "#5CBF2A18" : "transparent",
        borderRadius: 4,
        marginBottom: 1,
        transition: "background 0.2s",
        fontSize: 15,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{
          accentColor: "var(--accent)",
          width: 18,
          height: 18,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          color: checked ? "var(--success)" : "var(--text-primary)",
          textDecoration: checked ? "line-through" : "none",
          letterSpacing: "0.3px",
        }}
      >
        {item.label}
      </span>
    </label>
  );
}
