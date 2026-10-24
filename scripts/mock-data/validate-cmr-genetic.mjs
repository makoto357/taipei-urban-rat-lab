#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSpatialContext,
  distanceMeters,
  readJson,
  summarize,
} from "./spatial-utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(scriptDir, "../..");
const workspaceDir = path.resolve(repoDir, "..");
const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.split("=");
    return [key, value.join("=")];
  }),
);
const dataDir = path.resolve(args.get("--data-dir") || path.join(repoDir, "apps/web/public/data"));
const gisDir = path.resolve(args.get("--gis-dir") || path.join(workspaceDir, "prepare/data/processed/geojson"));
const names = {
  official: "mock-official-observations.json",
  control: "mock-control-records.json",
  samples: "mock-sample-records.json",
  rats: "mock-rat-individuals.json",
  geneticSamples: "mock-genetic-samples.json",
  analyses: "mock-genetic-analyses.json",
  relationships: "mock-genetic-relationships.json",
};
const collections = Object.fromEntries(
  Object.entries(names).map(([key, name]) => [key, readJson(path.join(dataDir, name))]),
);
const spatial = createSpatialContext({
  landuseFile: path.join(gisDir, "taipei-landuse-detail-merged.geojson"),
  road8mFile: path.join(gisDir, "taipei-road-8m.geojson"),
  roadSizeFile: path.join(gisDir, "taipei-road-size.geojson"),
});
const errors = [];
const warnings = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};

for (const [key, collection] of Object.entries(collections)) {
  check(collection.provenance === "synthetic_mock", `${key}: provenance must remain synthetic_mock`);
  check(collection.schemaVersion === 1, `${key}: top-level schemaVersion changed`);
  check(collection.coordinateReferenceSystem === "OGC:CRS84", `${key}: output CRS must be OGC:CRS84`);
  const ids = collection.documents.map((document) => document.id);
  check(new Set(ids).size === ids.length, `${key}: duplicate document IDs`);
}

const sampleById = new Map(collections.samples.documents.map((document) => [document.id, document]));
const officialById = new Map(collections.official.documents.map((document) => [document.id, document]));
const ratById = new Map(collections.rats.documents.map((document) => [document.id, document]));
const geneticSampleById = new Map(
  collections.geneticSamples.documents.map((document) => [document.id, document]),
);
const analysisById = new Map(collections.analyses.documents.map((document) => [document.id, document]));
const capturesByRat = new Map();
const eventByKey = new Map();
let waterSites = 0;
let blockMismatches = 0;
const sitesByBlock = new Map();

for (const record of collections.samples.documents) {
  const block = spatial.blockAt(record.data.location);
  if (spatial.isWater(block)) waterSites += 1;
  if ((block?.id ?? null) !== record.data.blockId) blockMismatches += 1;
  const blockKey = block?.id ?? "unassigned";
  sitesByBlock.set(blockKey, (sitesByBlock.get(blockKey) ?? 0) + 1);
  const times = record.data.events.map((event) => Date.parse(event.time));
  if (record.data.linkedOfficialObservationId) {
    check(
      officialById.has(record.data.linkedOfficialObservationId),
      `${record.id}: missing official observation ${record.data.linkedOfficialObservationId}`,
    );
  }
  check(times.every((time, index) => index === 0 || time >= times[index - 1]), `${record.id}: events are not chronological`);
  for (const event of record.data.events) {
    eventByKey.set(`${record.id}|${event.eventId}`, event);
    for (const capture of event.captures ?? []) {
      check(ratById.has(capture.ratId), `${record.id}/${event.eventId}: missing rat ${capture.ratId}`);
      check(distanceMeters(event.location, capture.location) <= 15, `${record.id}/${event.eventId}: capture is >15 m from event location`);
      const values = capturesByRat.get(capture.ratId) ?? [];
      values.push({ record, event, capture });
      capturesByRat.set(capture.ratId, values);
    }
  }
}
check(waterSites === 0, `${waterSites} trapping sites are in water land-use polygons`);
check(blockMismatches === 0, `${blockMismatches} trapping sites have inconsistent blockId values`);
const maxSitesPerBlock = Math.max(...sitesByBlock.values());
check(maxSitesPerBlock <= 3, `a block contains ${maxSitesPerBlock} sampling sites; maximum is 3`);

