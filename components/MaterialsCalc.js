"use client";

import { useState, useCallback, useMemo } from "react";

const DEFAULT_MATERIALS = [
  {id:"wood_fiber",name:"Wood Fiber Mulch (Profile)",unit:"bale",costPerUnit:0,balesPerTank:9,lbsPerBale:50,category:"Mulch"},
  {id:"flexterra",name:"Flexterra HP-FGM (Profile)",unit:"bale",costPerUnit:0,balesPerTank:8,lbsPerBale:50,category:"Mulch"},
  {id:"biotic_earth",name:"Biotic Earth Black BSA (Verdyol)",unit:"bale",costPerUnit:0,balesPerTank:15,lbsPerBale:50,category:"Mulch"},
  {id:"fert_starter",name:"18-24-12 Starter Fertilizer",unit:"bag",costPerUnit:0,bagsPerTank:1,category:"Fertilizer"},
  {id:"fert_balanced",name:"10-10-10 Slow Release",unit:"bag",costPerUnit:0,bagsPerTank:1,category:"Fertilizer"},
  {id:"neutralime",name:"NeutraLime",unit:"lb",costPerUnit:0,lbsPerTank:20,category:"pH Correction"},
  {id:"ag_lime",name:"Ag Lime (broadcast)",unit:"ton",costPerUnit:0,category:"pH Correction"},
  {id:"floc_loc",name:"Floc Loc (PAM tackifier)",unit:"jug (3 lb)",costPerUnit:0,jugsPerAcre:1,category:"Additives"},
  {id:"slikcolor",name:"SlikColor (dye)",unit:"lb",costPerUnit:0,lbsPerTank:1.5,category:"Additives"},
  {id:"seed_tall_fescue",name:"Tall Fescue Seed",unit:"lb",costPerUnit:0,lbsPerKSqFt:8,category:"Seed"},
  {id:"seed_bermuda",name:"Bermuda Seed",unit:"lb",costPerUnit:0,lbsPerKSqFt:2,category:"Seed"},
  {id:"seed_custom",name:"Custom Seed Blend",unit:"lb",costPerUnit:0,lbsPerKSqFt:8,category:"Seed"},
  {id:"soil_test",name:"Soil Test (Profile Lab)",unit:"test",costPerUnit:75,category:"Service"},
];

const lbl = { fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: -4, display: "block", fontFamily: "var(--body-font)" };

