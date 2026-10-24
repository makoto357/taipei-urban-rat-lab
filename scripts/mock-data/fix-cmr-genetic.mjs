#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSpatialContext,
  distanceMeters,
  readJson,
  summarize,
  writeJson,
} from "./spatial-utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(scriptDir, "../..");
const workspaceDir = path.resolve(repoDir, "..");
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split("=");
    return [key, rest.join("=")];
  }),
);
const dataDir = path.resolve(args.get("--data-dir") || path.join(repoDir, "apps/web/public/data"));
const gisDir = path.resolve(args.get("--gis-dir") || path.join(workspaceDir, "prepare/data/processed/geojson"));
const backupDir = path.resolve(
  args.get("--backup-dir") || path.join(repoDir, "data/mock/backups/cmr-genetic-before-fix-2026-10-23"),
);
const reportFile = path.resolve(
  args.get("--report") || path.join(repoDir, "docs/data/mock-cmr-genetic-before-after.md"),
);

const files = {
  official: "mock-official-observations.json",
  control: "mock-control-records.json",
  samples: "mock-sample-records.json",
  rats: "mock-rat-individuals.json",
  geneticSamples: "mock-genetic-samples.json",
  analyses: "mock-genetic-analyses.json",
  relationships: "mock-genetic-relationships.json",
};

for (const file of Object.values(files)) {
  if (!fs.existsSync(path.join(dataDir, file))) throw new Error(`Missing mock collection: ${file}`);
}
for (const file of [
  "taipei-landuse-detail-merged.geojson",
  "taipei-road-8m.geojson",
  "taipei-road-size.geojson",
]) {
  if (!fs.existsSync(path.join(gisDir, file))) throw new Error(`Missing GIS dataset: ${file}`);
}

fs.mkdirSync(backupDir, { recursive: true });
for (const file of Object.values(files)) {
  const destination = path.join(backupDir, file);
  if (!fs.existsSync(destination)) fs.copyFileSync(path.join(dataDir, file), destination);
}

const current = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readJson(path.join(dataDir, file))]),
);
const before = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readJson(path.join(backupDir, file))]),
);
// Always regenerate mutable research collections from the immutable pre-fix
// backup. This keeps repeated runs deterministic and prevents spatial drift.
// Later append-only mock batches are retained.
const appendedSamples = current.samples.documents.filter((document) =>
  Number(document.id.match(/(\d+)$/)?.[1] ?? 0) > 60,
);
const appendedGeneticSamples = current.geneticSamples.documents.filter((document) =>
  {
    const number = Number(document.id.match(/(\d+)$/)?.[1] ?? 0);
    return number >= 71 && number <= 120;
  },
);
const appendedRats = current.rats.documents.filter((document) =>
  Number(document.id.match(/(\d+)$/)?.[1] ?? 0) > 90,
);
for (const key of ["samples", "rats", "geneticSamples", "analyses", "relationships"]) {
  current[key] = structuredClone(before[key]);
}
current.samples.documents.push(...appendedSamples);
current.geneticSamples.documents.push(...appendedGeneticSamples);
current.rats.documents.push(...appendedRats);
const daanAppendNote =
  "2026-10-23 appended 50 deterministic Daan genetic-sampling records: 38 captured individuals and 12 environmental samples, including five compact three-site family clusters.";
if (appendedSamples.length && !current.samples.notes.includes(daanAppendNote)) {
  current.samples.notes.push(daanAppendNote);
}
if (appendedGeneticSamples.length && !current.geneticSamples.notes.includes(daanAppendNote)) {
  current.geneticSamples.notes.push(daanAppendNote);
}
if (appendedRats.length && !current.rats.notes.includes(daanAppendNote)) {
  current.rats.notes.push(daanAppendNote);
}
const spatial = createSpatialContext({
  landuseFile: path.join(gisDir, "taipei-landuse-detail-merged.geojson"),
  road8mFile: path.join(gisDir, "taipei-road-8m.geojson"),
  roadSizeFile: path.join(gisDir, "taipei-road-size.geojson"),
});

const sampleById = new Map(current.samples.documents.map((document) => [document.id, document]));
const ratById = new Map(current.rats.documents.map((document) => [document.id, document]));
const officialById = new Map(current.official.documents.map((document) => [document.id, document]));

function clone(value) {
  return structuredClone(value);
}