const cmrDistances = [];
const cmrRoads = [];
for (const [ratId, entries] of capturesByRat) {
  entries.sort((a, b) => a.event.time.localeCompare(b.event.time));
  check(entries[0].capture.captureStatus === "first_capture", `${ratId}: first chronological encounter is not first_capture`);
  for (const entry of entries.slice(1)) {
    check(entry.capture.captureStatus === "recapture", `${ratId}: later encounter is not recapture`);
    check(Date.parse(entry.event.time) >= Date.parse(entries[0].event.time), `${ratId}: recapture precedes first capture`);
    cmrDistances.push(distanceMeters(entries[0].capture.location, entry.capture.location));
    cmrRoads.push(spatial.crossing(entries[0].capture.location, entry.capture.location));
  }
}
check(cmrDistances.length === 30, `expected 30 recaptures, found ${cmrDistances.length}`);
check(cmrDistances.every((distance) => distance <= 200), "one or more recaptures exceed 200 m");
const cmrBins = [
  cmrDistances.filter((distance) => distance < 20).length,
  cmrDistances.filter((distance) => distance >= 20 && distance < 50).length,
  cmrDistances.filter((distance) => distance >= 50 && distance < 100).length,
  cmrDistances.filter((distance) => distance >= 100 && distance <= 200).length,
];
const targetBins = [0.55, 0.3, 0.12, 0.03];
for (let index = 0; index < cmrBins.length; index += 1) {
  check(
    Math.abs(cmrBins[index] / cmrDistances.length - targetBins[index]) <= 0.05,
    `CMR bin ${index + 1} differs from target by more than 5 percentage points`,
  );
}

for (const rat of collections.rats.documents) {
  const first = capturesByRat.get(rat.id)?.find((entry) => entry.capture.captureStatus === "first_capture");
  check(Boolean(first), `${rat.id}: missing first-capture encounter`);
  if (!first) continue;
  check(rat.data.firstCapture.sampleRecordId === first.record.id, `${rat.id}: firstCapture record reference mismatch`);
  check(rat.data.firstCapture.sampleEventId === first.event.eventId, `${rat.id}: firstCapture event reference mismatch`);
  check(rat.data.firstCapturedAt === first.event.time, `${rat.id}: firstCapturedAt mismatch`);
  if (rat.data.geneticSampleId) check(geneticSampleById.has(rat.data.geneticSampleId), `${rat.id}: missing genetic sample`);
}

for (const sample of collections.geneticSamples.documents) {
  const record = sampleById.get(sample.data.sampleRecordId);
  const event = eventByKey.get(`${sample.data.sampleRecordId}|${sample.data.sampleEventId}`);
  check(Boolean(record), `${sample.id}: missing sample record`);
  check(Boolean(event), `${sample.id}: missing collection event`);
  if (sample.data.ratId) {
    check(ratById.has(sample.data.ratId), `${sample.id}: missing rat ${sample.data.ratId}`);
    check(
      Boolean(event?.captures?.some((capture) => capture.ratId === sample.data.ratId)),
      `${sample.id}: known individual was not captured at linked event`,
    );
  } else {
    check(sample.source.ratId == null, `${sample.id}: environmental sample source has an arbitrary ratId`);
  }
}

