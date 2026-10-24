import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../src/features/map/timeRange.ts", import.meta.url),
  "utf8",
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
});
const timeRange = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`
);

const now = new Date(2026, 9, 24, 12);

test("all time range has no cutoff", () => {
  assert.equal(timeRange.getTimeRangeCutoff("all", now), null);
  assert.equal(timeRange.getTimeRangeCutoffDate("all", now), null);
});

test("relative time ranges use stable local calendar dates", () => {
  assert.equal(timeRange.getTimeRangeCutoffDate("1m", now), "2026-09-24");
  assert.equal(timeRange.getTimeRangeCutoffDate("3m", now), "2026-07-24");
  assert.equal(timeRange.getTimeRangeCutoffDate("1y", now), "2025-10-24");
});
