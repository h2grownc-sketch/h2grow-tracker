"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getStage, getNextAction, getAlertMsg, isJobDone, soilFlag } from "../lib/jobUtils";

// ── NC City coordinates (50+ cities) ──
const NC_CITIES = {
  "goldsboro":{lat:35.3849,lon:-77.9928},"pikeville":{lat:35.4971,lon:-77.8850},
  "smithfield":{lat:35.5085,lon:-78.3394},"wilson":{lat:35.7212,lon:-77.9156},
  "kinston":{lat:35.2627,lon:-77.5816},"greenville":{lat:35.6127,lon:-77.3664},
  "clayton":{lat:35.6507,lon:-78.4564},"selma":{lat:35.5363,lon:-78.2842},
  "la grange":{lat:35.3069,lon:-77.7883},"mount olive":{lat:35.1968,lon:-78.0664},
  "snow hill":{lat:35.4518,lon:-77.6811},"clinton":{lat:35.0049,lon:-78.3233},
  "dunn":{lat:35.3063,lon:-78.6089},"new bern":{lat:35.1085,lon:-77.0441},
  "jacksonville":{lat:34.7541,lon:-77.4303},"morehead city":{lat:34.7230,lon:-76.7260},
  "raleigh":{lat:35.7796,lon:-78.6382},"fayetteville":{lat:35.0527,lon:-78.8784},
  "rocky mount":{lat:35.9382,lon:-77.7905},"ayden":{lat:35.4727,lon:-77.4155},
  "farmville":{lat:35.5955,lon:-77.5858},"tarboro":{lat:35.8968,lon:-77.5358},
  "havelock":{lat:34.8791,lon:-76.9014},"beulaville":{lat:34.9244,lon:-77.7689},
  "benson":{lat:35.3824,lon:-78.5486},"princeton":{lat:35.4660,lon:-78.1603},
  "kenly":{lat:35.5960,lon:-78.1233},"erwin":{lat:35.3268,lon:-78.6764},
  "garner":{lat:35.7113,lon:-78.6142},"fuquay-varina":{lat:35.5843,lon:-78.8000},
  "fuquay varina":{lat:35.5843,lon:-78.8000},"angier":{lat:35.5072,lon:-78.7392},
  "spring lake":{lat:35.1749,lon:-78.9722},"sanford":{lat:35.4799,lon:-79.1803},
  "lillington":{lat:35.3988,lon:-78.8158},"burgaw":{lat:34.5521,lon:-77.9261},
  "wallace":{lat:34.7357,lon:-77.9953},"warsaw":{lat:35.0027,lon:-78.0914},
  "kenansville":{lat:34.9624,lon:-77.9622},"richlands":{lat:34.8991,lon:-77.5469},
  "swansboro":{lat:34.6877,lon:-77.1190},"beaufort":{lat:34.7182,lon:-76.6638},
  "newport":{lat:34.7869,lon:-76.8591},"dudley":{lat:35.2724,lon:-78.0275},
  "fremont":{lat:35.5441,lon:-77.9739},"seven springs":{lat:35.2268,lon:-77.8361},
  "faison":{lat:35.1146,lon:-78.0986},"calypso":{lat:35.1571,lon:-78.0911},
  "albertson":{lat:35.1185,lon:-77.8558},"hookerton":{lat:35.4271,lon:-77.5778},
  "cove city":{lat:35.1649,lon:-77.3081},"pink hill":{lat:35.0524,lon:-77.7386},
  "trenton":{lat:35.0668,lon:-77.3527},"pollocksville":{lat:35.0052,lon:-77.2186},
  "maysville":{lat:34.9052,lon:-77.2328},"bayboro":{lat:35.1560,lon:-76.7699},
  "youngsville":{lat:36.0246,lon:-78.4742},"mt olive":{lat:35.1968,lon:-78.0664},
  "zebulon":{lat:35.8238,lon:-78.3147},"wendell":{lat:35.7813,lon:-78.3700},
  "knightdale":{lat:35.7879,lon:-78.4964},"four oaks":{lat:35.4438,lon:-78.4272},
  "sims":{lat:35.7671,lon:-78.0839},"lucama":{lat:35.6443,lon:-78.0094},
  "stantonsburg":{lat:35.6007,lon:-77.8178},"walstonburg":{lat:35.5924,lon:-77.6950},
};

