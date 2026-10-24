import type { LiteratureSummary, ResourceType } from "@taipei-rat-lab/contracts";

export type Era = "all" | "recent" | "mid" | "old" | "none";

export const ERA_OPTIONS: { value: Era; label: string }[] = [
  { value: "all", label: "全部年份" },
  { value: "recent", label: "2024 年以後" },
  { value: "mid", label: "2020–2023" },
  { value: "old", label: "2019 年以前" },
  { value: "none", label: "無年份" },
];

export interface Filters {
  query: string;
  type: ResourceType | "all";
  era: Era;
  tags: string[];
}

export const EMPTY_FILTERS: Filters = { query: "", type: "all", era: "all", tags: [] };

const matchesEra = (year: number | null, era: Era): boolean => {
  switch (era) {
    case "all": return true;
    case "none": return year === null;
    case "recent": return year !== null && year >= 2024;
    case "mid": return year !== null && year >= 2020 && year <= 2023;
    case "old": return year !== null && year <= 2019;
  }
};

/** 關鍵字比對標題、全名、作者、標籤與摘要；標籤是 AND（同時具備所選標籤）。 */
export function filterLiterature(items: LiteratureSummary[], filters: Filters): LiteratureSummary[] {
  const query = filters.query.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.type !== "all" && item.resourceType !== filters.type) return false;
    if (!matchesEra(item.year, filters.era)) return false;
    if (!filters.tags.every((tag) => item.tags.includes(tag))) return false;
    if (!query) return true;
    return [item.title, item.fullTitle, item.authorsText, item.excerpt, ...item.tags]
      .join("\n")
      .toLowerCase()
      .includes(query);
  });
}
