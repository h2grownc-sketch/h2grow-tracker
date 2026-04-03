"use client";

import { useState } from "react";
import ProgressBar from "./ProgressBar";

const OPS_CHECKLISTS = [
  {title:"Daily — T120",items:["Grease pump seal (Finn 000698 ONLY)","Grease clutch lever bearings (2)","Grease agitator shaft bearings (2)","Grease discharge swivels (1)","Grease clutch release bearing","Check engine oil — Rotella T6","Check fuel level","End of day: flush, drain, wash, grease"]},
  {title:"Daily — 333G",items:["Check engine oil","Check hydraulic oil","Check coolant","Grease boom, cylinders, Quik-Tatch","Walk-around","HydraBucket: grease drum zerks","HydraBucket: check edges & teeth","Mulcher: fasteners, case drain"]},
  {title:"Weekly — T120",items:["Grease pump bearings (4)","Check hydraulic oil (sight gauge)","Clean air cleaner","Check clutch engagement","Check radiator antifreeze","Inspect suction area","Clean radiator","Grease clutch cross shaft"]},
  {title:"Weekly — 333G",items:["Check track tension","Clean dust unloader valve","Inspect all 44 mulcher teeth","Rotate dull teeth","Check mulcher disc","Check HydraBucket connections"]},
  {title:"Monthly / Seasonal",items:["T120 engine oil & filter (250 hrs)","T120 hydraulic oil & filter (400 hrs)","T120 clutch linkage lube (500 hrs)","333G engine oil & filter (500 hrs)","333G fuel filters (500 hrs)","333G hydraulic oil & filter (1,000 hrs)","HydraBucket motor bolts 150 ft-lbs (90 days)","Mulcher gearbox oil (2,500 hrs/annual)","Repack T120 trailer bearings (end of season)"]},
];

export default function OpsChecklistTab() {
  const [checked, setChecked] = useState({});
  const toggle = (li, ii) => {
    const k = li + "-" + ii;
    setChecked((p) => ({ ...p, [k]: !p[k] }));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontFamily: "var(--heading-font)", fontSize: 20, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
          Ops Checklists
        </div>
        <button
          onClick={() => setChecked({})}
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px" }}
        >
          Reset All
        </button>
      </div>

      {OPS_CHECKLISTS.map((list, li) => {
        const total = list.items.length;
        const done = list.items.filter((_, ii) => checked[li + "-" + ii]).length;
        return (
          <div key={li} style={{ marginBottom: 12, background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: "var(--heading-font)", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{list.title}</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: done === total ? "var(--success)" : "var(--text-muted)" }}>{done}/{total}</span>
            </div>
            <ProgressBar pct={Math.round((done / total) * 100)} color={done === total ? "var(--success)" : "var(--info)"} height={3} />
            <div style={{ padding: "4px 8px" }}>
              {list.items.map((item, ii) => (
                <label key={ii} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", cursor: "pointer", background: checked[li + "-" + ii] ? "#4CAF5008" : "transparent", borderRadius: 4, borderBottom: ii < total - 1 ? "1px solid var(--border-light)" : "none", fontSize: 14 }}>
                  <input type="checkbox" checked={!!checked[li + "-" + ii]} onChange={() => toggle(li, ii)} style={{ accentColor: "var(--accent)", width: 16, height: 16, flexShrink: 0 }} />
                  <span style={{ color: checked[li + "-" + ii] ? "var(--success)" : "var(--text-primary)", textDecoration: checked[li + "-" + ii] ? "line-through" : "none", opacity: checked[li + "-" + ii] ? 0.6 : 1 }}>{item}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
