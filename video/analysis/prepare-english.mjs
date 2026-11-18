import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (file) =>
  JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const content = read("src/en-2min/content.json");
const analysis = read("analysis/fun-time.en-2min.analysis.json");
const barF = (bar) => Math.round(((bar * 4 * 60) / analysis.grid.bpm) * 30);
const out = path.join(root, "public/en-2min");
fs.mkdirSync(out, { recursive: true });

const samples = JSON.parse(
  fs.readFileSync(
    path.join(root, "../apps/web/public/data/mock-sample-records.json"),
    "utf8",
  ),
);
const genetics = JSON.parse(
  fs.readFileSync(
    path.join(root, "../apps/web/public/data/mock-genetic-samples.json"),
    "utf8",
  ),
);
const individuals = JSON.parse(
  fs.readFileSync(
    path.join(root, "../apps/web/public/data/mock-rat-individuals.json"),
    "utf8",
  ),
);
for (const source of [samples, genetics, individuals]) {
  if (source.provenance !== "synthetic_mock")
    throw new Error("Expected synthetic research fixtures");
}
const individual = individuals.documents.find((r) => r.id === "mock-rat-017");
if (!individual) throw new Error("Expected fixture individual missing");
const encounters = samples.documents
  .flatMap((record) =>
    record.data.events.flatMap((event) =>
      (event.captures ?? [])
        .filter((capture) => capture.ratId === individual.id)
        .map((capture) => ({
          recordId: record.id,
          eventId: event.eventId,
          at: event.time,
          status: capture.captureStatus,
          weightG: capture.weightG,
          markCode: capture.markCode,
          samplingEffort: event.samplingEffort ?? null,
        })),
    ),
  )
  .sort((a, b) => a.at.localeCompare(b.at));
const specimen = genetics.documents.find((r) => r.data.ratId === individual.id);
if (!specimen || encounters.length < 2)
  throw new Error("Need a linked specimen and recapture fixture");
const firstRecord = samples.documents.find(
  (r) => r.id === encounters[0].recordId,
);
const effort = firstRecord.data.events.find(
  (e) => e.samplingEffort,
)?.samplingEffort;
fs.writeFileSync(
  path.join(out, "research-example.json"),
  JSON.stringify(
    {
      provenance: "synthetic_mock",
      individualId: individual.id,
      markCode: individual.data.markCode,
      sampleRecordId: firstRecord.id,
      method: firstRecord.data.sampleMethod,
      effort,
      specimen: {
        id: specimen.id,
        type: specimen.data.sampleType,
        collectedAt: specimen.data.collectedAt,
        analysisStatus: specimen.data.analysisStatus,
      },
      encounters,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Prepared research example for ${content.scenes.length} scenes; ${barF(64)} frames; ${(barF(64) / 30).toFixed(2)} seconds; linked fixture encounters: ${encounters.length}`,
);
