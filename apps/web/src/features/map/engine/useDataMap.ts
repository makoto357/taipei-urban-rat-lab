import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from "maplibre-gl";
import {
  addBaseBuildingsLayer,
  initialBaseLayerVisibility,
  setBaseLayerVisibility,
  TAIPEI_CENTER,
  type BaseLayerKey,
} from "./baseMap";
import { createDataMapStyle } from "./mapStyle";
import {
  addEnvironmentLayers,
  addVacantSpacesLayer,
  environmentLayerIds,
} from "./environmentLayers";
import {
  addInfrastructureLayers,
  infrastructureLayerIds,
} from "./infrastructureLayers";
import { createMockPopupContent } from "./mockDataPopups";
import {
  addMockResearchLayers,
  mockInteractiveLayerKinds,
  mockLayerIds,
} from "./mockMapLayers";
import { loadMockResearchMapData } from "./mockResearchData";
import { loadOfficialObservations } from "./officialObservations";
import { loadRatReportLanduse } from "./ratLanduse";
import { getRiskLevel } from "./riskModel";
import {
  getTimeRangeCutoff,
  getTimeRangeCutoffDate,
  type TimeRangeKey,
} from "../timeRange";

maplibregl.setWorkerUrl(maplibreWorkerUrl);

export type DataLayerKey =
  | "districts"
  | "ratLanduse"
  | "riskCitizen"
  | "riskGovernment"
  | "riskFoodSource"
  | "riskShelter"
  | "riskGroundMovement"
  | "riskUndergroundMovement"
  | "ratReports"
  | "baitReports"
  | "officialEvidence"
  | "officialNoEvidence"
  | "sewer"
  | "stormwater"
  | "markets"
  | "restaurants"
  | "trashBins"
  | "garbageStops"
  | "parks"
  | "vacantSpaces"
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

const reportLayerIds = [
  "citizen-reports-rat-circle",
  "citizen-reports-bait-circle",
] as const;

const officialEvidenceLayerId = "official-observations-evidence-square";
const officialNoEvidenceLayerId = "official-observations-no-evidence-square";
const vacantSpaceLayerId = environmentLayerIds.vacantSpaces[0];

const initialDataLayerVisibility: Record<DataLayerKey, boolean> = {
  districts: false,
  ratLanduse: true,
  riskCitizen: true,
  riskGovernment: true,
  riskFoodSource: true,
  riskShelter: true,
  riskGroundMovement: true,
  riskUndergroundMovement: true,
  ratReports: true,
  baitReports: true,
  officialEvidence: true,
  officialNoEvidence: true,
  sewer: false,
  stormwater: false,
  markets: false,
  restaurants: false,
  trashBins: false,
  garbageStops: false,
  parks: false,
  vacantSpaces: false,
  controlContraceptive: false,
  controlRodenticide: false,
  controlUnknown: false,
  sampleRecords: false,
  captureEncounters: false,
  geneticSamples: false,
  geneticRelationshipNodes: false,
  geneticParentRelationships: false,
  geneticSiblingRelationships: false,
  geneticOtherRelationships: false,
};

const dataLayerIds: Record<DataLayerKey, readonly string[]> = {
  districts: [
    "districts-selected-fill",
    "districts-line",
    "districts-selected-line",
    "districts-label",
  ],
  ratLanduse: ["rat-landuse-fill"],
  riskCitizen: [],
  riskGovernment: [],
  riskFoodSource: [],
  riskShelter: [],
  riskGroundMovement: [],
  riskUndergroundMovement: [],
  ratReports: ["citizen-reports-rat-circle"],
  baitReports: ["citizen-reports-bait-circle"],
  officialEvidence: [officialEvidenceLayerId],
  officialNoEvidence: [officialNoEvidenceLayerId],
  ...infrastructureLayerIds,
  ...environmentLayerIds,
  ...mockLayerIds,
};

const createDataLayerVisibility = (
  visibleLayers: readonly DataLayerKey[],
): Record<DataLayerKey, boolean> => {
  const visible = new Set(visibleLayers);
  return Object.fromEntries(
    (Object.keys(dataLayerIds) as DataLayerKey[]).map((key) => [
      key,
      visible.has(key),
    ]),
  ) as Record<DataLayerKey, boolean>;
};

const getRiskFactorMask = (visibility: Record<DataLayerKey, boolean>) =>
  (visibility.riskCitizen ? 1 : 0) |
  (visibility.riskGovernment ? 2 : 0) |
  (visibility.riskFoodSource ? 4 : 0) |
  (visibility.riskShelter ? 8 : 0);

