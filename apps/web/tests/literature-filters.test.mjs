import assert from "node:assert/strict";
import { test } from "node:test";

import { EMPTY_FILTERS, filterLiterature } from "../src/features/literature/filters.ts";

const item = (over) => ({
  id: "x", resourceType: "review", tags: [], title: "T", fullTitle: "T", authorsText: "A",
  year: 2021, excerpt: "e", evidenceType: null, ...over,
});
const items = [
  item({ id: "1", title: "Rat ecology", tags: ["鼠類生態"], year: 2025 }),
  item({ id: "2", title: "Bait manual", resourceType: "technical_manual", tags: ["防治措施", "鼠類生態"], year: 2021 }),
  item({ id: "3", title: "Policy inventory", resourceType: "policy_data_inventory", year: null, authorsText: "臺北市" }),
  item({ id: "4", title: "Old paper", year: 2015, excerpt: "Leptospirosis surveillance" }),
];
const ids = (filters) => filterLiterature(items, { ...EMPTY_FILTERS, ...filters }).map((i) => i.id);

test("no filters returns everything", () => assert.deepEqual(ids({}), ["1", "2", "3", "4"]));
test("type filter", () => assert.deepEqual(ids({ type: "technical_manual" }), ["2"]));
test("era buckets, including no year", () => {
  assert.deepEqual(ids({ era: "recent" }), ["1"]);
  assert.deepEqual(ids({ era: "mid" }), ["2"]);
  assert.deepEqual(ids({ era: "old" }), ["4"]);
  assert.deepEqual(ids({ era: "none" }), ["3"]);
});
test("tags are ANDed", () => {
  assert.deepEqual(ids({ tags: ["鼠類生態"] }), ["1", "2"]);
  assert.deepEqual(ids({ tags: ["鼠類生態", "防治措施"] }), ["2"]);
});
test("search covers title, authors, excerpt and is case-insensitive", () => {
  assert.deepEqual(ids({ query: "RAT" }), ["1"]);
  assert.deepEqual(ids({ query: "臺北市" }), ["3"]);
  assert.deepEqual(ids({ query: "leptospirosis" }), ["4"]);
  assert.deepEqual(ids({ query: "  " }), ["1", "2", "3", "4"]);
});
test("filters combine", () => assert.deepEqual(ids({ query: "manual", era: "mid", tags: ["防治措施"] }), ["2"]));
