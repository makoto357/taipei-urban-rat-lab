import type {
  ExpressionSpecification,
  FilterSpecification,
  Map as MapLibreMap,
} from "maplibre-gl";
import type { MockResearchMapData } from "./mockResearchData";
import type { MockPopupKind } from "./mockDataPopups";

type MockLayerKey =
  | "controlContraceptive"
  | "controlRodenticide"
  | "controlUnknown"
  | "sampleRecords"
  | "captureEncounters"
  | "geneticSamples"
  | "geneticRelationshipNodes"
  | "geneticParentRelationships"
  | "geneticSiblingRelationships"
  | "geneticOtherRelationships";

export const mockLayerIds = {
  controlContraceptive: ["control-records-contraceptive-circle"],
  controlRodenticide: ["control-records-rodenticide-square"],
  controlUnknown: ["control-records-unknown-circle"],
  sampleRecords: ["sample-records-circle"],
  captureEncounters: [
    "capture-connections-line",
    "capture-connections-hit-line",
    "capture-encounters-first-circle",
    "capture-encounters-recapture-circle",
    "capture-encounters-unknown-circle",
  ],
  geneticSamples: ["genetic-samples-circle"],
  geneticRelationshipNodes: ["genetic-relationship-nodes-circle"],
  geneticParentRelationships: [
    "genetic-relationships-parent-line",
    "genetic-relationships-parent-hit-line",
  ],
  geneticSiblingRelationships: [
    "genetic-relationships-sibling-line",
    "genetic-relationships-sibling-hit-line",
  ],
  geneticOtherRelationships: [
    "genetic-relationships-other-line",
    "genetic-relationships-other-hit-line",
  ],
} as const satisfies Record<MockLayerKey, readonly string[]>;

export const mockInteractiveLayerKinds: ReadonlyArray<
  readonly [string, MockPopupKind]
> = [
  ["control-records-contraceptive-circle", "controlRecords"],
  ["control-records-rodenticide-square", "controlRecords"],
  ["control-records-unknown-circle", "controlRecords"],
  ["sample-records-circle", "sampleRecords"],
  ["capture-connections-line", "captureConnections"],
  ["capture-connections-hit-line", "captureConnections"],
  ["capture-encounters-first-circle", "captureEncounters"],
  ["capture-encounters-recapture-circle", "captureEncounters"],
  ["capture-encounters-unknown-circle", "captureEncounters"],
  ["genetic-samples-circle", "geneticSamples"],
  ["genetic-relationships-parent-line", "geneticRelationships"],
  ["genetic-relationships-parent-hit-line", "geneticRelationships"],
  ["genetic-relationships-sibling-line", "geneticRelationships"],
  ["genetic-relationships-sibling-hit-line", "geneticRelationships"],
  ["genetic-relationships-other-line", "geneticRelationships"],
  ["genetic-relationships-other-hit-line", "geneticRelationships"],
];

const visibility = (visible: boolean) => ({
  visibility: visible ? ("visible" as const) : ("none" as const),
});

const circleRadius: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  9,
  3.5,
  13,
  5.5,
  17,
  8,
];
const geneticSampleRadius: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  9,
  5.5,
  13,
  7.5,
  17,
  10.5,
];

