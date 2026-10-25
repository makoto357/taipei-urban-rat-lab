import assert from "node:assert/strict";
import test from "node:test";

import {
  MAP_TOPICS,
  mapTopicIndexFromSlug,
} from "../src/features/map/mapTopics.ts";

test("map topic slugs follow the visible tab order", () => {
  assert.deepEqual(
    MAP_TOPICS.map(({ slug }) => slug),
    [
      "risk",
      "observations",
      "bait",
      "environment",
      "distribution",
      "comparison",
    ],
  );
});

test("map topic query falls back to the risk model", () => {
  assert.equal(mapTopicIndexFromSlug("distribution"), 4);
  assert.equal(mapTopicIndexFromSlug("unknown"), 0);
  assert.equal(mapTopicIndexFromSlug(null), 0);
});
