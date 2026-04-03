"use client";

import ProgressBar from "./ProgressBar";
import {
  getStage,
  getProgress,
  getNextAction,
  getAlertMsg,
  daysInStage,
  jobLocation,
  isHydro,
} from "../lib/jobUtils";

function StatusDot({ color, size = 8 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

export default function JobCard({ job, onSelect, onQuickAdvance }) {
  const stage = job.isDead
    ? { label: "Dead", color: "#999" }
    : getStage(job.checks, job.serviceType);
  const pct = getProgress(job.checks, job.serviceType);
  const next = job.isDead ? null : getNextAction(job.checks, job.serviceType);
  const alert = getAlertMsg(job);
  const stageDays = daysInStage(job);
  const loc = jobLocation(job);
  const isDone =
    job.checks?.followUp90 || job.checks?.followUp3
      ? !!(
          (job.serviceType === "Hydroseeding" && job.checks?.followUp90) ||
          (job.serviceType !== "Hydroseeding" && job.checks?.followUp3)
        )
      : false;

  return (
    <div
      onClick={() => onSelect(job)}
      style={{
        background: "var(--card-bg)",
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 8,
        cursor: "pointer",
        border: "1px solid var(--card-border)",
        borderLeftWidth: 4,
        borderLeftColor: stage.color,
        opacity: job.isDead ? 0.55 : 1,
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        if (!job.isDead) e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Row 1: Name + Stage */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontFamily: "var(--heading-font)",
            fontWeight: 600,
            fontSize: 17,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            textDecoration: job.isDead ? "line-through" : "none",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {job.customerName || "No Name"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
          <StatusDot color={stage.color} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: stage.color,
              textTransform: "uppercase",
            }}
          >
            {stage.label}
          </span>
        </div>
      </div>

      {!job.isDead && <ProgressBar pct={pct} color={stage.color} />}

      {/* Row 2: Meta */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 8,
          fontSize: 13,
          color: "var(--text-secondary)",
          flexWrap: "wrap",
        }}
      >
        {job.serviceType && <span>{job.serviceType}</span>}
        {loc && <span style={{ color: "var(--text-muted)" }}>{loc}</span>}
        {job.scheduledDate && (
          <span style={{ color: stage.color, fontWeight: 600 }}>
            {new Date(job.scheduledDate + "T00:00:00").toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric" }
            )}
          </span>
        )}
        {job.quoteAmount && (
          <span style={{ fontWeight: 600 }}>
            ${parseFloat(job.quoteAmount).toLocaleString()}
          </span>
        )}
        {job.requiresSitePrep && isHydro(job.serviceType) && (
          <span
            style={{
              fontSize: 11,
              background: "#8B6FC020",
              color: "#8B6FC0",
              padding: "1px 6px",
              borderRadius: 3,
              fontWeight: 600,
            }}
          >
            + Site Prep
          </span>
        )}
        {!job.isDead && stageDays !== null && !isDone && (
          <span
            style={{
              fontSize: 11,
              color: stageDays > 7 ? "var(--warning)" : "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            {stageDays}d in stage
          </span>
        )}
      </div>

      {/* Phone actions */}
      {job.phone && !job.isDead && (
        <div
          style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={"tel:" + job.phone}
            style={{
              fontSize: 12,
              color: "var(--info)",
              fontWeight: 600,
              textDecoration: "none",
              padding: "4px 10px",
              border: "1px solid var(--info)",
              borderRadius: 6,
            }}
          >
            Call
          </a>
          <a
            href={"sms:" + job.phone}
            style={{
              fontSize: 12,
              color: "var(--accent)",
              fontWeight: 600,
              textDecoration: "none",
              padding: "4px 10px",
              border: "1px solid var(--accent)",
              borderRadius: 6,
            }}
          >
            Text
          </a>
          <button
            onClick={() => navigator.clipboard?.writeText(job.phone)}
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              fontWeight: 600,
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "4px 10px",
            }}
          >
            Copy #
          </button>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{job.phone}</span>
        </div>
      )}

      {/* Dead reason */}
      {job.isDead && job.deadReason && (
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
          {job.deadReason}
        </div>
      )}

      {/* Next action + Quick advance */}
      {next && !job.isDead && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ color: "var(--warning)", fontWeight: 700, fontSize: 11 }}>NEXT</span>
            {next.label}
          </div>
          {onQuickAdvance && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdvance(job, next.key);
              }}
              style={{
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--heading-font)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                minHeight: 28,
              }}
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Alert */}
      {alert && (
        <div
          style={{
            marginTop: 6,
            padding: "4px 10px",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            background: "#D6454510",
            color: "var(--danger)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <StatusDot color="var(--danger)" size={6} />
          {alert}
        </div>
      )}
    </div>
  );
}
