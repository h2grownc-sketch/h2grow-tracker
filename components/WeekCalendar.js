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
    (j) => j.scheduledDate && j.checks?.scheduled && !j.isDead
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
          marginBottom: 14,
        }}
      >
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          style={{
            background: "var(--white)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            borderRadius: 6,
            padding: "7px 14px",
            fontSize: 14,
          }}
        >
          Prev
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
            background: "var(--white)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            borderRadius: 6,
            padding: "7px 14px",
            fontSize: 14,
          }}
        >
          Next
        </button>
      </div>
      {weekOffset !== 0 && (
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <button
            onClick={() => setWeekOffset(0)}
            style={{
              background: "none",
              border: "none",
              color: "var(--info)",
              fontSize: 13,
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
              background: isToday ? "#4CAF5008" : "var(--white)",
              borderRadius: 8,
              padding: "10px 12px",
              border: isToday ? "1.5px solid #4CAF5040" : "1px solid var(--card-border)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--heading-font)",
                fontSize: 13,
                fontWeight: 600,
                color: isToday ? "var(--accent)" : "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                marginBottom: dayJobs.length ? 8 : 0,
              }}
            >
              {dayNames[i]} {day.getDate()}{" "}
              {isToday && <span style={{ color: "var(--accent)" }}>— Today</span>}
            </div>
            {dayJobs.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
                No jobs
              </div>
            )}
            {dayJobs.map((j) => (
              <div
                key={j.id}
                onClick={() => onSelect(j)}
                style={{
                  background: "var(--light-bg)",
                  borderRadius: 6,
                  padding: "10px 12px",
                  marginBottom: 4,
                  cursor: "pointer",
                  borderLeft: "3px solid var(--accent)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--heading-font)",
                    fontWeight: 600,
                    fontSize: 15,
                    textTransform: "uppercase",
                  }}
                >
                  {j.customerName}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span>{j.serviceType}</span>
                  {j.city && <span>{j.city}</span>}
                  {j.checks?.depositReceived ? (
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>Deposit received</span>
                  ) : (
                    <span style={{ color: "var(--danger)", fontWeight: 600 }}>No deposit</span>
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
