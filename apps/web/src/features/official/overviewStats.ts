import type { BaitRecord, CitizenReport, OfficialObservation } from "@taipei-rat-lab/contracts";

export const FETCH_LIMIT = 100;
const WINDOW_MS = 30 * 86_400_000;

export interface WithId<T> {
  id: string;
  data: T;
}

export interface OverviewData {
  reports: WithId<CitizenReport>[];
  observations: WithId<OfficialObservation>[];
  baitRecords: WithId<BaitRecord>[];
}

export interface OverviewStats {
  reports30d: number;
  observations30d: number;
  evidenceFound30d: number;
  activeBaitPoints: number;
  /** 任一來源抓滿 FETCH_LIMIT 筆時，統計數字可能被截斷，畫面要標示「以上」。 */
  truncated: boolean;
}

/**
 * 投藥點狀態只看最後一個事件：最後是 removed 代表「該次處置已完成」，
 * 不代表現場已經安全（plan.md 的風險語意），所以不叫「安全」，也不是「追蹤中」。
 */
export const baitPointStatus = (record: BaitRecord): "tracking" | "removed" | "not_started" => {
  const last = record.events.at(-1);
  if (!last) return "not_started";
  return last.actions.includes("removed") ? "removed" : "tracking";
};

export function summarizeOverview(data: OverviewData, nowMs: number): OverviewStats {
  const since = nowMs - WINDOW_MS;
  const recent = (ms: number) => ms >= since && ms <= nowMs;
  const observations = data.observations.filter((o) => recent(o.data.observedAt.toMillis()));
  return {
    reports30d: data.reports.filter((r) => recent(r.data.createdAt.toMillis())).length,
    observations30d: observations.length,
    evidenceFound30d: observations.filter((o) => o.data.surveyResult === "evidence_found").length,
    activeBaitPoints: data.baitRecords.filter((b) => baitPointStatus(b.data) === "tracking").length,
    truncated:
      data.reports.length >= FETCH_LIMIT ||
      data.observations.length >= FETCH_LIMIT ||
      data.baitRecords.length >= FETCH_LIMIT,
  };
}