function setRecordSite(record, point, anchor) {
  const anchorOfficialId = anchor.data.linkedOfficialObservationId;
  const official = officialById.get(anchorOfficialId);
  record.data.location = clone(point);
  record.data.district = anchor.data.district;
  record.data.addressText = anchor.data.addressText;
  record.data.placeType = anchor.data.placeType;
  record.data.linkedOfficialObservationId = anchorOfficialId;
  record.source = {
    ...clone(anchor.source),
    officialObservationId: anchorOfficialId,
    dataset: "prepare/data/processed/geojson/taipei-landuse-detail-merged.geojson",
    placement: "synthetic_accessible_point",
  };
  for (const event of record.data.events) {
    event.location = clone(point);
    for (const capture of event.captures ?? []) capture.location = clone(point);
  }
  for (const event of record.data.events) {
    for (const capture of event.captures ?? []) {
      if (capture.captureStatus !== "first_capture") continue;
      const rat = ratById.get(capture.ratId);
      if (!rat) continue;
      rat.source.officialObservationId = anchorOfficialId;
      rat.source.sampleRecordId = record.id;
      rat.source.sampleEventId = event.eventId;
    }
  }
  if (!official) throw new Error(`Missing linked official observation ${anchorOfficialId}`);
}

function findCandidate(origin, distance, seed, options = {}) {
  const candidate = spatial.candidate(origin, distance, seed, options);
  if (candidate) return candidate;
  const fallback = spatial.candidate(origin, distance, seed, { ...options, sameBlockOnly: false });
  if (!fallback) throw new Error(`No accessible land-use candidate near ${JSON.stringify(origin)}`);
  return fallback;
}

// Five small genetic sampling clusters use records 16–30. Each cluster contains
// no more than three complete trapping sites in one operational block. Records
// 1–15 remain dispersed anchors for CMR work.
const clusters = [];
for (let clusterIndex = 0; clusterIndex < 5; clusterIndex += 1) {
  const records = current.samples.documents.slice(15 + clusterIndex * 3, 18 + clusterIndex * 3);
  const anchor = records[0];
  const origin = clone(anchor.data.location);
  for (let index = 1; index < records.length; index += 1) {
    const isRareCrossBlockSite = clusterIndex === 4 && index === 2;
    const firstOffset = clusterIndex % 2 === 0 ? 12 : 5;
    const secondOffset = clusterIndex % 2 === 0 ? 20 : 28;
    const targetDistance = isRareCrossBlockSite
      ? 180
      : index === 1
        ? firstOffset
        : secondOffset;
    const located = findCandidate(origin, targetDistance, 40 + clusterIndex * 10 + index, {
      requireDifferentBlock: isRareCrossBlockSite,
      maxError: isRareCrossBlockSite ? 60 : Math.max(2, targetDistance * 0.15),
    });
    setRecordSite(records[index], located.point, anchor);
  }
  clusters.push(records);
}

// Move each complete recapture site (records 31–60) back near the individual's
// first-capture site. Exact targets give 17/9/3/1 observations in the four bins.
const cmrTargets = [
  ...Array.from({ length: 17 }, (_, index) => 4 + (14 * index) / 16),
  ...Array.from({ length: 9 }, (_, index) => 23 + (24 * index) / 8),
  60,
  78,
  96,
  150,
];
const firstCapture = new Map();
for (const record of current.samples.documents) {
  for (const event of record.data.events) {
    for (const capture of event.captures ?? []) {
      if (capture.captureStatus === "first_capture" && !firstCapture.has(capture.ratId)) {
        firstCapture.set(capture.ratId, { record, event, capture });
      }
    }
  }
}
const recaptureSites = [];
for (const record of current.samples.documents) {
  const recapture = record.data.events
    .flatMap((event) => (event.captures ?? []).map((capture) => ({ event, capture })))
    .find(({ capture }) => capture.captureStatus === "recapture");
  if (!recapture) continue;
  const first = firstCapture.get(recapture.capture.ratId);
  if (!first) throw new Error(`Missing first capture for ${recapture.capture.ratId}`);
  const target = cmrTargets[recaptureSites.length];
  const located = findCandidate(first.capture.location, target, 100 + recaptureSites.length, {
    maxError: target < 20 ? 1 : Math.max(2, target * 0.08),
  });
  setRecordSite(record, located.point, first.record);
  recaptureSites.push({ record, target, road: located.road });
}