export default function MaterialsCalc() {
  const [materials, setMaterials] = useState(DEFAULT_MATERIALS);
  const [sqft, setSqft] = useState("");
  const [mulchType, setMulchType] = useState("wood_fiber");
  const [seedType, setSeedType] = useState("seed_tall_fescue");
  const [mode, setMode] = useState("calc");
  const [newMat, setNewMat] = useState({ name: "", unit: "bale", costPerUnit: 0, category: "Other", balesPerTank: 0, lbsPerBale: 0, lbsPerKSqFt: 0, lbsPerTank: 0, bagsPerTank: 0, jugsPerAcre: 0 });

  const updateField = (id, field, value) => {
    setMaterials((prev) => prev.map((m) => m.id === id ? { ...m, [field]: ["costPerUnit", "balesPerTank", "lbsPerBale", "lbsPerKSqFt", "lbsPerTank", "bagsPerTank", "jugsPerAcre"].includes(field) ? parseFloat(value) || 0 : value } : m));
  };
  const removeMaterial = (id) => { if (confirm("Remove this material?")) setMaterials((prev) => prev.filter((m) => m.id !== id)); };
  const addMaterial = () => {
    if (!newMat.name.trim()) return;
    const id = newMat.name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now().toString(36);
    setMaterials((prev) => [...prev, { ...newMat, id }]);
    setNewMat({ name: "", unit: "bale", costPerUnit: 0, category: "Other", balesPerTank: 0, lbsPerBale: 0, lbsPerKSqFt: 0, lbsPerTank: 0, bagsPerTank: 0, jugsPerAcre: 0 });
    setMode("edit");
  };
  const resetToDefaults = () => { if (confirm("Reset all materials to defaults?")) setMaterials(DEFAULT_MATERIALS); };

  const area = parseFloat(sqft) || 0;
  const acres = area / 43560;
  const mulch = materials.find((m) => m.id === mulchType);
  const seed = materials.find((m) => m.id === seedType);
  const tanks = mulch ? Math.ceil(area / (mulch.id === "wood_fiber" ? 10000 : mulch.id === "flexterra" ? 5500 : 9000)) : 0;
  const bales = mulch ? tanks * (mulch.balesPerTank || 0) : 0;
  const seedLbs = seed ? (area / 1000) * (seed.lbsPerKSqFt || 8) : 0;
  const fert = materials.find((m) => m.id === "fert_starter");
  const tack = materials.find((m) => m.id === "floc_loc");
  const dye = materials.find((m) => m.id === "slikcolor");
  const lime = materials.find((m) => m.id === "neutralime");
  const test = materials.find((m) => m.id === "soil_test");

  const lineItems = area > 0 ? [
    mulch && { name: mulch.name, qty: bales, unit: mulch.unit, cost: bales * (mulch.costPerUnit || 0) },
    seed && { name: seed.name, qty: Math.ceil(seedLbs), unit: "lb", cost: Math.ceil(seedLbs) * (seed.costPerUnit || 0) },
    fert && { name: fert.name, qty: tanks, unit: "bag", cost: tanks * (fert.costPerUnit || 0) },
    tack && { name: tack.name, qty: Math.ceil(acres), unit: tack.unit, cost: Math.ceil(acres) * (tack.costPerUnit || 0) },
    dye && { name: dye.name, qty: Math.ceil(tanks * 1.5), unit: "lb", cost: Math.ceil(tanks * 1.5) * (dye.costPerUnit || 0) },
    lime && { name: lime.name, qty: Math.ceil(tanks * 20), unit: "lb", cost: Math.ceil(tanks * 20) * (lime.costPerUnit || 0) },
    test && { name: test.name, qty: 1, unit: "test", cost: test.costPerUnit || 0 },
  ].filter(Boolean) : [];
  const totalCost = lineItems.reduce((s, l) => s + l.cost, 0);
  const categories = [...new Set(materials.map((m) => m.category))];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontFamily: "var(--heading-font)", fontSize: 20, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Materials</div>
        <div style={{ display: "flex", gap: 6 }}>
          {mode !== "calc" && <button onClick={() => setMode("calc")} style={{ background: "none", border: "1px solid var(--accent)", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "1px" }}>Calculator</button>}
          {mode !== "edit" && <button onClick={() => setMode("edit")} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px" }}>Edit List</button>}
        </div>
      </div>

      {/* Edit Mode */}
      {mode === "edit" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <button onClick={() => setMode("add")} style={{ background: "linear-gradient(135deg,#4CAF50,#5CBF2A)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontWeight: 600, fontSize: 13, letterSpacing: "1px", textTransform: "uppercase" }}>+ Add Material</button>
            <button onClick={resetToDefaults} style={{ background: "none", border: "1px solid var(--danger)", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "1px" }}>Reset</button>
          </div>
          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--h2-blue)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 6, fontFamily: "var(--heading-font)" }}>{cat}</div>
              {materials.filter((m) => m.category === cat).map((m) => (
                <div key={m.id} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 8, padding: 12, marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <input value={m.name} onChange={(e) => updateField(m.id, "name", e.target.value)} style={{ fontWeight: 600, fontSize: 15, border: "none", background: "transparent", padding: 0, width: "70%" }} />
                    <button onClick={() => removeMaterial(m.id)} style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 18, cursor: "pointer", padding: "0 4px" }}>x</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div><label style={{ ...lbl, fontSize: 10 }}>Unit</label><select value={m.unit} onChange={(e) => updateField(m.id, "unit", e.target.value)} style={{ padding: "6px 8px", fontSize: 13 }}><option value="bale">bale</option><option value="bag">bag</option><option value="lb">lb</option><option value="ton">ton</option><option value="jug (3 lb)">jug (3 lb)</option><option value="gallon">gallon</option><option value="test">test</option><option value="each">each</option></select></div>
                    <div><label style={{ ...lbl, fontSize: 10 }}>Cost/Unit</label><input value={m.costPerUnit || ""} onChange={(e) => updateField(m.id, "costPerUnit", e.target.value)} placeholder="$0" type="number" style={{ padding: "6px 8px", fontSize: 13 }} /></div>
                    <div><label style={{ ...lbl, fontSize: 10 }}>Category</label><select value={m.category} onChange={(e) => updateField(m.id, "category", e.target.value)} style={{ padding: "6px 8px", fontSize: 13 }}><option>Mulch</option><option>Fertilizer</option><option>pH Correction</option><option>Additives</option><option>Seed</option><option>Service</option><option>Other</option></select></div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add Mode */}
      {mode === "add" && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--heading-font)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, color: "var(--h2-blue)" }}>New Material</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div><label style={lbl}>Name *</label><input value={newMat.name} onChange={(e) => setNewMat((p) => ({ ...p, name: e.target.value }))} placeholder="Product name" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div><label style={lbl}>Unit</label><select value={newMat.unit} onChange={(e) => setNewMat((p) => ({ ...p, unit: e.target.value }))}><option value="bale">bale</option><option value="bag">bag</option><option value="lb">lb</option><option value="ton">ton</option><option value="jug (3 lb)">jug (3 lb)</option><option value="gallon">gallon</option><option value="test">test</option><option value="each">each</option></select></div>
              <div><label style={lbl}>Cost/Unit</label><input value={newMat.costPerUnit || ""} onChange={(e) => setNewMat((p) => ({ ...p, costPerUnit: parseFloat(e.target.value) || 0 }))} placeholder="$0" type="number" /></div>
              <div><label style={lbl}>Category</label><select value={newMat.category} onChange={(e) => setNewMat((p) => ({ ...p, category: e.target.value }))}><option>Mulch</option><option>Fertilizer</option><option>pH Correction</option><option>Additives</option><option>Seed</option><option>Service</option><option>Other</option></select></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={addMaterial} style={{ flex: 1, padding: "10px 0", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#4CAF50,#5CBF2A)", color: "#fff", fontWeight: 600, fontSize: 14, letterSpacing: "1px", textTransform: "uppercase" }}>Add Material</button>
            <button onClick={() => setMode("edit")} style={{ padding: "10px 16px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, textTransform: "uppercase" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Calculator Mode */}
      {mode === "calc" && (
        <>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div><label style={lbl}>Square Feet</label><input value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="10,000" type="number" /></div>
              <div><label style={lbl}>Mulch Type</label><select value={mulchType} onChange={(e) => setMulchType(e.target.value)}>{materials.filter((m) => m.category === "Mulch").map((m) => <option key={m.id} value={m.id}>{m.name.split("(")[0].trim()}</option>)}</select></div>
              <div><label style={lbl}>Seed Type</label><select value={seedType} onChange={(e) => setSeedType(e.target.value)}>{materials.filter((m) => m.category === "Seed").map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            </div>
          </div>

          {area > 0 && (
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div><span style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--heading-font)", color: "var(--accent)" }}>{tanks}</span><span style={{ fontSize: 14, color: "var(--text-muted)", marginLeft: 6 }}>tanks</span></div>
                <div style={{ textAlign: "right" }}><span style={{ fontSize: 14, color: "var(--text-muted)" }}>{area.toLocaleString()} sq ft</span><br /><span style={{ fontSize: 12, color: "var(--text-muted)" }}>{acres.toFixed(2)} acres</span></div>
              </div>

              {lineItems.map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-light)", fontSize: 14 }}>
                  <span>{l.name}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{l.qty} {l.unit}{l.cost > 0 && <span style={{ marginLeft: 8, fontWeight: 600, color: "var(--text-primary)" }}>${l.cost.toFixed(2)}</span>}</span>
                </div>
              ))}

              {totalCost > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 16, fontWeight: 700, fontFamily: "var(--heading-font)" }}>
                  <span>Total Materials</span>
                  <span style={{ color: "var(--accent)" }}>${totalCost.toFixed(2)}</span>
                </div>
              )}
              {totalCost === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, fontStyle: "italic" }}>Tap "Edit List" to set material costs</div>}

              {/* Supercast Order */}
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border-light)", paddingTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--h2-blue)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8, fontFamily: "var(--heading-font)" }}>Supercast Order</div>
                <div style={{ fontSize: 12, background: "var(--light-bg)", padding: 10, borderRadius: 6, border: "1px solid var(--border-light)", fontFamily: "monospace", marginBottom: 8 }}>
                  {lineItems.filter((l) => l.qty > 0).map((l, i) => <div key={i}>{l.name}: <b>{l.qty} {l.unit}</b></div>)}
                </div>
                <button
                  onClick={() => {
                    const txt = `MATERIAL ORDER — H2 Grow LLC\n${new Date().toLocaleDateString()}\n${area.toLocaleString()} sq ft (${tanks} tanks)\n\n${lineItems.filter((l) => l.qty > 0).map((l) => `${l.name}: ${l.qty} ${l.unit}`).join("\n")}\n\nPlease confirm availability.\nMatt Fleetwood | 984-343-2424`;
                    navigator.clipboard?.writeText(txt);
                  }}
                  style={{ width: "100%", padding: "10px 0", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#4CAF50,#5CBF2A)", color: "#fff", fontWeight: 600, fontSize: 13, letterSpacing: "1px", textTransform: "uppercase" }}
                >
                  Copy Order to Clipboard
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