export const addMockResearchLayers = (
  map: MapLibreMap,
  data: MockResearchMapData,
  layerVisibility: Record<MockLayerKey, boolean>,
) => {
  map.addSource("controlRecords", {
    type: "geojson",
    data: data.controlRecords,
  });
  map.addSource("sampleRecords", { type: "geojson", data: data.sampleRecords });
  map.addSource("captureEncounters", {
    type: "geojson",
    data: data.captureEncounters,
  });
  map.addSource("captureConnections", {
    type: "geojson",
    data: data.captureConnections,
  });
  map.addSource("geneticSamples", {
    type: "geojson",
    data: data.geneticSamples,
  });
  map.addSource("geneticRelationships", {
    type: "geojson",
    data: data.geneticRelationships,
  });
  map.addSource("geneticRelationshipNodes", {
    type: "geojson",
    data: data.geneticRelationshipNodes,
  });

  const relationshipBeforeId = map.getLayer("districts-line")
    ? "districts-line"
    : undefined;
  const addRelationshipLine = (
    key:
      | "geneticParentRelationships"
      | "geneticSiblingRelationships"
      | "geneticOtherRelationships",
    id: "parent" | "sibling" | "other",
    filter: FilterSpecification,
    width: number,
    dashed = false,
  ) => {
    map.addLayer(
      {
        id: `genetic-relationships-${id}-line`,
        type: "line",
        source: "geneticRelationships",
        filter,
        layout: visibility(layerVisibility[key]),
        paint: {
          "line-color": "#776A97",
          "line-width": width,
          "line-opacity": 0.72,
          ...(dashed ? { "line-dasharray": [2, 2] } : {}),
        },
      },
      relationshipBeforeId,
    );
    map.addLayer(
      {
        id: `genetic-relationships-${id}-hit-line`,
        type: "line",
        source: "geneticRelationships",
        filter,
        layout: visibility(layerVisibility[key]),
        paint: {
          "line-color": "#000000",
          "line-width": 12,
          "line-opacity": 0.01,
        },
      },
      relationshipBeforeId,
    );
  };

  addRelationshipLine(
    "geneticParentRelationships",
    "parent",
    ["==", ["get", "relationshipType"], "parent_offspring"],
    4,
  );
  addRelationshipLine(
    "geneticSiblingRelationships",
    "sibling",
    [
      "in",
      ["get", "relationshipType"],
      ["literal", ["full_sibling", "half_sibling"]],
    ],
    2.5,
  );
  addRelationshipLine(
    "geneticOtherRelationships",
    "other",
    ["==", ["get", "relationshipType"], "other_related"],
    2,
    true,
  );

  map.addLayer({
    id: "capture-connections-line",
    type: "line",
    source: "captureConnections",
    minzoom: 11,
    layout: visibility(layerVisibility.captureEncounters),
    paint: {
      "line-color": "#4388E8",
      "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1.2, 17, 3],
      "line-opacity": 0.62,
    },
  });
  map.addLayer({
    id: "capture-connections-hit-line",
    type: "line",
    source: "captureConnections",
    minzoom: 11,
    layout: visibility(layerVisibility.captureEncounters),
    paint: {
      "line-color": "#000000",
      "line-width": 12,
      "line-opacity": 0.01,
    },
  });

  map.addLayer({
    id: "control-records-contraceptive-circle",
    type: "circle",
    source: "controlRecords",
    filter: ["==", ["get", "productCategory"], "contraceptive"],
    layout: visibility(layerVisibility.controlContraceptive),
    paint: {
      "circle-color": "#D90F7D",
      "circle-radius": circleRadius,
      "circle-opacity": 0.9,
      "circle-stroke-color": "#000000",
      "circle-stroke-width": 1.4,
    },
  });
  map.addLayer({
    id: "control-records-rodenticide-square",
    type: "symbol",
    source: "controlRecords",
    filter: ["==", ["get", "productCategory"], "rodenticide"],
    layout: {
      ...visibility(layerVisibility.controlRodenticide),
      "text-field": "■",
      "text-font": ["Noto Sans Regular"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 9, 12, 17, 24],
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#D90F7D",
      "text-halo-color": "#000000",
      "text-halo-width": 1,
    },
  });
  map.addLayer({
    id: "control-records-unknown-circle",
    type: "circle",
    source: "controlRecords",
    filter: ["==", ["get", "productCategory"], "unknown"],
    layout: visibility(layerVisibility.controlUnknown),
    paint: {
      "circle-color": "rgba(0, 0, 0, 0)",
      "circle-radius": circleRadius,
      "circle-stroke-color": "#D90F7D",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "sample-records-circle",
    type: "circle",
    source: "sampleRecords",
    layout: visibility(layerVisibility.sampleRecords),
    paint: {
      "circle-color": "#168778",
      "circle-radius": circleRadius,
      "circle-opacity": 0.9,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.4,
    },
  });

  const captureLayer = (
    id: string,
    captureStatus: string,
    color: string,
    strokeColor: string,
    strokeWidth: number,
  ) =>
    map.addLayer({
      id,
      type: "circle",
      source: "captureEncounters",
      filter: ["==", ["get", "captureStatus"], captureStatus],
      layout: visibility(layerVisibility.captureEncounters),
      paint: {
        "circle-color": color,
        "circle-radius": circleRadius,
        "circle-opacity": 0.92,
        "circle-stroke-color": strokeColor,
        "circle-stroke-width": strokeWidth,
      },
    });
  captureLayer(
    "capture-encounters-first-circle",
    "first_capture",
    "#4388E8",
    "#000000",
    1.5,
  );
  captureLayer(
    "capture-encounters-recapture-circle",
    "recapture",
    "#4388E8",
    "#000000",
    1.5,
  );
  captureLayer(
    "capture-encounters-unknown-circle",
    "unknown",
    "#858b87",
    "#ffffff",
    1.8,
  );

  map.addLayer({
    id: "genetic-relationship-nodes-circle",
    type: "circle",
    source: "geneticRelationshipNodes",
    layout: visibility(layerVisibility.geneticRelationshipNodes),
    paint: {
      "circle-color": "#776A97",
      "circle-radius": circleRadius,
      "circle-opacity": 0.94,
      "circle-stroke-color": "#000000",
      "circle-stroke-width": 1.5,
    },
  });

  map.addLayer({
    id: "genetic-samples-circle",
    type: "circle",
    source: "geneticSamples",
    layout: visibility(layerVisibility.geneticSamples),
    paint: {
      "circle-color": "#776A97",
      "circle-radius": geneticSampleRadius,
      "circle-opacity": 0.72,
      "circle-stroke-color": "#000000",
      "circle-stroke-width": 1.25,
    },
  });
  map.moveLayer("genetic-samples-circle", "capture-encounters-first-circle");
  map.moveLayer(
    "genetic-relationship-nodes-circle",
    "capture-encounters-first-circle",
  );
};