// Give co-located traps small, deterministic offsets while retaining the event/site location.
for (const record of current.samples.documents.slice(0, 30)) {
  for (const event of record.data.events) {
    const captures = (event.captures ?? []).filter((capture) => capture.captureStatus === "first_capture");
    for (let index = 0; index < captures.length; index += 1) {
      const located = findCandidate(event.location, 2.5, Number(record.id.slice(-3)) * 2 + index, {
        maxError: 0.5,
      });
      captures[index].location = clone(located.point);
    }
  }
}

// Genetic sampling overlaps most, but not all, CMR encounters. All CMR rats
// retain their first-capture specimen, and fifteen deterministic recaptures
// receive an additional specimen.
const sampledRecaptures = current.samples.documents
  .filter((record) => {
    const number = Number(record.id.match(/(\d+)$/)?.[1] ?? 0);
    return number >= 31 && number <= 45;
  })
  .flatMap((record) =>
    record.data.events.flatMap((event) => {
      const recapture = (event.captures ?? []).find(
        (capture) => capture.captureStatus === "recapture",
      );
      if (!recapture) return [];
      if (!event.actions.includes("sample_collected")) event.actions.push("sample_collected");
      event.notes = "合成資料：完成捕鼠器查核、再捕個體量測與毛髮基因採樣。";
      recapture.notes = `${(recapture.notes ?? "合成資料：完成再捕個體處理").replace(/。$/, "")}、毛髮採樣。`;
      return [{ record, event, capture: recapture }];
    }),
  );
if (sampledRecaptures.length !== 15) {
  throw new Error(`Expected 15 genetically sampled recaptures, found ${sampledRecaptures.length}`);
}
for (let index = 0; index < sampledRecaptures.length; index += 1) {
  const { record, event, capture } = sampledRecaptures[index];
  const id = `mock-genetic-sample-${String(121 + index).padStart(3, "0")}`;
  current.geneticSamples.documents.push({
    id,
    source: {
      sampleRecordId: record.id,
      sampleEventId: event.eventId,
      ratId: capture.ratId,
    },
    data: {
      sampleId: id,
      sampleRecordId: record.id,
      sampleEventId: event.eventId,
      ratId: capture.ratId,
      collectedAt: event.time,
      collectedByUid: event.operatorId,
      sampleType: "hair",
      storageLocation: `Mock Freezer A / CMR Overlap Box ${String(index + 1).padStart(3, "0")}`,
      laboratoryId: "mock-lab-taipei-001",
      analysisStatus: "pending",
      notes: "合成資料：於再捕捉事件取得的個體毛髮基因檢體。",
      createdAt: new Date(Date.parse(event.time) + 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.parse(event.time) + 14 * 24 * 60 * 60 * 1000).toISOString(),
      schemaVersion: 1,
    },
  });
}

// Assign operational blocks after every movement. This does not alter GIS source files.
for (const record of current.samples.documents) {
  const block = spatial.blockAt(record.data.location);
  record.data.blockId = block?.id ?? null;
  record.data.blockVersion = block ? "taipei-landuse-detail-merged" : null;
  if (record.source.placement === "synthetic_accessible_point" && block) {
    record.source.featureId = block.id;
  }
}

function captureIndex(collections) {
  const map = new Map();
  for (const record of collections.samples.documents) {
    for (const event of record.data.events) {
      for (const capture of event.captures ?? []) {
        const entries = map.get(capture.ratId) ?? [];
        entries.push({ record, event, capture });
        map.set(capture.ratId, entries);
      }
    }
  }
  for (const entries of map.values()) entries.sort((a, b) => a.event.time.localeCompare(b.event.time));
  return map;
}

const capturesByRat = captureIndex(current);
const relationshipRats = clusters.map((records) =>
  records.flatMap((record) =>
    record.data.events.flatMap((event) =>
      (event.captures ?? [])
        .filter((capture) => capture.captureStatus === "first_capture")
        .map((capture) => capture.ratId),
    ),
  ),
);

