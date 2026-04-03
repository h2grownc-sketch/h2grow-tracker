"use client";

import { useState, useMemo, useRef } from "react";
import ProgressBar from "./ProgressBar";
import CheckItem from "./CheckItem";
import {
  SERVICE_TYPES,
  LEAD_SOURCES,
  DEAD_REASONS,
  ESTIMATE_STATUSES,
  getStage,
  getProgress,
  getChecklist,
  isHydro,
  jobLocation,
} from "../lib/jobUtils";

export default function JobDetail({ job, onSave, onDelete, onClose, saving, allJobs }) {
  const [form, setForm] = useState(JSON.parse(JSON.stringify(job)));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCheck = (k, v) =>
    setForm((f) => ({ ...f, checks: { ...f.checks, [k]: v } }));
  const soilReq = isHydro(form.serviceType) ? form.soilSamplesRequired !== false : undefined;
  const stage = form.isDead
    ? { label: "Dead", color: "#999" }
    : getStage(form.checks, form.serviceType, soilReq === false ? false : undefined);
  const pct = getProgress(form.checks, form.serviceType, soilReq === false ? false : undefined);
  const checklist = getChecklist(form.serviceType, soilReq === false ? false : undefined).filter((c) => {
    if (c.key === "sitePrepQuoteSent" && !form.requiresSitePrep) return false;
    return true;
  });

  // Group checklist items
  const groups = [];
  let lastGroup = "";
  checklist.forEach((item) => {
    if (item.group !== lastGroup) {
      groups.push({ type: "header", label: item.group });
      lastGroup = item.group;
    }
    groups.push({ type: "item", item });
  });

  // Customer auto-fill
  const [showCL, setShowCL] = useState(false);
  const existingCustomers = useMemo(() => {
    if (!allJobs) return [];
    const names = {};
    allJobs.forEach((j) => {
      if (j.customerName && j.id !== job.id) names[j.customerName] = j;
    });
    return Object.values(names);
  }, [allJobs, job.id]);
  const filtered = existingCustomers.filter(
    (c) =>
      form.customerName &&
      c.customerName.toLowerCase().includes(form.customerName.toLowerCase()) &&
      c.customerName !== form.customerName
  );
  const autoFill = (c) =>
    setForm((f) => ({
      ...f,
      customerName: c.customerName,
      phone: c.phone || f.phone,
      email: c.email || f.email,
      address: c.address || f.address,
      city: c.city || f.city,
      state: c.state || f.state || "NC",
      source: "Repeat",
    }));

  // Photos
  const fileRef = useRef(null);
  const photos = form.photos ? form.photos.split("|||").filter(Boolean) : [];
  const addPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      set("photos", [...photos, ev.target.result].join("|||"));
    };
    reader.readAsDataURL(file);
  };
  const removePhoto = (idx) => {
    const p = [...photos];
    p.splice(idx, 1);
    set("photos", p.join("|||"));
  };

  const lbl = {
    fontSize: 11,
    fontWeight: 600,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: "1.2px",
    marginBottom: -4,
    display: "block",
    fontFamily: "var(--body-font)",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--white)",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "20px 20px 36px",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: "var(--border)",
            borderRadius: 2,
            margin: "0 auto 14px",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
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
            {job.id === "NEW" ? "New Job" : form.customerName || "Job"}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: stage.color,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: stage.color }}>
              {pct}%
            </span>
          </div>
        </div>
        <ProgressBar pct={pct} color={stage.color} height={6} />

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Customer + Phone */}
          <div style={{ position: "relative" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={lbl}>Customer *</label>
                <input
                  value={form.customerName}
                  onChange={(e) => { set("customerName", e.target.value); setShowCL(true); }}
                  onFocus={() => setShowCL(true)}
                  placeholder="Start typing..."
                />
                {showCL && filtered.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "var(--white)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      zIndex: 10,
                      maxHeight: 150,
                      overflowY: "auto",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  >
                    {filtered.slice(0, 5).map((c) => (
                      <div
                        key={c.id}
                        onClick={() => { autoFill(c); setShowCL(false); }}
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          borderBottom: "1px solid var(--border-light)",
                          fontSize: 14,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{c.customerName}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {jobLocation(c)}
                          {c.phone && " · " + c.phone}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(919) 555-0000"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label style={lbl}>Street Address</label>
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="123 Main St"
            />
          </div>

          {/* City + State + Source */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>City</label>
              <input
                value={form.city || ""}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Goldsboro"
              />
            </div>
            <div>
              <label style={lbl}>State</label>
              <input
                value={form.state || "NC"}
                onChange={(e) => set("state", e.target.value)}
                placeholder="NC"
                maxLength={2}
              />
            </div>
            <div>
              <label style={lbl}>Source</label>
              <select value={form.source} onChange={(e) => set("source", e.target.value)}>
                <option value="">—</option>
                {LEAD_SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Service + Sqft */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Service Type</label>
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
              <label style={lbl}>Sq Ft</label>
              <input
                value={form.sqft}
                onChange={(e) => set("sqft", e.target.value)}
                placeholder="10,000"
                type="number"
              />
            </div>
          </div>

          {/* Hydro-specific: Site Prep + Quotes + Soil */}
          {isHydro(form.serviceType) && (
            <>
              {/* Toggle checkboxes */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 15, padding: "6px 0" }}>
                  <input type="checkbox" checked={form.soilSamplesRequired !== false} onChange={(e) => set("soilSamplesRequired", e.target.checked)} style={{ accentColor: "#C48A08", width: 18, height: 18 }} />
                  <span style={{ fontWeight: 600, color: form.soilSamplesRequired !== false ? "#C48A08" : "var(--text-secondary)" }}>Soil samples required</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 15, padding: "6px 0" }}>
                  <input type="checkbox" checked={form.requiresSitePrep} onChange={(e) => set("requiresSitePrep", e.target.checked)} style={{ accentColor: "#8B6FC0", width: 18, height: 18 }} />
                  <span style={{ fontWeight: 600, color: form.requiresSitePrep ? "#8B6FC0" : "var(--text-secondary)" }}>Requires site prep</span>
                </label>
              </div>

              {/* Quotes */}
              <div style={{ display: "grid", gridTemplateColumns: form.requiresSitePrep ? "1fr 1fr" : "1fr", gap: 10 }}>
                <div>
                  <label style={lbl}>Hydroseed Quote $</label>
                  <input value={form.quoteAmount} onChange={(e) => set("quoteAmount", e.target.value)} placeholder="$0" />
                </div>
                {form.requiresSitePrep && (
                  <div>
                    <label style={lbl}>Site Prep Quote $</label>
                    <input value={form.sitePrepAmount || ""} onChange={(e) => set("sitePrepAmount", e.target.value)} placeholder="$0" />
                  </div>
                )}
              </div>

              {/* Soil test fields — only if soil required */}
              {form.soilSamplesRequired !== false && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={lbl}>Soil Test #</label>
                    <input value={form.soilTestNumber} onChange={(e) => set("soilTestNumber", e.target.value)} placeholder="PS3 #" />
                  </div>
                  <div>
                    <label style={lbl}>Mailed</label>
                    <input value={form.sampleMailedDate} onChange={(e) => set("sampleMailedDate", e.target.value)} type="date" />
                  </div>
                  <div>
                    <label style={lbl}>Quote Sent</label>
                    <input value={form.quoteSentDate} onChange={(e) => set("quoteSentDate", e.target.value)} type="date" />
                  </div>
                </div>
              )}
              {/* Quote sent date when no soil */}
              {form.soilSamplesRequired === false && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  <div>
                    <label style={lbl}>Quote Sent</label>
                    <input value={form.quoteSentDate} onChange={(e) => set("quoteSentDate", e.target.value)} type="date" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Non-hydro: Quote + Quote Sent */}
          {!isHydro(form.serviceType) && form.serviceType && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={lbl}>Quote $</label>
                <input
                  value={form.quoteAmount}
                  onChange={(e) => set("quoteAmount", e.target.value)}
                  placeholder="$0"
                />
              </div>
              <div>
                <label style={lbl}>Quote Sent</label>
                <input
                  value={form.quoteSentDate}
                  onChange={(e) => set("quoteSentDate", e.target.value)}
                  type="date"
                />
              </div>
            </div>
          )}

          {/* County + Assigned To + Estimate Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>County</label>
              <input
                value={form.county || ""}
                onChange={(e) => set("county", e.target.value)}
                placeholder="Wayne"
              />
            </div>
            <div>
              <label style={lbl}>Assigned To</label>
              <input
                value={form.assignedTo || ""}
                onChange={(e) => set("assignedTo", e.target.value)}
                placeholder="PM name"
              />
            </div>
            <div>
              <label style={lbl}>Estimate Status</label>
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

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Scheduled</label>
              <input
                value={form.scheduledDate}
                onChange={(e) => set("scheduledDate", e.target.value)}
                type="date"
              />
            </div>
            <div>
              <label style={lbl}>{isHydro(form.serviceType) ? "Spray Date" : "Completed"}</label>
              <input
                value={form.sprayDate}
                onChange={(e) => set("sprayDate", e.target.value)}
                type="date"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={lbl}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Notes..."
              style={{ minHeight: 50, resize: "vertical" }}
            />
          </div>
        </div>

        {/* Photos */}
        <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1.5px", fontFamily: "var(--heading-font)" }}>
              Photos ({photos.length})
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "5px 12px",
                fontSize: 12,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              + Add Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={addPhoto} style={{ display: "none" }} />
          </div>
          {photos.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                  <img src={p} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                  <button
                    onClick={() => removePhoto(i)}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      background: "var(--danger)",
                      color: "#fff",
                      border: "none",
                      fontSize: 12,
                      lineHeight: "20px",
                      textAlign: "center",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checklist */}
        {form.serviceType && (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
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
              {isHydro(form.serviceType) ? "Hydroseeding Checklist" : "Job Checklist"}
            </div>
            {groups.map((g, i) => {
              if (g.type === "header")
                return (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "1.5px",
                      fontFamily: "var(--heading-font)",
                      marginTop: i > 0 ? 14 : 0,
                      marginBottom: 4,
                    }}
                  >
                    {g.label}
                  </div>
                );
              return (
                <CheckItem
                  key={g.item.key}
                  item={g.item}
                  checked={form.checks[g.item.key]}
                  onChange={(e) => setCheck(g.item.key, e.target.checked)}
                />
              );
            })}
          </div>
        )}

        {/* Dead Lead */}
        <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            <input
              type="checkbox"
              checked={form.isDead}
              onChange={(e) => set("isDead", e.target.checked)}
              style={{ accentColor: "var(--danger)", width: 18, height: 18 }}
            />
            <span
              style={{
                fontWeight: 600,
                color: form.isDead ? "var(--danger)" : "var(--text-secondary)",
              }}
            >
              Mark as dead / lost
            </span>
          </label>
          {form.isDead && (
            <div style={{ marginTop: 8 }}>
              <label style={lbl}>Reason</label>
              <select
                value={form.deadReason}
                onChange={(e) => set("deadReason", e.target.value)}
              >
                <option value="">Select...</option>
                {DEAD_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Save / Delete */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 8,
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
                if (confirm("Delete permanently?")) onDelete(job.id);
              }}
              disabled={saving}
              style={{
                padding: "13px 18px",
                borderRadius: 8,
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
    </div>
  );
}
