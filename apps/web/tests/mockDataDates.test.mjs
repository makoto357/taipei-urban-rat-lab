import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const dataDirectory = new URL("../public/data/", import.meta.url);
const minimumTimestamp = Date.parse("2025-01-01T00:00:00+08:00");

const collectIsoTimestamps = (value, path = "root", timestamps = []) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    timestamps.push({ path, value });
    return timestamps;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectIsoTimestamps(item, `${path}[${index}]`, timestamps),
    );
    return timestamps;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      collectIsoTimestamps(item, `${path}.${key}`, timestamps);
    }
  }
  return timestamps;
};

test("all active mock data timestamps are in 2025 or later", async () => {
  const filenames = (await readdir(dataDirectory))
    .filter((filename) => filename.startsWith("mock-") && filename.endsWith(".json"))
    .sort();
  assert.ok(filenames.length > 0, "no mock data files found");

  let timestampCount = 0;
  for (const filename of filenames) {
    const data = JSON.parse(await readFile(new URL(filename, dataDirectory), "utf8"));
    const timestamps = collectIsoTimestamps(data);
    timestampCount += timestamps.length;
    for (const timestamp of timestamps) {
      const parsed = Date.parse(timestamp.value);
      assert.ok(
        Number.isFinite(parsed) && parsed >= minimumTimestamp,
        `${filename}:${timestamp.path} has an invalid or pre-2025 timestamp: ${timestamp.value}`,
      );
    }
  }

  assert.ok(timestampCount > 0, "mock data contains no ISO timestamps");
});
