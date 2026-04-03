"use client";

import { useState } from "react";
import { STAGE_LABELS, SERVICE_TYPES } from "../lib/jobUtils";

const SMART_FILTERS = [
  { key: "overdue", label: "Overdue Only" },
  { key: "readyToSchedule", label: "Ready to Schedule" },
  { key: "waitingSoil", label: "Waiting on Soil" },
  { key: "waitingApproval", label: "Waiting on Approval" },
];

export default function FilterBar({
  search,
  setSearch,
  stageFilter,
  setStageFilter,
  serviceFilter,
  setServiceFilter,
  smartFilters,
  setSmartFilters,
  assignedFilter,
  setAssignedFilter,
  countyFilter,
  setCountyFilter,
  activeFilterCount,
}) {
  const [open, setOpen] = useState(false);

  const toggleSmart = (key) => {
    setSmartFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const clearAll = () => {
    setStageFilter("All");
    setServiceFilter("All");
    setSmartFilters({ overdue: false, readyToSchedule: false, waitingSoil: false, waitingApproval: false });
    setAssignedFilter("");
    setCountyFilter("");
  };

  return (
    <div style={{ marginBottom: 10 }}>
      {/* Search + Filter button */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs..."
          style={{
            flex: 1,
            background: "var(--light-bg)",
            border: "1px solid var(--border)",
            fontSize: 14,
            borderRadius: 8,
            letterSpacing: "0.3px",
          }}
        />
        <button
          onClick={() => setOpen(!open)}
          style={{
            flexShrink: 0,
            padding: "10px 14px",
            borderRadius: 8,
            border: activeFilterCount > 0 ? "1.5px solid var(--accent)" : "1px solid var(--border)",
            background: activeFilterCount > 0 ? "#4CAF5010" : "var(--white)",
            color: activeFilterCount > 0 ? "var(--accent)" : "var(--text-secondary)",
            fontFamily: "var(--heading-font)",
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            whiteSpace: "nowrap",
          }}
        >
          Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {/* Filter panel */}
      {open && (
        <div
          style={{
            marginTop: 8,
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: 10,
            padding: 14,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          {/* Smart Filters */}
          <div style={{ marginBottom: 12 }}>
            <div className="fb-section-label">Quick Filters</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SMART_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => toggleSmart(f.key)}
                  className={`fb-chip ${smartFilters[f.key] ? "fb-chip-active" : ""}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stage */}
          <div style={{ marginBottom: 12 }}>
            <div className="fb-section-label">Stage</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                onClick={() => setStageFilter("All")}
                className={`fb-chip ${stageFilter === "All" ? "fb-chip-active" : ""}`}
              >
                All
              </button>
              {STAGE_LABELS.filter((s) => s !== "Done").map((s) => (
                <button
                  key={s}
                  onClick={() => setStageFilter(stageFilter === s ? "All" : s)}
                  className={`fb-chip ${stageFilter === s ? "fb-chip-active" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Service Type */}
          <div style={{ marginBottom: 12 }}>
            <div className="fb-section-label">Service</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                onClick={() => setServiceFilter("All")}
                className={`fb-chip ${serviceFilter === "All" ? "fb-chip-active" : ""}`}
              >
                All
              </button>
              {SERVICE_TYPES.map((s) => (
                <button
                  key={s}
                  onClick={() => setServiceFilter(serviceFilter === s ? "All" : s)}
                  className={`fb-chip ${serviceFilter === s ? "fb-chip-active" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned + County */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <div className="fb-section-label">Assigned To</div>
              <input
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                placeholder="Any"
                style={{ fontSize: 13, padding: "7px 10px" }}
              />
            </div>
            <div>
              <div className="fb-section-label">County</div>
              <input
                value={countyFilter}
                onChange={(e) => setCountyFilter(e.target.value)}
                placeholder="Any"
                style={{ fontSize: 13, padding: "7px 10px" }}
              />
            </div>
          </div>

          {/* Clear */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              style={{
                width: "100%",
                padding: "8px 0",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontFamily: "var(--heading-font)",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
