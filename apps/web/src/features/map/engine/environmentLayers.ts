import type { ExpressionSpecification, Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";

export type EnvironmentLayerKey =
  "markets" | "trashBins" | "garbageStops" | "parks" | "vacantSpaces";

export const environmentLayerIds = {
  markets: ["environment-markets-fill"],
  trashBins: ["environment-trash-bins-circle"],
  garbageStops: ["environment-garbage-stops-star"],
  parks: ["environment-parks-fill"],
  vacantSpaces: ["environment-vacant-spaces-circle"],
} as const satisfies Record<EnvironmentLayerKey, readonly string[]>;

const includesPropertyText = (
  property: string,
  text: string,
): ExpressionSpecification => [
  ">=",
  ["index-of", text, ["coalesce", ["get", property], ""]],
  0,
];

export const addVacantSpacesLayer = (map: MapLibreMap, visible: boolean) => {
  map.addLayer({
    id: "environment-vacant-spaces-circle",
    type: "circle",
    source: "officialObservations",
    filter: [
      "any",
      includesPropertyText("observationTypes", "clutter"),
      includesPropertyText("observationTypes", "unused_space"),
    ],
    minzoom: 11,
    layout: visibility(visible),
    paint: {
      "circle-color": "#58A960",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3, 16, 7],
      "circle-stroke-color": "#000000",
      "circle-stroke-width": 1.2,
      "circle-opacity": 0.88,
    },
  });
};

const includesLanduseText = (text: string) =>
  includesPropertyText("使用分區", text);

const visibility = (visible: boolean) => ({
  visibility: visible ? ("visible" as const) : ("none" as const),
});

type GarbageStopProperties = Record<string, unknown> & {
  抵達時間?: unknown;
  離開時間?: unknown;
};

const parseHhmm = (value: unknown) => {
  if (typeof value !== "string" && typeof value !== "number") return null;

  const text = String(value).trim().padStart(4, "0");
  if (!/^\d{4}$/.test(text)) return null;

  const hours = Number(text.slice(0, 2));
  const minutes = Number(text.slice(2));
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
};

const getStopDurationMinutes = (properties: GarbageStopProperties) => {
  const arrival = parseHhmm(properties.抵達時間);
  let departure = parseHhmm(properties.離開時間);
  if (arrival === null || departure === null) return null;

  if (departure < arrival) departure += 24 * 60;
  return departure - arrival;
};

const loadLongGarbageStops = async (signal: AbortSignal) => {
  const response = await fetch("/data/taipei-garbage-truck-stops.geojson", {
    signal,
  });
  if (!response.ok) {
    throw new Error(`垃圾車停靠點資料載入失敗（${response.status}）`);
  }

  const data = (await response.json()) as FeatureCollection<
    Point,
    GarbageStopProperties
  >;

  return {
    ...data,
    features: data.features.filter((feature) => {
      const duration = getStopDurationMinutes(feature.properties);
      return duration !== null && duration > 30;
    }),
  } satisfies FeatureCollection<Point, GarbageStopProperties>;
};

export const addEnvironmentLayers = async (
  map: MapLibreMap,
  layerVisibility: Record<EnvironmentLayerKey, boolean>,
  signal: AbortSignal,
) => {
  map.addSource("trashBins", {
    type: "geojson",
    data: "/data/taipei-bins.geojson",
  });
  const longGarbageStops = await loadLongGarbageStops(signal);
  if (signal.aborted) return;

  map.addSource("garbageStops", { type: "geojson", data: longGarbageStops });

  const beforeLayerId = map.getLayer("districts-line")
    ? "districts-line"
    : undefined;

  map.addLayer(
    {
      id: "environment-markets-fill",
      type: "fill",
      source: "landuse",
      filter: includesLanduseText("市場"),
      layout: visibility(layerVisibility.markets),
      paint: {
        "fill-color": "#3E7B66",
        "fill-opacity": 0.78,
        "fill-outline-color": "#000000",
      },
    },
    beforeLayerId,
  );
  map.addLayer(
    {
      id: "environment-parks-fill",
      type: "fill",
      source: "landuse",
      filter: ["any", includesLanduseText("公園"), includesLanduseText("綠地")],
      layout: visibility(layerVisibility.parks),
      paint: {
        "fill-color": "#58A960",
        "fill-opacity": 0.7,
        "fill-outline-color": "#000000",
      },
    },
    beforeLayerId,
  );
  map.addLayer({
    id: "environment-garbage-stops-star",
    type: "symbol",
    source: "garbageStops",
    minzoom: 11,
    layout: {
      ...visibility(layerVisibility.garbageStops),
      "text-field": "★",
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 11, 12, 16, 22],
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#3E7B66",
      "text-halo-color": "#000000",
      "text-halo-width": 1,
    },
  });
  map.addLayer({
    id: "environment-trash-bins-circle",
    type: "circle",
    source: "trashBins",
    minzoom: 11,
    layout: visibility(layerVisibility.trashBins),
    paint: {
      "circle-color": "#3E7B66",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2, 16, 6],
      "circle-stroke-color": "#000000",
      "circle-stroke-width": 1.2,
      "circle-opacity": 0.88,
    },
  });
};
