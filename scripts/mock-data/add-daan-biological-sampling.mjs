#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSpatialContext,
  distanceMeters,
  fromTwd97,
  readJson,
  writeJson,
} from "./spatial-utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(scriptDir, "../..");
const workspaceDir = path.resolve(repoDir, "..");
const dataDir = path.join(repoDir, "apps/web/public/data");
const gisDir = path.join(workspaceDir, "prepare/data/processed/geojson");
const backupDir = path.join(
  repoDir,
  "data/mock/backups/daan-biological-sampling-before-50-2026-10-23",
);
const paths = {
  official: path.join(dataDir, "mock-official-observations.json"),
  samples: path.join(dataDir, "mock-sample-records.json"),
  rats: path.join(dataDir, "mock-rat-individuals.json"),
  genetic: path.join(dataDir, "mock-genetic-samples.json"),
};

fs.mkdirSync(backupDir, { recursive: true });
for (const [key, file] of Object.entries(paths)) {
  const backup = path.join(backupDir, path.basename(file));
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
}

const official = readJson(paths.official);
const samples = readJson(paths.samples);
const rats = readJson(paths.rats);
const genetic = readJson(paths.genetic);
const spatial = createSpatialContext({
  landuseFile: path.join(gisDir, "taipei-landuse-detail-merged.geojson"),
  road8mFile: path.join(gisDir, "taipei-road-8m.geojson"),
  roadSizeFile: path.join(gisDir, "taipei-road-size.geojson"),
});

function transformCoordinates(coordinates, transform) {
  if (typeof coordinates[0] === "number") return transform(coordinates);
  return coordinates.map((part) => transformCoordinates(part, transform));
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, polygon) {
  return pointInRing(point, polygon[0]) && !polygon.slice(1).some((ring) => pointInRing(point, ring));
}

function pointInGeometry(point, geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) => pointInPolygon(point, polygon));
}

function ringArea(ring) {
  let area = 0;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    area += ring[previous][0] * ring[index][1] - ring[index][0] * ring[previous][1];
  }
  return area / 2;
}

function interiorPoint(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const polygon = polygons.reduce((largest, candidate) =>
    Math.abs(ringArea(candidate[0])) > Math.abs(ringArea(largest[0])) ? candidate : largest,
  );
  const ring = polygon[0];
  let crossSum = 0;
  let xSum = 0;
  let ySum = 0;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const cross = ring[previous][0] * ring[index][1] - ring[index][0] * ring[previous][1];
    crossSum += cross;
    xSum += (ring[previous][0] + ring[index][0]) * cross;
    ySum += (ring[previous][1] + ring[index][1]) * cross;
  }
  const centroid = crossSum === 0 ? ring[0] : [xSum / (3 * crossSum), ySum / (3 * crossSum)];
  if (pointInPolygon(centroid, polygon)) return centroid;
  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  for (let grid = 5; grid <= 31; grid += 2) {
    for (let row = 1; row < grid; row += 1) {
      for (let column = 1; column < grid; column += 1) {
        const point = [
          minX + ((maxX - minX) * column) / grid,
          minY + ((maxY - minY) * row) / grid,
        ];
        if (pointInPolygon(point, polygon)) return point;
      }
    }
  }
  return null;
}

const districtSource = readJson(path.join(gisDir, "taipei-dist.geojson"));
const daanSource = districtSource.features.find((feature) => feature.properties?.TNAME === "大安區");
if (!daanSource) throw new Error("Unable to find 大安區 in taipei-dist.geojson");
const daanGeometry = {
  ...daanSource.geometry,
  coordinates: transformCoordinates(daanSource.geometry.coordinates, ([x, y]) => {
    const point = fromTwd97({ x, y });
    return [point.longitude, point.latitude];
  }),
};

const officialRange = (id) => {
  const number = Number(id.match(/(\d+)$/)?.[1] ?? 0);
  return number >= 251 && number <= 300;
};
const sampleRange = (id) => {
  const number = Number(id.match(/(\d+)$/)?.[1] ?? 0);
  return number >= 61 && number <= 110;
};
const geneticRange = (id) => {
  const number = Number(id.match(/(\d+)$/)?.[1] ?? 0);
  return number >= 71 && number <= 120;
};
const ratRange = (id) => {
  const number = Number(id.match(/(\d+)$/)?.[1] ?? 0);
  return number >= 91 && number <= 128;
};

