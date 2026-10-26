import type { StyleSpecification } from "maplibre-gl";

// A small, quiet basemap drawn from our own tile archive (Protomaps schema). It has no text labels on purpose: labels need
// font files, and the point of the map is one marker on streets, not place names. Colours follow the site's warm greys.
export const MAP_TILES_PATH = "/api/map/tiles";

export function mapStyle(origin: string): StyleSpecification {
  return {
    version: 8,
    sources: { base: { type: "vector", url: `pmtiles://${origin}${MAP_TILES_PATH}`, attribution: "© OpenStreetMap contributors, Protomaps" } },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#0b0d08" } },
      { id: "earth", type: "fill", source: "base", "source-layer": "earth", paint: { "fill-color": "#12160e" } },
      { id: "landuse", type: "fill", source: "base", "source-layer": "landuse", filter: ["in", ["get", "kind"], ["literal", ["park", "forest", "wood", "grass", "garden", "cemetery", "pitch"]]], paint: { "fill-color": "#1a2a12" } },
      { id: "water", type: "fill", source: "base", "source-layer": "water", paint: { "fill-color": "#0e1a1c" } },
      { id: "buildings", type: "fill", source: "base", "source-layer": "buildings", minzoom: 14, paint: { "fill-color": "#1a1f14", "fill-outline-color": "#252d1e" } },
      {
        id: "roads-minor", type: "line", source: "base", "source-layer": "roads", minzoom: 13,
        filter: ["in", ["get", "kind"], ["literal", ["minor_road", "other", "path"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#2b3423", "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.6, 17, 6] },
      },
      {
        id: "roads-medium", type: "line", source: "base", "source-layer": "roads", minzoom: 11,
        filter: ["==", ["get", "kind"], "medium_road"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#2b3423", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.8, 17, 9] },
      },
      {
        id: "roads-major", type: "line", source: "base", "source-layer": "roads",
        filter: ["in", ["get", "kind"], ["literal", ["major_road", "highway"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#5a3a1a", "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 17, 12] },
      },
    ],
  };
}