const individualGeneticKeys = new Set(
  collections.geneticSamples.documents
    .filter((sample) => sample.data.ratId)
    .map(
      (sample) =>
        `${sample.data.sampleRecordId}|${sample.data.sampleEventId}|${sample.data.ratId}`,
    ),
);
let captureGeneticOverlap = 0;
let cmrCaptureGeneticOverlap = 0;
let cmrCaptureCount = 0;
const totalCaptureCount = [...capturesByRat.values()].reduce(
  (sum, entries) => sum + entries.length,
  0,
);
for (const [ratId, entries] of capturesByRat) {
  const isCmrIndividual = entries.length > 1;
  for (const entry of entries) {
    const key = `${entry.record.id}|${entry.event.eventId}|${ratId}`;
    const hasLinkedGeneticSample = individualGeneticKeys.has(key);
    if (hasLinkedGeneticSample) captureGeneticOverlap += 1;
    if (isCmrIndividual) {
      cmrCaptureCount += 1;
      if (hasLinkedGeneticSample) cmrCaptureGeneticOverlap += 1;
    }
  }
  if (isCmrIndividual) {
    const firstCapture = entries.find(
      (entry) => entry.capture.captureStatus === "first_capture",
    );
    const firstCaptureKey = firstCapture
      ? `${firstCapture.record.id}|${firstCapture.event.eventId}|${ratId}`
      : "";
    check(
      Boolean(firstCapture && individualGeneticKeys.has(firstCaptureKey)),
      `${ratId}: CMR individual has no first-capture genetic specimen`,
    );
  }
}
check(
  cmrCaptureCount === 60 && cmrCaptureGeneticOverlap === 45,
  `expected CMR/genetic overlap 45/60, found ${cmrCaptureGeneticOverlap}/${cmrCaptureCount}`,
);
check(
  totalCaptureCount > collections.geneticSamples.documents.length,
  `capture records (${totalCaptureCount}) must outnumber genetic samples (${collections.geneticSamples.documents.length})`,
);

for (const analysis of collections.analyses.documents) {
  for (const sampleId of analysis.data.sampleIds) check(geneticSampleById.has(sampleId), `${analysis.id}: missing sample ${sampleId}`);
}

const relationshipDistances = [];
let crossBlock = 0;
const relationshipPairs = new Set();
const relatedRatIds = new Set();
for (const relationship of collections.relationships.documents) {
  const { ratIdA, ratIdB, analysisId } = relationship.data;
  relatedRatIds.add(ratIdA);
  relatedRatIds.add(ratIdB);
  check(ratIdA !== ratIdB, `${relationship.id}: self relationship`);
  check(ratById.has(ratIdA) && ratById.has(ratIdB), `${relationship.id}: missing rat reference`);
  check(analysisById.has(analysisId), `${relationship.id}: missing analysis ${analysisId}`);
  const key = [ratIdA, ratIdB].sort().join("|");
  check(!relationshipPairs.has(key), `${relationship.id}: duplicate unordered rat pair`);
  relationshipPairs.add(key);
  const pointA = capturesByRat.get(ratIdA)?.[0]?.capture.location;
  const pointB = capturesByRat.get(ratIdB)?.[0]?.capture.location;
  if (!pointA || !pointB) continue;
  const distance = distanceMeters(pointA, pointB);
  relationshipDistances.push(distance);
  const blockA = spatial.blockAt(pointA)?.id;
  const blockB = spatial.blockAt(pointB)?.id;
  if (blockA && blockB && blockA !== blockB) crossBlock += 1;
}
const genetics = summarize(relationshipDistances);
check(relationshipDistances.every((distance) => distance <= 330), "one or more genetic relationships exceed 330 m");
check(genetics.q25 >= 3 && genetics.q25 <= 12, `genetic Q25 ${genetics.q25?.toFixed(1)} m is outside reference tolerance`);
check(genetics.median >= 10 && genetics.median <= 25, `genetic median ${genetics.median?.toFixed(1)} m is outside reference tolerance`);
check(genetics.q75 >= 20 && genetics.q75 <= 50, `genetic Q75 ${genetics.q75?.toFixed(1)} m is outside reference tolerance`);
check(crossBlock >= 10, `expected at least 10 cross-block pairs, found ${crossBlock}`);
const geneticRatIds = new Set(
  collections.geneticSamples.documents.map((document) => document.data.ratId).filter(Boolean),
);
check(
  relatedRatIds.size < geneticRatIds.size / 2,
  `${relatedRatIds.size} of ${geneticRatIds.size} genetic individuals occur in positive relationship pairs`,
);

if (cmrRoads.some((road) => road.maxWidth >= 30)) {
  warnings.push("At least one CMR route crosses a road >=30 m; inspect if alternatives are desired.");
}

