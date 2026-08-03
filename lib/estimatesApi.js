// ============================================
// H2 GROW — Estimator API (materials catalog, settings, estimates)
// ============================================
// Tables: materials, app_settings, estimates — see docs/ESTIMATOR_SETUP.md.
// Estimates store a full self-contained snapshot in `data` (JSONB), so later
// catalog price changes never alter an existing estimate.

import { supabase } from "./supabase";

// ── Default catalog (seeded into the DB on first use) ──
export const SEED_MATERIALS = [
  { id: "wood_fiber", name: "Wood Fiber Mulch (Profile)", unit: "bale", cost_per_unit: 0, bales_per_tank: 9, sqft_per_tank: 10000, category: "Mulch" },
  { id: "flexterra", name: "Flexterra HP-FGM (Profile)", unit: "bale", cost_per_unit: 0, bales_per_tank: 8, sqft_per_tank: 5500, category: "Mulch" },
  { id: "biotic_earth", name: "Biotic Earth Black BSA (Verdyol)", unit: "bale", cost_per_unit: 0, bales_per_tank: 15, sqft_per_tank: 9000, category: "Mulch" },
  { id: "std_res_mix", name: "Standard Residential Grass Mix (6 wood + 2 Verdyol)", unit: "tank", cost_per_unit: 0, bales_per_tank: 8, sqft_per_tank: 10000, category: "Mulch", notes: "Cost/unit = blended cost per tank of 6 wood fiber + 2 Biotic Earth bales" },
  { id: "fert_starter", name: "18-24-12 Starter Fertilizer", unit: "bag", cost_per_unit: 0, bags_per_tank: 1, category: "Fertilizer" },
  { id: "neutralime", name: "NeutraLime", unit: "lb", cost_per_unit: 0, lbs_per_tank: 20, category: "pH Correction" },
  { id: "floc_loc", name: "Floc Loc (PAM tackifier)", unit: "jug (3 lb)", cost_per_unit: 0, jugs_per_acre: 1, category: "Additives" },
  { id: "slikcolor", name: "SlikColor (dye)", unit: "lb", cost_per_unit: 0, lbs_per_tank: 1.5, category: "Additives" },
  { id: "seed_tall_fescue", name: "Tall Fescue Seed", unit: "lb", cost_per_unit: 0, lbs_per_ksqft: 8, category: "Seed" },
  { id: "seed_bermuda", name: "Bermuda Seed", unit: "lb", cost_per_unit: 0, lbs_per_ksqft: 2, category: "Seed" },
  { id: "seed_centipede", name: "Centipede Seed", unit: "lb", cost_per_unit: 0, lbs_per_ksqft: 0.5, category: "Seed" },
  { id: "soil_test", name: "Soil Test (Profile Lab)", unit: "test", cost_per_unit: 75, category: "Service" },
];

// All dollar rates default to 0 and are ASSUMPTIONS until the owner edits them
// in Settings inside the Estimator.
export const DEFAULT_SETTINGS = {
  marginPct: 50,      // target gross margin driving the recommended price
  wastePct: 10,       // default overage on measured area
  depositPct: 50,     // matches the 50%-deposit pipeline step
  laborRate: 0,       // loaded $/hr per person
  crewSize: 2,
  equipmentRate: 0,   // $/hr hydroseeder + support equipment
  mobilization: 0,    // flat $ per job (travel/setup)
  tanksPerDay: 4,     // crew production rate (T120, 1200 gal)
};

const ok = () => !!supabase;

// ── Materials ──
export async function fetchMaterials() {
  if (!ok()) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("materials").select("*").order("category").order("name");
  if (error) throw error;
  return data || [];
}

export async function seedMaterialsIfEmpty() {
  const existing = await fetchMaterials();
  if (existing.length > 0) return existing;
  const { error } = await supabase.from("materials").insert(SEED_MATERIALS.map((m) => ({ ...m, active: true })));
  if (error) throw error;
  return fetchMaterials();
}

export async function saveMaterial(mat) {
  if (!ok()) return false;
  // Track prior cost + when it changed (light price history)
  const { data: prevRows } = await supabase.from("materials").select("cost_per_unit").eq("id", mat.id);
  const prev = prevRows?.[0];
  const row = { ...mat };
  if (prev && Number(prev.cost_per_unit) !== Number(mat.cost_per_unit)) {
    row.prior_cost = prev.cost_per_unit;
    row.cost_updated_at = new Date().toISOString();
  }
  const { error } = await supabase.from("materials").upsert(row, { onConflict: "id" });
  if (error) { console.error("saveMaterial:", error); return false; }
  return true;
}

export async function deleteMaterial(id) {
  if (!ok()) return false;
  const { error } = await supabase.from("materials").delete().eq("id", id);
  if (error) { console.error("deleteMaterial:", error); return false; }
  return true;
}

