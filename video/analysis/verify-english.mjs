import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
const scenes = read("src/en-2min/content.json").scenes;
const analysis = read("analysis/fun-time.en-2min.analysis.json");
const frame = (bar) => Math.round(((bar * 240) / analysis.grid.bpm) * 30);
assert.equal(scenes[0].fromBar, 0);
assert.equal(scenes.at(-1).toBar, 62);
assert.ok(
  analysis.analyzedSeconds >= 120,
  "Music analysis must cover the edit",
);
assert.ok(
  analysis.durationSeconds >
    (62 * 240) / analysis.grid.bpm + analysis.grid.offsetSeconds,
);
const ids = new Set();
for (const [index, scene] of scenes.entries()) {
  if (index > 0)
    assert.equal(scenes[index - 1].toBar, scene.fromBar, "No gaps or overlaps");
  assert.ok(scene.toBar > scene.fromBar);
  assert.ok(!ids.has(scene.id), "Scene IDs must be unique");
  ids.add(scene.id);
  assert.ok(frame(scene.toBar) > frame(scene.fromBar));
}
const sceneSource = fs.readFileSync(
  path.join(root, "src/en-2min/Scenes.tsx"),
  "utf8",
);
for (const match of sceneSource.matchAll(/(?:en-2min|tex)\/[a-z-]+\.png/g)) {
  assert.ok(
    fs.existsSync(path.join(root, "public", match[0])),
    `Missing capture: ${match[0]}`,
  );
}
const sample = read("public/en-2min/research-example.json");
assert.equal(sample.provenance, "synthetic_mock");
assert.ok(sample.encounters.length >= 2);
assert.ok(sample.encounters.some((e) => e.status === "recapture"));
const modelScene = scenes.find((scene) => scene.id === "modelExplainer");
const recording = read("public/en-2min/risk-model-demo.json");
assert.equal(recording.kind, "real_ui_frame_capture");
assert.equal(recording.fps, 30);
const modelDuration = frame(modelScene.toBar) - frame(modelScene.fromBar);
assert.ok(
  recording.frames >= modelDuration,
  "The model recording must cover its scene",
);
assert.ok(recording.scrolls.every((scroll) => scroll.end < modelDuration));
assert.ok(recording.events.every((event) => event.frame < modelDuration));
assert.equal(
  recording.audio,
  false,
  "The walkthrough must not add an audio track",
);
assert.ok(recording.scrolls.length >= 3);
assert.ok(
  recording.events.some(
    (event) => event.kind === "checkbox" && event.before !== event.after,
  ),
);
assert.ok(
  recording.events.filter((event) => event.kind === "button" && event.pressed)
    .length >= 2,
);
assert.ok(fs.existsSync(path.join(root, "public/en-2min/risk-model-demo.mp4")));
const original = fs.readFileSync(path.join(root, "src/index.ts"), "utf8");
assert.ok(
  !original.includes("en-2min"),
  "Original entry point must remain separate",
);
console.log(
  `Verified ${scenes.length} contiguous scenes, research provenance, music coverage, referenced captures, and the ${recording.frames}-frame interactive model walkthrough.`,
);
