"use client";

import { useState } from "react";

export default function WeekCalendar({ jobs, onSelect }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = new Date(startOfWeek);
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const scheduledJobs = jobs.filter(
    (j) => j.scheduledDate && j.checks.scheduled && !j.checks.followUp90
  );
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekLabel = `${days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            borderRadius: 4,
            padding: "6px 12px",
            fontSize: 14,
          }}
        >
          ← Prev
        </button>
        <div
          style={{
            fontFamily: "var(--heading-font)",
            fontSize: 16,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {weekLabel}
        </div>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            borderRadius: 4,
            padding: "6px 12px",
            fontSize: 14,
          }}
        >
          Next →
        </button>
      </div>
      {weekOffset !== 0 && (
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <button
            onClick={() => setWeekOffset(0)}
            style={{
              background: "none",
              border: "none",
              color: "var(--h2-blue)",
              fontSize: 13,
              textDecoration: "underline",
            }}
          >
            Back to this week
          </button>
        </div>
      )}
      {days.map((day, i) => {
        const ds = day.toISOString().split("T")[0];
        const isToday = ds === today.toISOString().split("T")[0];
        const dayJobs = scheduledJobs.filter((j) => j.scheduledDate === ds);
        return (
          <div
            key={i}
            style={{
              marginBottom: 6,
              background: isToday ? "#5CBF2A10" : "transparent",
              borderRadius: 6,
              padding: "8px 10px",
              border: isToday
                ? "1px solid #5CBF2A40"
                : "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--heading-font)",
                fontSize: 13,
                fontWeight: 600,
                color: isToday ? "var(--accent)" : "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                marginBottom: dayJobs.length ? 6 : 0,
              }}
            >
              {dayNames[i]} {day.getDate()} {isToday && "• TODAY"}
            </div>
            {dayJobs.length === 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
              >
                No jobs
              </div>
            )}
            {dayJobs.map((j) => (
              <div
                key={j.id}
                onClick={() => onSelect(j)}
                style={{
                  background: "var(--card-bg)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  marginBottom: 4,
                  cursor: "pointer",
                  borderLeft: "3px solid var(--grow-lime)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--heading-font)",
                    fontWeight: 600,
                    fontSize: 14,
                    textTransform: "uppercase",
                  }}
                >
                  {j.customerName}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {j.serviceType} {j.address && `• 📍 ${j.address}`}{" "}
                  {j.checks.depositReceived ? (
                    <span style={{ color: "var(--success)", marginLeft: 8 }}>
                      💰 ✓
                    </span>
                  ) : (
                    <span style={{ color: "var(--danger)", marginLeft: 8 }}>
                      ⚠ No deposit
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
