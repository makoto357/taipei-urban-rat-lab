import { useMemo, useState } from "react";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { LayerLegendSwatch } from "../features/map/LayerLegendSwatch";
import { DISTRICTS, MAP_TOPICS, TIME_RANGES } from "../features/map/mapTopics";

/**
 * 地圖頁 UI，對應 Claude Artifact 的 Map.dc.html。
 * 地圖主體（底圖、點位渲染）依尺寸留白，交由之後接入 MapLibre GL JS
 * （見 plan.md Tech Stack、docs/design/design-system.md §6 地圖語意）；
 * 本頁先完成分頁、圖層面板、篩選與點位詳情（空狀態）等周邊 UI。
 */
export function MapPage() {
  const [activeTopic, setActiveTopic] = useState(0);
  const [layerOverrides, setLayerOverrides] = useState<Record<string, boolean>>({});

  const topic = MAP_TOPICS[activeTopic]!;

  const layers = useMemo(
    () =>
      topic.layers.map((layer) => ({
        ...layer,
        on: layerOverrides[layer.key] ?? !layer.defaultOff,
      })),
    [topic, layerOverrides],
  );

  function toggleLayer(key: string, currentlyOn: boolean) {
    setLayerOverrides((prev) => ({ ...prev, [key]: !currentlyOn }));
  }

  function selectTopic(index: number) {
    setActiveTopic(index);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-container flex-col gap-6 px-10 pb-14 pt-8">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 border-b-2 border-ink pb-5">
          <div>
            <p className="m-0 mb-1.5 text-[15px] font-bold text-accent-text">
              地圖探索 <span className="font-label font-normal tracking-[0.1em]">/ INTERACTIVE MAP</span>
            </p>
            <h1 className="m-0 text-[46px] font-black leading-[1.2]">老鼠都在哪裡？</h1>
          </div>
          <p className="m-0 mb-2 text-[15px] leading-[1.7]">整合不同來源的數據與環境資料，一起探索台北市的鼠患線索。</p>
        </div>

        <div role="tablist" aria-label="資料主題" className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-0.5 border-2 border-ink bg-ink">
          {MAP_TOPICS.map((t, i) => {
            const active = i === activeTopic;
            return (
              <button
                key={t.en}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTopic(i)}
                className={`flex min-h-[60px] items-center gap-3 border-0 px-3.5 py-2 text-left font-heading ${
                  active ? "bg-accent" : "bg-paper"
                }`}
              >
                <span className="flex h-[30px] w-[30px] items-center justify-center border-[1.5px] border-ink bg-card font-label text-[15px] text-ink">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-[17px] font-black">{t.zh}</span>
                  <span className="font-label text-[11px] tracking-[0.1em]">{t.en}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap border-2 border-ink bg-card">
          <aside className="flex max-w-full flex-[1_1_260px] flex-col gap-[22px] border-r-2 border-ink px-[22px] py-5">
            <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
              <legend className="mb-2 p-0 text-base font-black">圖層顯示</legend>
              {layers.map((layer) => (
                <label key={layer.key} className="flex min-h-10 cursor-pointer items-center gap-3 font-body text-sm">
                  <LayerLegendSwatch layer={layer} />
                  <span className="flex-1">{layer.label}</span>
                  <input
                    type="checkbox"
                    checked={layer.on}
                    onChange={() => toggleLayer(layer.key, layer.on)}
                    className="m-0 h-5 w-5 accent-ink"
                  />
                </label>
              ))}
            </fieldset>

            {topic.note && (
              <p className="m-0 border-[1.5px] border-ink bg-activity-l1 px-3 py-2.5 font-body text-[13px] leading-[1.6]">
                {topic.note}
              </p>
            )}

            <div className="h-0.5 bg-ink" />

            <label className="flex flex-col gap-2 text-base font-black">
              時間範圍
              <select className="min-h-11 rounded-none border-[1.5px] border-ink bg-paper px-2.5 font-body text-sm font-normal">
                {TIME_RANGES.map((range) => (
                  <option key={range}>{range}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-base font-black">
              行政區篩選
              <select className="min-h-11 rounded-none border-[1.5px] border-ink bg-paper px-2.5 font-body text-sm font-normal">
                {DISTRICTS.map((district) => (
                  <option key={district}>{district}</option>
                ))}
              </select>
            </label>

            <div aria-label="點位詳情" className="flex flex-col gap-1.5 border-[1.5px] border-ink bg-paper px-3.5 py-3 font-body text-[13px] leading-[1.6]">
              <p className="m-0 font-heading text-[15px] font-black">點位詳情</p>
              <p className="m-0 text-xs text-muted">點選地圖上的任一個點，這裡會顯示來源、觀察日期與驗證狀態。</p>
            </div>

            <p className="mt-auto font-label text-xs tracking-[0.08em] text-muted">LAST UPDATED · [YYYY/MM/DD]</p>
          </aside>

          <div
            className="relative flex min-h-[520px] flex-[999_1_560px] min-w-0 items-center justify-center overflow-hidden bg-[#E4E2DC]"
            role="img"
            aria-label="地圖區域（尺寸預留，地圖引擎尚未接入）"
          >
            <div className="pointer-events-none absolute inset-3 border-2 border-dashed border-[#9A988F]" />
            <div className="relative flex flex-col items-center gap-2.5 px-6 text-center text-muted">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6B6658" strokeWidth={1.6} aria-hidden="true">
                <path d="M9 20l-6-2V4l6 2 6-2 6 2v14l-6-2-6 2z" />
                <path d="M9 6v14M15 4v14" />
              </svg>
              <p className="m-0 font-body text-sm leading-[1.6]">
                地圖區域（尺寸預留）
                <br />
                地圖引擎尚未接入
              </p>
            </div>
            <div className="absolute bottom-4 right-4 flex flex-col border-[1.5px] border-ink bg-card">
              <button type="button" aria-label="放大" className="h-11 w-11 border-0 border-b-[1.5px] border-ink bg-transparent text-xl leading-none">
                +
              </button>
              <button type="button" aria-label="縮小" className="h-11 w-11 border-0 border-b-[1.5px] border-ink bg-transparent text-xl leading-none">
                −
              </button>
              <button type="button" aria-label="定位到我的位置" className="flex h-11 w-11 items-center justify-center border-0 bg-transparent">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth={2} aria-hidden="true">
                  <circle cx="12" cy="12" r="7" />
                  <circle cx="12" cy="12" r="2.5" fill="#000000" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
