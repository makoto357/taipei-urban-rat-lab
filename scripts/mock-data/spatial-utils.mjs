import fs from "node:fs";

const A = 6378137;
const B = 6356752.314245;
const E2 = 1 - (B * B) / (A * A);
const EP2 = E2 / (1 - E2);
const K0 = 0.9999;
const LON0 = (121 * Math.PI) / 180;
const DX = 250000;

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function toTwd97(point) {
  const lon = (point.longitude * Math.PI) / 180;
  const lat = (point.latitude * Math.PI) / 180;
  const sinLat = Math.sin(lat);
  const n = A / Math.sqrt(1 - E2 * sinLat * sinLat);
  const t = Math.tan(lat) ** 2;
  const c = EP2 * Math.cos(lat) ** 2;
  const aa = (lon - LON0) * Math.cos(lat);
  const e4 = E2 ** 2;
  const e6 = E2 ** 3;
  const m =
    A *
    ((1 - E2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * lat -
      ((3 * E2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) *
        Math.sin(2 * lat) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * lat) -
      ((35 * e6) / 3072) * Math.sin(6 * lat));
  return {
    x:
      DX +
      K0 *
        n *
        (aa +
          ((1 - t + c) * aa ** 3) / 6 +
          ((5 - 18 * t + t * t + 72 * c - 58 * EP2) * aa ** 5) / 120),
    y:
      K0 *
      (m +
        n *
          Math.tan(lat) *
          (aa ** 2 / 2 +
            ((5 - t + 9 * c + 4 * c * c) * aa ** 4) / 24 +
            ((61 - 58 * t + t * t + 600 * c - 330 * EP2) * aa ** 6) /
              720)),
  };
}

export function fromTwd97({ x, y }) {
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const m = y / K0;
  const mu =
    m /
    (A *
      (1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256));
  const j1 = (3 * e1) / 2 - (27 * e1 ** 3) / 32;
  const j2 = (21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32;
  const j3 = (151 * e1 ** 3) / 96;
  const j4 = (1097 * e1 ** 4) / 512;
  const fp =
    mu +
    j1 * Math.sin(2 * mu) +
    j2 * Math.sin(4 * mu) +
    j3 * Math.sin(6 * mu) +
    j4 * Math.sin(8 * mu);
  const c1 = EP2 * Math.cos(fp) ** 2;
  const t1 = Math.tan(fp) ** 2;
  const n1 = A / Math.sqrt(1 - E2 * Math.sin(fp) ** 2);
  const r1 =
    (A * (1 - E2)) / Math.pow(1 - E2 * Math.sin(fp) ** 2, 1.5);
  const d = (x - DX) / (n1 * K0);
  const lat =
    fp -
    ((n1 * Math.tan(fp)) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * EP2) * d ** 4) /
          24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * EP2 - 3 * c1 ** 2) *
          d ** 6) /
          720);
  const lon =
    LON0 +
    (d - ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * EP2 + 24 * t1 ** 2) *
        d ** 5) /
        120) /
      Math.cos(fp);
  return {
    latitude: Number(((lat * 180) / Math.PI).toFixed(7)),
    longitude: Number(((lon * 180) / Math.PI).toFixed(7)),
  };
}

export function distanceMeters(a, b) {
  const pa = toTwd97(a);
  const pb = toTwd97(b);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
}