const createCompositeRiskExpression = (
  visibility: Record<DataLayerKey, boolean>,
): ExpressionSpecification => {
  const mask = getRiskFactorMask(visibility);
  if (mask === 0) return ["literal", 0];
  const property =
    visibility.riskGroundMovement && visibility.riskUndergroundMovement
      ? `risk_combined_movement_${mask}`
      : visibility.riskGroundMovement
        ? `risk_movement_${mask}`
        : visibility.riskUndergroundMovement
          ? `risk_underground_${mask}`
          : `risk_local_${mask}`;
  return ["coalesce", ["get", property], 0];
};

const createRiskColorExpression = (
  score: ExpressionSpecification,
): ExpressionSpecification => [
  "step",
  score,
  "#F8E8A8",
  0.2,
  "#F2CC67",
  0.4,
  "#E99843",
  0.6,
  "#D65B37",
  0.8,
  "#9E352F",
];

const includesPropertyText = (
  property: string,
  text: string,
): ExpressionSpecification =>
  [
    ">=",
    ["index-of", text, ["coalesce", ["get", property], ""]],
    0,
  ];

const applyTimeRangeFilters = (
  map: MapLibreMap,
  range: TimeRangeKey,
) => {
  const cutoff = getTimeRangeCutoffDate(range);
  const dateFilter = (field: string): FilterSpecification =>
    [">=", ["get", field], cutoff ?? ""] as FilterSpecification;
  const combine = (
    base: FilterSpecification | null,
    ...dateFields: string[]
  ): FilterSpecification | null => {
    if (!cutoff) return base;
    const filters = [
      ...(base ? [base] : []),
      ...dateFields.map(dateFilter),
    ];
    return filters.length === 1
      ? filters[0]!
      : (["all", ...filters] as FilterSpecification);
  };
  const setFilter = (
    layerId: string,
    base: FilterSpecification | null,
    ...dateFields: string[]
  ) => {
    if (map.getLayer(layerId)) {
      map.setFilter(layerId, combine(base, ...dateFields));
    }
  };

  setFilter(
    "citizen-reports-rat-circle",
    ["==", ["get", "reportType"], "rat"],
    "observedAt",
  );
  setFilter(
    "citizen-reports-bait-circle",
    ["==", ["get", "reportType"], "bait"],
    "observedAt",
  );
  setFilter(
    officialEvidenceLayerId,
    ["==", ["get", "surveyResult"], "evidence_found"],
    "observedAt",
  );
  setFilter(
    officialNoEvidenceLayerId,
    ["==", ["get", "surveyResult"], "no_evidence_found"],
    "observedAt",
  );
  setFilter(
    vacantSpaceLayerId,
    [
      "any",
      includesPropertyText("observationTypes", "clutter"),
      includesPropertyText("observationTypes", "unused_space"),
    ] as FilterSpecification,
    "observedAt",
  );

  for (const [layerId, category] of [
    ["control-records-contraceptive-circle", "contraceptive"],
    ["control-records-rodenticide-square", "rodenticide"],
    ["control-records-unknown-circle", "unknown"],
  ] as const) {
    setFilter(
      layerId,
      ["==", ["get", "productCategory"], category],
      "latestEventTime",
    );
  }
  setFilter("sample-records-circle", null, "latestEventTime");
  for (const [layerId, status] of [
    ["capture-encounters-first-circle", "first_capture"],
    ["capture-encounters-recapture-circle", "recapture"],
    ["capture-encounters-unknown-circle", "unknown"],
  ] as const) {
    setFilter(
      layerId,
      ["==", ["get", "captureStatus"], status],
      "capturedAt",
    );
  }
  setFilter(
    "capture-connections-line",
    null,
    "fromCapturedAt",
    "toCapturedAt",
  );
  setFilter(
    "capture-connections-hit-line",
    null,
    "fromCapturedAt",
    "toCapturedAt",
  );
  setFilter("genetic-samples-circle", null, "collectedAt");
  setFilter(
    "genetic-relationship-nodes-circle",
    null,
    "firstCapturedAt",
  );
  const relationshipFilters: Array<[
    "parent" | "sibling" | "other",
    FilterSpecification,
  ]> = [
    [
      "parent",
      ["==", ["get", "relationshipType"], "parent_offspring"],
    ],
    [
      "sibling",
      [
        "in",
        ["get", "relationshipType"],
        ["literal", ["full_sibling", "half_sibling"]],
      ],
    ],
    ["other", ["==", ["get", "relationshipType"], "other_related"]],
  ];
  for (const [relationship, base] of relationshipFilters) {
    for (const suffix of ["line", "hit-line"] as const) {
      setFilter(
        `genetic-relationships-${relationship}-${suffix}`,
        base,
        "fromCapturedAt",
        "toCapturedAt",
      );
    }
  }
};