const relationshipDefinitions = [];
for (let clusterIndex = 0; clusterIndex < 4; clusterIndex += 1) {
  const rats = relationshipRats[clusterIndex];
  if (clusterIndex % 2 === 0) {
    // Two parents and two full siblings.
    relationshipDefinitions.push(
      [rats[0], rats[2], "parent_offspring", 0.5, "high"],
      [rats[1], rats[2], "parent_offspring", 0.5, "high"],
      [rats[0], rats[3], "parent_offspring", 0.5, "high"],
      [rats[1], rats[3], "parent_offspring", 0.5, "high"],
      [rats[2], rats[3], "full_sibling", 0.5, "high"],
      [rats[0], rats[4], "parent_offspring", 0.5, "high"],
      [rats[1], rats[4], "parent_offspring", 0.5, "high"],
      [rats[2], rats[4], "full_sibling", 0.5, "high"],
      [rats[3], rats[4], "full_sibling", 0.5, "high"],
    );
  } else {
    // Two offspring share parent 0 but have different second parents.
    relationshipDefinitions.push(
      [rats[0], rats[2], "parent_offspring", 0.5, "high"],
      [rats[1], rats[2], "parent_offspring", 0.5, "high"],
      [rats[0], rats[4], "parent_offspring", 0.5, "high"],
      [rats[3], rats[4], "parent_offspring", 0.5, "high"],
      [rats[2], rats[4], "half_sibling", 0.25, "high"],
      [rats[0], rats[5], "parent_offspring", 0.5, "high"],
      [rats[3], rats[5], "parent_offspring", 0.5, "high"],
      [rats[4], rats[5], "full_sibling", 0.5, "high"],
      [rats[2], rats[5], "half_sibling", 0.25, "high"],
    );
  }
}
// One rare, cross-block positive relationship. The remaining sampled rats are
// intentionally absent from this positive-only relationship collection.
relationshipDefinitions.push([
  relationshipRats[4][2],
  relationshipRats[4][4],
  "other_related",
  0.125,
  "medium",
]);

// The first fifteen Daan captured individuals form five geographically
// separated, three-member family groups. Each group contains one sampled
// parent and two full siblings; the second parent is not sampled.
for (let clusterIndex = 0; clusterIndex < 5; clusterIndex += 1) {
  const parent = `mock-rat-${String(91 + clusterIndex * 3).padStart(3, "0")}`;
  const childA = `mock-rat-${String(92 + clusterIndex * 3).padStart(3, "0")}`;
  const childB = `mock-rat-${String(93 + clusterIndex * 3).padStart(3, "0")}`;
  relationshipDefinitions.push(
    [parent, childA, "parent_offspring", 0.5, "high"],
    [parent, childB, "parent_offspring", 0.5, "medium"],
    [childA, childB, "full_sibling", 0.5, clusterIndex === 4 ? "low" : "high"],
  );
}

// Confirmed extended-kin links across nearby Daan blocks. These are deliberately
// typed as other_related rather than inventing direct parent/sibling roles.
for (const [ratIdA, ratIdB, confidence] of [
  ["mock-rat-100", "mock-rat-119", "medium"],
  ["mock-rat-102", "mock-rat-119", "medium"],
  ["mock-rat-101", "mock-rat-119", "low"],
  ["mock-rat-092", "mock-rat-109", "medium"],
  ["mock-rat-093", "mock-rat-109", "medium"],
  ["mock-rat-091", "mock-rat-109", "low"],
  ["mock-rat-125", "mock-rat-126", "medium"],
  ["mock-rat-101", "mock-rat-118", "low"],
  ["mock-rat-102", "mock-rat-118", "low"],
  ["mock-rat-100", "mock-rat-118", "low"],
]) {
  relationshipDefinitions.push([
    ratIdA,
    ratIdB,
    "other_related",
    0.125,
    confidence,
  ]);
}

current.relationships.documents = current.relationships.documents
  .slice(0, relationshipDefinitions.length)
  .map((document, index) => {
    const [ratIdA, ratIdB, relationshipType, relatednessCoefficient, confidence] =
      relationshipDefinitions[index];
    document.source.ratIdA = ratIdA;
    document.source.ratIdB = ratIdB;
    document.data.ratIdA = ratIdA;
    document.data.ratIdB = ratIdB;
    document.data.relationshipType = relationshipType;
    document.data.relatednessCoefficient = relatednessCoefficient;
    document.data.confidence = confidence;
    return document;
  });

