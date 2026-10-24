import { useMemo, useState } from "react";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import {
  InteractiveMap,
  getEngineLayers,
} from "../features/map/InteractiveMap";
import { LayerLegendSwatch } from "../features/map/LayerLegendSwatch";
import { DISTRICTS, MAP_TOPICS, TIME_RANGES } from "../features/map/mapTopics";

export function MapPage() {
  const [activeTopic, setActiveTopic] = useState(0);
  const [layerOverrides, setLayerOverrides] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const topic = MAP_TOPICS[activeTopic]!;
  const layers = useMemo(() => {
    const configured = topic.layers.map((layer) => ({
      ...layer,
      on: layerOverrides[layer.key] ?? !layer.defaultOff,
    }));
    const observationKeys = new Set(
      topic.factorSections?.find(({ id }) => id === "observation")?.layerKeys ??
        [],
    );
    const movementKeys = new Set(
      topic.factorSections?.find(({ id }) => id === "movement")?.layerKeys ??
        [],
    );
    const hasSelectedObservation = configured.some(
      (layer) => observationKeys.has(layer.key) && layer.on,
    );
    const enabledByKey = new Map(
      configured.map((layer) => [layer.key, layer.on]),
    );
    return configured.map((layer) => {
      const disabledByObservation =
        movementKeys.has(layer.key) && !hasSelectedObservation;
      return {
        ...layer,
        interactionDisabled: Boolean(layer.disabled || disabledByObservation),
        disabledReason: layer.disabled
          ? "目前沒有可用的地理資料"
          : disabledByObservation
            ? "請先選擇民眾通報或政府調查"
            : undefined,
        effectiveOn:
          layer.on &&
          !disabledByObservation &&
          (!layer.parentKey || enabledByKey.get(layer.parentKey) !== false),
      };
    });
  }, [topic, layerOverrides]);
  const visibleDataLayers = useMemo(() => {
    const visible = new Set(
      layers.flatMap((layer) =>
        layer.effectiveOn ? getEngineLayers(layer.key) : [],
      ),
    );
    for (const layerKey of topic.alwaysVisibleLayerKeys ?? []) {
      for (const engineLayer of getEngineLayers(layerKey)) {
        visible.add(engineLayer);
      }
    }
    if (selectedDistrict) visible.add("districts");
    return [...visible];
  }, [layers, selectedDistrict, topic]);

  function toggleLayer(key: string, currentlyOn: boolean) {
    const nextOn = !currentlyOn;
    const selectedLayer = topic.layers.find((layer) => layer.key === key);
    const children = topic.layers.filter((layer) => layer.parentKey === key);

    setLayerOverrides((previous) => {
      const next = { ...previous, [key]: nextOn };
      for (const child of children) {
        if (!child.disabled) next[child.key] = nextOn;
      }
      if (nextOn && selectedLayer?.parentKey) {
        next[selectedLayer.parentKey] = true;
      }
      return next;
    });
  }

  function resetRiskModel() {
    setLayerOverrides((previous) => ({
      ...previous,
      ...Object.fromEntries(topic.layers.map((layer) => [layer.key, true])),
    }));
  }

  function renderLayerControl(layer: (typeof layers)[number]) {
    return (
      <label
        key={layer.key}
        title={layer.disabledReason}
        className={`flex min-h-10 items-center gap-3 font-body text-sm ${layer.indent ? "pl-9" : ""} ${layer.interactionDisabled ? "cursor-not-allowed text-muted" : "cursor-pointer"}`}
      >
        {topic.factorList ? (
          <span
            aria-hidden="true"
            className={`h-2 w-2 flex-none rounded-full ${layer.interactionDisabled ? "bg-muted" : "bg-ink"}`}
          />
        ) : (
          <LayerLegendSwatch layer={layer} />
        )}
        <span className="flex-1">{layer.label}</span>
        <input
          type="checkbox"
          checked={layer.on}
          disabled={layer.interactionDisabled}
          onChange={() => toggleLayer(layer.key, layer.on)}
          className="m-0 h-5 w-5 flex-none accent-ink"
        />
      </label>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-container flex-col gap-6 px-4 pb-14 pt-8 sm:px-10">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 border-b-2 border-ink pb-5">
          <div>
            <p className="m-0 mb-1.5 text-[15px] font-bold text-accent-text">
              地圖探索{" "}
              <span className="font-label font-normal tracking-[0.1em]">
                / INTERACTIVE MAP
              </span>
            </p>
            <h1 className="m-0 text-[clamp(36px,5vw,46px)] font-black leading-[1.2]">
              老鼠都在哪裡？
            </h1>
          </div>
          <p className="m-0 mb-2 text-[15px] leading-[1.7]">
            整合不同來源的數據與環境資料，一起探索台北市的鼠患線索。
          </p>
        </div>

        <div
          role="tablist"
          aria-label="資料主題"
          className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-0.5 border-2 border-ink bg-ink"
        >
          {MAP_TOPICS.map((candidate, index) => {
            const active = index === activeTopic;
            return (
              <button
                key={candidate.en}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTopic(index)}
                className={`flex min-h-[60px] items-center gap-3 border-0 px-3.5 py-2 text-left font-heading transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  active ? "bg-accent" : "bg-paper hover:bg-card"
                }`}
              >
                <span className="flex h-[30px] w-[30px] flex-none items-center justify-center border-[1.5px] border-ink bg-card font-label text-[15px] text-ink">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex min-w-0 flex-col items-start leading-tight">
                  <span className="text-[17px] font-black">{candidate.zh}</span>
                  <span className="font-label text-[11px] tracking-[0.1em]">
                    {candidate.en}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative min-h-[720px] overflow-hidden border-2 border-ink bg-card md:flex md:min-h-[620px] md:flex-wrap md:overflow-visible">
          <aside className="absolute inset-x-0 bottom-0 z-10 flex max-h-[52%] flex-col gap-[22px] overflow-y-auto border-t-2 border-ink bg-card px-[22px] py-5 shadow-[0_-5px_0_rgb(0_0_0_/_18%)] md:static md:max-h-none md:max-w-[320px] md:flex-[1_1_280px] md:overflow-visible md:border-r-2 md:border-t-0 md:shadow-none">
            <div className="m-0 flex flex-col gap-1.5">
              {topic.riskLevels && (
                <div className="mb-5 flex flex-col gap-2.5">
                  <h2 className="m-0 font-heading text-2xl font-black">
                    風險層級
                  </h2>
                  {topic.riskLevels.map((level) => (
                    <div
                      key={level.label}
                      className="grid min-h-9 grid-cols-[64px_64px_1fr] items-center gap-3"
                    >
                      <span
                        aria-hidden="true"
                        className={`h-7 w-16 ${level.color ? "" : "border-[1.5px] border-ink"}`}
                        style={{ backgroundColor: level.color ?? "transparent" }}
                      />
                      <span className="font-label text-lg">{level.label}</span>
                      <span className="text-xs leading-snug text-muted">
                        {level.description}
                      </span>
                    </div>
                  ))}
                  {topic.riskLevelNote && (
                    <p className="m-0 mt-1 text-xs leading-[1.55] text-muted">
                      {topic.riskLevelNote}
                    </p>
                  )}
                </div>
              )}
              <div className="mb-1 flex items-center justify-between gap-3">
                <h2 className="m-0 text-base font-black">
                  {topic.layerHeading ?? "圖層顯示"}
                </h2>
                {topic.factorSections && (
                  <button
                    type="button"
                    onClick={resetRiskModel}
                    className="border-0 border-b border-ink bg-transparent px-0 py-0.5 font-body text-xs font-bold text-ink hover:border-accent hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    全部重設
                  </button>
                )}
              </div>
              {topic.factorSections ? (
                <div className="flex flex-col">
                  {topic.factorSections.map((section) => (
                    <section
                      key={section.id}
                      className="border-t border-ink/25 py-3 first:mt-1"
                    >
                      <h3 className="m-0 mb-1.5 flex items-baseline gap-2 font-heading text-sm font-black">
                        <span className="font-label text-xs tracking-[0.08em]">
                          {section.number}
                        </span>
                        <span aria-hidden="true">—</span>
                        <span>{section.label}</span>
                      </h3>
                      {section.layerKeys.map((key) => {
                        const layer = layers.find(
                          (candidate) => candidate.key === key,
                        );
                        return layer ? renderLayerControl(layer) : null;
                      })}
                      {section.description && (
                        <p className="m-0 mt-1.5 text-xs leading-[1.55] text-muted">
                          {section.description}
                        </p>
                      )}
                    </section>
                  ))}
                </div>
              ) : (
                layers.map(renderLayerControl)
              )}
            </div>

            {topic.note && (
              <p className="m-0 border-[1.5px] border-ink bg-activity-l1 px-3 py-2.5 font-body text-[13px] leading-[1.6]">
                {topic.note}
              </p>
            )}

            <div className="h-0.5 bg-ink" />

            <label className="flex flex-col gap-2 text-base font-black">
              時間範圍
              <select
                disabled
                title="目前資料尚未提供時間篩選"
                className="min-h-11 rounded-none border-[1.5px] border-muted bg-unknown px-2.5 font-body text-sm font-normal text-muted"
              >
                {TIME_RANGES.map((range) => (
                  <option key={range}>{range}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-base font-black">
              行政區篩選
              <select
                value={selectedDistrict}
                onChange={(event) => setSelectedDistrict(event.target.value)}
                className="min-h-11 rounded-none border-[1.5px] border-ink bg-paper px-2.5 font-body text-sm font-normal focus:bg-card focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ink"
              >
                {DISTRICTS.map((district) => (
                  <option
                    key={district}
                    value={district === "全部行政區" ? "" : district}
                  >
                    {district}
                  </option>
                ))}
              </select>
            </label>

            <div
              aria-label="點位詳情"
              className="flex flex-col gap-1.5 border-[1.5px] border-ink bg-paper px-3.5 py-3 font-body text-[13px] leading-[1.6]"
            >
              <p className="m-0 font-heading text-[15px] font-black">
                點位詳情
              </p>
              <p className="m-0 text-xs text-muted">
                點選地圖上的任一個點，可查看來源、觀察日期與資料狀態。
              </p>
            </div>

            <p className="mt-auto font-label text-xs tracking-[0.08em] text-muted">
              RESEARCH PROTOTYPE · MOCK DATA 標示於圖層與詳情
            </p>
          </aside>

          <section
            className="absolute inset-0 overflow-hidden bg-[#E4E2DC] md:relative md:inset-auto md:min-h-[520px] md:flex-[999_1_560px]"
            aria-label="台北都市鼠患互動地圖"
          >
            <InteractiveMap
              visibleDataLayers={visibleDataLayers}
              selectedDistrict={selectedDistrict}
            />
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
