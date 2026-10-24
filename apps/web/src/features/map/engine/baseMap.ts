import type {
  ExpressionSpecification,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";

export const TAIPEI_CENTER: [number, number] = [121.5654, 25.033];

export type BaseLayerKey =
  "osmBasemap" | "landuse" | "water" | "roads" | "buildings";

export const initialBaseLayerVisibility: Record<BaseLayerKey, boolean> = {
  osmBasemap: false,
  landuse: true,
  water: true,
  roads: true,
  buildings: true,
};

export const baseLayerIds: Record<BaseLayerKey, readonly string[]> = {
  osmBasemap: ["basemap"],
  landuse: ["landuse-fill"],
  water: ["water-fill"],
  roads: ["roads-label"],
  buildings: ["buildings-fill"],
};

const includesText = (text: string): ExpressionSpecification => [
  ">=",
  [
    "index-of",
    text,
    [
      "coalesce",
      ["get", "使用分區"],
      ["get", "分區簡稱"],
      ["get", "分區代碼"],
      "",
    ],
  ],
  0,
];

export const createBaseMapStyle = (): StyleSpecification => ({
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    basemap: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    },
    landuse: {
      type: "geojson",
      data: "/data/taipei-landuse-detail.geojson",
    },
    water: {
      type: "geojson",
      data: "/data/taipei-water.geojson",
    },
    roads: {
      type: "geojson",
      data: "/data/taipei-roads.geojson",
    },
    boundary: {
      type: "geojson",
      data: "/data/taipei-boundary.geojson",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#E5DECC",
      },
    },
    {
      id: "basemap",
      type: "raster",
      source: "basemap",
      layout: {
        visibility: initialBaseLayerVisibility.osmBasemap ? "visible" : "none",
      },
      paint: {
        "raster-opacity": 0.2,
        "raster-saturation": -1,
      },
    },
    {
      id: "landuse-fill",
      type: "fill",
      source: "landuse",
      paint: {
        "fill-color": [
          "case",
          includesText("住宅"),
          "#D7D4CC",
          ["any", includesText("商業"), includesText("市場")],
          "#C0BDB8",
          [
            "any",
            includesText("公園"),
            includesText("綠地"),
            includesText("保護"),
          ],
          "#97B893",
          ["any", includesText("河川"), includesText("排水")],
          "#D7D4CC",
          [
            "any",
            includesText("學校"),
            includesText("文教"),
            includesText("國小"),
            includesText("國中"),
            includesText("機關"),
          ],
          "#D7D4CC",
          [
            "any",
            includesText("交通"),
            includesText("停車"),
            includesText("道路"),
          ],
          "#E8E5DC",
          includesText("高速公路"),
          "#ffffff00",
          "#D7D4CC",
        ],
        "fill-opacity": 1,
        "fill-outline-color": "rgba(91, 82, 70, 0.28)",
      },
    },
    {
      id: "water-fill",
      type: "fill",
      source: "water",
      paint: {
        "fill-color": "#7BBDB8",
        "fill-opacity": 1,
      },
    },
    {
      id: "roads-label",
      type: "symbol",
      source: "roads",
      minzoom: 13,
      filter: ["all", ["has", "name"], ["!=", ["get", "name"], ""]],
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 420,
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10, 17, 13],
        "text-rotation-alignment": "map",
        "text-pitch-alignment": "viewport",
        "text-max-angle": 35,
        "text-padding": 4,
        "text-allow-overlap": false,
        "text-ignore-placement": false,
      },
      paint: {
        "text-color": "#3d3a35",
        "text-halo-color": "rgba(255, 255, 255, 0.92)",
        "text-halo-width": 1.5,
        "text-halo-blur": 0.5,
      },
    },
    {
      id: "boundary-line",
      type: "line",
      source: "boundary",
      paint: {
        "line-color": "#1F2923",
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2, 14, 2.8],
        "line-opacity": 0.9,
      },
    },
  ],
});

export const addBaseBuildingsLayer = (map: MapLibreMap, visible: boolean) => {
  if (map.getSource("buildings")) return;

  map.addSource("buildings", {
    type: "geojson",
    data: "/data/taipei-buildings.geojson",
  });
  map.addLayer(
    {
      id: "buildings-fill",
      type: "fill",
      source: "buildings",
      minzoom: 15,
      layout: {
        visibility: visible ? "visible" : "none",
      },
      paint: {
        "fill-color": "#626864",
        "fill-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          15,
          0.16,
          18,
          0.34,
        ],
        "fill-outline-color": "rgba(65, 71, 67, 0.42)",
      },
    },
    map.getLayer("roads-label") ? "roads-label" : undefined,
  );
};

export const setBaseLayerVisibility = (
  map: MapLibreMap,
  layerKey: BaseLayerKey,
  visible: boolean,
) => {
  for (const layerId of baseLayerIds[layerKey]) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(
        layerId,
        "visibility",
        visible ? "visible" : "none",
      );
    }
  }
};
