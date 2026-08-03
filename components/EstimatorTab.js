"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import MaterialsCalc from "./MaterialsCalc";
import { generateId, parseMoney } from "../lib/jobUtils";
import { formatCurrency } from "../lib/payUtils";
import {
  fetchMaterials, seedMaterialsIfEmpty, saveMaterial, deleteMaterial,
  fetchSettings, saveSettings, fetchEstimates, saveEstimate, deleteEstimate,
  calcEstimate, DEFAULT_SETTINGS,
} from "../lib/estimatesApi";

const lbl = { fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: -4, display: "block", fontFamily: "var(--body-font)" };
const card = { background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 10, padding: 14, marginBottom: 12 };
const chipBtn = (active) => ({ padding: "7px 12px", borderRadius: 6, border: "1px solid " + (active ? "var(--accent)" : "var(--border)"), background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", minHeight: 36 });
const num = (v) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));

const STATUS_COLORS = { draft: "var(--text-muted)", sent: "var(--warning)", approved: "var(--success)", declined: "var(--danger)" };

function snapFromCatalog(materials, settings, mulchId, seedId) {
  const act = materials.filter((m) => m.active !== false);
  return {
    mulch: act.find((m) => m.id === mulchId) || null,
    seed: act.find((m) => m.id === seedId) || null,
    companions: act.filter((m) => m.category !== "Mulch" && m.category !== "Seed" && (m.bags_per_tank || m.lbs_per_tank || m.jugs_per_acre)),
    settings: { ...settings },
  };
}

function newEstimateFor(job, materials, settings) {
  const mulchId = "wood_fiber", seedId = "seed_tall_fescue";
  return {
    id: generateId(),
    job_id: job?.id || null,
    title: job?.customerName ? job.customerName + " — Hydroseed" : "New Estimate",
    status: "draft",
    data: {
      areas: [{ label: "Main area", len: "", wid: "", sqft: job?.sqft ? String(parseMoney(job.sqft)) : "", exclude: false }],
      wastePct: settings.wastePct ?? 10,
      mulchId, seedId,
      extras: { laborHours: 0, equipmentHours: 0, mobilization: settings.mobilization || 0, custom: [] },
      price: "",
      customerScope: "",
      snap: snapFromCatalog(materials, settings, mulchId, seedId),
    },
  };
}

const areaSqft = (a) => (num(a.len) > 0 && num(a.wid) > 0 ? num(a.len) * num(a.wid) : num(a.sqft));