// ── Settings (single row in app_settings, key = 'estimator') ──
export async function fetchSettings() {
  if (!ok()) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", "estimator");
  if (error) throw error;
  return { ...DEFAULT_SETTINGS, ...(data?.[0]?.value || {}) };
}

export async function saveSettings(value) {
  if (!ok()) return false;
  const { error } = await supabase.from("app_settings").upsert({ key: "estimator", value }, { onConflict: "key" });
  if (error) { console.error("saveSettings:", error); return false; }
  return true;
}

// ── Estimates ──
export async function fetchEstimates(limit = 100) {
  if (!ok()) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("estimates")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function saveEstimate(est) {
  if (!ok()) return false;
  const { error } = await supabase.from("estimates").upsert(est, { onConflict: "id" });
  if (error) { console.error("saveEstimate:", error); return false; }
  return true;
}

export async function deleteEstimate(id) {
  if (!ok()) return false;
  const { error } = await supabase.from("estimates").delete().eq("id", id);
  if (error) { console.error("deleteEstimate:", error); return false; }
  return true;
}

// ── Pure calculation (exported for testing / reuse) ──
// areas: [{sqft:number, exclude:bool}]
export function calcEstimate({ areas, wastePct, mulch, seed, extras, materials, settings, price }) {
  const included = areas.filter((a) => !a.exclude).reduce((s, a) => s + (a.sqft || 0), 0);
  const excluded = areas.filter((a) => a.exclude).reduce((s, a) => s + (a.sqft || 0), 0);
  const netSqft = Math.max(0, included - excluded);
  const adjSqft = netSqft * (1 + (wastePct || 0) / 100);
  const acres = netSqft / 43560;

  const lines = [];
  let tanks = 0;
  if (mulch && adjSqft > 0) {
    tanks = Math.ceil(adjSqft / (mulch.sqft_per_tank || 9000));
    const qty = tanks * (mulch.bales_per_tank || 0) || tanks;
    const unit = mulch.bales_per_tank ? mulch.unit : "tank";
    const unitCost = Number(mulch.cost_per_unit) || 0;
    lines.push({ name: mulch.name, qty, unit, unitCost, cost: qty * unitCost });
  }
  if (seed && adjSqft > 0) {
    const qty = Math.ceil((adjSqft / 1000) * (seed.lbs_per_ksqft || 0));
    const unitCost = Number(seed.cost_per_unit) || 0;
    if (qty > 0) lines.push({ name: seed.name, qty, unit: "lb", unitCost, cost: qty * unitCost });
  }
  // Per-tank / per-acre companions from the catalog
  (materials || []).forEach((m) => {
    if (!m.active && m.active !== undefined) return;
    if (m === mulch || m === seed) return;
    let qty = 0, unit = m.unit;
    if (m.bags_per_tank) qty = tanks * m.bags_per_tank;
    else if (m.lbs_per_tank) { qty = Math.ceil(tanks * m.lbs_per_tank); unit = "lb"; }
    else if (m.jugs_per_acre) qty = Math.ceil(acres * m.jugs_per_acre);
    else return; // seed/mulch/one-off items are added explicitly
    if (qty > 0) {
      const unitCost = Number(m.cost_per_unit) || 0;
      lines.push({ name: m.name, qty, unit, unitCost, cost: qty * unitCost });
    }
  });

  const materialCost = lines.reduce((s, l) => s + l.cost, 0);
  const laborCost = (extras.laborHours || 0) * (settings.crewSize || 1) * (settings.laborRate || 0);
  const equipmentCost = (extras.equipmentHours || 0) * (settings.equipmentRate || 0);
  const mobilization = extras.mobilization ?? settings.mobilization ?? 0;
  const otherCost = (extras.custom || []).reduce((s, c) => s + (Number(c.cost) || 0), 0);
  const totalCost = materialCost + laborCost + equipmentCost + mobilization + otherCost;

  const marginPct = Math.min(95, Math.max(0, settings.marginPct ?? 50));
  const recommended = totalCost > 0 ? totalCost / (1 - marginPct / 100) : 0;
  const finalPrice = Number(price) || 0;
  const gp = finalPrice - totalCost;
  const gmPct = finalPrice > 0 ? (gp / finalPrice) * 100 : 0;
  const deposit = finalPrice * ((settings.depositPct ?? 50) / 100);
  const days = tanks > 0 && settings.tanksPerDay > 0 ? Math.ceil(tanks / settings.tanksPerDay) : 0;

  return {
    netSqft, adjSqft, acres, tanks, lines,
    materialCost, laborCost, equipmentCost, mobilization, otherCost, totalCost,
    marginPct, recommended, finalPrice, gp, gmPct, deposit, days,
    perSqft: netSqft > 0 && finalPrice > 0 ? finalPrice / netSqft : 0,
    perAcre: acres > 0 && finalPrice > 0 ? finalPrice / acres : 0,
  };
}
