"use client";

import { useState } from "react";
import ProgressBar from "./ProgressBar";
import CheckItem from "./CheckItem";
import {
  CHECKLIST,
  SERVICE_TYPES,
  LEAD_SOURCES,
  ESTIMATE_STATUSES,
  getStage,
  getProgress,
} from "../lib/jobUtils";

export default function JobDetail({ job, onSave, onDelete, onClose, saving }) {
  const [form, setForm] = useState(JSON.parse(JSON.stringify(job)));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCheck = (k, v) =>
    setForm((f) => ({ ...f, checks: { ...f.checks, [k]: v } }));
  const stage = getStage(form.checks);
  const pct = getProgress(form.checks);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--black)",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "20px 20px 36px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          border: "1px solid var(--border)",
          borderBottom: "none",
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: "var(--border)",
            borderRadius: 2,
            margin: "0 auto 12px",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <h2
            style={{
              fontSize: 20,
              fontWeight: 600,
              fontFamily: "var(--heading-font)",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {job.id === "NEW" ? "New Job" : form.customerName || "Job Details"}
          </h2>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 3,
              background: stage.color + "22",
              color: stage.color,
              textTransform: "uppercase",
            }}
          >
            {stage.icon} {pct}%
          </span>
        </div>
        <ProgressBar pct={pct} color={stage.color} />

        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="lbl">Customer *</label>
              <input
                value={form.customerName}
                onChange={(e) => set("customerName", e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="lbl">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(919) 555-0000"
              />
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}
          >
            <div>
              <label className="lbl">Address</label>
              <input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label className="lbl">Source</label>
              <select
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
              >
                <option value="">—</option>
                {LEAD_SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <label className="lbl">County</label>
              <input
                value={form.county || ""}
                onChange={(e) => set("county", e.target.value)}
                placeholder="Wake"
              />
            </div>
            <div>
              <label className="lbl">Assigned To</label>
              <input
                value={form.assignedTo || ""}
                onChange={(e) => set("assignedTo", e.target.value)}
                placeholder="PM name"
              />
            </div>
            <div>
              <label className="lbl">Estimate Status</label>
              <select
                value={form.estimateStatus || ""}
                onChange={(e) => set("estimateStatus", e.target.value)}
              >
                <option value="">—</option>
                {ESTIMATE_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <label className="lbl">Service</label>
              <select
                value={form.serviceType}
                onChange={(e) => set("serviceType", e.target.value)}
              >
                <option value="">—</option>
                {SERVICE_TYPES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="lbl">Sq Ft</label>
              <input
                value={form.sqft}
                onChange={(e) => set("sqft", e.target.value)}
                placeholder="10,000"
                type="number"
              />
            </div>
            <div>
              <label className="lbl">Quote $</label>
              <input
                value={form.quoteAmount}
                onChange={(e) => set("quoteAmount", e.target.value)}
                placeholder="$0"
              />
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <label className="lbl">Soil Test #</label>
              <input
                value={form.soilTestNumber}
                onChange={(e) => set("soilTestNumber", e.target.value)}
                placeholder="PS3 #"
              />
            </div>
            <div>
              <label className="lbl">Mailed</label>
              <input
                value={form.sampleMailedDate}
                onChange={(e) => set("sampleMailedDate", e.target.value)}
                type="date"
              />
            </div>
            <div>
              <label className="lbl">Quote Sent</label>
              <input
                value={form.quoteSentDate}
                onChange={(e) => set("quoteSentDate", e.target.value)}
                type="date"
              />
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div>
              <label className="lbl">Scheduled</label>
              <input
                value={form.scheduledDate}
                onChange={(e) => set("scheduledDate", e.target.value)}
                type="date"
              />
            </div>
            <div>
              <label className="lbl">Spray Date</label>
              <input
                value={form.sprayDate}
                onChange={(e) => set("sprayDate", e.target.value)}
                type="date"
              />
            </div>
          </div>
          <div>
            <label className="lbl">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Notes..."
              style={{ minHeight: 50, resize: "vertical" }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            borderTop: "1px solid var(--border)",
            paddingTop: 12,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--h2-blue)",
              fontFamily: "var(--heading-font)",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              marginBottom: 8,
            }}
          >
            Job Checklist
          </div>
          {CHECKLIST.map((item) => (
            <CheckItem
              key={item.key}
              item={item}
              checked={form.checks[item.key]}
              onChange={(e) => setCheck(item.key, e.target.checked)}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 6,
              border: "none",
              background: "linear-gradient(135deg,#4CAF50,#5CBF2A)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {job.id !== "NEW" && (
            <button
              onClick={() => {
                if (confirm("Delete this job?")) onDelete(job.id);
              }}
              disabled={saving}
              style={{
                padding: "13px 18px",
                borderRadius: 6,
                border: "2px solid var(--danger)",
                background: "transparent",
                color: "var(--danger)",
                fontWeight: 600,
                fontSize: 15,
                textTransform: "uppercase",
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
      <style jsx>{`
        .lbl {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1.2px;
          margin-bottom: -4px;
          display: block;
          font-family: var(--body-font);
        }
      `}</style>
    </div>
  );
}