const applyDataLayerVisibility = (
  map: MapLibreMap,
  visibility: Record<DataLayerKey, boolean>,
) => {
  for (const [key, layerIds] of Object.entries(dataLayerIds) as Array<
    [DataLayerKey, readonly string[]]
  >) {
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          visibility[key] ? "visible" : "none",
        );
      }
    }
  }
  if (map.getLayer("rat-landuse-fill")) {
    const score = createCompositeRiskExpression(visibility);
    map.setPaintProperty(
      "rat-landuse-fill",
      "fill-color",
      createRiskColorExpression(score),
    );
    map.setPaintProperty("rat-landuse-fill", "fill-opacity", [
      "case",
      [">", score, 0],
      0.82,
      0,
    ]);
  }
};

const reportDetailFields = [
  ["observedAt", "觀察時間"],
  ["addressText", "地點"],
  ["district", "行政區"],
  ["description", "說明"],
] as const;

const createReportPopupContent = (properties: Record<string, unknown>) => {
  const content = document.createElement("div");
  content.className = "report-popup";

  const title = document.createElement("strong");
  title.className = "report-popup-title";
  title.textContent =
    properties.reportType === "bait" ? "毒餌通報" : "鼠蹤通報";
  content.append(title);

  for (const [field, labelText] of reportDetailFields) {
    let value = properties[field];
    if (value === null || value === undefined || value === "") continue;

    if (field === "observedAt" && typeof value === "string") {
      const timestamp = new Date(value);
      if (!Number.isNaN(timestamp.getTime())) {
        value = timestamp.toLocaleString("zh-TW", {
          timeZone: "Asia/Taipei",
          hour12: false,
        });
      }
    }

    const row = document.createElement("div");
    row.className = "report-popup-row";

    const label = document.createElement("span");
    label.className = "report-popup-label";
    label.textContent = labelText;

    const detail = document.createElement("span");
    detail.textContent = String(value);

    row.append(label, detail);
    content.append(row);
  }

  const photoPaths = properties.photoPaths;
  const photoUrl = Array.isArray(photoPaths) ? photoPaths[0] : undefined;
  if (typeof photoUrl === "string") {
    try {
      const url = new URL(photoUrl);
      if (url.protocol === "https:") {
        const photo = document.createElement("img");
        photo.className = "report-popup-photo";
        photo.alt = "通報照片";
        photo.decoding = "async";
        photo.referrerPolicy = "no-referrer";
        photo.addEventListener("error", () => photo.remove(), { once: true });
        photo.src = url.href;
        content.append(photo);
      }
    } catch {
      // Ignore malformed photo URLs from the report data.
    }
  }

  return content;
};

const pointDetailConfigs = {
  "environment-trash-bins-circle": {
    title: "垃圾桶",
    fields: [
      ["行政區", "行政區"],
      ["地址", "地址"],
      ["備註", "備註"],
    ],
  },
  "environment-restaurants-triangle": {
    title: "餐館",
    fields: [
      ["name", "名稱"],
      ["address", "地址"],
      ["businessId", "商業 ID"],
    ],
  },
  "environment-garbage-stops-star": {
    title: "垃圾車停靠點",
    fields: [
      ["地點", "地點"],
      ["行政區", "行政區"],
      ["里別", "里別"],
      ["路線", "路線"],
      ["車次", "車次"],
      ["抵達時間", "抵達時間"],
      ["離開時間", "離開時間"],
      ["車號", "車號"],
    ],
  },
  "sewer-manholes-circle": {
    title: "污水下水道人孔",
    fields: [["manholeId", "人孔編號"]],
  },
  "stormwater-manholes-circle": {
    title: "雨水下水道人孔",
    fields: [
      ["manholeId", "人孔編號"],
      ["manholeType", "人孔類型"],
      ["usageStatus", "使用狀態"],
      ["lengthM", "長度（m）"],
      ["widthM", "寬度（m）"],
    ],
  },
} as const;

const pointDetailLayerIds = Object.keys(pointDetailConfigs);

const createPointDetailPopupContent = (
  layerId: keyof typeof pointDetailConfigs,
  properties: Record<string, unknown>,
) => {
  const config = pointDetailConfigs[layerId];
  const content = document.createElement("div");
  content.className = "report-popup";

  const title = document.createElement("strong");
  title.className = "report-popup-title";
  title.textContent = config.title;
  content.append(title);

  for (const [property, labelText] of config.fields) {
    const value = properties[property];
    if (value === undefined || value === null || value === "") continue;

    const row = document.createElement("div");
    row.className = "report-popup-row";
    const label = document.createElement("span");
    label.className = "report-popup-label";
    label.textContent = labelText;
    const detail = document.createElement("span");
    detail.textContent = String(value);
    row.append(label, detail);
    content.append(row);
  }
  return content;
};

const surveyResultLabels: Record<string, string> = {
  evidence_found: "發現跡證",
  no_evidence_found: "未發現跡證",
  unable_to_assess: "無法判定",
};