// ── Normalize city string for lookup ──
function normalizeCity(raw) {
  if (!raw) return "";
  return raw.trim().toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

// ── Try to match a string against NC_CITIES ──
function matchCity(raw) {
  const city = normalizeCity(raw);
  if (!city) return null;
  if (NC_CITIES[city]) return NC_CITIES[city];
  const noHyphen = city.replace(/-/g, " ");
  if (NC_CITIES[noHyphen]) return NC_CITIES[noHyphen];
  const withHyphen = city.replace(/ /g, "-");
  if (NC_CITIES[withHyphen]) return NC_CITIES[withHyphen];
  // Check if any known city name appears in the string
  for (const [name, coords] of Object.entries(NC_CITIES)) {
    if (city.includes(name) && name.length >= 4) return coords;
  }
  return null;
}

// ── Geocode a job — try city field first, then parse address ──
function geocodeJob(job) {
  // Try city field first
  const fromCity = matchCity(job.city);
  if (fromCity) return fromCity;
  // Fallback: try to find a city name in the address string
  const fromAddr = matchCity(job.address);
  if (fromAddr) return fromAddr;
  return null;
}

// ── Leaflet CDN loader ──
let leafletLoaded = false;
let leafletPromise = null;
function loadLeaflet() {
  if (leafletLoaded && window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve) => {
    // CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
    }
    // JS
    if (window.L) { leafletLoaded = true; resolve(window.L); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => { leafletLoaded = true; resolve(window.L); };
    document.head.appendChild(script);
  });
  return leafletPromise;
}

// ── Filter options ──
const SERVICES = ["All","Hydroseeding","Forestry Mulching","Site Prep / Grading","Drainage","Erosion Control","Food Plot","Skid Steer Work","Other"];
const STAGES = ["All","New Lead","Contacted","Consultation","Consulted","Sampling","Awaiting Results","Quoting","Quote Sent","Approved","Job Day","Follow-Up"];