const sampleIdByRat = new Map(
  current.geneticSamples.documents
    .filter((document) => document.data.ratId)
    .map((document) => [document.data.ratId, document.id]),
);
const usedRatIds = new Set(
  current.relationships.documents.flatMap((document) => [document.data.ratIdA, document.data.ratIdB]),
);
const relatednessAnalysis = current.analyses.documents.find(
  (document) => document.id === "mock-genetic-analysis-relatedness-v1",
);
if (!relatednessAnalysis) throw new Error("Missing relatedness analysis");
relatednessAnalysis.data.sampleIds = [...new Set([
  ...relatednessAnalysis.data.sampleIds,
  ...[...usedRatIds].map((ratId) => sampleIdByRat.get(ratId)).filter(Boolean),
])].sort();

for (const collection of [current.samples, current.rats, current.geneticSamples, current.analyses, current.relationships]) {
  const note = "2026-10-23 deterministic spatial revision uses EPSG:3826 calculations and retains synthetic_mock provenance.";
  if (!collection.notes.includes(note)) collection.notes.push(note);
}
const cmrGeneticOverlapNote =
  "Genetic specimens overlap 45 of 60 CMR encounters: all 30 first captures and 15 deterministic recaptures; environmental specimens remain identity-free.";
if (!current.geneticSamples.notes.includes(cmrGeneticOverlapNote)) {
  current.geneticSamples.notes.push(cmrGeneticOverlapNote);
}
const positivePairsNote =
  "This collection contains positive or potentially positive relatedness pairs only; absence from the collection does not imply that an individual was not genetically sampled.";
if (!current.relationships.notes.includes(positivePairsNote)) {
  current.relationships.notes.push(positivePairsNote);
}

function metrics(collections) {
  const index = captureIndex(collections);
  const cmrDistances = [];
  for (const entries of index.values()) {
    if (entries.length > 1) cmrDistances.push(distanceMeters(entries[0].capture.location, entries[1].capture.location));
  }
  const relationshipDistances = [];
  let crossBlock = 0;
  const relatedRatIds = new Set();
  for (const relationship of collections.relationships.documents) {
    relatedRatIds.add(relationship.data.ratIdA);
    relatedRatIds.add(relationship.data.ratIdB);
    const a = index.get(relationship.data.ratIdA)?.[0]?.capture.location;
    const b = index.get(relationship.data.ratIdB)?.[0]?.capture.location;
    if (!a || !b) continue;
    relationshipDistances.push(distanceMeters(a, b));
    const blockA = spatial.blockAt(a)?.id;
    const blockB = spatial.blockAt(b)?.id;
    if (blockA && blockB && blockA !== blockB) crossBlock += 1;
  }
  const sitesByBlock = new Map();
  for (const record of collections.samples.documents) {
    const blockId = spatial.blockAt(record.data.location)?.id ?? "unassigned";
    sitesByBlock.set(blockId, (sitesByBlock.get(blockId) ?? 0) + 1);
  }
  const geneticRatCount = new Set(
    collections.geneticSamples.documents.map((document) => document.data.ratId).filter(Boolean),
  ).size;
  return {
    cmr: { ...summarize(cmrDistances), over200: cmrDistances.filter((value) => value > 200).length },
    genetics: {
      ...summarize(relationshipDistances),
      over330: relationshipDistances.filter((value) => value > 330).length,
      crossBlock,
    },
    sampling: {
      blockCount: sitesByBlock.size,
      maxSitesPerBlock: Math.max(...sitesByBlock.values()),
    },
    relationshipCoverage: {
      geneticIndividuals: geneticRatCount,
      individualsInPositivePairs: relatedRatIds.size,
    },
  };
}

for (const [key, file] of Object.entries(files)) {
  if (["official", "control"].includes(key)) continue;
  writeJson(path.join(dataDir, file), current[key]);
}

