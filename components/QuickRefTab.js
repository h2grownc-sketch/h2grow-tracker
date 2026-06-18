"use client";

import { useState } from "react";

const QUICK_REF = [
  {title:"Inquiry Script",sections:[{heading:"Ask First",items:["How big is the project? (sq ft or acreage)","Seed selection in mind?","What results are you hoping for?"]},{heading:"Pricing",items:["Residential: $0.18–$0.30/sq ft","Commercial: below $0.18/sq ft","Minimum: 1 tank (10,000 sq ft)","Site prep quoted separately","Soil test: $75 (credited toward invoice)"]},{heading:"Key Points",items:["We soil test, custom-blend, correct soil before application","60-day warranty","Under 2,000 sq ft — recommend sod ($1.00–$1.25/sq ft)","Skipped soil test = waiver required","Customer site prep = waiver required"]},{heading:"Close",items:["Ask for address to schedule site visit","984-343-2424 | H2GrowNC@gmail.com"]}]},
  {title:"Site Visit — On Site",sections:[{heading:"Before You Leave",items:["Confirm address + appointment time","Bring: measuring wheel, soil kit, phone for photos","Review any notes already on the job"]},{heading:"With the Customer",items:["Ask what results they want — write it in the job Notes","Confirm service type + scope of work","Note access: gates, slopes, pets, irrigation, utilities","Set expectations: soil test, 60-day warranty, timeline"]},{heading:"Document in the App",items:["Open / add the job → tap '+ Add Photo'","Wide shots + problem areas (bare spots, drainage, slopes)","Write customer notes + site notes in the Notes field","Enter Sq Ft from the wheel (see Measuring Jobs)"]},{heading:"Soil & Quote Prep",items:["Pull soil samples if required (see Soil Samples)","Enter the Soil Test # on the job","Set service type so the right checklist shows"]},{heading:"Before You Leave Site",items:["Save the job","Check off Contacted / Consultation / Soil Collected","Tell the customer the next step + when they'll hear back"]}]},
  {title:"Measuring Jobs — Plott Carta Wheel",sections:[{heading:"Before You Start",items:["Power on / wake the Plott Carta wheel","Confirm units are set to FEET","Zero / reset the counter at your start point","Wipe the tire — debris throws off the count"]},{heading:"Measure Area",items:["Walk straight, steady lines — don't drag or bounce the wheel","Rectangle = Length × Width = sq ft","Mark your start point so you can close the loop","Re-zero between each separate measurement"]},{heading:"Irregular Lots",items:["Break the yard into rectangles and triangles","Rectangle = L × W","Triangle = (base × height) ÷ 2","Measure each piece, then add them together"]},{heading:"Slopes & Banks",items:["Roll the wheel ALONG the slope face, not the flat distance","Slopes use more material — note them on the quote"]},{heading:"Finish",items:["Add all areas = total job sq ft","~10,000 sq ft ≈ 1 tank wood fiber — see Loading Chart","Record sq ft on the job before you leave site"]}]},
  {title:"Soil Samples — Collect & Bag",sections:[{heading:"What You Need",items:["Clean plastic bucket (no rust or residue)","Soil probe or clean spade","Sample bags + permanent marker","Soil test form / soil test number"]},{heading:"Where to Sample",items:["Walk a zig-zag (W) pattern across the area","10–15 small cores per area for a good average","Avoid wet spots, burn piles, fertilizer spills, driveways"]},{heading:"How to Collect",items:["Pull each core ~4 in deep (turf / lawn)","Drop all cores into the bucket","Break up clumps and mix thoroughly","Fill the bag with ~1–2 cups of mixed soil"]},{heading:"Separate Areas",items:["Take a SEPARATE composite sample per distinct area","e.g. front vs back, or different soil types","Label each bag so they don't get mixed up"]},{heading:"Label & Send",items:["Label: customer name, date, area, soil test #","Complete the soil test form","Ship to lab (see Suppliers & Contacts → Lab)","Enter the soil test number on the job","Check off Soil Collected → Soil Mailed on the job"]},{heading:"Mail at Post Office",items:["Double-bag each sample; seal so soil can't leak","Include the completed soil test form","Padded envelope / small box addressed to the lab (see Suppliers)","USPS Priority — keep the tracking receipt","Enter the Mailed date on the job","Check off Soil Mailed"]}]},
  {title:"Grass Selection — Site Eval (NC)",sections:[{heading:"Assess On Site",items:["Sun: full sun 8+ hrs / part shade 4–6 / shade <4","Use: lawn, play/traffic, slope/erosion, utility","Soil: sandy vs clay, drainage, wet spots","Soil test pH — drives species + lime (see Soil Samples)","Region: Mountains / Piedmont / Coastal Plain","Maintenance level the customer wants"]},{heading:"Pick By Conditions",items:["Full sun + high traffic: Bermuda","Full sun + low input: Centipede (coastal) or Bahia","Shade, cool-season: Tall Fescue or Fine Fescue","Shade, warm-season: St. Augustine (coastal) or Zoysia (light)"]},{heading:"Seeding Season",items:["Cool-season: late Aug–Oct best (spring 2nd choice)","Warm-season seed: late spring–summer, soil 65°F+","Quick cover / erosion: annual ryegrass (temporary)","St. Augustine = sod / plugs only, NOT from seed"]},{heading:"NC Regions",items:["Mountains: cool-season (tall fescue, bluegrass)","Piedmont (transition): tall fescue; also bermuda, zoysia","Coastal Plain: warm-season (centipede, bermuda, bahia, St. Aug)"]}]},
  {title:"Cool-Season Grasses (NC)",sections:[{heading:"About",items:["Best growth 60–75°F; stays green most of the year","Grows best spring & fall; seed late summer–fall"]},{heading:"Tall Fescue",items:["NC's #1 lawn grass; sun to moderate shade","Deep roots = good drought; bunch-type (won't spread/repair)","Good all-around traffic; pH ~5.8–6.5","Seedable ✓ — primary cool-season hydroseed"]},{heading:"Kentucky Bluegrass",items:["Cooler areas / Mountains; high cold tolerance","Spreads by rhizomes — self-repairs bare spots","Poor shade; needs more water + maintenance","Seedable ✓ (slow) — usually blended with fescue"]},{heading:"Fine Fescue",items:["Best cool-season shade tolerance","Low maintenance, low fertility","Weak in summer heat/drought; low traffic","Seedable ✓ — use in shade mixes"]},{heading:"Ryegrass",items:["Perennial: fast germination, good wear; bunch-type","Annual: temporary cover / erosion / overseed — dies out","Seedable ✓ — fast nurse grass in mixes"]}]},
  {title:"Warm-Season Grasses (NC)",sections:[{heading:"About",items:["Best growth 80–95°F; grows hardest in summer","Slow spring green-up; brown/dormant after first frost"]},{heading:"Bermudagrass",items:["Full sun ONLY; best wear/traffic; excellent drought","Aggressive spreader (stolons + rhizomes)","Higher maintenance for a quality lawn","Seedable ✓ (common types) — late spring/summer"]},{heading:"Zoysiagrass",items:["Sun to light shade; dense, slow to establish","Best cold tolerance of the warm-season grasses","Good traffic once established","Mostly sod/plugs; some seeded types (slow)"]},{heading:"Centipedegrass",items:["Low-maintenance 'lazy man's' grass; low fertility","Acidic sandy soil pH 5.0–6.0; takes light shade","Poor traffic; yellows (chlorosis) at high pH","Seedable ✓ (slow) — Coastal Plain / Sandhills"]},{heading:"St. Augustine / Bahia / Carpet",items:["St. Augustine: best warm-season shade; coastal; sod/plugs only","Bahiagrass: roadsides/erosion, sandy low-fertility; seed ✓","Carpetgrass: wet, acidic, poorly-drained low spots; seed ✓"]}]},
  {title:"Loading Chart",sections:[{heading:"Standard Residential Grass Mix",items:["Wood Fiber: 6 bales (300 lbs)","Verdyol Biotic Earth: 2 bales (100 lbs)","8 bales total per tank"]},{heading:"Single-Product / Tank",items:["Wood Fiber: 9 bales (450 lbs)","Flexterra: 8 bales (400 lbs)","Biotic Earth: 15 bales (750 lbs)"]},{heading:"Additives",items:["Floc Loc: ~1–1.5 lb/tank","SlikColor: ~1–1.5 lb/tank","Fertilizer: 1 bag/tank (generic)","NeutraLime: 20 lbs/tank (generic)"]},{heading:"Loading Order",items:["1. Water → agitator REVERSE","2. Purge lines","3. Continue filling, full RPM","4. Seed (lightest first)","5. Mulch/BFM/BSM (before 3/4 full)","6. Tackifier → 7. Dye","8. Fertilizer (LAST) → 9. NeutraLime","10. Mix — FORWARD, 1/2–3/4 speed"]},{heading:"Coverage/Tank",items:["One-step: ~14,520 sq ft (~1/3 acre)","Wood fiber: ~10,000 sq ft","Flexterra: 4,000–7,000 sq ft","Seed+fert only: ~130,000 sq ft"]}]},
  {title:"Spray Day — Job Execution",sections:[{heading:"Site Prep",items:["Fresh power rake the dirt — loosen + level the seedbed","Site prep by customer OR performed by H2 Grow (confirm on job)","Remove rocks, debris, and large clods","Rough grade / smooth low spots; keep positive drainage","Apply lime / fertilizer amendments per the soil test"]},{heading:"Before You Spray",items:["Confirm the tank mix for the job (see Loading Chart)","Check sq ft + coverage = enough tanks","Walk the site: mark obstacles, beds, hardscape","Cover walks, drives, fences from overspray"]},{heading:"Application",items:["Even, overlapping passes — no gaps or pooling","Heavier on slopes / banks for erosion hold","Keep agitation running; consistent slurry","Spray edges/borders first, then fill the field"]},{heading:"After Spraying",items:["Rinse overspray off walks, drives, fences right away","Photograph the finished job (add to the job)","Clean out tank + lines (see T120 End of Day)","Mark Job Complete + set Spray Date on the job"]},{heading:"Customer Handoff",items:["Walk the customer through watering","Give the after-care / watering instructions","Set follow-up expectations (14 / 30 / 90 day)"]}]},
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
