"use client";

export default function ProgressBar({ pct, color, height = 4 }) {
  return (
    <div
      style={{
        height,
        borderRadius: height / 2,
        background: "#E8E8E4",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: height / 2,
          background: color || "var(--accent)",
          width: pct + "%",
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}
