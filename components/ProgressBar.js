"use client";

export default function ProgressBar({ pct, color }) {
  return (
    <div
      style={{
        height: 4,
        borderRadius: 2,
        background: "#2A2A2A",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: 2,
          background: color || "#5CBF2A",
          width: pct + "%",
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}
