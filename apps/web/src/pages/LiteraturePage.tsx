import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ResourceType } from "@taipei-rat-lab/contracts";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { TYPE_COLORS, TYPE_LABELS, useLiteratureIndex } from "../features/literature/data";
import { EMPTY_FILTERS, ERA_OPTIONS, filterLiterature, type Era, type Filters } from "../features/literature/filters";

const control = "min-h-11 w-full border-2 border-ink bg-card px-3 font-heading text-[15px]";

/** 文獻列表頁，對應 Claude Artifact Knowledge.dc.html（列表視圖）。資料為 build 時產生的靜態 JSON。 */
export function LiteraturePage() {
  const state = useLiteratureIndex();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const items = state.status === "ready" ? state.data.resources : [];
  const shown = useMemo(() => filterLiterature(items, filters), [items, filters]);
  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return counts;
  }, [items]);

  const toggleTag = (tag: string) =>
    setFilters((f) => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag] }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-container flex-1 px-4 pb-[72px] pt-8 sm:px-10">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 border-b-2 border-ink pb-5">
          <div className="flex-none">
            <p className="m-0 mb-1.5 text-[15px] font-bold text-accent-text">
              文獻知識{" "}
              <span className="font-label font-normal tracking-[0.1em]">
                / KNOWLEDGE
              </span>
            </p>
            <h1 className="m-0 text-[clamp(36px,5vw,46px)] font-black leading-[1.2]">
              鼠患研究與防治知識
            </h1>
          </div>
          <p className="m-0 mb-2 min-w-[280px] flex-[1_1_420px] text-[15px] leading-[1.7]">
            整理國內外都市鼠患研究、防治手冊與台北市制度資料。
          </p>
        </div>

        {state.status === "loading" && <p className="mt-10 font-body">載入中…</p>}
        {state.status === "error" && (
          <p role="alert" className="mt-10 font-body">文獻資料暫時無法載入，請稍後重新整理。</p>
        )}

        {state.status === "ready" && (
          <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
            <aside aria-label="篩選文獻" className="flex flex-col gap-5 border-r border-ink pr-10">
              <label className="flex flex-col gap-1.5 text-sm font-bold">
                搜尋
                <input
                  type="search"
                  value={filters.query}
                  onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                  placeholder="標題、作者、關鍵字"
                  className={control}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold">
                文獻類型
                <select
                  value={filters.type}
                  onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as ResourceType | "all" }))}
                  className={control}
                >
                  <option value="all">全部類型</option>
                  {(Object.keys(TYPE_LABELS) as ResourceType[]).map((type) => (
                    <option key={type} value={type}>{TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold">
                年份
                <select
                  value={filters.era}
                  onChange={(e) => setFilters((f) => ({ ...f, era: e.target.value as Era }))}
                  className={control}
                >
                  {ERA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              {state.data.tagGroups.map((group) => (
                <fieldset key={group.name} className="m-0 border-0 p-0">
                  <legend className="mb-1.5 p-0 text-sm font-bold">{group.name}</legend>
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag) => {
                      const on = filters.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleTag(tag)}
                          className={`min-h-9 border-[1.5px] border-ink px-2.5 font-heading text-[13px] ${
                            on ? "bg-ink text-card" : "bg-transparent"
                          }`}
                        >
                          {tag} <span className="font-label">{tagCounts.get(tag) ?? 0}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <button
                type="button"
                disabled={!dirty}
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="button-secondary min-h-11 px-4 text-[15px]"
              >
                清除篩選
              </button>
            </aside>

            <section aria-label="文獻列表">
              <p aria-live="polite" className="m-0 mb-4 font-label text-[13px] tracking-[0.1em] text-muted">
                SHOWING {shown.length} / {items.length}
              </p>
              {shown.length === 0 ? (
                <div className="border-2 border-dashed border-ink bg-card p-10 text-center font-body">
                  沒有符合條件的文獻。試著放寬篩選條件或清除篩選。
                </div>
              ) : (
                <ul className="m-0 grid list-none gap-5 p-0 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
                  {shown.map((item) => (
                    <li key={item.id} className="flex flex-col gap-3 border-2 border-ink bg-card p-5">
                      <div className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span
                          className="border-[1.5px] border-ink px-2 py-0.5 font-bold"
                          style={{ background: TYPE_COLORS[item.resourceType] }}
                        >
                          {TYPE_LABELS[item.resourceType]}
                        </span>
                        <span className="font-label">{item.year ?? "無年份"}</span>
                        {item.resourceType === "policy_data_inventory" && (
                          <span className="border-[1.5px] border-accent-text px-2 py-0.5 font-bold text-accent-text">待查證</span>
                        )}
                      </div>
                      <h2 className="m-0 text-[20px] font-black leading-[1.4]">{item.title}</h2>
                      <p className="m-0 font-body text-sm text-muted">{item.authorsText}</p>
                      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                        {item.tags.map((tag) => (
                          <li key={tag} className="border border-ink px-2 py-0.5 text-xs">{tag}</li>
                        ))}
                      </ul>
                      <p className="m-0 flex-1 font-body text-sm leading-[1.8]">{item.excerpt}</p>
                      <Link
                        to={`/literature/${item.id}`}
                        className="button-primary min-h-11 px-5"
                      >
                        閱讀整理
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
