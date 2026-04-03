"use client";

export default function CheckItem({ item, checked, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 8px",
        cursor: "pointer",
        background: checked ? "#4CAF5008" : "transparent",
        borderRadius: 6,
        borderBottom: "1px solid var(--border-light)",
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
          opacity: checked ? 0.7 : 1,
        }}
      >
        {item.label}
      </span>
    </label>
  );
}
