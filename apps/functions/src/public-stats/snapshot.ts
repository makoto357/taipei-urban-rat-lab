export interface ObservationSummary {
  observedAtMs: number;
  surveyResult: string;
}

export interface SnapshotNumbers {
  verifiedTraces30d: number;
  coverageStartMs: number | null;
  coverageEndMs: number | null;
}

const WINDOW_MS = 30 * 86_400_000;

/**
 * 「已查核鼠跡」＝市府人員現場調查結果為 evidence_found 的紀錄；
 * 涵蓋期間取所有調查（含未發現鼠跡）的最早與最晚日期，避免只用有鼠跡的資料誇大涵蓋範圍。
 */
export const summarizeObservations = (
  observations: ObservationSummary[],
  nowMs: number,
): SnapshotNumbers => {
  let verified = 0;
  let start: number | null = null;
  let end: number | null = null;
  for (const { observedAtMs, surveyResult } of observations) {
    if (surveyResult === 'evidence_found' && observedAtMs <= nowMs && observedAtMs >= nowMs - WINDOW_MS) verified += 1;
    if (observedAtMs > nowMs) continue;
    start = start === null ? observedAtMs : Math.min(start, observedAtMs);
    end = end === null ? observedAtMs : Math.max(end, observedAtMs);
  }
  return { verifiedTraces30d: verified, coverageStartMs: start, coverageEndMs: end };
};