const result = {
  ok: errors.length === 0,
  errors,
  warnings,
  counts: Object.fromEntries(Object.entries(collections).map(([key, collection]) => [key, collection.documents.length])),
  cmr: {
    ...summarize(cmrDistances),
    bins: {
      "0-20m": cmrBins[0],
      "20-50m": cmrBins[1],
      "50-100m": cmrBins[2],
      "100-200m": cmrBins[3],
    },
    widestRoadCrossingMeters: Math.max(0, ...cmrRoads.map((road) => road.maxWidth ?? 0)),
    geneticOverlap: `${cmrCaptureGeneticOverlap}/${cmrCaptureCount}`,
  },
  captureGeneticOverlap: `${captureGeneticOverlap}/${totalCaptureCount}`,
  genetics: { ...genetics, crossBlock },
  relationshipCoverage: {
    geneticIndividuals: geneticRatIds.size,
    individualsInPositivePairs: relatedRatIds.size,
    individualsWithoutPositivePair: geneticRatIds.size - relatedRatIds.size,
  },
  integrity: { waterSites, blockMismatches, blockCount: sitesByBlock.size, maxSitesPerBlock },
};

const daanOfficial = collections.official.documents.filter((document) => {
  const number = Number(document.id.match(/(\d+)$/)?.[1] ?? 0);
  return number >= 251 && number <= 300;
});
const daanSamples = collections.samples.documents.filter((document) => {
  const number = Number(document.id.match(/(\d+)$/)?.[1] ?? 0);
  return number >= 61 && number <= 110;
});
const daanGenetic = collections.geneticSamples.documents.filter((document) => {
  const number = Number(document.id.match(/(\d+)$/)?.[1] ?? 0);
  return number >= 71 && number <= 120;
});
const daanRats = collections.rats.documents.filter((document) => {
  const number = Number(document.id.match(/(\d+)$/)?.[1] ?? 0);
  return number >= 91 && number <= 128;
});
check(daanOfficial.length === 50, `expected 50 appended Daan observations, found ${daanOfficial.length}`);
check(daanSamples.length === 50, `expected 50 appended Daan sample records, found ${daanSamples.length}`);
check(daanGenetic.length === 50, `expected 50 appended Daan genetic samples, found ${daanGenetic.length}`);
check(daanRats.length === 38, `expected 38 appended Daan rat individuals, found ${daanRats.length}`);
for (const document of daanOfficial) {
  check(document.data.district === "大安區", `${document.id}: appended observation is not in 大安區`);
}
for (const document of daanSamples) {
  const number = Number(document.id.match(/(\d+)$/)?.[1] ?? 0);
  const captured = number <= 98;
  check(document.data.district === "大安區", `${document.id}: appended sample is not in 大安區`);
  check(
    document.data.sampleMethod === (captured ? "live_trapping" : "environmental_sampling"),
    `${document.id}: sampling method does not match 38/12 allocation`,
  );
  check(
    document.data.events.some((event) => event.actions.includes("sample_collected")),
    `${document.id}: no genetic sample collection event`,
  );
  const captures = document.data.events.flatMap((event) => event.captures ?? []);
  check(captures.length === (captured ? 1 : 0), `${document.id}: capture count does not match allocation`);
}
for (const document of daanGenetic) {
  const number = Number(document.id.match(/(\d+)$/)?.[1] ?? 0);
  const captured = number <= 108;
  check(
    captured
      ? Boolean(document.data.ratId && document.source.ratId)
      : document.data.ratId == null && document.source.ratId == null,
    `${document.id}: ratId does not match 38/12 allocation`,
  );
}
result.daanBiologicalBatch = {
  officialObservations: daanOfficial.length,
  sampleRecords: daanSamples.length,
  capturedIndividualGeneticSamples: daanGenetic.filter((document) => document.data.ratId).length,
  environmentalGeneticSamples: daanGenetic.filter((document) => !document.data.ratId).length,
  ratIndividuals: daanRats.length,
};
result.ok = errors.length === 0;
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
