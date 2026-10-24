export interface ConnectivityNetwork {
  edges: Array<[number, number, number]>;
}

export interface ConnectivityData {
  blockIds: string[];
  componentIds?: string[];
  edges: Array<[number, number, number]>;
  networks?: Record<string, ConnectivityNetwork>;
}

export interface FactorScores {
  citizen: number;
  government: number;
  food: number;
  shelter: number;
}

export interface MovementFactorScores {
  citizen: number;
  government: number;
}

export interface FinalScoreOptions {
  mask: number;
  local: FactorScores;
  ground?: MovementFactorScores;
  underground?: MovementFactorScores;
  groundEnabled: boolean;
  undergroundEnabled: boolean;
}

type Position = number[];
type PolygonCoordinates = Position[][];

export const AREA_ADJUSTMENT_BETA = 0.5;
export const FULL_SCORE_RADIUS_METERS = 3;
export const HALF_SCORE_RADIUS_METERS = 5;
export const MAX_PROPAGATION_HOPS = 2;

export const FACTOR_WEIGHTS = {
  citizen: 3,
  government: 3,
  food: 1,
  shelter: 1,
} as const;

export const MARKET_BASE_SCORE = 3;
export const MIN_CLASSIFIED_SCORE = 0.000001;

export const SHELTER_LANDUSE_RULES = [
  { includes: "公園", score: 1 },
  { includes: "綠地", score: 0.75 },
] as const;

const METERS_PER_LATITUDE_DEGREE = 111_320;

export const clampScore = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

export const percentile95 = (values: readonly number[]) => {
  const positive = values
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);
  if (positive.length === 0) return 1;
  return positive[Math.ceil(positive.length * 0.95) - 1] ?? 1;
};

export const normalizeScore = (value: number, reference: number) =>
  reference > 0 && Number.isFinite(reference)
    ? clampScore(value / reference)
    : 0;

export const remapPositiveScores = (values: readonly number[]) => {
  const positive = values.filter(
    (value) => Number.isFinite(value) && value > 0,
  );
  if (positive.length === 0) {
    return { scores: values.map(() => 0), minimum: 0, maximum: 0 };
  }

  const minimum = Math.min(...positive);
  const maximum = Math.max(...positive);
  const scores = values.map((value) => {
    if (!Number.isFinite(value) || value <= 0) return 0;
    if (maximum === minimum) return 0.5;
    return Math.max(
      MIN_CLASSIFIED_SCORE,
      clampScore((value - minimum) / (maximum - minimum)),
    );
  });
  return { scores, minimum, maximum };
};

export const adjustScoreForArea = (
  rawScore: number,
  areaHectares: number,
  beta = AREA_ADJUSTMENT_BETA,
) => {
  if (
    !Number.isFinite(rawScore) ||
    rawScore <= 0 ||
    !Number.isFinite(areaHectares) ||
    areaHectares <= 0 ||
    !Number.isFinite(beta)
  ) {
    return 0;
  }
  return rawScore / areaHectares ** beta;
};

export const calculateFoodRawScore = ({
  marketIndicator,
  restaurantPointScore,
  binPointScore,
  garbageStopPointScore,
}: {
  marketIndicator: number;
  restaurantPointScore: number;
  binPointScore: number;
  garbageStopPointScore: number;
}) =>
  MARKET_BASE_SCORE * Math.max(0, marketIndicator) +
  Math.max(0, restaurantPointScore) +
  Math.max(0, binPointScore) +
  Math.max(0, garbageStopPointScore);

export const getShelterLanduseScore = (landUse: string) =>
  SHELTER_LANDUSE_RULES.reduce(
    (maximum, rule) =>
      landUse.includes(rule.includes) ? Math.max(maximum, rule.score) : maximum,
    0,
  );

/** Allocate one feature-level contribution across its components exactly once. */
export const distributeFeatureScore = (
  featureScore: number,
  areaShares: readonly number[],
) => areaShares.map((areaShare) => Math.max(0, featureScore * areaShare));

export const createComponentIds = (blockIds: readonly string[]) => {
  const occurrences = new Map<string, number>();
  return blockIds.map((blockId) => {
    const componentIndex = occurrences.get(blockId) ?? 0;
    occurrences.set(blockId, componentIndex + 1);
    return `${blockId}:${componentIndex}`;
  });
};

const getCoordinate = (position: Position): [number, number] | null => {
  const [longitude, latitude] = position;
  return typeof longitude === "number" && typeof latitude === "number"
    ? [longitude, latitude]
    : null;
};