export default function MapView({ jobs, onSelect }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [leafletReady, setLeafletReady] = useState(false);
  const [serviceFilter, setServiceFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showReadyOnly, setShowReadyOnly] = useState(false);
  const [highlighted, setHighlighted] = useState(null);

  // Load Leaflet on mount
  useEffect(() => {
    loadLeaflet().then(() => setLeafletReady(true));
  }, []);

  // Active (non-dead, non-done) jobs with geocoding
  const activeJobs = useMemo(() => {
    return jobs
      .filter((j) => !j.isDead && !isJobDone(j))
      .map((j) => ({ ...j, _geo: geocodeJob(j) }));
  }, [jobs]);

  // Apply filters
  const filteredJobs = useMemo(() => {
    let result = activeJobs;
    if (serviceFilter !== "All") result = result.filter((j) => j.serviceType === serviceFilter);
    if (stageFilter !== "All") result = result.filter((j) => getStage(j.checks, j.serviceType, soilFlag(j)).label === stageFilter);
    if (showOverdueOnly) result = result.filter((j) => getAlertMsg(j));
    if (showReadyOnly) result = result.filter((j) => j.checks?.approved && !j.checks?.scheduled);
    return result;
  }, [activeJobs, serviceFilter, stageFilter, showOverdueOnly, showReadyOnly]);

  const locatedJobs = useMemo(() => filteredJobs.filter((j) => j._geo), [filteredJobs]);
  const unlocatedJobs = useMemo(() => filteredJobs.filter((j) => !j._geo && (j.city || j.address)), [filteredJobs]);
  const noCityJobs = useMemo(() => filteredJobs.filter((j) => !j._geo && !j.city && !j.address), [filteredJobs]);

  // Initialize map
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapInstanceRef.current) return;
    const L = window.L;
    const map = L.map(mapContainerRef.current, { zoomControl: true, attributionControl: false }).setView([35.38, -77.99], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [leafletReady]);

  // Update markers when filtered jobs change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;
    const L = window.L;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
    markersRef.current = {};

    // Add new markers
    locatedJobs.forEach((j) => {
      const g = j._geo;
      const st = getStage(j.checks, j.serviceType, soilFlag(j));
      const next = getNextAction(j.checks, j.serviceType, soilFlag(j), j);
      const alert = getAlertMsg(j);
      const ready = j.checks?.approved && !j.checks?.scheduled;

      const popup = `
        <div style="font-family:sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:14px;text-transform:uppercase;margin-bottom:4px">${(j.customerName || "").replace(/"/g, "&quot;")}</div>
          <div style="font-size:12px;color:#555;margin-bottom:2px">${j.serviceType || ""} ${j.city ? "— " + j.city : ""}</div>
          <div style="font-size:12px;color:${st.color};font-weight:600;margin-bottom:2px">${st.label}</div>
          ${j.assignedTo ? `<div style="font-size:11px;color:#5BA3D1">Assigned: ${j.assignedTo}</div>` : ""}
          ${next ? `<div style="font-size:11px;color:#C48A08;margin-top:3px">Next: ${next.label}</div>` : ""}
          ${ready ? `<div style="font-size:11px;color:#4CAF50;font-weight:600">Ready to schedule</div>` : ""}
          ${alert ? `<div style="font-size:11px;color:#D64545;font-weight:600;margin-top:2px">${alert}</div>` : ""}
        </div>
      `;

      const marker = L.circleMarker([g.lat, g.lon], {
        radius: 10,
        fillColor: st.color,
        color: "#fff",
        weight: 2,
        fillOpacity: 0.9,
      }).addTo(map).bindPopup(popup);

      marker.on("click", () => setHighlighted(j.id));
      markersRef.current[j.id] = marker;
    });

    // Fit bounds
    if (locatedJobs.length > 1) {
      const bounds = locatedJobs.map((j) => [j._geo.lat, j._geo.lon]);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (locatedJobs.length === 1) {
      map.setView([locatedJobs[0]._geo.lat, locatedJobs[0]._geo.lon], 12);
    }
  }, [locatedJobs]);

  // Highlight marker when clicking job in list
  const focusJob = useCallback((job) => {
    setHighlighted(job.id);
    const marker = markersRef.current[job.id];
    const map = mapInstanceRef.current;
    if (marker && map && job._geo) {
      map.setView([job._geo.lat, job._geo.lon], 13, { animate: true });
      marker.openPopup();
    }
  }, []);

  const activeFilterCount =
    (serviceFilter !== "All" ? 1 : 0) +
    (stageFilter !== "All" ? 1 : 0) +
    (showOverdueOnly ? 1 : 0) +
    (showReadyOnly ? 1 : 0);

  return (
    <div>
      {/* Header + Filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontFamily: "var(--heading-font)", fontSize: 20, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
          Job Map
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 400, marginLeft: 8 }}>
            {locatedJobs.length} plotted
          </span>
        </div>
      </div>

      {/* Filter row */}
      <div className="map-filters">
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="map-filter-select">
          {SERVICES.map((s) => <option key={s} value={s}>{s === "All" ? "All Services" : s}</option>)}
        </select>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="map-filter-select">
          {STAGES.map((s) => <option key={s} value={s}>{s === "All" ? "All Stages" : s}</option>)}
        </select>
        <label className="map-filter-check">
          <input type="checkbox" checked={showOverdueOnly} onChange={(e) => setShowOverdueOnly(e.target.checked)} />
          <span>Overdue</span>
        </label>
        <label className="map-filter-check">
          <input type="checkbox" checked={showReadyOnly} onChange={(e) => setShowReadyOnly(e.target.checked)} />
          <span>Ready</span>
        </label>
        {activeFilterCount > 0 && (
          <button onClick={() => { setServiceFilter("All"); setStageFilter("All"); setShowOverdueOnly(false); setShowReadyOnly(false); }} className="map-filter-clear">Clear</button>
        )}
      </div>

      {/* Map */}
      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--card-border)", height: 380, marginBottom: 12, background: "#E8E8E4", position: "relative" }}>
        {!leafletReady && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
            Loading map...
          </div>
        )}
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Stage legend */}
      <div className="map-legend">
        {[
          { label: "New/Contacted", color: "#5BA3D1" },
          { label: "Consultation", color: "#B07CC6" },
          { label: "Sampling", color: "#8B6FC0" },
          { label: "Awaiting/Quoting", color: "#C48A08" },
          { label: "Quote Sent", color: "#D4740A" },
          { label: "Approved", color: "#4CAF50" },
          { label: "Scheduled", color: "#2E7D32" },
          { label: "Follow-Up", color: "#43A047" },
        ].map((s) => (
          <div key={s.label} className="map-legend-item">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block", flexShrink: 0 }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Job list — plotted */}
      {locatedJobs.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="map-section-label">On Map ({locatedJobs.length})</div>
          {locatedJobs.map((j) => {
            const st = getStage(j.checks, j.serviceType, soilFlag(j));
            const next = getNextAction(j.checks, j.serviceType, soilFlag(j), j);
            const alert = getAlertMsg(j);
            const isHL = highlighted === j.id;
            return (
              <div
                key={j.id}
                onClick={() => focusJob(j)}
                onDoubleClick={() => onSelect(j)}
                className="map-job-row"
                style={{ borderLeftColor: st.color, background: isHL ? "#4CAF5008" : "var(--card-bg)", boxShadow: isHL ? "0 0 0 2px #4CAF5040" : "none" }}
              >
                <div className="map-job-main">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="map-job-name">{j.customerName}</div>
                    <div className="map-job-meta">
                      {j.serviceType && <span>{j.serviceType}</span>}
                      {j.city && <span>{j.city}{j.state ? ", " + j.state : ""}</span>}
                      {j.assignedTo && <span style={{ color: "var(--info)" }}>{j.assignedTo}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{st.label}</span>
                    {next && <span style={{ fontSize: 10, color: "var(--warning)" }}>Next: {next.label}</span>}
                  </div>
                </div>
                {alert && <div className="map-job-alert">{alert}</div>}
                {j.checks?.approved && !j.checks?.scheduled && (
                  <div style={{ fontSize: 10, color: "var(--success)", fontWeight: 600, marginTop: 2 }}>Ready to schedule</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unlocated */}
      {unlocatedJobs.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="map-section-label" style={{ color: "var(--warning)" }}>City Not Recognized ({unlocatedJobs.length})</div>
          {unlocatedJobs.map((j) => (
            <div key={j.id} onClick={() => onSelect(j)} className="map-job-row" style={{ borderLeftColor: "var(--warning)", opacity: 0.7 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{j.customerName}</span>
              <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: 12 }}>{j.city || j.address} — tap to edit</span>
            </div>
          ))}
        </div>
      )}

      {/* No city */}
      {noCityJobs.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="map-section-label" style={{ color: "var(--text-muted)" }}>No Location ({noCityJobs.length})</div>
          {noCityJobs.map((j) => (
            <div key={j.id} onClick={() => onSelect(j)} className="map-job-row" style={{ borderLeftColor: "var(--border)", opacity: 0.5 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{j.customerName}</span>
              <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: 12 }}>Tap to add city</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filteredJobs.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 14 }}>
          No jobs match current filters
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
        Tap a job to focus on map. Double-tap to open details.
      </div>
    </div>
  );
}
