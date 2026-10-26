"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect, useRef, useState } from "react";
import { mapStyle } from "./map-style";

export type MapPoint = { t: string; lat: number; lng: number; accuracy_m: number | null };

const EMBER = "#ef6905";
const GRAPHITE = "#f1e5a1";

let protocolReady = false;
function ensureProtocol() {
  if (protocolReady) return;
  maplibregl.addProtocol("pmtiles", new Protocol().tile);
  protocolReady = true;
}

// A circle of `radiusM` metres around a point, as a polygon the map can fill.
function circle(lng: number, lat: number, radiusM: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const ring: [number, number][] = [];
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

// The wearer: a graphite disc with a person in it and an ember ring that pulses, so it reads as "live" at a glance.
function personMarker(): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = "position:relative;width:44px;height:44px;";
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", "Vị trí người đeo đồng hồ");
  const ring = document.createElement("div");
  ring.style.cssText = `position:absolute;inset:0;border-radius:9999px;background:${EMBER};opacity:.35;`;
  ring.animate([{ transform: "scale(.6)", opacity: 0.5 }, { transform: "scale(1.5)", opacity: 0 }], { duration: 1800, iterations: Infinity });
  const disc = document.createElement("div");
  disc.style.cssText = `position:absolute;inset:6px;border-radius:9999px;background:${GRAPHITE};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:grid;place-items:center;`;
  disc.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z"/></svg>';
  el.append(ring, disc);
  return el;
}

function boundsOf(points: MapPoint[]) {
  const b = new maplibregl.LngLatBounds();
  for (const p of points) b.extend([p.lng, p.lat]);
  return b;
}

export default function AlertMap({ points }: { points: MapPoint[] }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const touched = useRef(false);
  const latest = points[points.length - 1];
  const [ready, setReady] = useState(false);
  const [noTiles, setNoTiles] = useState(false);

  // Create the map once.
  useEffect(() => {
    if (!box.current || map.current || !latest) return;
    ensureProtocol();
    const m = new maplibregl.Map({
      container: box.current,
      style: mapStyle(window.location.origin),
      center: [latest.lng, latest.lat],
      zoom: 16,
      attributionControl: { compact: true },
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // Once the viewer has moved the map themselves, later fixes must not pull it away.
    m.on("dragstart", () => { touched.current = true; });
    m.on("zoomstart", (e) => { if ((e as { originalEvent?: unknown }).originalEvent) touched.current = true; });
    m.on("error", (e) => {
      const status = (e as { error?: { status?: number } }).error?.status;
      if (status === 404 || status === 401) setNoTiles(true);
    });
    m.on("load", () => {
      m.addSource("accuracy", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addSource("trail", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "accuracy-fill", type: "fill", source: "accuracy", paint: { "fill-color": EMBER, "fill-opacity": 0.14 } });
      m.addLayer({ id: "accuracy-line", type: "line", source: "accuracy", paint: { "line-color": EMBER, "line-width": 1.2, "line-opacity": 0.6 } });
      m.addLayer({ id: "trail-line", type: "line", source: "trail", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": GRAPHITE, "line-width": 2, "line-dasharray": [2, 2], "line-opacity": 0.55 } });
      m.addLayer({ id: "trail-dots", type: "circle", source: "trail", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 4, "circle-color": "#fff", "circle-stroke-color": GRAPHITE, "circle-stroke-width": 2 } });
      marker.current = new maplibregl.Marker({ element: personMarker() }).setLngLat([latest.lng, latest.lat]).addTo(m);
      setReady(true);
    });
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is created once; points are applied by the effect below
  }, [!!latest]);

  // Apply the points: the first time fit them all, afterwards only follow the newest if the viewer has not moved the map.
  const fitted = useRef(false);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !latest) return;
    marker.current?.setLngLat([latest.lng, latest.lat]);
    (m.getSource("accuracy") as maplibregl.GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: latest.accuracy_m ? [circle(latest.lng, latest.lat, latest.accuracy_m)] : [],
    });
    const earlier = points.slice(0, -1);
    (m.getSource("trail") as maplibregl.GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: [
        ...(points.length > 1 ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: points.map((p) => [p.lng, p.lat]) } }] : []),
        ...earlier.map((p) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] } })),
      ],
    });
    if (!fitted.current) {
      fitted.current = true;
      if (points.length > 1) m.fitBounds(boundsOf(points), { padding: 70, maxZoom: 17, duration: 0 });
      else m.jumpTo({ center: [latest.lng, latest.lat], zoom: 16 });
    } else if (!touched.current) {
      m.easeTo({ center: [latest.lng, latest.lat], duration: 800 });
    }
  }, [points, latest, ready]);

  if (!latest) return null;
  return (
    <div className="relative overflow-hidden rounded-[14px] bg-fog">
      <div ref={box} className="h-[320px] w-full md:h-[380px]" aria-label="Bản đồ vị trí" />
      <button
        type="button"
        onClick={() => {
          touched.current = false;
          map.current?.easeTo({ center: [latest.lng, latest.lat], zoom: Math.max(map.current.getZoom(), 15), duration: 600 });
        }}
        className="absolute bottom-3 left-3 rounded-[20px] bg-canvas-white px-3 py-1.5 text-[13px] shadow-sm"
      >
        Về vị trí hiện tại
      </button>
      {noTiles && (
        <p className="absolute top-3 left-3 max-w-[60%] rounded-[10px] bg-canvas-white/95 px-3 py-1.5 text-[12px] text-steel">
          Chưa có dữ liệu bản đồ trên máy chủ. Vị trí vẫn được đánh dấu.
        </p>
      )}
    </div>
  );
}