const isPointInRing = (point: Position, ring: Position[]) => {
  const pointCoordinate = getCoordinate(point);
  if (!pointCoordinate) return false;
  const [x, y] = pointCoordinate;
  let isInside = false;

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    index += 1
  ) {
    const currentCoordinate = getCoordinate(ring[index] ?? []);
    const previousCoordinate = getCoordinate(ring[previous] ?? []);
    if (!currentCoordinate || !previousCoordinate) continue;
    const [currentX, currentY] = currentCoordinate;
    const [previousX, previousY] = previousCoordinate;
    const crossesRay =
      currentY > y !== previousY > y &&
      x <
        ((previousX - currentX) * (y - currentY)) /
          (previousY - currentY) +
          currentX;

    if (crossesRay) isInside = !isInside;
    previous = index;
  }

  return isInside;
};

const isPointInPolygon = (point: Position, rings: PolygonCoordinates) =>
  Boolean(rings[0]) &&
  isPointInRing(point, rings[0]!) &&
  !rings.slice(1).some((hole) => isPointInRing(point, hole));

const getMetersPerLongitudeDegree = (latitude: number) =>
  METERS_PER_LATITUDE_DEGREE * Math.cos((latitude * Math.PI) / 180);

const getDistanceToSegmentMeters = (
  point: Position,
  start: Position,
  end: Position,
) => {
  const pointCoordinate = getCoordinate(point);
  const startCoordinate = getCoordinate(start);
  const endCoordinate = getCoordinate(end);
  if (!pointCoordinate || !startCoordinate || !endCoordinate) return Infinity;

  const [pointX, pointY] = pointCoordinate;
  const [startLongitude, startLatitude] = startCoordinate;
  const [endLongitude, endLatitude] = endCoordinate;
  const metersPerLongitudeDegree = getMetersPerLongitudeDegree(pointY);
  const startX = (startLongitude - pointX) * metersPerLongitudeDegree;
  const startY = (startLatitude - pointY) * METERS_PER_LATITUDE_DEGREE;
  const segmentX = (endLongitude - startLongitude) * metersPerLongitudeDegree;
  const segmentY = (endLatitude - startLatitude) * METERS_PER_LATITUDE_DEGREE;
  const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;

  if (segmentLengthSquared === 0) return Math.hypot(startX, startY);

  const projection = Math.max(
    0,
    Math.min(
      1,
      -(startX * segmentX + startY * segmentY) / segmentLengthSquared,
    ),
  );
  return Math.hypot(
    startX + projection * segmentX,
    startY + projection * segmentY,
  );
};

export const getDistanceToPolygonMeters = (
  point: Position,
  rings: PolygonCoordinates,
) => {
  if (isPointInPolygon(point, rings)) return 0;

  let minimumDistance = Infinity;
  for (const ring of rings) {
    for (let index = 0; index < ring.length; index += 1) {
      const start = ring[index];
      const end = ring[(index + 1) % ring.length];
      if (!start || !end) continue;
      minimumDistance = Math.min(
        minimumDistance,
        getDistanceToSegmentMeters(point, start, end),
      );
    }
  }
  return minimumDistance;
};

const getPolygonBounds = (rings: PolygonCoordinates) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const position of rings[0] ?? []) {
    const coordinate = getCoordinate(position);
    if (!coordinate) continue;
    const [longitude, latitude] = coordinate;
    minX = Math.min(minX, longitude);
    minY = Math.min(minY, latitude);
    maxX = Math.max(maxX, longitude);
    maxY = Math.max(maxY, latitude);
  }
  return { minX, minY, maxX, maxY };
};

/** Assign each point to at most one (the nearest) component of a feature. */
export const scorePointsByComponent = (
  polygons: readonly PolygonCoordinates[],
  points: readonly Position[],
) => {
  const scores = new Array<number>(polygons.length).fill(0);
  const bounds = polygons.map(getPolygonBounds);
  for (const point of points) {
    const coordinate = getCoordinate(point);
    if (!coordinate) continue;
    const [longitude, latitude] = coordinate;
    const longitudePadding =
      HALF_SCORE_RADIUS_METERS / getMetersPerLongitudeDegree(latitude);
    const latitudePadding =
      HALF_SCORE_RADIUS_METERS / METERS_PER_LATITUDE_DEGREE;
    let nearestIndex = -1;
    let nearestDistance = Infinity;
    polygons.forEach((polygon, componentIndex) => {
      const componentBounds = bounds[componentIndex];
      if (
        !componentBounds ||
        longitude < componentBounds.minX - longitudePadding ||
        longitude > componentBounds.maxX + longitudePadding ||
        latitude < componentBounds.minY - latitudePadding ||
        latitude > componentBounds.maxY + latitudePadding
      ) {
        return;
      }
      const distance = getDistanceToPolygonMeters(point, polygon);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = componentIndex;
      }
    });
    if (nearestIndex < 0 || nearestDistance > HALF_SCORE_RADIUS_METERS) continue;
    scores[nearestIndex] =
      (scores[nearestIndex] ?? 0) +
      (nearestDistance <= FULL_SCORE_RADIUS_METERS ? 1 : 0.5);
  }
  return scores;
};