const beforeMetrics = metrics(before);
const afterMetrics = metrics(current);
const cmrBinCounts = [
  [0, 20],
  [20, 50],
  [50, 100],
  [100, 200.000001],
].map(([minimum, maximum]) => {
  const captures = captureIndex(current);
  let count = 0;
  for (const entries of captures.values()) {
    if (entries.length > 1) {
      const distance = distanceMeters(entries[0].capture.location, entries[1].capture.location);
      if (distance >= minimum && distance < maximum) count += 1;
    }
  }
  return count;
});
const round = (value) => (value == null ? "n/a" : value.toFixed(1));
const report = `# CMR and genetic mock-data spatial revision

Generated deterministically on 2026-10-23. Distances were calculated in TWD97 / TM2 zone 121 (EPSG:3826); JSON coordinates remain CRS84. The inputs were the three requested GIS datasets. Road overlap is not accumulated: each route uses the widest known intersected road once, and width 0 remains unknown.

| Metric | Before | After |
|---|---:|---:|
| CMR count | ${beforeMetrics.cmr.count} | ${afterMetrics.cmr.count} |
| CMR Q25 / median / Q75 | ${round(beforeMetrics.cmr.q25)} / ${round(beforeMetrics.cmr.median)} / ${round(beforeMetrics.cmr.q75)} m | ${round(afterMetrics.cmr.q25)} / ${round(afterMetrics.cmr.median)} / ${round(afterMetrics.cmr.q75)} m |
| CMR maximum | ${round(beforeMetrics.cmr.max)} m | ${round(afterMetrics.cmr.max)} m |
| CMR >200 m | ${beforeMetrics.cmr.over200} | ${afterMetrics.cmr.over200} |
| CMR bins 0–20 / 20–50 / 50–100 / 100–200 m | — | ${cmrBinCounts.join(" / ")} (${cmrBinCounts.map((count) => `${((count / afterMetrics.cmr.count) * 100).toFixed(1)}%`).join(" / ")}) |
| Related-pair Q25 / median / Q75 | ${round(beforeMetrics.genetics.q25)} / ${round(beforeMetrics.genetics.median)} / ${round(beforeMetrics.genetics.q75)} m | ${round(afterMetrics.genetics.q25)} / ${round(afterMetrics.genetics.median)} / ${round(afterMetrics.genetics.q75)} m |
| Related-pair maximum | ${round(beforeMetrics.genetics.max)} m | ${round(afterMetrics.genetics.max)} m |
| Related pairs >330 m | ${beforeMetrics.genetics.over330} | ${afterMetrics.genetics.over330} |
| Cross-block related pairs | ${beforeMetrics.genetics.crossBlock} | ${afterMetrics.genetics.crossBlock} |
| Genetic relationship documents | ${beforeMetrics.genetics.count} | ${afterMetrics.genetics.count} |
| Genetic individuals in positive pairs | ${beforeMetrics.relationshipCoverage.individualsInPositivePairs} / ${beforeMetrics.relationshipCoverage.geneticIndividuals} | ${afterMetrics.relationshipCoverage.individualsInPositivePairs} / ${afterMetrics.relationshipCoverage.geneticIndividuals} |
| Operational blocks / maximum sites per block | ${beforeMetrics.sampling.blockCount} / ${beforeMetrics.sampling.maxSitesPerBlock} | ${afterMetrics.sampling.blockCount} / ${afterMetrics.sampling.maxSitesPerBlock} |

## Changes and remaining limitations

- Preserved all seven collection files, schemas, timestamps, analysis IDs, capture/genetic references, and every retained document ID. Removed 51 arbitrary relationship documents rather than treating the relationship collection as an exhaustive pair matrix.
- Left official observations and control records byte-for-byte unchanged; their originals are also in the backup.
- Relocated complete trapping-site records and all nested event/capture coordinates, rather than changing isolated recapture points.
- Kept known-individual genetic samples attached to their recorded first-capture events. Environmental samples still have no rat identity.
- Operational block IDs use the containing merged land-use polygon as a proxy for a street block. This is a synthetic constraint, not an official block identifier.
- Road-crossing weights are candidate-selection heuristics, not measured crossing probabilities or biological limits.
- The relationship graph uses deterministic family roles for parent-offspring, full-sibling, and half-sibling edges; “other_related” and “uncertain” remain intentionally nonspecific.
- The relationship collection contains positive or potentially positive pairs only. Individuals absent from this collection may still have valid genetic samples.
- Ten extended-kin relationships connect nearby Daan blocks; they are kept as “other_related” rather than assigning unsupported direct family roles.
- Genetic sampling overlaps 45 of 60 CMR encounters (75%): every CMR individual has a first-capture specimen and fifteen also have a recapture specimen. Capture/mark records remain more numerous than genetic specimens.
`;
fs.mkdirSync(path.dirname(reportFile), { recursive: true });
fs.writeFileSync(reportFile, report);

console.log(JSON.stringify({ dataDir, backupDir, reportFile, before: beforeMetrics, after: afterMetrics }, null, 2));