const surveyMethodLabels: Record<string, string> = {
  visual_inspection: "目視巡查",
  routine_inspection: "例行巡查",
  environmental_inspection: "環境巡查",
  trap_survey: "誘捕調查",
};

const createOfficialObservationPopupContent = (
  properties: Record<string, unknown>,
) => {
  const content = document.createElement("div");
  content.className = "report-popup";

  const title = document.createElement("strong");
  title.className = "report-popup-title official-observation-title";
  title.textContent = properties.isSynthetic
    ? "官方巡查（模擬資料）"
    : "官方巡查";
  content.append(title);

  const observedAt = String(properties.observedAt ?? "");
  const timestamp = new Date(observedAt);
  const details: Array<[string, string]> = [
    [
      "觀察時間",
      Number.isNaN(timestamp.getTime())
        ? observedAt
        : timestamp.toLocaleString("zh-TW", {
            timeZone: "Asia/Taipei",
            hour12: false,
          }),
    ],
    ["地點", String(properties.addressText ?? "")],
    [
      "調查方式",
      surveyMethodLabels[String(properties.surveyMethod)] ??
        String(properties.surveyMethod ?? ""),
    ],
    [
      "調查結果",
      surveyResultLabels[String(properties.surveyResult)] ??
        String(properties.surveyResult ?? ""),
    ],
    ["觀察項目", String(properties.observationTypes || "無")],
    ["說明", String(properties.description ?? "")],
    ["建議處理", String(properties.recommendedActions ?? "")],
  ];

  for (const [labelText, value] of details) {
    if (!value) continue;

    const row = document.createElement("div");
    row.className = "report-popup-row";

    const label = document.createElement("span");
    label.className = "report-popup-label";
    label.textContent = labelText;

    const detail = document.createElement("span");
    detail.textContent = value;

    row.append(label, detail);
    content.append(row);
  }

  return content;
};

const createRatLandusePopupContent = (
  properties: Record<string, unknown>,
  visibility: Record<DataLayerKey, boolean>,
) => {
  const content = document.createElement("div");
  content.className = "report-popup";

  const title = document.createElement("strong");
  title.className = "report-popup-title";
  title.textContent = String(properties["使用分區"] ?? "使用分區");
  content.append(title);

  const mask = getRiskFactorMask(visibility);
  const localScore = Number(properties[`risk_local_${mask}`] ?? 0);
  const adjustedProperty =
    visibility.riskGroundMovement && visibility.riskUndergroundMovement
      ? `risk_combined_movement_${mask}`
      : visibility.riskGroundMovement
        ? `risk_movement_${mask}`
        : visibility.riskUndergroundMovement
          ? `risk_underground_${mask}`
          : `risk_local_${mask}`;
  const adjustedScore = Number(properties[adjustedProperty] ?? 0);
  const riskLevel = getRiskLevel(adjustedScore);
  const trialLevel = riskLevel === "unclassified" ? "未分級" : riskLevel;

  const details: Array<[string, string]> = [
    ["試算層級", trialLevel],
    [
      "面積",
      `${Number(properties["area_ha"]).toLocaleString("zh-TW", { maximumFractionDigits: 2 })} ha`,
    ],
    ["綜合相對分數", adjustedScore.toFixed(2)],
    ["街廓自身相對分數", localScore.toFixed(2)],
    ["民眾通報因子", Number(properties.risk_citizen ?? 0).toFixed(2)],
    ["政府調查因子", Number(properties.risk_government ?? 0).toFixed(2)],
    ["食物來源因子", Number(properties.risk_food_source ?? 0).toFixed(2)],
    ["躲藏空間因子", Number(properties.risk_shelter ?? 0).toFixed(2)],
    ["地面移動", visibility.riskGroundMovement ? "已套用" : "未套用"],
    [
      "下水道移動",
      visibility.riskUndergroundMovement ? "已套用" : "未套用",
    ],
  ];

  for (const [labelText, value] of details) {
    const row = document.createElement("div");
    row.className = "report-popup-row";

    const label = document.createElement("span");
    label.className = "report-popup-label";
    label.textContent = labelText;

    const detail = document.createElement("span");
    detail.textContent = value;

    row.append(label, detail);
    content.append(row);
  }

  return content;
};

const extendBounds = (
  bounds: maplibregl.LngLatBounds,
  coordinates: unknown,
) => {
  if (!Array.isArray(coordinates)) return;
  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    const [longitude, latitude] = coordinates;
    if (
      longitude >= -180 &&
      longitude <= 180 &&
      latitude >= -90 &&
      latitude <= 90
    ) {
      bounds.extend([longitude, latitude]);
    }
    return;
  }
  for (const coordinate of coordinates) extendBounds(bounds, coordinate);
};

interface DistrictGeoJson {
  features: Array<{
    properties?: { TNAME?: unknown };
    geometry?: { coordinates?: unknown };
  }>;
}

