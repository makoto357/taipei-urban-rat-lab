import type { Map as MapLibreMap } from "maplibre-gl";

export type InfrastructureLayerKey = "sewer" | "stormwater";

export const infrastructureLayerIds = {
  sewer: ["sewer-pipes-line", "sewer-manholes-circle"],
  stormwater: ["stormwater-pipes-line", "stormwater-manholes-circle"],
} as const satisfies Record<InfrastructureLayerKey, readonly string[]>;

export const addInfrastructureLayers = (
  map: MapLibreMap,
  visibility: Record<InfrastructureLayerKey, boolean>,
) => {
  map.addSource("sewerPipes", {
    type: "geojson",
    data: "/data/taipei-sewer-pipes.geojson",
  });
  map.addSource("sewerManholes", {
    type: "geojson",
    data: "/data/taipei-sewer-manholes.geojson",
  });
  map.addSource("stormwaterPipes", {
    type: "geojson",
    data: "/data/taipei-stormwater-pipes.geojson",
  });
  map.addSource("stormwaterManholes", {
    type: "geojson",
    data: "/data/taipei-stormwater-manholes.geojson",
  });

  const beforeLayerId = map.getLayer("districts-line")
    ? "districts-line"
    : undefined;

  map.addLayer(
    {
      id: "sewer-pipes-line",
      type: "line",
      source: "sewerPipes",
      minzoom: 12,
      layout: { visibility: visibility.sewer ? "visible" : "none" },
      paint: {
        "line-color": "#287d98",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.7, 17, 2.4],
        "line-opacity": 0.72,
      },
    },
    beforeLayerId,
  );
  map.addLayer(
    {
      id: "stormwater-pipes-line",
      type: "line",
      source: "stormwaterPipes",
      minzoom: 12,
      layout: { visibility: visibility.stormwater ? "visible" : "none" },
      paint: {
        "line-color": "#287d98",
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.7, 17, 2.4],
        "line-dasharray": [3, 2],
        "line-opacity": 0.72,
      },
    },
    beforeLayerId,
  );
  map.addLayer(
    {
      id: "sewer-manholes-circle",
      type: "circle",
      source: "sewerManholes",
      minzoom: 15,
      layout: { visibility: visibility.sewer ? "visible" : "none" },
      paint: {
        "circle-color": "#f7f2e6",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 2, 18, 4.5],
        "circle-stroke-color": "#287d98",
        "circle-stroke-width": 1.5,
      },
    },
    beforeLayerId,
  );
  map.addLayer(
    {
      id: "stormwater-manholes-circle",
      type: "circle",
      source: "stormwaterManholes",
      minzoom: 15,
      layout: { visibility: visibility.stormwater ? "visible" : "none" },
      paint: {
        "circle-color": "#f7f2e6",
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 15, 2, 18, 4.5],
        "circle-stroke-color": "#287d98",
        "circle-stroke-width": 1.5,
      },
    },
    beforeLayerId,
  );
};
