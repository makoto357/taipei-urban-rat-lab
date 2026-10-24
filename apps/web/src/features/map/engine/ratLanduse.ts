import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Point,
  Position,
} from "geojson";
import { loadOfficialObservations } from "./officialObservations";
import {
  adjustScoreForArea,
  AREA_ADJUSTMENT_BETA,
  calculateFoodRawScore,
  calculateFinalScore,
  clampScore,
  distributeFeatureScore,
  FACTOR_WEIGHTS,
  getShelterLanduseScore,
  normalizeScore,
  percentile95,
  propagateConnectivity,
  remapPositiveScores,
  scorePointsByComponent,
  type ConnectivityData,
  type FactorScores,
  type MovementFactorScores,
} from "./riskModel";

type LanduseFeature = Feature<MultiPolygon, Record<string, unknown>>;
type ReportFeature = Feature<Point, Record<string, unknown>>;
type RiskFeature = Feature<MultiPolygon, Record<string, unknown>>;
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
  shelterScore: number;
}

const POINT_GRID_SIZE_DEGREES = 0.01;
const POINT_QUERY_PADDING_DEGREES = 0.0001;

const createPointGridIndex = (points: readonly Position[]) => {
  const grid = new Map<string, Position[]>();
  for (const point of points) {
    const [longitude, latitude] = point;
    if (typeof longitude !== "number" || typeof latitude !== "number") {
      continue;
    }
    const key = `${Math.floor(
      longitude / POINT_GRID_SIZE_DEGREES,
    )}:${Math.floor(latitude / POINT_GRID_SIZE_DEGREES)}`;
    const cell = grid.get(key);
    if (cell) cell.push(point);
    else grid.set(key, [point]);
  }
  return grid;
};