const propagateEdges = (
  componentIds: readonly string[],
  edges: readonly [number, number, number][],
  baseScores: ReadonlyMap<string, number>,
) => {
  let frontier = Float64Array.from(
    componentIds,
    (componentId) => baseScores.get(componentId) ?? 0,
  );
  const best = frontier.slice();

  for (let hop = 0; hop < MAX_PROPAGATION_HOPS; hop += 1) {
    const next = new Float64Array(componentIds.length);
    for (const [left, right, rawWeight] of edges) {
      if (
        left < 0 ||
        right < 0 ||
        left >= componentIds.length ||
        right >= componentIds.length
      ) {
        continue;
      }
      const weight = clampScore(rawWeight);
      next[right] = Math.max(next[right] ?? 0, (frontier[left] ?? 0) * weight);
      next[left] = Math.max(next[left] ?? 0, (frontier[right] ?? 0) * weight);
    }
    for (let index = 0; index < best.length; index += 1) {
      best[index] = Math.max(best[index] ?? 0, next[index] ?? 0);
    }
    frontier = next;
  }

  return new Map(
    componentIds.map((componentId, index) => [
      componentId,
      clampScore(best[index] ?? 0),
    ]),
  );
};

export const propagateConnectivity = (
  connectivity: ConnectivityData,
  baseScores: ReadonlyMap<string, number>,
) => {
  const componentIds =
    connectivity.componentIds ?? createComponentIds(connectivity.blockIds);
  const networkEdges = connectivity.networks
    ? Object.values(connectivity.networks).map(({ edges }) => edges)
    : [connectivity.edges];
  const result = new Map(
    componentIds.map((componentId) => [
      componentId,
      clampScore(baseScores.get(componentId) ?? 0),
    ]),
  );

  // Each named network is propagated independently, then combined by maximum.
  // This prevents a path from switching between sewer and stormwater edges.
  for (const edges of networkEdges) {
    const networkResult = propagateEdges(componentIds, edges, baseScores);
    for (const [componentId, score] of networkResult) {
      result.set(componentId, Math.max(result.get(componentId) ?? 0, score));
    }
  }
  return result;
};

const getObservationFactorScore = (
  factor: "citizen" | "government",
  options: FinalScoreOptions,
) => {
  const candidates = [options.local[factor]];
  if (options.groundEnabled && options.ground) {
    candidates.push(options.ground[factor]);
  }
  if (options.undergroundEnabled && options.underground) {
    candidates.push(options.underground[factor]);
  }
  return clampScore(Math.max(...candidates));
};

export const calculateFinalScore = (options: FinalScoreOptions) => {
  let weightedSum = 0;
  let selectedWeight = 0;
  if (options.mask & 1) {
    weightedSum +=
      FACTOR_WEIGHTS.citizen * getObservationFactorScore("citizen", options);
    selectedWeight += FACTOR_WEIGHTS.citizen;
  }
  if (options.mask & 2) {
    weightedSum +=
      FACTOR_WEIGHTS.government *
      getObservationFactorScore("government", options);
    selectedWeight += FACTOR_WEIGHTS.government;
  }
  if (options.mask & 4) {
    // Habitat suitability remains local and is never propagated.
    weightedSum += FACTOR_WEIGHTS.food * clampScore(options.local.food);
    selectedWeight += FACTOR_WEIGHTS.food;
  }
  if (options.mask & 8) {
    weightedSum += FACTOR_WEIGHTS.shelter * clampScore(options.local.shelter);
    selectedWeight += FACTOR_WEIGHTS.shelter;
  }
  if (selectedWeight === 0) return 0;
  return clampScore(weightedSum / selectedWeight);
};

export type RiskLevel =
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "L5"
  | "unclassified";

export const getRiskLevel = (score: number): RiskLevel => {
  const normalized = clampScore(score);
  if (normalized >= 0.8) return "L1";
  if (normalized >= 0.6) return "L2";
  if (normalized >= 0.4) return "L3";
  if (normalized >= 0.2) return "L4";
  if (normalized > 0) return "L5";
  return "unclassified";
};
