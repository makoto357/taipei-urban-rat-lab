import type { StyleSpecification } from "maplibre-gl";
import { createBaseMapStyle } from "./baseMap";

export const createDataMapStyle = (): StyleSpecification => {
  const style = createBaseMapStyle();

  style.sources.districts = {
    type: "geojson",
    data: "/data/taipei-dist.geojson",
  };
  style.sources.citizenReports = {
    type: "geojson",
    data: "/data/citizen-reports.geojson",
  };

  style.layers.push(
    {
      id: "districts-selected-fill",
      type: "fill",
      source: "districts",
      filter: ["==", ["get", "TNAME"], ""],
      layout: {
        visibility: "none",
      },
      paint: {
        "fill-color": "#D65B37",
        "fill-opacity": 0.14,
      },
    },
    {
      id: "districts-line",
      type: "line",
      source: "districts",
      layout: {
        visibility: "none",
      },
      paint: {
        "line-color": "#000000",
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1, 14, 2],
        "line-opacity": 0.78,
      },
    },
    {
      id: "districts-selected-line",
      type: "line",
      source: "districts",
      filter: ["==", ["get", "TNAME"], ""],
      layout: {
        visibility: "none",
      },
      paint: {
        "line-color": "#D65B37",
        "line-width": ["interpolate", ["linear"], ["zoom"], 9, 4, 14, 7],
        "line-opacity": 1,
      },
    },
    {
      id: "districts-label",
      type: "symbol",
      source: "districts",
      minzoom: 9,
      layout: {
        visibility: "none",
        "text-field": ["get", "TNAME"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 12, 14, 15],
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#000000",
        "text-halo-color": "rgba(244, 238, 221, 0.94)",
        "text-halo-width": 1.5,
        "text-halo-blur": 0.5,
      },
    },
    {
      id: "citizen-reports-rat-circle",
      type: "circle",
      source: "citizenReports",
      filter: ["==", ["get", "reportType"], "rat"],
      paint: {
        "circle-color": "#D65B37",
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          2.5,
          13,
          4,
          17,
          7,
        ],
        "circle-opacity": 0.82,
        "circle-stroke-color": "#000000",
        "circle-stroke-width": 1.5,
      },
    },
    {
      id: "citizen-reports-bait-circle",
      type: "circle",
      source: "citizenReports",
      filter: ["==", ["get", "reportType"], "bait"],
      paint: {
        "circle-color": "#F35AAF",
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          2.5,
          13,
          4,
          17,
          7,
        ],
        "circle-opacity": 0.82,
        "circle-stroke-color": "#000000",
        "circle-stroke-width": 1.5,
      },
    },
  );

  return style;
};