const queryPointGrid = (
  grid: ReadonlyMap<string, readonly Position[]>,
  polygons: readonly number[][][][],
) => {
  let minLongitude = Infinity;
  let minLatitude = Infinity;
  let maxLongitude = -Infinity;
  let maxLatitude = -Infinity;
  for (const polygon of polygons) {
    for (const position of polygon[0] ?? []) {
      const [longitude, latitude] = position;
      if (typeof longitude !== "number" || typeof latitude !== "number") {
        continue;
      }
      minLongitude = Math.min(minLongitude, longitude);
      minLatitude = Math.min(minLatitude, latitude);
      maxLongitude = Math.max(maxLongitude, longitude);
      maxLatitude = Math.max(maxLatitude, latitude);
    }
  }
  if (!Number.isFinite(minLongitude)) return [];

  const points: Position[] = [];
  const minX = Math.floor(
    (minLongitude - POINT_QUERY_PADDING_DEGREES) / POINT_GRID_SIZE_DEGREES,
  );
  const maxX = Math.floor(
    (maxLongitude + POINT_QUERY_PADDING_DEGREES) / POINT_GRID_SIZE_DEGREES,
  );
  const minY = Math.floor(
    (minLatitude - POINT_QUERY_PADDING_DEGREES) / POINT_GRID_SIZE_DEGREES,
  );
  const maxY = Math.floor(
    (maxLatitude + POINT_QUERY_PADDING_DEGREES) / POINT_GRID_SIZE_DEGREES,
  );
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      points.push(...(grid.get(`${x}:${y}`) ?? []));
    }
  }
  return points;
};

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
    restaurants,
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
    fetchFeatureCollection<ReportFeature>(
      "/data/taipei-restaurants.geojson",
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
  const shelterObservationPoints = official.features
    .filter((feature) => {
      const types = String(feature.properties.observationTypes ?? "");
      return types.includes("clutter") || types.includes("unused_space");
    })
    .map((feature) => feature.geometry.coordinates);
  const restaurantPoints = restaurants.features.map(
    (feature) => feature.geometry.coordinates,
  );
  const binPoints = bins.features.map((feature) => feature.geometry.coordinates);
  const garbageStopPoints = garbageStops.features
    .filter((feature) => isLongGarbageStop(feature.properties))
    .map((feature) => feature.geometry.coordinates);
  const citizenPointIndex = createPointGridIndex(ratPoints);
  const governmentPointIndex = createPointGridIndex(governmentEvidencePoints);
  const shelterPointIndex = createPointGridIndex(shelterObservationPoints);
  const restaurantPointIndex = createPointGridIndex(restaurantPoints);
  const binPointIndex = createPointGridIndex(binPoints);
  const garbageStopPointIndex = createPointGridIndex(garbageStopPoints);

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
    const citizenScores = scorePointsByComponent(
      polygons,
      queryPointGrid(citizenPointIndex, polygons),
    );
    const governmentScores = scorePointsByComponent(
      polygons,
      queryPointGrid(governmentPointIndex, polygons),
    );
    const shelterObservationScores = scorePointsByComponent(
      polygons,
      queryPointGrid(shelterPointIndex, polygons),
    );
    const restaurantScores = scorePointsByComponent(
      polygons,
      queryPointGrid(restaurantPointIndex, polygons),
    );
    const binScores = scorePointsByComponent(
      polygons,
      queryPointGrid(binPointIndex, polygons),
    );
    const garbageStopScores = scorePointsByComponent(
      polygons,
      queryPointGrid(garbageStopPointIndex, polygons),
    );
    const landUse = String(feature.properties["使用分區"] ?? "");
    const isMarket = landUse.includes("市場");
    const shelterLanduseScores = distributeFeatureScore(
      getShelterLanduseScore(landUse),
      areaShares,
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
            calculateFoodRawScore({
              marketIndicator: isMarket ? areaShare : 0,
              restaurantPointScore: restaurantScores[componentIndex] ?? 0,
              binPointScore: binScores[componentIndex] ?? 0,
              garbageStopPointScore: garbageStopScores[componentIndex] ?? 0,
            }),
            componentAreaHectares,
            areaAdjustmentBeta,
          ),
          shelterScore: adjustScoreForArea(
            (shelterLanduseScores[componentIndex] ?? 0) +
              (shelterObservationScores[componentIndex] ?? 0),
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
  const shelterReference = percentile95(
    scoredComponents.map(({ shelterScore }) => shelterScore),
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
        shelter: normalizeScore(component.shelterScore, shelterReference),
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

  const riskFieldNames = [
    "risk_local",
    "risk_movement",
    "risk_underground",
    "risk_combined_movement",
  ].flatMap((prefix) =>
    Array.from({ length: 15 }, (_, index) => `${prefix}_${index + 1}`),
  );

  const features: RiskFeature[] = scoredFeatures.map(
    ({ feature, areaHectares, components }) => {
      const localScores = components.map(
        (component) => normalizedByComponent.get(component.componentId)!,
      );
      const riskFields: Record<string, number> = {};

      for (let mask = 1; mask < 16; mask += 1) {
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
          risk_citizen: getMaximum(localScores.map(({ citizen }) => citizen)),
          risk_government: getMaximum(
            localScores.map(({ government }) => government),
          ),
          risk_food_source: getMaximum(localScores.map(({ food }) => food)),
          risk_shelter: getMaximum(localScores.map(({ shelter }) => shelter)),
          risk_observation: getMaximum(
            localScores.map(
              ({ citizen, government }) => (citizen + government) / 2,
            ),
          ),
          risk_habitat: getMaximum(
            localScores.map(({ food, shelter }) => (food + shelter) / 2),
          ),
          ...riskFields,
        },
      };
    },
  );

  const remapRanges: Record<string, { minimum: number; maximum: number }> = {};
  for (const field of riskFieldNames) {
    const remapped = remapPositiveScores(
      features.map(({ properties }) => Number(properties[field] ?? 0)),
    );
    remapRanges[field] = {
      minimum: remapped.minimum,
      maximum: remapped.maximum,
    };
    features.forEach((feature, index) => {
      feature.properties[field] = remapped.scores[index] ?? 0;
    });
  }

  return {
    type: "FeatureCollection",
    metadata: {
      riskModel: {
        version: "weighted-remapped-five-level-v5",
        areaAdjustmentBeta,
        factorWeights: FACTOR_WEIGHTS,
        p95References: {
          citizen: citizenReference,
          government: governmentReference,
          foodSource: foodSourceReference,
          shelter: shelterReference,
        },
        weightedScoreRemap: {
          method: "positive-min-max",
          equalValueFallback: 0.5,
          ranges: remapRanges,
        },
      },
    },
    features,
  } as FeatureCollection<MultiPolygon, Record<string, unknown>> & {
    metadata: Record<string, unknown>;
  };
};
