export type TimeRangeKey = "1m" | "3m" | "1y" | "all";

export const TIME_RANGE_OPTIONS: ReadonlyArray<{
  value: TimeRangeKey;
  label: string;
}> = [
  { value: "3m", label: "最近 3 個月" },
  { value: "1m", label: "最近 1 個月" },
  { value: "1y", label: "最近 1 年" },
  { value: "all", label: "全部" },
];

const RANGE_MONTHS: Record<Exclude<TimeRangeKey, "all">, number> = {
  "1m": 1,
  "3m": 3,
  "1y": 12,
};

export const getTimeRangeCutoff = (
  range: TimeRangeKey,
  now = new Date(),
): Date | null => {
  if (range === "all") return null;
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  const targetDay = cutoff.getDate();
  cutoff.setDate(1);
  cutoff.setMonth(cutoff.getMonth() - RANGE_MONTHS[range]);
  const lastDayOfTargetMonth = new Date(
    cutoff.getFullYear(),
    cutoff.getMonth() + 1,
    0,
  ).getDate();
  cutoff.setDate(Math.min(targetDay, lastDayOfTargetMonth));
  return cutoff;
};

export const getTimeRangeCutoffDate = (
  range: TimeRangeKey,
  now = new Date(),
): string | null => {
  const cutoff = getTimeRangeCutoff(range, now);
  if (!cutoff) return null;
  const year = cutoff.getFullYear();
  const month = String(cutoff.getMonth() + 1).padStart(2, "0");
  const day = String(cutoff.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