official.documents = official.documents.filter((document) => !officialRange(document.id));
samples.documents = samples.documents.filter((document) => !sampleRange(document.id));
rats.documents = rats.documents.filter((document) => !ratRange(document.id));
genetic.documents = genetic.documents.filter((document) => !geneticRange(document.id));

const usedSources = new Set(
  official.documents.map((document) => `${document.source.dataset}|${document.source.featureId}`),
);
const blockCounts = new Map();
for (const record of samples.documents) {
  const blockId = spatial.blockAt(record.data.location)?.id;
  if (blockId) blockCounts.set(blockId, (blockCounts.get(blockId) ?? 0) + 1);
}

function candidatesFrom(features, type) {
  const dataset =
    type === "building"
      ? "prepare/data/processed/geojson/taipei-buildings.geojson"
      : "prepare/data/processed/geojson/taipei-landuse-detail-merged.geojson";
  const candidates = [];
  for (const feature of features) {
    if (!feature.geometry || !["Polygon", "MultiPolygon"].includes(feature.geometry.type)) continue;
    const point = interiorPoint(feature.geometry);
    if (!point || !pointInGeometry(point, daanGeometry)) continue;
    const featureId = String(type === "building" ? feature.properties?.fid : feature.properties?.["編號"]);
    if (usedSources.has(`${dataset}|${featureId}`)) continue;
    const location = {
      latitude: Number(point[1].toFixed(7)),
      longitude: Number(point[0].toFixed(7)),
    };
    const block = spatial.blockAt(location);
    if (!block || spatial.isWater(block) || (blockCounts.get(block.id) ?? 0) >= 3) continue;
    candidates.push({
      type,
      dataset,
      featureId,
      geometry: feature.geometry,
      geometryType: feature.geometry.type,
      point,
      location,
      block,
      name: feature.properties?.name ?? null,
      landUse: feature.properties?.["使用分區"] ?? null,
    });
  }
  candidates.sort((a, b) => a.point[0] - b.point[0] || a.point[1] - b.point[1]);
  return candidates;
}

const buildings = readJson(path.join(gisDir, "taipei-buildings.geojson")).features.filter(
  (feature) => feature.properties?.fclass === "building",
);
const parks = readJson(path.join(gisDir, "taipei-landuse-detail-merged.geojson")).features.filter(
  (feature) => feature.properties?.["使用分區"] === "公園用地",
);
const parkCandidates = candidatesFrom(parks, "park");
const buildingCandidates = candidatesFrom(buildings, "building");

function selectSpread(candidates, count, blocked = new Set()) {
  const onePerBlock = [];
  const seen = new Set(blocked);
  for (const candidate of candidates) {
    if (seen.has(candidate.block.id)) continue;
    seen.add(candidate.block.id);
    onePerBlock.push(candidate);
  }
  if (onePerBlock.length < count) throw new Error(`Need ${count} distinct blocks, found ${onePerBlock.length}`);
  const selected = [];
  for (let index = 0; index < count; index += 1) {
    selected.push(onePerBlock[Math.floor(((index + 1) * onePerBlock.length) / (count + 1))]);
  }
  return selected;
}

