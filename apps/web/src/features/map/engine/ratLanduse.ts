import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Point,
} from "geojson";
import { loadOfficialObservations } from "./officialObservations";
import {
  adjustScoreForArea,
  AREA_ADJUSTMENT_BETA,
  calculateFinalScore,
  clampScore,
  normalizeScore,
  percentile95,
  propagateConnectivity,
  scorePointsByComponent,
  type ConnectivityData,
  type FactorScores,
  type MovementFactorScores,
} from "./riskModel";

type LanduseFeature = Feature<MultiPolygon, Record<string, unknown>>;
type ReportFeature = Feature<Point, Record<string, unknown>>;
const EXCLUDED_LAND_USES = ["河川區", "河道用地", "行水區", "高速公路用地"];

const isExcludedLanduse = (feature: LanduseFeature) => {
  const landuse = String(feature.properties["使用分區"] ?? "");
  return EXCLUDED_LAND_USES.some((excluded) => landuse.includes(excluded));
};

const fetchFeatureCollection = async <T extends Feature>(
  url: string,
  signal: AbortSignal,
) => {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  return (await response.json()) as FeatureCollection<
    T["geometry"],
    T["properties"]
  >;
};

const parseHhmm = (value: unknown) => {
  const text = String(value ?? "").trim().padStart(4, "0");
  if (!/^\d{4}$/.test(text)) return null;
  const hours = Number(text.slice(0, 2));
  const minutes = Number(text.slice(2));
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const isLongGarbageStop = (properties: Record<string, unknown>) => {
  const arrival = parseHhmm(properties.抵達時間);
  let departure = parseHhmm(properties.離開時間);
  if (arrival === null || departure === null) return false;
  if (departure < arrival) departure += 24 * 60;
  return departure - arrival > 30;
};

const getRingArea = (ring: readonly number[][]) => {
  if (ring.length < 3) return 0;
  const origin = ring[0];
  if (!origin) return 0;
  let twiceArea = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    if (!current || !next) continue;
    const currentX = (current[0] ?? 0) - (origin[0] ?? 0);
    const currentY = (current[1] ?? 0) - (origin[1] ?? 0);
    const nextX = (next[0] ?? 0) - (origin[0] ?? 0);
    const nextY = (next[1] ?? 0) - (origin[1] ?? 0);
    twiceArea += currentX * nextY - nextX * currentY;
  }
  return Math.abs(twiceArea) / 2;
};

const getPolygonAreaShare = (polygon: number[][][]) =>
  Math.max(
    0,
    getRingArea(polygon[0] ?? []) -
      polygon.slice(1).reduce((sum, ring) => sum + getRingArea(ring), 0),
  );

interface ScoredComponent {
  componentId: string;
  citizenScore: number;
  governmentScore: number;
  foodSourceScore: number;
}

export interface RiskModelConfig {
  areaAdjustmentBeta?: number;
}