export default function EstimatorTab({ jobs, onApplyToJob }) {
  const [mode, setMode] = useState("list");
  const [materials, setMaterials] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [estimates, setEstimates] = useState(null);
  const [dbMissing, setDbMissing] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [est, setEst] = useState(null); // estimate being edited
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const flash = (m) => { setNotice(m); setTimeout(() => setNotice(""), 2500); };

  const loadAll = useCallback(async () => {
    try {
      const [mats, sets, ests] = await Promise.all([seedMaterialsIfEmpty(), fetchSettings(), fetchEstimates()]);
      setMaterials(mats);
      setSettings(sets);
      setEstimates(ests);
      setDbMissing(false);
      setLoadErr("");
    } catch (e) {
      const msg = e?.message || String(e);
      if (/does not exist|42P01|relation/i.test(msg)) setDbMissing(true);
      else setLoadErr(msg);
      setEstimates([]);
    }
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  const activeJobs = useMemo(() => (jobs || []).filter((j) => !j.isDead).sort((a, b) => (a.customerName || "").localeCompare(b.customerName || "")), [jobs]);
  const jobName = (id) => (jobs || []).find((j) => j.id === id)?.customerName || "";

  // ── Derived calculation for the open estimate ──
  const calc = useMemo(() => {
    if (!est) return null;
    const d = est.data;
    return calcEstimate({
      areas: d.areas.map((a) => ({ sqft: areaSqft(a), exclude: a.exclude })),
      wastePct: num(d.wastePct),
      mulch: d.snap.mulch, seed: d.snap.seed, materials: d.snap.companions,
      extras: { ...d.extras, laborHours: num(d.extras.laborHours), equipmentHours: num(d.extras.equipmentHours), mobilization: num(d.extras.mobilization) },
      settings: d.snap.settings,
      price: parseMoney(d.price),
    });
  }, [est]);

  const setD = (patch) => setEst((p) => ({ ...p, data: { ...p.data, ...patch } }));
  const setSnapSettings = (patch) => setEst((p) => ({ ...p, data: { ...p.data, snap: { ...p.data.snap, settings: { ...p.data.snap.settings, ...patch } } } }));

  const pickMaterial = (kind, id) => {
    const m = materials.find((x) => x.id === id) || null;
    setEst((p) => ({ ...p, data: { ...p.data, [kind + "Id"]: id, snap: { ...p.data.snap, [kind]: m } } }));
  };

  const saveCurrent = async (extra = {}) => {
    if (!est) return false;
    setBusy(true);
    const row = {
      id: est.id, job_id: est.job_id, title: est.title, status: est.status,
      data: est.data,
      total_cost: calc?.totalCost || 0, price: parseMoney(est.data.price),
      updated_at: new Date().toISOString(), ...extra,
    };
    const ok = await saveEstimate(row);
    setBusy(false);
    if (!ok) { alert("SAVE FAILED — could not reach the database. Your estimate is still on screen."); return false; }
    flash("Estimate saved");
    loadAll();
    return true;
  };

  const duplicate = async (source) => {
    const copy = { ...source, id: generateId(), title: source.title + " (rev)", status: "draft", data: JSON.parse(JSON.stringify(source.data)) };
    setEst(copy);
    setMode("edit");
    flash("Duplicated — editing the new revision");
  };

  const copyCustomerSummary = async () => {
    if (!est || !calc) return;
    const txt = [
      `H2 GROW LLC — ESTIMATE`,
      est.title,
      est.job_id && jobName(est.job_id) ? `Customer: ${jobName(est.job_id)}` : null,
      ``,
      `Area: ${Math.round(calc.netSqft).toLocaleString()} sq ft (${calc.acres.toFixed(2)} acres)`,
      est.data.customerScope ? `\nScope of work:\n${est.data.customerScope}` : null,
      ``,
      `Price: ${formatCurrency(calc.finalPrice)}`,
      `Deposit due to schedule (${est.data.snap.settings.depositPct ?? 50}%): ${formatCurrency(calc.deposit)}`,
      ``,
      `60-day warranty. Questions: 984-343-2424 | H2GrowNC@gmail.com`,
    ].filter((l) => l !== null).join("\n");
    try { await navigator.clipboard.writeText(txt); flash("Customer summary copied — no internal costs included"); }
    catch { alert(txt); }
  };

  // ══════════ RENDER ══════════
  if (dbMissing) {
    return (
      <div>
        <div style={{ fontFamily: "var(--heading-font)", fontSize: 20, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>Estimator</div>
        <div style={{ ...card, borderColor: "var(--warning)" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>One-time setup needed</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            The estimator tables don&apos;t exist in the database yet. Run the SQL block in
            <b> docs/ESTIMATOR_SETUP.md</b> (Supabase → SQL Editor), then come back and pull to refresh.
          </div>
          <button onClick={loadAll} style={{ marginTop: 10, ...chipBtn(true) }}>Check again</button>
        </div>
        <MaterialsCalc />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: "var(--heading-font)", fontSize: 20, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Estimator</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={chipBtn(mode === "list" || mode === "edit")} onClick={() => setMode("list")}>Estimates</button>
          <button style={chipBtn(mode === "materials")} onClick={() => setMode("materials")}>Materials</button>
          <button style={chipBtn(mode === "settings")} onClick={() => setMode("settings")}>Rates</button>
          <button style={chipBtn(mode === "quick")} onClick={() => setMode("quick")}>Quick Calc</button>
        </div>
      </div>

      {notice && <div style={{ background: "#4CAF5015", color: "var(--success)", borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 600, marginBottom: 10 }} role="status">{notice}</div>}
      {loadErr && <div style={{ background: "#D6454510", color: "var(--danger)", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginBottom: 10 }} role="alert">{loadErr}</div>}

      {mode === "quick" && <MaterialsCalc />}

      {/* ── Estimates list ── */}
      {mode === "list" && (
        <>
          <button
            onClick={() => { setEst(newEstimateFor(null, materials, settings)); setMode("edit"); }}
            style={{ width: "100%", padding: "13px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#4CAF50,#5CBF2A)", color: "#fff", fontWeight: 600, fontSize: 14, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12, minHeight: 46 }}
          >
            + New Estimate
          </button>
          {estimates === null && <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading…</div>}
          {Array.isArray(estimates) && estimates.length === 0 && (
            <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No estimates yet — tap + New Estimate to build your first quote.</div>
          )}
          {(estimates || []).map((e) => (
            <div key={e.id} onClick={() => { setEst({ ...e, data: JSON.parse(JSON.stringify(e.data)) }); setMode("edit"); }} style={{ ...card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {e.job_id && jobName(e.job_id) ? jobName(e.job_id) + " · " : ""}
                  {new Date(e.updated_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontFamily: "var(--heading-font)", fontSize: 15 }}>{formatCurrency(e.price || 0)}</div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: STATUS_COLORS[e.status] || "var(--text-muted)" }}>{e.status}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Estimate editor ── */}
      {mode === "edit" && est && calc && (
        <>
          <div style={card}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><label style={lbl}>Title</label><input value={est.title} onChange={(e) => setEst((p) => ({ ...p, title: e.target.value }))} /></div>
              <div><label style={lbl}>Status</label>
                <select value={est.status} onChange={(e) => setEst((p) => ({ ...p, status: e.target.value }))}>
                  <option value="draft">Draft</option><option value="sent">Sent</option><option value="approved">Approved</option><option value="declined">Declined</option>
                </select>
              </div>
            </div>
            <div><label style={lbl}>Link to Job (optional — prefills area, enables Apply)</label>
              <select value={est.job_id || ""} onChange={(e) => {
                const j = activeJobs.find((x) => x.id === e.target.value);
                setEst((p) => ({ ...p, job_id: e.target.value || null }));
                if (j && j.sqft && !est.data.areas.some((a) => areaSqft(a) > 0))
                  setD({ areas: [{ label: "Main area", len: "", wid: "", sqft: String(parseMoney(j.sqft)), exclude: false }] });
              }}>
                <option value="">— No job —</option>
                {activeJobs.map((j) => <option key={j.id} value={j.id}>{j.customerName}</option>)}
              </select>
            </div>
          </div>

          {/* Areas */}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--h2-blue)", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8, fontFamily: "var(--heading-font)" }}>Measured Areas</div>
            {est.data.areas.map((a, i) => (
              <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border-light)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.2fr", gap: 6 }}>
                  <div><label style={lbl}>Label</label><input value={a.label} onChange={(e) => { const areas = [...est.data.areas]; areas[i] = { ...a, label: e.target.value }; setD({ areas }); }} /></div>
                  <div><label style={lbl}>Length ft</label><input value={a.len} onChange={(e) => { const areas = [...est.data.areas]; areas[i] = { ...a, len: e.target.value }; setD({ areas }); }} inputMode="decimal" placeholder="—" /></div>
                  <div><label style={lbl}>Width ft</label><input value={a.wid} onChange={(e) => { const areas = [...est.data.areas]; areas[i] = { ...a, wid: e.target.value }; setD({ areas }); }} inputMode="decimal" placeholder="—" /></div>
                  <div><label style={lbl}>or Sq Ft</label><input value={a.sqft} onChange={(e) => { const areas = [...est.data.areas]; areas[i] = { ...a, sqft: e.target.value }; setD({ areas }); }} inputMode="numeric" placeholder="0" /></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: a.exclude ? "var(--danger)" : "var(--text-secondary)" }}>
                    <input type="checkbox" checked={!!a.exclude} onChange={(e) => { const areas = [...est.data.areas]; areas[i] = { ...a, exclude: e.target.checked }; setD({ areas }); }} style={{ width: 16, height: 16, accentColor: "var(--danger)" }} />
                    Exclusion (subtract this area)
                  </label>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{Math.round(areaSqft(a)).toLocaleString()} sq ft</span>
                  {est.data.areas.length > 1 && (
                    <button onClick={() => setD({ areas: est.data.areas.filter((_, x) => x !== i) })} aria-label="Remove area" style={{ background: "none", border: "1px solid var(--border)", borderRadius: 5, padding: "4px 10px", fontSize: 12, color: "var(--text-muted)" }}>✕</button>
                  )}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => setD({ areas: [...est.data.areas, { label: "Area " + (est.data.areas.length + 1), len: "", wid: "", sqft: "", exclude: false }] })} style={chipBtn(false)}>+ Add Area</button>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>Waste %</label>
                <input value={est.data.wastePct} onChange={(e) => setD({ wastePct: e.target.value })} inputMode="numeric" style={{ width: 64, textAlign: "center" }} />
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-secondary)" }}>
              Net <b>{Math.round(calc.netSqft).toLocaleString()} sq ft</b> ({calc.acres.toFixed(2)} ac) · with waste <b>{Math.round(calc.adjSqft).toLocaleString()}</b> · <b style={{ color: "var(--accent)" }}>{calc.tanks} tanks</b>{calc.days > 0 ? ` · ~${calc.days} day${calc.days > 1 ? "s" : ""}` : ""}
            </div>
          </div>

          {/* Recipe + extra costs */}
          <div style={card}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div><label style={lbl}>Mulch / Mix</label>
                <select value={est.data.mulchId || ""} onChange={(e) => pickMaterial("mulch", e.target.value)}>
                  {materials.filter((m) => m.category === "Mulch" && m.active !== false).map((m) => <option key={m.id} value={m.id}>{m.name.split("(")[0].trim()}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Seed</label>
                <select value={est.data.seedId || ""} onChange={(e) => pickMaterial("seed", e.target.value)}>
                  {materials.filter((m) => m.category === "Seed" && m.active !== false).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div><label style={lbl}>Labor hrs</label><input value={est.data.extras.laborHours || ""} onChange={(e) => setD({ extras: { ...est.data.extras, laborHours: e.target.value } })} inputMode="decimal" placeholder="0" /></div>
              <div><label style={lbl}>Equip hrs</label><input value={est.data.extras.equipmentHours || ""} onChange={(e) => setD({ extras: { ...est.data.extras, equipmentHours: e.target.value } })} inputMode="decimal" placeholder="0" /></div>
              <div><label style={lbl}>Mobilization $</label><input value={est.data.extras.mobilization || ""} onChange={(e) => setD({ extras: { ...est.data.extras, mobilization: e.target.value } })} inputMode="decimal" placeholder="0" /></div>
            </div>
            {(est.data.extras.custom || []).map((c, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginTop: 8 }}>
                <input value={c.label} onChange={(e) => { const custom = [...est.data.extras.custom]; custom[i] = { ...c, label: e.target.value }; setD({ extras: { ...est.data.extras, custom } }); }} placeholder="Cost item (site prep, topsoil…)" />
                <input value={c.cost} onChange={(e) => { const custom = [...est.data.extras.custom]; custom[i] = { ...c, cost: e.target.value }; setD({ extras: { ...est.data.extras, custom } }); }} inputMode="decimal" placeholder="$" />
                <button onClick={() => setD({ extras: { ...est.data.extras, custom: est.data.extras.custom.filter((_, x) => x !== i) } })} aria-label="Remove cost line" style={{ background: "none", border: "1px solid var(--border)", borderRadius: 5, padding: "0 12px", color: "var(--text-muted)" }}>✕</button>
              </div>
            ))}
            <button onClick={() => setD({ extras: { ...est.data.extras, custom: [...(est.data.extras.custom || []), { label: "", cost: "" }] } })} style={{ ...chipBtn(false), marginTop: 8 }}>+ Other Cost</button>
            {(est.data.snap.settings.laborRate || 0) === 0 && num(est.data.extras.laborHours) > 0 && (
              <div style={{ fontSize: 12, color: "var(--warning)", marginTop: 8 }}>Labor rate is $0 (assumption) — set real rates under the Rates tab.</div>
            )}
          </div>

          {/* Results */}
          <div style={{ ...card, borderColor: "var(--accent)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--h2-blue)", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8, fontFamily: "var(--heading-font)" }}>Internal Costs &amp; Price</div>
            {calc.lines.map((l, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", color: "var(--text-secondary)" }}>
                <span>{l.name} — {l.qty} {l.unit}</span><span>{formatCurrency(l.cost)}</span>
              </div>
            ))}
            {calc.laborCost > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", color: "var(--text-secondary)" }}><span>Labor ({est.data.extras.laborHours}h × {est.data.snap.settings.crewSize} crew)</span><span>{formatCurrency(calc.laborCost)}</span></div>}
            {calc.equipmentCost > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", color: "var(--text-secondary)" }}><span>Equipment</span><span>{formatCurrency(calc.equipmentCost)}</span></div>}
            {calc.mobilization > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", color: "var(--text-secondary)" }}><span>Mobilization</span><span>{formatCurrency(calc.mobilization)}</span></div>}
            {calc.otherCost > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", color: "var(--text-secondary)" }}><span>Other</span><span>{formatCurrency(calc.otherCost)}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid var(--border-light)", marginTop: 6, paddingTop: 6 }}>
              <span>Total cost</span><span>{formatCurrency(calc.totalCost)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <label style={{ ...lbl, marginBottom: 0 }}>Margin %</label>
              <input value={est.data.snap.settings.marginPct} onChange={(e) => setSnapSettings({ marginPct: num(e.target.value) })} inputMode="numeric" style={{ width: 64, textAlign: "center" }} />
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>→ recommended <b>{formatCurrency(calc.recommended)}</b></span>
              <button onClick={() => setD({ price: String(Math.round(calc.recommended)) })} style={chipBtn(false)}>Use</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <div><label style={lbl}>Your Price $</label><input value={est.data.price} onChange={(e) => setD({ price: e.target.value })} inputMode="decimal" placeholder="0" style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--heading-font)" }} /></div>
              <div style={{ fontSize: 13, paddingTop: 14, color: calc.gp >= 0 ? "var(--text-secondary)" : "var(--danger)" }}>
                GP {formatCurrency(calc.gp)} · <b>{calc.gmPct.toFixed(0)}% margin</b><br />
                {calc.perSqft > 0 && <>{"$" + calc.perSqft.toFixed(2)}/sq ft · deposit {formatCurrency(calc.deposit)}</>}
              </div>
            </div>
            {calc.finalPrice > 0 && calc.gmPct < (est.data.snap.settings.marginPct ?? 50) && calc.totalCost > 0 && (
              <div style={{ fontSize: 12, color: "var(--warning)", marginTop: 6 }}>Below your {est.data.snap.settings.marginPct}% target margin.</div>
            )}
          </div>

          {/* Customer-facing scope */}
          <div style={card}>
            <label style={lbl}>Customer-Facing Scope (goes in the summary — never includes costs)</label>
            <textarea value={est.data.customerScope} onChange={(e) => setD({ customerScope: e.target.value })} placeholder="Prep, hydroseed ~12,000 sq ft with tall fescue blend, starter fertilizer, 60-day warranty…" style={{ minHeight: 60, resize: "vertical" }} />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <button onClick={() => saveCurrent()} disabled={busy} style={{ flex: "1 1 120px", padding: "13px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#4CAF50,#5CBF2A)", color: "#fff", fontWeight: 600, fontSize: 14, letterSpacing: "1px", textTransform: "uppercase", opacity: busy ? 0.6 : 1, minHeight: 46 }}>Save</button>
            <button onClick={copyCustomerSummary} style={{ ...chipBtn(false), flex: "1 1 120px", minHeight: 46 }}>Copy Customer Summary</button>
            {est.job_id && parseMoney(est.data.price) > 0 && (
              <button onClick={async () => { if (await saveCurrent()) { onApplyToJob?.(est.job_id, parseMoney(est.data.price)); } }} style={{ ...chipBtn(false), flex: "1 1 120px", minHeight: 46, borderColor: "var(--h2-blue)", color: "var(--h2-blue)" }}>Apply Price to Job</button>
            )}
            <button onClick={() => duplicate(est)} style={{ ...chipBtn(false), minHeight: 46 }}>Duplicate</button>
            <button onClick={async () => { if (confirm("Delete this estimate?")) { await deleteEstimate(est.id); setMode("list"); loadAll(); } }} style={{ ...chipBtn(false), minHeight: 46, borderColor: "var(--danger)", color: "var(--danger)" }}>Delete</button>
          </div>
          <button onClick={() => { setMode("list"); loadAll(); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "1px", padding: "8px 0" }}>← Back to list (unsaved changes are lost)</button>
        </>
      )}

      {/* ── Materials catalog ── */}
      {mode === "materials" && (
        <>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>
            Shared catalog — costs sync to every device and feed new estimates. Existing estimates keep the prices they were built with.
          </div>
          {[...new Set(materials.map((m) => m.category))].map((cat) => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--h2-blue)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 6, fontFamily: "var(--heading-font)" }}>{cat}</div>
              {materials.filter((m) => m.category === cat).map((m) => (
                <div key={m.id} style={{ ...card, opacity: m.active === false ? 0.55 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <input value={m.name} onChange={(e) => setMaterials((prev) => prev.map((x) => x.id === m.id ? { ...x, name: e.target.value } : x))} style={{ fontWeight: 600, border: "none", background: "transparent", padding: 0 }} />
                    <button onClick={async () => { const upd = { ...m, active: m.active === false }; setMaterials((p) => p.map((x) => x.id === m.id ? upd : x)); await saveMaterial(upd); }} style={{ ...chipBtn(false), fontSize: 10 }}>{m.active === false ? "Inactive" : "Active"}</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div><label style={{ ...lbl, fontSize: 10 }}>Cost / {m.unit}</label><input value={m.cost_per_unit ?? ""} onChange={(e) => setMaterials((prev) => prev.map((x) => x.id === m.id ? { ...x, cost_per_unit: e.target.value } : x))} inputMode="decimal" placeholder="$0" /></div>
                    {m.category === "Mulch" && <div><label style={{ ...lbl, fontSize: 10 }}>SqFt/Tank</label><input value={m.sqft_per_tank ?? ""} onChange={(e) => setMaterials((prev) => prev.map((x) => x.id === m.id ? { ...x, sqft_per_tank: e.target.value } : x))} inputMode="numeric" /></div>}
                    {m.category === "Mulch" && <div><label style={{ ...lbl, fontSize: 10 }}>Bales/Tank</label><input value={m.bales_per_tank ?? ""} onChange={(e) => setMaterials((prev) => prev.map((x) => x.id === m.id ? { ...x, bales_per_tank: e.target.value } : x))} inputMode="numeric" /></div>}
                    {m.category === "Seed" && <div><label style={{ ...lbl, fontSize: 10 }}>Lbs/1000 sqft</label><input value={m.lbs_per_ksqft ?? ""} onChange={(e) => setMaterials((prev) => prev.map((x) => x.id === m.id ? { ...x, lbs_per_ksqft: e.target.value } : x))} inputMode="decimal" /></div>}
                  </div>
                  {m.prior_cost != null && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                      Was {formatCurrency(m.prior_cost)}{m.cost_updated_at ? " until " + new Date(m.cost_updated_at).toLocaleDateString() : ""}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button onClick={async () => {
                      const row = { ...m, cost_per_unit: num(m.cost_per_unit), sqft_per_tank: m.sqft_per_tank ? num(m.sqft_per_tank) : m.sqft_per_tank, bales_per_tank: m.bales_per_tank ? num(m.bales_per_tank) : m.bales_per_tank, lbs_per_ksqft: m.lbs_per_ksqft ? num(m.lbs_per_ksqft) : m.lbs_per_ksqft };
                      if (await saveMaterial(row)) flash("Saved " + m.name); else alert("Save failed — check connection");
                      loadAll();
                    }} style={{ ...chipBtn(true), flex: 1 }}>Save</button>
                    <button onClick={async () => { if (confirm(`Delete ${m.name} from the catalog? Existing estimates keep their snapshot.`)) { await deleteMaterial(m.id); loadAll(); } }} style={{ ...chipBtn(false), borderColor: "var(--danger)", color: "var(--danger)" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <button onClick={async () => {
            const name = prompt("New material name:");
            if (!name) return;
            const id = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 40) + "_" + generateId().slice(0, 4);
            await saveMaterial({ id, name, category: "Other", unit: "each", cost_per_unit: 0, active: true });
            loadAll();
          }} style={{ ...chipBtn(false), width: "100%", minHeight: 44 }}>+ Add Material</button>
        </>
      )}

      {/* ── Rates / settings ── */}
      {mode === "settings" && (
        <div style={card}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            Defaults used by new estimates. <b>All $0 values are placeholders (assumptions)</b> — fill in your real numbers.
            Changing these never alters saved estimates.
          </div>
          {[
            ["marginPct", "Target gross margin %", "Recommended price = cost ÷ (1 − margin)"],
            ["wastePct", "Default waste / overage %", "Applied to measured area"],
            ["depositPct", "Deposit %", "Matches your 50% deposit step"],
            ["laborRate", "Loaded labor rate $/hr per person", "Wages + taxes + insurance"],
            ["crewSize", "Default crew size", ""],
            ["equipmentRate", "Equipment rate $/hr", "T120 + truck + support"],
            ["mobilization", "Default mobilization $ per job", "Travel / setup flat amount"],
            ["tanksPerDay", "Tanks per day (production rate)", "Drives the job-duration estimate"],
          ].map(([key, label, hint]) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <label style={lbl}>{label}</label>
              <input value={settings[key] ?? ""} onChange={(e) => setSettings((p) => ({ ...p, [key]: num(e.target.value) }))} inputMode="decimal" />
              {hint && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{hint}</div>}
            </div>
          ))}
          <button onClick={async () => { if (await saveSettings(settings)) flash("Rates saved — new estimates will use them"); else alert("Save failed — check connection"); }} style={{ width: "100%", padding: "12px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#4CAF50,#5CBF2A)", color: "#fff", fontWeight: 600, fontSize: 14, letterSpacing: "1.5px", textTransform: "uppercase", minHeight: 44 }}>Save Rates</button>
        </div>
      )}
    </div>
  );
}
