import assert from "node:assert/strict";
import { test } from "node:test";

import { baitPointStatus, FETCH_LIMIT, summarizeOverview } from "../src/features/official/overviewStats.ts";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 24);
const ts = (ms) => ({ toMillis: () => ms });
const event = (actions) => ({ actions });

test("bait status follows the last event; removed is not 'safe'", () => {
  assert.equal(baitPointStatus({ events: [] }), "not_started");
  assert.equal(baitPointStatus({ events: [event(["bait_placed"]), event(["checked"])] }), "tracking");
  assert.equal(baitPointStatus({ events: [event(["bait_placed"]), event(["removed"])] }), "removed");
  // 移除後又補投 → 回到追蹤中
  assert.equal(baitPointStatus({ events: [event(["removed"]), event(["bait_placed"])] }), "tracking");
});

test("stats count only the last 30 days and only evidence_found as traces", () => {
  const stats = summarizeOverview(
    {
      reports: [{ data: { createdAt: ts(NOW - DAY) } }, { data: { createdAt: ts(NOW - 40 * DAY) } }],
      observations: [
        { data: { observedAt: ts(NOW - 2 * DAY), surveyResult: "evidence_found" } },
        { data: { observedAt: ts(NOW - 3 * DAY), surveyResult: "no_evidence_found" } },
        { data: { observedAt: ts(NOW - 50 * DAY), surveyResult: "evidence_found" } },
        { data: { observedAt: ts(NOW + 5 * DAY), surveyResult: "evidence_found" } },
      ],
      baitRecords: [
        { data: { events: [event(["bait_placed"])] } },
        { data: { events: [event(["removed"])] } },
        { data: { events: [] } },
      ],
    },
    NOW,
  );
  assert.deepEqual(stats, { reports30d: 1, observations30d: 2, evidenceFound30d: 1, activeBaitPoints: 1, truncated: false });
});

test("marks stats as truncated when a source hits the fetch limit", () => {
  const many = Array.from({ length: FETCH_LIMIT }, () => ({ data: { createdAt: ts(NOW) } }));
  assert.equal(summarizeOverview({ reports: many, observations: [], baitRecords: [] }, NOW).truncated, true);
});