function compactTriplet(candidates) {
  let best = null;
  for (const anchor of candidates) {
    const nearest = candidates
      .filter((candidate) => candidate !== anchor)
      .map((candidate) => ({
        candidate,
        distance: distanceMeters(anchor.location, candidate.location),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);
    if (nearest.length < 2) continue;
    const triplet = [anchor, ...nearest.map((item) => item.candidate)];
    const distances = [
      distanceMeters(triplet[0].location, triplet[1].location),
      distanceMeters(triplet[0].location, triplet[2].location),
      distanceMeters(triplet[1].location, triplet[2].location),
    ];
    const maxDistance = Math.max(...distances);
    if (!best || maxDistance < best.maxDistance) best = { triplet, maxDistance };
  }
  return best;
}

const buildingsByBlock = new Map();
for (const candidate of buildingCandidates) {
  const candidates = buildingsByBlock.get(candidate.block.id) ?? [];
  candidates.push(candidate);
  buildingsByBlock.set(candidate.block.id, candidates);
}
const clusterOptions = [...buildingsByBlock.entries()]
  .filter(([blockId, candidates]) => (blockCounts.get(blockId) ?? 0) === 0 && candidates.length >= 3)
  .map(([blockId, candidates]) => {
    const compact = compactTriplet(candidates);
    if (!compact) return null;
    return {
      block: compact.triplet[0].block,
      point: compact.triplet[0].point,
      candidates: compact.triplet,
      maxDistance: compact.maxDistance,
    };
  })
  .filter((option) => option && option.maxDistance <= 25)
  .sort((a, b) => a.point[0] - b.point[0] || a.point[1] - b.point[1]);
if (clusterOptions.length < 5) {
  throw new Error(`Need five compact Daan family clusters, found ${clusterOptions.length}`);
}

const selectedClusterOptions = selectSpread(clusterOptions, 5);
const clusterBlocks = new Set(selectedClusterOptions.map((option) => option.block.id));
const clusteredCaptured = selectedClusterOptions.flatMap((option) => option.candidates);
const capturedSingles = selectSpread(buildingCandidates, 23, clusterBlocks);
const captured = [...clusteredCaptured, ...capturedSingles];
const capturedBlocks = new Set(captured.map((candidate) => candidate.block.id));
const environmentalBuildings = selectSpread(buildingCandidates, 2, capturedBlocks);
const buildingBlocks = new Set([
  ...capturedBlocks,
  ...environmentalBuildings.map((candidate) => candidate.block.id),
]);
const environmentalParks = selectSpread(parkCandidates, 10, buildingBlocks);
const selected = [
  ...captured,
  ...environmentalBuildings,
  ...environmentalParks,
];
if (
  selected.length !== 50 ||
  new Set(selected.map((candidate) => `${candidate.dataset}|${candidate.featureId}`)).size !== 50
) {
  throw new Error("Daan sampling selection is incomplete or contains duplicate GIS features");
}

const pad = (number) => String(number).padStart(2, "0");
function timestamp(index, dayOffset, hourOffset = 0) {
  const date = new Date(Date.UTC(2026, 8, 1 + Math.floor(index / 2) + dayOffset, 8 + (index % 2) * 3 + hourOffset, (index * 11) % 60));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:00+08:00`;
}

for (let index = 0; index < selected.length; index += 1) {
  const candidate = selected[index];
  const officialId = `mock-official-observation-${String(251 + index).padStart(3, "0")}`;
  const sampleRecordId = `mock-sample-record-${String(61 + index).padStart(3, "0")}`;
  const geneticSampleId = `mock-genetic-sample-${String(71 + index).padStart(3, "0")}`;
  const capturedIndividual = index < 38;
  const ratId = capturedIndividual
    ? `mock-rat-${String(91 + index).padStart(3, "0")}`
    : null;
  const eventId = `${sampleRecordId}-${capturedIndividual ? "event-checked" : "event-environment-sample"}`;
  const reporterId = `mock-official-${String((index % 3) + 1).padStart(3, "0")}`;
  const placeLabel = candidate.type === "building" ? "建物" : "公園";
  const addressText = `臺北市大安區（合成${placeLabel}點位）`;
  const observedAt = timestamp(index, 0, 0);
  const officialCreatedAt = timestamp(index, 0, 6);
  const officialUpdatedAt = timestamp(index, 1, 1);
  const sampleCreatedAt = timestamp(index, 1, 0);
  const trapPlacedAt = timestamp(index, 1, 1);
  const collectedAt = capturedIndividual ? timestamp(index, 2, 1) : timestamp(index, 1, 3);
  const trapRemovedAt = timestamp(index, 2, 3);
  const sampleUpdatedAt = capturedIndividual ? timestamp(index, 2, 4) : timestamp(index, 1, 5);
  const geneticUpdatedAt = timestamp(index, 4, 3);

  official.documents.push({
    id: officialId,
    source: {
      dataset: candidate.dataset,
      featureId: candidate.featureId,
      geometryType: candidate.geometryType,
      placement: "interior_point",
      sourceName: candidate.name,
      sourceLandUse: candidate.landUse,
    },
    data: {
      reporterId,
      organizationId: "mock-org-taipei-urban-rat-lab",
      observedAt,
      createdAt: officialCreatedAt,
      updatedAt: officialUpdatedAt,
      location: candidate.location,
      addressText,
      district: "大安區",
      blockId: candidate.block.id,
      blockVersion: "taipei-landuse-detail-merged",
      surveyMethod: "environmental_inspection",
      surveyResult: "evidence_found",
      observationTypes: [capturedIndividual ? "live_rat" : "rat_droppings"],
      description: capturedIndividual
        ? `合成資料：於${placeLabel}範圍發現活鼠活動，並安排捕獲個體基因採樣。`
        : `合成資料：於${placeLabel}範圍發現疑似鼠糞，並安排環境基因採樣。`,
      recommendedActions: "完成檢體保存與實驗室登錄，並安排後續環境複查。",
      photoPaths: [],
      schemaVersion: 1,
      suspectedSpecies: capturedIndividual ? "norway_rat" : "unknown",
      speciesConfidence: capturedIndividual ? "medium" : "low",
    },
  });

  samples.documents.push({
    id: sampleRecordId,
    source: {
      officialObservationId: officialId,
      dataset: candidate.dataset,
      featureId: candidate.featureId,
      placement: "interior_point",
    },
    data: {
      reporterId,
      organizationId: "mock-org-taipei-urban-rat-lab",
      createdAt: sampleCreatedAt,
      updatedAt: sampleUpdatedAt,
      location: candidate.location,
      addressText,
      district: "大安區",
      blockId: candidate.block.id,
      blockVersion: "taipei-landuse-detail-merged",
      placeType: candidate.type === "building" ? "building_interior" : "park",
      sampleMethod: capturedIndividual ? "live_trapping" : "environmental_sampling",
      linkedOfficialObservationId: officialId,
      events: capturedIndividual
        ? [
            {
              eventId: `${sampleRecordId}-event-placed`,
              time: trapPlacedAt,
              operatorId: reporterId,
              actions: ["trap_placed"],
              photoPaths: [],
              samplingEffort: { trapCount: 3, durationHours: 24 },
              location: candidate.location,
              notes: "合成資料：設置活捉式捕鼠器。",
            },
            {
              eventId,
              time: collectedAt,
              operatorId: reporterId,
              actions: ["trap_checked", "sample_collected"],
              photoPaths: [],
              sampleType: "live_rat",
              sampleCount: 1,
              captures: [
                {
                  ratId,
                  markCode: `MR${String(91 + index).padStart(3, "0")}`,
                  trapId: `${sampleRecordId}-trap-1`,
                  captureStatus: "first_capture",
                  species: "norway_rat",
                  sex: index % 2 === 0 ? "male" : "female",
                  weightG: 245 + ((index * 17) % 190),
                  marked: true,
                  released: true,
                  location: candidate.location,
                  notes: "合成資料：完成量測、標記、毛髮採樣與釋放。",
                },
              ],
              samplingEffort: { trapCount: 3, durationHours: 24 },
              location: candidate.location,
              notes: "合成資料：捕獲一隻個體並取得基因檢體。",
            },
            {
              eventId: `${sampleRecordId}-event-removed`,
              time: trapRemovedAt,
              operatorId: reporterId,
              actions: ["trap_removed"],
              photoPaths: [],
              location: candidate.location,
              notes: "合成資料：完成捕鼠器移除。",
            },
          ]
        : [
            {
              eventId,
              time: collectedAt,
              operatorId: reporterId,
              actions: ["sample_collected"],
              photoPaths: [],
              sampleType: "rat_droppings",
              sampleCount: 1,
              location: candidate.location,
              notes: "合成資料：採集一份無法確認個體來源的鼠糞環境基因檢體。",
            },
          ],
      schemaVersion: 1,
    },
  });

  if (capturedIndividual && ratId) {
    rats.documents.push({
      id: ratId,
      source: {
        sampleRecordId,
        sampleEventId: eventId,
        officialObservationId: officialId,
      },
      data: {
        markCode: `MR${String(91 + index).padStart(3, "0")}`,
        markType: "ear_tag",
        species: "norway_rat",
        sex: index % 2 === 0 ? "male" : "female",
        firstCapturedAt: collectedAt,
        firstCapture: { sampleRecordId, sampleEventId: eventId },
        createdAt: timestamp(index, 2, 2),
        updatedAt: timestamp(index, 2, 4),
        schemaVersion: 1,
        geneticSampleId,
      },
    });
  }

  genetic.documents.push({
    id: geneticSampleId,
    source: { sampleRecordId, sampleEventId: eventId, ratId },
    data: {
      sampleId: geneticSampleId,
      sampleRecordId,
      sampleEventId: eventId,
      ...(ratId ? { ratId } : {}),
      collectedAt,
      collectedByUid: reporterId,
      sampleType: capturedIndividual ? "hair" : "feces",
      storageLocation: capturedIndividual
        ? `Mock Freezer A / Daan Individual Box ${String(index + 1).padStart(3, "0")}`
        : `Mock Freezer B / Daan Environmental Box ${String(index + 1).padStart(3, "0")}`,
      laboratoryId: "mock-lab-taipei-001",
      analysisStatus: "pending",
      notes: capturedIndividual
        ? "合成資料：由已標記捕獲個體取得的毛髮基因檢體。"
        : "合成資料：環境基因檢體，個體來源未知；不得任意指定 ratId。",
      createdAt: capturedIndividual ? timestamp(index, 2, 2) : timestamp(index, 1, 4),
      updatedAt: geneticUpdatedAt,
      schemaVersion: 1,
    },
  });

  blockCounts.set(candidate.block.id, (blockCounts.get(candidate.block.id) ?? 0) + 1);
}

for (const collection of [official, samples, rats, genetic]) {
  collection.notes = collection.notes.filter(
    (note) => !note.startsWith("2026-10-23 appended 50 deterministic Daan"),
  );
  const note = "2026-10-23 appended 50 deterministic Daan genetic-sampling records: 38 captured individuals and 12 environmental samples, including five compact three-site family clusters.";
  if (!collection.notes.includes(note)) collection.notes.push(note);
}

const officialById = new Map(official.documents.map((document) => [document.id, document]));
const sampleById = new Map(samples.documents.map((document) => [document.id, document]));
for (const document of official.documents.filter((item) => officialRange(item.id))) {
  const point = [document.data.location.longitude, document.data.location.latitude];
  if (document.data.district !== "大安區" || !pointInGeometry(point, daanGeometry)) {
    throw new Error(`${document.id} is not inside 大安區`);
  }
}
for (const document of samples.documents.filter((item) => sampleRange(item.id))) {
  if (!officialById.has(document.data.linkedOfficialObservationId)) {
    throw new Error(`${document.id} has no linked official observation`);
  }
}
for (const document of genetic.documents.filter((item) => geneticRange(item.id))) {
  const sample = sampleById.get(document.data.sampleRecordId);
  if (!sample?.data.events.some((event) => event.eventId === document.data.sampleEventId)) {
    throw new Error(`${document.id} has no linked sampling event`);
  }
  const number = Number(document.id.match(/(\d+)$/)?.[1] ?? 0);
  const shouldHaveRat = number >= 71 && number <= 108;
  if (shouldHaveRat !== Boolean(document.data.ratId && document.source.ratId)) {
    throw new Error(`${document.id} ratId does not match captured/environmental allocation`);
  }
}
if (Math.max(...blockCounts.values()) > 3) throw new Error("A block exceeds three sampling sites");

writeJson(paths.official, official);
writeJson(paths.samples, samples);
writeJson(paths.rats, rats);
writeJson(paths.genetic, genetic);

console.log(JSON.stringify({
  officialObservations: official.documents.length,
  sampleRecords: samples.documents.length,
  ratIndividuals: rats.documents.length,
  geneticSamples: genetic.documents.length,
  appended: selected.length,
  appendedBuildings: selected.filter((item) => item.type === "building").length,
  appendedParks: selected.filter((item) => item.type === "park").length,
  capturedIndividualSamples: 38,
  environmentalSamples: 12,
  maxSamplingSitesPerBlock: Math.max(...blockCounts.values()),
  backupDir,
}, null, 2));
