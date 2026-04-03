"use client";

import { useMemo, useRef } from "react";
import { getStage, jobLocation } from "../lib/jobUtils";

const NC_CITIES={"goldsboro":{lat:35.3849,lon:-77.9928},"pikeville":{lat:35.4971,lon:-77.8850},"smithfield":{lat:35.5085,lon:-78.3394},"wilson":{lat:35.7212,lon:-77.9156},"kinston":{lat:35.2627,lon:-77.5816},"greenville":{lat:35.6127,lon:-77.3664},"clayton":{lat:35.6507,lon:-78.4564},"selma":{lat:35.5363,lon:-78.2842},"la grange":{lat:35.3069,lon:-77.7883},"mount olive":{lat:35.1968,lon:-78.0664},"snow hill":{lat:35.4518,lon:-77.6811},"clinton":{lat:35.0049,lon:-78.3233},"dunn":{lat:35.3063,lon:-78.6089},"new bern":{lat:35.1085,lon:-77.0441},"jacksonville":{lat:34.7541,lon:-77.4303},"morehead city":{lat:34.7230,lon:-76.7260},"raleigh":{lat:35.7796,lon:-78.6382},"fayetteville":{lat:35.0527,lon:-78.8784},"rocky mount":{lat:35.9382,lon:-77.7905},"ayden":{lat:35.4727,lon:-77.4155},"farmville":{lat:35.5955,lon:-77.5858},"tarboro":{lat:35.8968,lon:-77.5358},"havelock":{lat:34.8791,lon:-76.9014},"beulaville":{lat:34.9244,lon:-77.7689},"benson":{lat:35.3824,lon:-78.5486},"princeton":{lat:35.4660,lon:-78.1603},"kenly":{lat:35.5960,lon:-78.1233},"erwin":{lat:35.3268,lon:-78.6764},"garner":{lat:35.7113,lon:-78.6142},"fuquay-varina":{lat:35.5843,lon:-78.8000},"angier":{lat:35.5072,lon:-78.7392},"spring lake":{lat:35.1749,lon:-78.9722},"sanford":{lat:35.4799,lon:-79.1803},"lillington":{lat:35.3988,lon:-78.8158},"burgaw":{lat:34.5521,lon:-77.9261},"wallace":{lat:34.7357,lon:-77.9953},"warsaw":{lat:35.0027,lon:-78.0914},"kenansville":{lat:34.9624,lon:-77.9622},"richlands":{lat:34.8991,lon:-77.5469},"swansboro":{lat:34.6877,lon:-77.1190},"beaufort":{lat:34.7182,lon:-76.6638},"newport":{lat:34.7869,lon:-76.8591},"dudley":{lat:35.2724,lon:-78.0275},"fremont":{lat:35.5441,lon:-77.9739},"seven springs":{lat:35.2268,lon:-77.8361},"faison":{lat:35.1146,lon:-78.0986},"calypso":{lat:35.1571,lon:-78.0911},"albertson":{lat:35.1185,lon:-77.8558},"hookerton":{lat:35.4271,lon:-77.5778},"cove city":{lat:35.1649,lon:-77.3081},"pink hill":{lat:35.0524,lon:-77.7386},"trenton":{lat:35.0668,lon:-77.3527},"pollocksville":{lat:35.0052,lon:-77.2186},"maysville":{lat:34.9052,lon:-77.2328},"bayboro":{lat:35.1560,lon:-76.7699},"youngsville":{lat:36.0246,lon:-78.4742},"mt olive":{lat:35.1968,lon:-78.0664},"fuquay varina":{lat:35.5843,lon:-78.8000}};

