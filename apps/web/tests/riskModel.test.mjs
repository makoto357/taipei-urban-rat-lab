import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourcePath = new URL(
  "../src/features/map/engine/riskModel.ts",
  import.meta.url,
);
const source = await readFile(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
});
const model = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`
);
const undergroundArtifact = JSON.parse(
  await readFile(
    new URL("../public/data/underground-connectivity.json", import.meta.url),
    "utf8",
  ),
);

const local = (citizen, government, food) => ({
  citizen,
  government,
  food,
});

const assertClose = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < Number.EPSILON * 4);

test("food-only selection remains local when movement is enabled", () => {
  const score = model.calculateFinalScore({
    mask: 4,
    local: local(0, 0, 0.4),
    ground: { citizen: 1, government: 1 },
    underground: { citizen: 1, government: 1 },
    groundEnabled: true,
    undergroundEnabled: true,
  });
  assertClose(score, 0.4);
});

test("movement disabled uses the local equal-weight score", () => {
  const score = model.calculateFinalScore({
    mask: 7,
    local: local(0.2, 0.4, 0.6),
    ground: { citizen: 1, government: 1 },
    underground: { citizen: 1, government: 1 },
    groundEnabled: false,
    undergroundEnabled: false,
  });
  assertClose(score, 0.4);
});

test("movement has no effect without a selected observation factor", () => {
  const options = {
    mask: 4,
    local: local(0.8, 0.9, 0.25),
    ground: { citizen: 1, government: 1 },
    underground: { citizen: 1, government: 1 },
  };
  const withoutMovement = model.calculateFinalScore({
    ...options,
    groundEnabled: false,
    undergroundEnabled: false,
  });
  const withMovement = model.calculateFinalScore({
    ...options,
    groundEnabled: true,
    undergroundEnabled: true,
  });
  assert.equal(withMovement, withoutMovement);
});

test("disconnected components of one feature do not share source scores", () => {
  const connectivity = {
    blockIds: ["A", "A", "B"],
    componentIds: ["A:0", "A:1", "B:0"],
    edges: [[0, 2, 0.5]],
  };
  const scores = model.propagateConnectivity(
    connectivity,
    new Map([["A:0", 1]]),
  );
  assert.equal(scores.get("A:0"), 1);
  assert.equal(scores.get("A:1"), 0);
  assert.equal(scores.get("B:0"), 0.5);
});

test("one observation is assigned to only one component", () => {
  const left = [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ];
  const right = [
    [
      [1, 0],
      [2, 0],
      [2, 1],
      [1, 1],
      [1, 0],
    ],
  ];
  const scores = model.scorePointsByComponent([left, right], [[1, 0.5]]);
  assert.deepEqual(scores, [1, 0]);
  assert.equal(scores.reduce((sum, score) => sum + score, 0), 1);
});

test("ground and underground propagation are combined per factor", () => {
  const options = {
    mask: 3,
    local: local(0.1, 0.2, 0),
    ground: { citizen: 0.8, government: 0.2 },
    underground: { citizen: 0.1, government: 0.9 },
  };
  assertClose(
    model.calculateFinalScore({
      ...options,
      groundEnabled: true,
      undergroundEnabled: false,
    }),
    0.5,
  );
  assertClose(
    model.calculateFinalScore({
      ...options,
      groundEnabled: false,
      undergroundEnabled: true,
    }),
    0.5,
  );
  assertClose(
    model.calculateFinalScore({
      ...options,
      groundEnabled: true,
      undergroundEnabled: true,
    }),
    0.85,
  );
});

test("named underground networks cannot form a mixed two-hop path", () => {
  const connectivity = {
    blockIds: ["A", "B", "C"],
    componentIds: ["A:0", "B:0", "C:0"],
    edges: [
      [0, 1, 1],
      [1, 2, 1],
    ],
    networks: {
      sewer: { edges: [[0, 1, 1]] },
      stormwater: { edges: [[1, 2, 1]] },
    },
  };
  const scores = model.propagateConnectivity(
    connectivity,
    new Map([["A:0", 1]]),
  );
  assert.equal(scores.get("B:0"), 1);
  assert.equal(scores.get("C:0"), 0);
});

test("underground artifact keeps sewer and stormwater networks separate", () => {
  assert.deepEqual(Object.keys(undergroundArtifact.networks).sort(), [
    "sewer",
    "stormwater",
  ]);
  assert.equal(
    undergroundArtifact.componentIds.length,
    undergroundArtifact.blockIds.length,
  );
  assert.equal(
    new Set(undergroundArtifact.componentIds).size,
    undergroundArtifact.componentIds.length,
  );
  assert.equal(undergroundArtifact.counts.invalidEndpointIds, 0);
});

test("final scores are clamped to the inclusive zero-to-one range", () => {
  for (let mask = 0; mask < 8; mask += 1) {
    const score = model.calculateFinalScore({
      mask,
      local: local(-1, 2, 4),
      ground: { citizen: 5, government: -2 },
      underground: { citizen: 3, government: 7 },
      groundEnabled: true,
      undergroundEnabled: true,
    });
    assert.ok(score >= 0 && score <= 1);
  }
});

test("L1-L4 thresholds remain unchanged", () => {
  assert.equal(model.getRiskLevel(0.75), "L1");
  assert.equal(model.getRiskLevel(0.749), "L2");
  assert.equal(model.getRiskLevel(0.5), "L2");
  assert.equal(model.getRiskLevel(0.499), "L3");
  assert.equal(model.getRiskLevel(0.25), "L3");
  assert.equal(model.getRiskLevel(0.249), "L4");
  assert.equal(model.getRiskLevel(0), "unclassified");
});

test("P95 uses positive values and area adjustment beta defaults to 0.5", () => {
  assert.equal(model.percentile95([0, 1, 2, 3]), 3);
  assert.equal(model.adjustScoreForArea(2, 4), 1);
  assert.equal(model.adjustScoreForArea(2, 4, 1), 0.5);
  assert.equal(model.adjustScoreForArea(2, 0), 0);
});
