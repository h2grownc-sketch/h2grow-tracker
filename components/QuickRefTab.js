"use client";

import { useState } from "react";

const QUICK_REF = [
  {title:"Inquiry Script",sections:[{heading:"Ask First",items:["How big is the project? (sq ft or acreage)","Seed selection in mind?","What results are you hoping for?"]},{heading:"Pricing",items:["Residential: $0.18–$0.30/sq ft","Commercial: below $0.18/sq ft","Minimum: 1 tank (10,000 sq ft)","Site prep quoted separately","Soil test: $75 (credited toward invoice)"]},{heading:"Key Points",items:["We soil test, custom-blend, correct soil before application","60-day warranty","Under 2,000 sq ft — recommend sod ($1.00–$1.25/sq ft)","Skipped soil test = waiver required","Customer site prep = waiver required"]},{heading:"Close",items:["Ask for address to schedule site visit","984-343-2424 | H2GrowNC@gmail.com"]}]},
  {title:"Loading Chart",sections:[{heading:"Products/Tank",items:["Wood Fiber: 9 bales (450 lbs)","Flexterra: 8 bales (400 lbs)","Biotic Earth: 15 bales (750 lbs)"]},{heading:"Additives",items:["Floc Loc: ~1–1.5 lb/tank","SlikColor: ~1–1.5 lb/tank","Fertilizer: 1 bag/tank (generic)","NeutraLime: 20 lbs/tank (generic)"]},{heading:"Loading Order",items:["1. Water → agitator REVERSE","2. Purge lines","3. Continue filling, full RPM","4. Seed (lightest first)","5. Mulch/BFM/BSM (before 3/4 full)","6. Tackifier → 7. Dye","8. Fertilizer (LAST) → 9. NeutraLime","10. Mix — FORWARD, 1/2–3/4 speed"]},{heading:"Coverage/Tank",items:["One-step: ~14,520 sq ft (~1/3 acre)","Wood fiber: ~10,000 sq ft","Flexterra: 4,000–7,000 sq ft","Seed+fert only: ~130,000 sq ft"]}]},
  {title:"T120 Daily Startup",sections:[{heading:"Engine OFF Checks",items:["Walk-around: hitch, chains, lights, brakes","Fluids: engine oil, hydraulic, fuel, radiator","Inspect hoses for cracks/bulges","Check slurry tank — no foreign objects","Drain plug secure, suction valve OPEN","Test clutch — snap in/out","Install nozzle, check clogs","Grease ALL daily lube points","Check pump auto-lubricator (Finn 000698 ONLY)"]},{heading:"Start",items:["Open recirc, close discharge, clutch OFF, agitator NEUTRAL, hydraulic switch DOWN","Start, check faults, warm 3–5 min","Hydraulics ON (toggle up)"]}]},
  {title:"T120 End of Day",sections:[{heading:"Cleanup",items:["Fill to agitator center, run full speed","Remove nozzle/gasket, discharge until clear","Drain plug out, wash outside + radiator","Grease all points (engine OFF)"]},{heading:"Freezing",items:["Leave drain plug out, pull pump plug, open ALL valves"]}]},
  {title:"333G + Attachments",sections:[{heading:"333G Daily",items:["Engine oil — Plus-50 II","Hydraulic oil — Hydrau","Coolant — Cool-Gard II Pre-Mix","Grease boom, cylinders, Quik-Tatch","Walk-around inspection"]},{heading:"HydraBucket",items:["Grease BOTH drum zerks (Lithium #2 + MOLY, 8–10 pumps)","Check cutting edges and teeth","Test drum rotation at idle"]},{heading:"Disc Mulcher",items:["All fasteners tight","Case drain hose connected","Check 333G hydraulic oil after connecting"]}]},
  {title:"Suppliers & Contacts",sections:[{heading:"Materials",items:["Supercast (Goldsboro): 3–5 day lead time","Green Resource (Garner): same-day pickup","Colonial Materials (VA): Biotic Earth"]},{heading:"Lab",items:["Profile Soil Analysis Lab","300 Speedway Cir Ste 2, Lincoln NE 68502","800-508-8681 | Ship UPS"]},{heading:"Equipment",items:["Finn: 800-543-7166 x246","Blue Diamond: 888-376-7027","CMP: 320-743-0109"]}]},
];

export default function QuickRefTab() {
  const [open, setOpen] = useState(null);

  return (
    <div>
      <div style={{ fontFamily: "var(--heading-font)", fontSize: 20, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
        Quick Reference
      </div>
      {QUICK_REF.map((ref, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: "100%",
              textAlign: "left",
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: open === i ? "8px 8px 0 0" : 8,
              padding: "12px 16px",
              fontSize: 15,
              fontFamily: "var(--heading-font)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: open === i ? "var(--accent)" : "var(--text-primary)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {ref.title}
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{open === i ? "−" : "+"}</span>
          </button>
          {open === i && (
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "12px 16px" }}>
              {ref.sections.map((sec, j) => (
                <div key={j} style={{ marginBottom: j < ref.sections.length - 1 ? 14 : 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--h2-blue)", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 6, fontFamily: "var(--heading-font)" }}>
                    {sec.heading}
                  </div>
                  {sec.items.map((item, k) => (
                    <div key={k} style={{ fontSize: 14, color: "var(--text-primary)", padding: "3px 0 3px 12px", borderLeft: "2px solid var(--border-light)" }}>
                      {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