export default function MapView({ jobs, onSelect }) {
  const mapRef = useRef(null);
  const mapJobs = jobs.filter((j) => !j.isDead);

  const geocoded = {};
  mapJobs.forEach((j) => {
    const city = (j.city || "").trim().toLowerCase();
    if (city && NC_CITIES[city]) {
      geocoded[j.id] = NC_CITIES[city];
    } else if (city) {
      const match = Object.keys(NC_CITIES).find((k) => k.includes(city) || city.includes(k));
      if (match) geocoded[j.id] = NC_CITIES[match];
    }
  });

  const located = mapJobs.filter((j) => geocoded[j.id]);
  const notLocated = mapJobs.filter((j) => !geocoded[j.id] && (j.city || j.address));
  const noCity = mapJobs.filter((j) => !j.city && !j.address);

  const cLat = located.length > 0 ? located.reduce((s, j) => s + geocoded[j.id].lat, 0) / located.length : 35.38;
  const cLon = located.length > 0 ? located.reduce((s, j) => s + geocoded[j.id].lon, 0) / located.length : -77.99;

  const mapHtml = useMemo(() => {
    if (located.length === 0) return "";
    const markers = located.map((j) => {
      const g = geocoded[j.id];
      const st = getStage(j.checks, j.serviceType);
      const nm = (j.customerName || "").replace(/'/g, "&#39;");
      const sv = (j.serviceType || "").replace(/'/g, "&#39;");
      const ct = (j.city || "").replace(/'/g, "&#39;");
      return `L.circleMarker([${g.lat},${g.lon}],{radius:10,fillColor:'${st.color}',color:'#fff',weight:2,fillOpacity:0.9}).addTo(map).bindPopup('<b>${nm}</b><br>${sv}<br><span style="color:${st.color};font-weight:bold">${st.label}</span><br>${ct}');`;
    }).join("\n");
    const bounds = located.map((j) => `[${geocoded[j.id].lat},${geocoded[j.id].lon}]`).join(",");
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script><style>html,body,#map{margin:0;padding:0;width:100%;height:100%}</style></head><body><div id="map"></div><script>var map=L.map('map').setView([${cLat},${cLon}],${located.length > 1 ? 9 : 12});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'OpenStreetMap'}).addTo(map);${markers}${located.length > 1 ? `map.fitBounds([${bounds}],{padding:[30,30]});` : ""}<\/script></body></html>`;
  }, [located.length]);

  return (
    <div>
      <div style={{ fontFamily: "var(--heading-font)", fontSize: 20, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12 }}>
        Job Map
      </div>

      {located.length > 0 && (
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--card-border)", height: 380, marginBottom: 12 }}>
          <iframe ref={mapRef} srcDoc={mapHtml} style={{ width: "100%", height: "100%", border: "none" }} key={located.length} />
        </div>
      )}

      {located.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, background: "var(--card-bg)", borderRadius: 10, border: "1px solid var(--card-border)", marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Add a city to your jobs to see them on the map</div>
        </div>
      )}

      {located.map((j) => {
        const st = getStage(j.checks, j.serviceType);
        return (
          <div key={j.id} onClick={() => onSelect(j)} style={{ background: "var(--card-bg)", borderRadius: 8, padding: "10px 14px", marginBottom: 6, cursor: "pointer", border: "1px solid var(--card-border)", borderLeftWidth: 4, borderLeftColor: st.color, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "var(--heading-font)", fontWeight: 600, fontSize: 14, textTransform: "uppercase" }}>{j.customerName}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{j.city || j.address}{j.serviceType && " — " + j.serviceType}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, display: "inline-block" }} />
              <span style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>{st.label}</span>
            </div>
          </div>
        );
      })}

      {notLocated.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>City not recognized ({notLocated.length})</div>
          {notLocated.map((j) => (
            <div key={j.id} onClick={() => onSelect(j)} style={{ background: "var(--card-bg)", borderRadius: 6, padding: "8px 12px", marginBottom: 4, cursor: "pointer", border: "1px solid var(--card-border)", opacity: 0.6, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{j.customerName}</span>
              <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>{j.city || j.address}</span>
            </div>
          ))}
        </div>
      )}

      {noCity.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>No city set ({noCity.length})</div>
          {noCity.map((j) => (
            <div key={j.id} onClick={() => onSelect(j)} style={{ background: "var(--card-bg)", borderRadius: 6, padding: "8px 12px", marginBottom: 4, cursor: "pointer", border: "1px solid var(--card-border)", opacity: 0.5, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{j.customerName}</span>
              <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>Tap to add city</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