function bboxOfCoordinates(coordinates, bbox = [Infinity, Infinity, -Infinity, -Infinity]) {
  if (typeof coordinates[0] === "number") {
    bbox[0] = Math.min(bbox[0], coordinates[0]);
    bbox[1] = Math.min(bbox[1], coordinates[1]);
    bbox[2] = Math.max(bbox[2], coordinates[0]);
    bbox[3] = Math.max(bbox[3], coordinates[1]);
    return bbox;
  }
  for (const child of coordinates) bboxOfCoordinates(child, bbox);
  return bbox;
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(point, polygon) {
  return pointInRing(point, polygon[0]) && !polygon.slice(1).some((ring) => pointInRing(point, ring));
}

function containsPoint(feature, point) {
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  return polygons.some((polygon) => pointInPolygon(point, polygon));
}

function segments(coordinates, output = []) {
  if (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    typeof coordinates[0]?.[0] === "number"
  ) {
    for (let i = 1; i < coordinates.length; i += 1) {
      output.push([coordinates[i - 1], coordinates[i]]);
    }
    return output;
  }
  for (const child of coordinates) segments(child, output);
  return output;
}

function orientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function intersects(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return (o1 === 0 || o2 === 0 || Math.sign(o1) !== Math.sign(o2)) &&
    (o3 === 0 || o4 === 0 || Math.sign(o3) !== Math.sign(o4));
}

function roadWidth(feature, property) {
  const raw = feature.properties?.[property];
  const parsed = Number.parseFloat(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function crossingWeight(width) {
  if (width == null) return 1;
  if (width < 8) return 1;
  if (width < 12) return 0.6;
  if (width < 20) return 0.25;
  if (width < 30) return 0.08;
  return 0.01;
}

export function createSpatialContext({ landuseFile, road8mFile, roadSizeFile }) {
  const landuse = readJson(landuseFile).features.map((feature, index) => ({
    feature,
    index,
    bbox: bboxOfCoordinates(feature.geometry.coordinates),
    id: String(feature.properties?.["編號"] ?? `landuse-${index + 1}`),
    use: String(feature.properties?.["使用分區"] ?? "unknown"),
  }));
  const waterPattern = /河川|河道|行水|水域|湖泊/;

  const road8m = readJson(road8mFile).features.map((feature) => ({
    bbox: bboxOfCoordinates(feature.geometry.coordinates),
    lines: segments(feature.geometry.coordinates),
    width: roadWidth(feature, "ROADWIDTH"),
  }));
  const roadSize = readJson(roadSizeFile).features.map((feature) => ({
    bbox: bboxOfCoordinates(feature.geometry.coordinates),
    lines: segments(feature.geometry.coordinates),
    width: roadWidth(feature, "road_width"),
  }));

  function buildGrid(items, cellSize) {
    const grid = new Map();
    for (let index = 0; index < items.length; index += 1) {
      const bbox = items[index].bbox;
      const minX = Math.floor(bbox[0] / cellSize);
      const maxX = Math.floor(bbox[2] / cellSize);
      const minY = Math.floor(bbox[1] / cellSize);
      const maxY = Math.floor(bbox[3] / cellSize);
      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          const key = `${x}:${y}`;
          const bucket = grid.get(key) ?? [];
          bucket.push(index);
          grid.set(key, bucket);
        }
      }
    }
    return { grid, cellSize, items };
  }

  function queryGrid(index, bbox) {
    const found = new Set();
    const minX = Math.floor(bbox[0] / index.cellSize);
    const maxX = Math.floor(bbox[2] / index.cellSize);
    const minY = Math.floor(bbox[1] / index.cellSize);
    const maxY = Math.floor(bbox[3] / index.cellSize);
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (const itemIndex of index.grid.get(`${x}:${y}`) ?? []) found.add(itemIndex);
      }
    }
    return [...found].map((itemIndex) => index.items[itemIndex]);
  }

  const landuseIndex = buildGrid(landuse, 0.005);
  const road8mIndex = buildGrid(road8m, 250);
  const roadSizeIndex = buildGrid(roadSize, 250);

  function blockAt(point) {
    const pair = [point.longitude, point.latitude];
    return (
      queryGrid(landuseIndex, [pair[0], pair[1], pair[0], pair[1]]).find(
        ({ bbox, feature }) =>
          pair[0] >= bbox[0] &&
          pair[0] <= bbox[2] &&
          pair[1] >= bbox[1] &&
          pair[1] <= bbox[3] &&
          containsPoint(feature, pair),
      ) ?? null
    );
  }

  function crossing(origin, destination) {
    const a = toTwd97(origin);
    const b = toTwd97(destination);
    const line = [[a.x, a.y], [b.x, b.y]];
    const bbox = [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y)];
    const widths = [];
    let unknown = 0;
    const candidateRoads = [
      ...queryGrid(road8mIndex, bbox),
      ...queryGrid(roadSizeIndex, bbox),
    ];
    for (const road of candidateRoads) {
      if (road.bbox[2] < bbox[0] || road.bbox[0] > bbox[2] || road.bbox[3] < bbox[1] || road.bbox[1] > bbox[3]) continue;
      if (road.lines.some(([c, d]) => intersects(line[0], line[1], c, d))) {
        if (road.width == null) unknown += 1;
        else widths.push(road.width);
      }
    }
    // The two road datasets overlap. A route is scored once, using only the widest
    // known crossing, rather than multiplying duplicate penalties.
    const maxWidth = widths.length ? Math.max(...widths) : null;
    return { maxWidth, unknown, weight: crossingWeight(maxWidth) };
  }

  function candidate(origin, targetDistance, seed, options = {}) {
    const originXy = toTwd97(origin);
    const originBlock = blockAt(origin);
    const requireDifferentBlock = options.requireDifferentBlock ?? false;
    const sameBlockOnly = options.sameBlockOnly ?? !requireDifferentBlock;
    const maxError = options.maxError ?? Math.max(3, targetDistance * 0.2);
    const choices = [];
    for (let radialStep = -4; radialStep <= 4; radialStep += 1) {
      const distance = Math.max(1, targetDistance + (radialStep * maxError) / 4);
      for (let angleStep = 0; angleStep < 72; angleStep += 1) {
        const angle = ((seed * 137.508 + angleStep * 5 + radialStep * 11) * Math.PI) / 180;
        const point = fromTwd97({
          x: originXy.x + Math.cos(angle) * distance,
          y: originXy.y + Math.sin(angle) * distance,
        });
        const block = blockAt(point);
        if (!block || waterPattern.test(block.use)) continue;
        const sameBlock = block.id === originBlock?.id;
        if (requireDifferentBlock && sameBlock) continue;
        if (sameBlockOnly && !sameBlock) continue;
        const road = crossing(origin, point);
        choices.push({
          point,
          block,
          road,
          distance: distanceMeters(origin, point),
          score: road.weight * 100 - Math.abs(distance - targetDistance) + (sameBlock ? 1000 : 0),
        });
      }
    }
    choices.sort((a, b) => b.score - a.score || a.distance - b.distance);
    return choices[0] ?? null;
  }

  return { blockAt, candidate, crossing, isWater: (block) => waterPattern.test(block?.use ?? "") };
}

export function quantile(values, q) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function summarize(values) {
  return {
    count: values.length,
    min: values.length ? Math.min(...values) : null,
    q25: quantile(values, 0.25),
    median: quantile(values, 0.5),
    q75: quantile(values, 0.75),
    max: values.length ? Math.max(...values) : null,
  };
}