let districtBoundsPromise:
  Promise<Map<string, maplibregl.LngLatBounds>> | undefined;

const loadDistrictBounds = () => {
  districtBoundsPromise ??= fetch("/data/taipei-dist.geojson").then(
    async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load districts: ${response.status}`);
      }

      const data = (await response.json()) as DistrictGeoJson;
      const districts = new Map<string, maplibregl.LngLatBounds>();
      for (const feature of data.features) {
        const districtName = feature.properties?.TNAME;
        const coordinates = feature.geometry?.coordinates;
        if (typeof districtName !== "string" || coordinates === undefined) {
          continue;
        }

        const bounds =
          districts.get(districtName) ?? new maplibregl.LngLatBounds();
        extendBounds(bounds, coordinates);
        if (!bounds.isEmpty()) districts.set(districtName, bounds);
      }
      return districts;
    },
  );
  return districtBoundsPromise;
};

const fitDistrict = async (map: MapLibreMap, districtName: string) => {
  try {
    const bounds = (await loadDistrictBounds()).get(districtName);
    if (!bounds) return;

    const compactView = map.getContainer().clientWidth < 700;
    const camera = map.cameraForBounds(bounds, {
      padding: compactView ? 16 : 24,
      maxZoom: 14,
    });
    if (!camera) return;

    map.flyTo({
      ...camera,
      duration: 900,
      essential: true,
    });
  } catch (error) {
    console.error("Failed to focus district:", error);
  }
};

export function useDataMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const baseLayerVisibilityRef = useRef({ ...initialBaseLayerVisibility });
  const dataLayerVisibilityRef = useRef({ ...initialDataLayerVisibility });
  const timeRangeRef = useRef<TimeRangeKey>("all");
  const riskReloadControllerRef = useRef<AbortController | null>(null);
  const [baseLayerVisibility, setBaseLayerVisibilityState] = useState({
    ...initialBaseLayerVisibility,
  });
  const [dataLayerVisibility, setDataLayerVisibility] = useState({
    ...initialDataLayerVisibility,
  });
  const [selectedDistrict, setSelectedDistrict] = useState("");

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const deferredDataController = new AbortController();
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: createDataMapStyle(),
      center: TAIPEI_CENTER,
      zoom: 11.3,
      minZoom: 9,
      attributionControl: false,
    });
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(mapContainerRef.current);

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    const reportPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });
    const ratLandusePopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });
    const mockDataPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 10,
    });
    const mockLayerHoverHandlers = new Map<
      string,
      (event: MapLayerMouseEvent) => void
    >();

    const setPointerCursor = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clearPointerCursor = () => {
      map.getCanvas().style.cursor = "";
    };
    const hideMockDetails = () => {
      mockDataPopup.remove();
      clearPointerCursor();
    };

    const showReportDetails = (event: MapLayerMouseEvent) => {
      const properties = event.features?.[0]?.properties;
      if (!properties) return;

      ratLandusePopup.remove();
      map.getCanvas().style.cursor = "pointer";
      reportPopup
        .setLngLat(event.lngLat)
        .setDOMContent(createReportPopupContent(properties))
        .addTo(map);
    };

    const showOfficialObservationDetails = (event: MapLayerMouseEvent) => {
      const properties = event.features?.[0]?.properties;
      if (!properties) return;

      ratLandusePopup.remove();
      map.getCanvas().style.cursor = "pointer";
      reportPopup
        .setLngLat(event.lngLat)
        .setDOMContent(createOfficialObservationPopupContent(properties))
        .addTo(map);
    };

    const showPointDetails = (event: MapLayerMouseEvent) => {
      const properties = event.features?.[0]?.properties;
      const layerId = event.features?.[0]?.layer.id;
      if (!properties || !layerId || !(layerId in pointDetailConfigs)) return;

      ratLandusePopup.remove();
      map.getCanvas().style.cursor = "pointer";
      reportPopup
        .setLngLat(event.lngLat)
        .setDOMContent(
          createPointDetailPopupContent(
            layerId as keyof typeof pointDetailConfigs,
            properties,
          ),
        )
        .addTo(map);
    };

    const hideReportDetails = () => {
      reportPopup.remove();
      map.getCanvas().style.cursor = "";
    };

    const showRatLanduseDetails = (event: MapLayerMouseEvent) => {
      const pointLayers = [
        ...reportLayerIds,
        officialEvidenceLayerId,
        officialNoEvidenceLayerId,
        vacantSpaceLayerId,
        ...pointDetailLayerIds,
        ...mockInteractiveLayerKinds.map(([layerId]) => layerId),
      ].filter((layerId) => map.getLayer(layerId));
      if (
        map.queryRenderedFeatures(event.point, { layers: pointLayers }).length >
        0
      ) {
        ratLandusePopup.remove();
        return;
      }

      const properties = event.features?.[0]?.properties;
      if (!properties) return;

      map.getCanvas().style.cursor = "pointer";
      ratLandusePopup
        .setLngLat(event.lngLat)
        .setDOMContent(
          createRatLandusePopupContent(
            properties,
            dataLayerVisibilityRef.current,
          ),
        )
        .addTo(map);
    };

    const hideRatLanduseDetails = () => {
      ratLandusePopup.remove();
      map.getCanvas().style.cursor = "";
    };

    const loadDeferredLayers = async () => {
      addBaseBuildingsLayer(map, baseLayerVisibilityRef.current.buildings);
      addInfrastructureLayers(map, {
        sewer: dataLayerVisibilityRef.current.sewer,
        stormwater: dataLayerVisibilityRef.current.stormwater,
      });
      for (const layerId of [
        "sewer-manholes-circle",
        "stormwater-manholes-circle",
      ]) {
        map.on("mouseenter", layerId, showPointDetails);
        map.on("mouseleave", layerId, hideReportDetails);
      }
      try {
        await addEnvironmentLayers(
          map,
          {
            markets: dataLayerVisibilityRef.current.markets,
            restaurants: dataLayerVisibilityRef.current.restaurants,
            trashBins: dataLayerVisibilityRef.current.trashBins,
            garbageStops: dataLayerVisibilityRef.current.garbageStops,
            parks: dataLayerVisibilityRef.current.parks,
            vacantSpaces: dataLayerVisibilityRef.current.vacantSpaces,
          },
          deferredDataController.signal,
        );
        for (const layerId of [
          "environment-restaurants-triangle",
          "environment-trash-bins-circle",
          "environment-garbage-stops-star",
        ]) {
          map.on("mouseenter", layerId, showPointDetails);
          map.on("mouseleave", layerId, hideReportDetails);
        }
      } catch (error) {
        if (!deferredDataController.signal.aborted) {
          console.error(error);
        }
      }

      try {
        const cutoff = getTimeRangeCutoff(timeRangeRef.current);
        const data = await loadRatReportLanduse(deferredDataController.signal, {
          observedAfter: cutoff?.toISOString(),
        });
        if (
          deferredDataController.signal.aborted ||
          map.getSource("ratLanduse")
        ) {
          return;
        }

        map.addSource("ratLanduse", { type: "geojson", data });
        map.addLayer(
          {
            id: "rat-landuse-fill",
            type: "fill",
            source: "ratLanduse",
            layout: {
              visibility: dataLayerVisibilityRef.current.ratLanduse
                ? "visible"
                : "none",
            },
            paint: {
              "fill-color": createRiskColorExpression(
                createCompositeRiskExpression(
                  dataLayerVisibilityRef.current,
                ),
              ),
              "fill-opacity": [
                "case",
                [
                  ">",
                  createCompositeRiskExpression(
                    dataLayerVisibilityRef.current,
                  ),
                  0,
                ],
                0.82,
                0,
              ],
              "fill-outline-color": "rgba(0, 0, 0, 0.34)",
            },
          },
          map.getLayer("districts-line") ? "districts-line" : undefined,
        );
        map.on("mousemove", "rat-landuse-fill", showRatLanduseDetails);
        map.on("mouseleave", "rat-landuse-fill", hideRatLanduseDetails);
        applyTimeRangeFilters(map, timeRangeRef.current);
      } catch (error) {
        if (!deferredDataController.signal.aborted) {
          console.error("Failed to load rat-report land-use areas:", error);
        }
      }

      try {
        const data = await loadOfficialObservations(
          deferredDataController.signal,
        );
        if (
          deferredDataController.signal.aborted ||
          map.getSource("officialObservations")
        ) {
          return;
        }

        map.addSource("officialObservations", { type: "geojson", data });
        addVacantSpacesLayer(
          map,
          dataLayerVisibilityRef.current.vacantSpaces,
        );
        const markerSize = 18;
        const filledMarkerData = new Uint8Array(markerSize * markerSize * 4);
        const outlinedMarkerData = new Uint8Array(markerSize * markerSize * 4);
        for (let y = 0; y < markerSize; y += 1) {
          for (let x = 0; x < markerSize; x += 1) {
            const offset = (y * markerSize + x) * 4;
            const border =
              x < 2 || y < 2 || x >= markerSize - 2 || y >= markerSize - 2;
            filledMarkerData[offset] = border ? 0 : 214;
            filledMarkerData[offset + 1] = border ? 0 : 91;
            filledMarkerData[offset + 2] = border ? 0 : 55;
            filledMarkerData[offset + 3] = 255;
            outlinedMarkerData[offset] = border ? 214 : 0;
            outlinedMarkerData[offset + 1] = border ? 91 : 0;
            outlinedMarkerData[offset + 2] = border ? 55 : 0;
            outlinedMarkerData[offset + 3] = border ? 255 : 0;
          }
        }
        if (!map.hasImage("official-observation-square")) {
          map.addImage("official-observation-square", {
            width: markerSize,
            height: markerSize,
            data: filledMarkerData,
          });
        }
        if (!map.hasImage("official-observation-outline-square")) {
          map.addImage("official-observation-outline-square", {
            width: markerSize,
            height: markerSize,
            data: outlinedMarkerData,
          });
        }
        const officialLayers = [
          {
            id: officialEvidenceLayerId,
            result: "evidence_found",
            image: "official-observation-square",
            visible: dataLayerVisibilityRef.current.officialEvidence,
          },
          {
            id: officialNoEvidenceLayerId,
            result: "no_evidence_found",
            image: "official-observation-outline-square",
            visible: dataLayerVisibilityRef.current.officialNoEvidence,
          },
        ] as const;
        for (const layer of officialLayers) {
          map.addLayer({
            id: layer.id,
            type: "symbol",
            source: "officialObservations",
            filter: ["==", ["get", "surveyResult"], layer.result],
            layout: {
              visibility: layer.visible ? "visible" : "none",
              "icon-image": layer.image,
              "icon-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                9,
                0.65,
                13,
                0.9,
                17,
                1.25,
              ],
              "icon-allow-overlap": true,
            },
          });
          map.on("mouseenter", layer.id, showOfficialObservationDetails);
          map.on("mouseleave", layer.id, hideReportDetails);
        }
        map.on(
          "mouseenter",
          vacantSpaceLayerId,
          showOfficialObservationDetails,
        );
        map.on("mouseleave", vacantSpaceLayerId, hideReportDetails);
        applyTimeRangeFilters(map, timeRangeRef.current);
      } catch (error) {
        if (!deferredDataController.signal.aborted) {
          console.error("Failed to load official observations:", error);
        }
      }

      try {
        const data = await loadMockResearchMapData(
          deferredDataController.signal,
        );
        if (
          deferredDataController.signal.aborted ||
          map.getSource("controlRecords")
        ) {
          return;
        }

        addMockResearchLayers(map, data, dataLayerVisibilityRef.current);
        for (const [layerId, popupKind] of mockInteractiveLayerKinds) {
          const hoverHandler = (event: MapLayerMouseEvent) => {
            const properties = event.features?.[0]?.properties;
            if (!properties) return;

            const loadedInteractiveLayers = mockInteractiveLayerKinds
              .map(([candidateLayerId]) => candidateLayerId)
              .filter((candidateLayerId) => map.getLayer(candidateLayerId));
            const topFeature = map.queryRenderedFeatures(event.point, {
              layers: loadedInteractiveLayers,
            })[0];
            if (topFeature?.layer.id !== layerId) return;

            reportPopup.remove();
            ratLandusePopup.remove();
            setPointerCursor();
            mockDataPopup
              .setLngLat(event.lngLat)
              .setDOMContent(createMockPopupContent(popupKind, properties))
              .addTo(map);
          };
          mockLayerHoverHandlers.set(layerId, hoverHandler);
          map.on("mouseenter", layerId, hoverHandler);
          map.on("mouseleave", layerId, hideMockDetails);
        }
        applyTimeRangeFilters(map, timeRangeRef.current);
      } catch (error) {
        if (!deferredDataController.signal.aborted) {
          console.error("Failed to load mock research layers:", error);
        }
      }
    };

    const loadDeferredLayersAfterPrimaryData = () => {
      map.once("idle", loadDeferredLayers);
    };
    const applyPrimaryLayerVisibility = () => {
      applyDataLayerVisibility(map, dataLayerVisibilityRef.current);
      applyTimeRangeFilters(map, timeRangeRef.current);
    };
    const handleMapError = (event: maplibregl.ErrorEvent) => {
      console.error("Data map error:", event.error.message);
    };

    map.once("load", loadDeferredLayersAfterPrimaryData);
    map.once("load", applyPrimaryLayerVisibility);
    map.on("error", handleMapError);
    for (const layerId of reportLayerIds) {
      map.on("mouseenter", layerId, showReportDetails);
      map.on("mouseleave", layerId, hideReportDetails);
    }
    mapRef.current = map;

    return () => {
      resizeObserver.disconnect();
      deferredDataController.abort();
      riskReloadControllerRef.current?.abort();
      map.off("load", loadDeferredLayersAfterPrimaryData);
      map.off("load", applyPrimaryLayerVisibility);
      map.off("idle", loadDeferredLayers);
      map.off("error", handleMapError);
      for (const layerId of reportLayerIds) {
        map.off("mouseenter", layerId, showReportDetails);
        map.off("mouseleave", layerId, hideReportDetails);
      }
      if (map.getLayer("rat-landuse-fill")) {
        map.off("mousemove", "rat-landuse-fill", showRatLanduseDetails);
        map.off("mouseleave", "rat-landuse-fill", hideRatLanduseDetails);
      }
      for (const layerId of [
        officialEvidenceLayerId,
        officialNoEvidenceLayerId,
      ]) {
        if (!map.getLayer(layerId)) continue;
        map.off("mouseenter", layerId, showOfficialObservationDetails);
        map.off("mouseleave", layerId, hideReportDetails);
      }
      if (map.getLayer(vacantSpaceLayerId)) {
        map.off(
          "mouseenter",
          vacantSpaceLayerId,
          showOfficialObservationDetails,
        );
        map.off("mouseleave", vacantSpaceLayerId, hideReportDetails);
      }
      for (const layerId of pointDetailLayerIds) {
        if (!map.getLayer(layerId)) continue;
        map.off("mouseenter", layerId, showPointDetails);
        map.off("mouseleave", layerId, hideReportDetails);
      }
      for (const [layerId] of mockInteractiveLayerKinds) {
        const hoverHandler = mockLayerHoverHandlers.get(layerId);
        if (hoverHandler && map.getLayer(layerId)) {
          map.off("mouseenter", layerId, hoverHandler);
          map.off("mouseleave", layerId, hideMockDetails);
        }
      }
      reportPopup.remove();
      ratLandusePopup.remove();
      mockDataPopup.remove();
      mapRef.current = null;
      map.remove();
    };
  }, []);

  const toggleBaseLayer = (layerKey: BaseLayerKey) => {
    const visible = !baseLayerVisibilityRef.current[layerKey];
    const nextVisibility = {
      ...baseLayerVisibilityRef.current,
      [layerKey]: visible,
    };
    baseLayerVisibilityRef.current = nextVisibility;
    setBaseLayerVisibilityState(nextVisibility);

    const map = mapRef.current;
    if (map) setBaseLayerVisibility(map, layerKey, visible);
  };

  const toggleDataLayer = (layerKey: DataLayerKey) => {
    const visible = !dataLayerVisibilityRef.current[layerKey];
    const nextVisibility = {
      ...dataLayerVisibilityRef.current,
      [layerKey]: visible,
    };
    dataLayerVisibilityRef.current = nextVisibility;
    setDataLayerVisibility(nextVisibility);

    const map = mapRef.current;
    if (!map) return;
    for (const layerId of dataLayerIds[layerKey]) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          visible ? "visible" : "none",
        );
      }
    }
  };

  const setVisibleDataLayers = (visibleLayers: readonly DataLayerKey[]) => {
    const nextVisibility = createDataLayerVisibility(visibleLayers);
    const unchanged = (Object.keys(dataLayerIds) as DataLayerKey[]).every(
      (key) => dataLayerVisibilityRef.current[key] === nextVisibility[key],
    );
    if (unchanged) return;

    dataLayerVisibilityRef.current = nextVisibility;
    setDataLayerVisibility(nextVisibility);

    const map = mapRef.current;
    if (map) applyDataLayerVisibility(map, nextVisibility);
  };

  const selectDistrict = (districtName: string) => {
    setSelectedDistrict(districtName);
    const map = mapRef.current;
    if (!map) return;

    const applySelection = () => {
      const selectedDistrictFilter: maplibregl.FilterSpecification = [
        "==",
        ["get", "TNAME"],
        districtName,
      ];
      map.setFilter("districts-selected-fill", selectedDistrictFilter);
      map.setFilter("districts-selected-line", selectedDistrictFilter);

      if (!districtName) {
        map.flyTo({
          center: TAIPEI_CENTER,
          zoom: 11.3,
          duration: 900,
          essential: true,
        });
        return;
      }

      void fitDistrict(map, districtName);
    };

    if (map.isStyleLoaded()) applySelection();
    else map.once("load", applySelection);
  };

  const setTimeRange = (range: TimeRangeKey) => {
    timeRangeRef.current = range;
    const map = mapRef.current;
    if (!map) return;

    applyTimeRangeFilters(map, range);
    const source = map.getSource("ratLanduse") as GeoJSONSource | undefined;
    if (!source) return;

    riskReloadControllerRef.current?.abort();
    const controller = new AbortController();
    riskReloadControllerRef.current = controller;
    const cutoff = getTimeRangeCutoff(range);
    void loadRatReportLanduse(controller.signal, {
      observedAfter: cutoff?.toISOString(),
    })
      .then((data) => {
        if (!controller.signal.aborted && map.getSource("ratLanduse")) {
          source.setData(data);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("Failed to update risk model time range:", error);
        }
      });
  };

  return {
    mapContainerRef,
    baseLayerVisibility,
    dataLayerVisibility,
    selectedDistrict,
    toggleBaseLayer,
    toggleDataLayer,
    setVisibleDataLayers,
    selectDistrict,
    setTimeRange,
  };
}
