import { useEffect, useState } from "react";
import type { Literature, LiteratureSummary, ResourceType } from "@taipei-rat-lab/contracts";

export interface TagGroup {
  name: string;
  tags: string[];
}
export interface LiteratureIndex {
  tagGroups: TagGroup[];
  resources: LiteratureSummary[];
}
export type LiteratureDetail = Pick<
  Literature,
  | "id" | "resourceType" | "tags" | "title" | "fullTitle" | "authorsText" | "year"
  | "publicationText" | "doi" | "sourceLinks" | "sections" | "contentHtml" | "navigation"
>;

export const TYPE_LABELS: Record<ResourceType, string> = {
  review: "回顧文獻",
  research_article: "研究論文",
  technical_manual: "技術手冊",
  program_evaluation: "計畫評估",
  policy_data_inventory: "制度盤點",
};

/** 徽章底色沿用 Knowledge.dc.html。 */
export const TYPE_COLORS: Record<ResourceType, string> = {
  review: "#8CC3BD",
  research_article: "#8CC3BD",
  technical_manual: "#F2CC67",
  program_evaluation: "#E99843",
  policy_data_inventory: "#D7D4CC",
};

type State<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

const cache = new Map<string, Promise<unknown>>();

function load<T>(path: string): Promise<T> {
  let request = cache.get(path) as Promise<T> | undefined;
  if (!request) {
    request = fetch(path).then((response) => {
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      return response.json() as Promise<T>;
    });
    request.catch(() => cache.delete(path));
    cache.set(path, request);
  }
  return request;
}

function useJson<T>(path: string): State<T> {
  const [state, setState] = useState<State<T>>({ status: "loading" });
  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    load<T>(path).then(
      (data) => live && setState({ status: "ready", data }),
      () => live && setState({ status: "error" }),
    );
    return () => {
      live = false;
    };
  }, [path]);
  return state;
}

export const useLiteratureIndex = () => useJson<LiteratureIndex>("/literature/index.json");
export const useLiteratureDetail = (id: string) => useJson<LiteratureDetail>(`/literature/${id}.json`);
