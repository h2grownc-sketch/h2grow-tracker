"use client";

import { STAGE_LABELS, SERVICE_TYPES } from "../lib/jobUtils";

const FILTER_STAGES = ["All", ...STAGE_LABELS.filter((s) => s !== "Done")];
const FILTER_SERVICES = ["All", ...SERVICE_TYPES];

export default function FilterBar({
  stageFilter,
  setStageFilter,
  serviceFilter,
  setServiceFilter,
  stageCounts,
  serviceCounts,
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      {/* Stage filters */}
      <div className="filter-row">
        {FILTER_STAGES.map((s) => {
          const active = stageFilter === s;
          const count = s === "All" ? null : stageCounts[s] || 0;
          return (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`filter-chip ${active ? "filter-chip-active" : ""}`}
            >
              {s}
              {count !== null && count > 0 && (
                <span className="filter-count">{count}</span>
              )}
            </button>
          );
        })}
      </div>
      {/* Service type filters */}
      <div className="filter-row" style={{ marginTop: 6 }}>
        {FILTER_SERVICES.map((s) => {
          const active = serviceFilter === s;
          const count = s === "All" ? null : serviceCounts[s] || 0;
          return (
            <button
              key={s}
              onClick={() => setServiceFilter(s)}
              className={`filter-chip filter-chip-service ${active ? "filter-chip-service-active" : ""}`}
            >
              {s}
              {count !== null && count > 0 && (
                <span className="filter-count">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