export const loadRatReportLanduse = async (
  signal: AbortSignal,
  config: RiskModelConfig = {},
) => {
  const requestedBeta = config.areaAdjustmentBeta;
  const areaAdjustmentBeta =
    typeof requestedBeta === "number" &&
    Number.isFinite(requestedBeta) &&
    requestedBeta >= 0
      ? requestedBeta
      : AREA_ADJUSTMENT_BETA;
  const loadConnectivity = async (url: string) => {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status}`);
    }
    return (await response.json()) as ConnectivityData;
  };
  const [
    landuse,
    reports,
    official,
    bins,
    garbageStops,
    groundConnectivity,
    undergroundConnectivity,
  ] = await Promise.all([
    fetchFeatureCollection<LanduseFeature>(
      "/data/taipei-landuse-detail-merged.geojson",
      signal,
    ),
    fetchFeatureCollection<ReportFeature>(
      "/data/citizen-reports.geojson",
      signal,
    ),
    loadOfficialObservations(signal),
    fetchFeatureCollection<ReportFeature>("/data/taipei-bins.geojson", signal),
    fetchFeatureCollection<ReportFeature>(
      "/data/taipei-garbage-truck-stops.geojson",
      signal,
    ),
    loadConnectivity("/data/ground-connectivity.json"),
    loadConnectivity("/data/underground-connectivity.json"),
  ]);

  const ratPoints = reports.features
    .filter((feature) => feature.properties?.reportType === "rat")
    .map((feature) => feature.geometry.coordinates);

  const governmentEvidencePoints = official.features
    .filter((feature) => feature.properties.surveyResult === "evidence_found")
    .map((feature) => feature.geometry.coordinates);
  const foodSourcePoints = [
    ...bins.features.map((feature) => feature.geometry.coordinates),
    ...garbageStops.features
      .filter((feature) => isLongGarbageStop(feature.properties))
      .map((feature) => feature.geometry.coordinates),
  ];

  const scoredFeatures = landuse.features.flatMap((feature) => {
    if (isExcludedLanduse(feature)) return [];
    const areaSquareMeters = Number(feature.properties["area_m2"]);
    if (!Number.isFinite(areaSquareMeters) || areaSquareMeters <= 0) return [];

    const areaHectares = areaSquareMeters / 10_000;
    const blockId = String(feature.properties["編號"]);
    const polygons = feature.geometry.coordinates;
    if (polygons.length === 0) return [];

    const polygonAreas = polygons.map((polygon) => getPolygonAreaShare(polygon));
    const polygonAreaTotal = polygonAreas.reduce((sum, area) => sum + area, 0);
    const areaShares = polygonAreas.map((area) =>
      polygonAreaTotal > 0 ? area / polygonAreaTotal : 1 / polygons.length,
    );
    const citizenScores = scorePointsByComponent(polygons, ratPoints);
    const governmentScores = scorePointsByComponent(
      polygons,
      governmentEvidencePoints,
    );
    const foodSourceScores = scorePointsByComponent(polygons, foodSourcePoints);
    const isMarket = String(feature.properties["使用分區"] ?? "").includes(
      "市場",
    );

    const components: ScoredComponent[] = polygons.map(
      (_polygon, componentIndex) => {
        const areaShare = areaShares[componentIndex] ?? 0;
        const componentAreaHectares = areaHectares * areaShare;
        return {
          componentId: `${blockId}:${componentIndex}`,
          citizenScore: adjustScoreForArea(
            citizenScores[componentIndex] ?? 0,
            componentAreaHectares,
            areaAdjustmentBeta,
          ),
          governmentScore: adjustScoreForArea(
            governmentScores[componentIndex] ?? 0,
            componentAreaHectares,
            areaAdjustmentBeta,
          ),
          foodSourceScore: adjustScoreForArea(
            (foodSourceScores[componentIndex] ?? 0) +
              (isMarket ? areaShare : 0),
            componentAreaHectares,
            areaAdjustmentBeta,
          ),
        };
      },
    );
    return [
      {
        feature,
        areaHectares,
        components,
      },
    ];
  });

  const scoredComponents = scoredFeatures.flatMap(
    ({ components }) => components,
  );

  const citizenReference = percentile95(
    scoredComponents.map(({ citizenScore }) => citizenScore),
  );
  const governmentReference = percentile95(
    scoredComponents.map(({ governmentScore }) => governmentScore),
  );
  const foodSourceReference = percentile95(
    scoredComponents.map(({ foodSourceScore }) => foodSourceScore),
  );

  const normalizedByComponent = new Map<string, FactorScores>(
    scoredComponents.map((component) => [
      component.componentId,
      {
        citizen: normalizeScore(component.citizenScore, citizenReference),
        government: normalizeScore(
          component.governmentScore,
          governmentReference,
        ),
        food: normalizeScore(component.foodSourceScore, foodSourceReference),
      },
    ]),
  );

  const citizenScores = new Map(
    [...normalizedByComponent].map(([componentId, scores]) => [
      componentId,
      scores.citizen,
    ]),
  );
  const governmentScores = new Map(
    [...normalizedByComponent].map(([componentId, scores]) => [
      componentId,
      scores.government,
    ]),
  );
  const groundCitizen = propagateConnectivity(
    groundConnectivity,
    citizenScores,
  );
  const groundGovernment = propagateConnectivity(
    groundConnectivity,
    governmentScores,
  );
  const undergroundCitizen = propagateConnectivity(
    undergroundConnectivity,
    citizenScores,
  );
  const undergroundGovernment = propagateConnectivity(
    undergroundConnectivity,
    governmentScores,
  );

  const getMovementScores = (
    componentId: string,
    citizen: ReadonlyMap<string, number>,
    government: ReadonlyMap<string, number>,
  ): MovementFactorScores => ({
    citizen: citizen.get(componentId) ?? 0,
    government: government.get(componentId) ?? 0,
  });

  const getMaximum = (values: readonly number[]) =>
    clampScore(values.length > 0 ? Math.max(...values) : 0);

  return {
    type: "FeatureCollection",
    metadata: {
      riskModel: {
        version: "component-observation-propagation-v2",
        areaAdjustmentBeta,
        p95References: {
          citizen: citizenReference,
          government: governmentReference,
          foodSource: foodSourceReference,
        },
      },
    },
    features: scoredFeatures.map(
      ({ feature, areaHectares, components }) => {
        const localScores = components.map(
          (component) => normalizedByComponent.get(component.componentId)!,
        );
        const riskFields: Record<string, number> = {};

        for (let mask = 1; mask < 8; mask += 1) {
          const scoreComponents = (
            groundEnabled: boolean,
            undergroundEnabled: boolean,
          ) =>
            components.map((component, componentIndex) => {
              const local = localScores[componentIndex]!;
              return calculateFinalScore({
                mask,
                local,
                ground: getMovementScores(
                  component.componentId,
                  groundCitizen,
                  groundGovernment,
                ),
                underground: getMovementScores(
                  component.componentId,
                  undergroundCitizen,
                  undergroundGovernment,
                ),
                groundEnabled,
                undergroundEnabled,
              });
            });

          riskFields[`risk_local_${mask}`] = getMaximum(
            scoreComponents(false, false),
          );
          riskFields[`risk_movement_${mask}`] = getMaximum(
            scoreComponents(true, false),
          );
          riskFields[`risk_underground_${mask}`] = getMaximum(
            scoreComponents(false, true),
          );
          riskFields[`risk_combined_movement_${mask}`] = getMaximum(
            scoreComponents(true, true),
          );
        }

        return {
          ...feature,
          properties: {
            ...feature.properties,
            area_ha: areaHectares,
            risk_citizen: getMaximum(
              localScores.map(({ citizen }) => citizen),
            ),
            risk_government: getMaximum(
              localScores.map(({ government }) => government),
            ),
            risk_food_source: getMaximum(localScores.map(({ food }) => food)),
            risk_observation: getMaximum(
              localScores.map(
                ({ citizen, government }) => (citizen + government) / 2,
              ),
            ),
            risk_habitat: getMaximum(localScores.map(({ food }) => food)),
            ...riskFields,
          },
        };
      },
    ),
  } as FeatureCollection<MultiPolygon, Record<string, unknown>> & {
    metadata: Record<string, unknown>;
  };
};
