import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { PageHeading } from "../components/PageHeading";
import {
  InteractiveMap,
  getEngineLayers,
} from "../features/map/InteractiveMap";
import { LayerLegendSwatch } from "../features/map/LayerLegendSwatch";
import {
  DISTRICTS,
  MAP_TOPICS,
  mapTopicIndexFromSlug,
} from "../features/map/mapTopics";
import {
  TIME_RANGE_OPTIONS,
  type TimeRangeKey,
} from "../features/map/timeRange";

export function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTopic = mapTopicIndexFromSlug(searchParams.get("topic"));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [layerOverrides, setLayerOverrides] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("1y");

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
      const disabledByRequirement = Boolean(
        layer.requiresAnyLayerKeys?.length &&
          !layer.requiresAnyLayerKeys.some((key) => enabledByKey.get(key)),
      );
      return {
        ...layer,
        interactionDisabled: Boolean(
          layer.disabled || disabledByObservation || disabledByRequirement,
        ),
        disabledReason: layer.disabled
          ? "目前沒有可用的地理資料"
          : disabledByObservation
            ? "請先選擇民眾通報或政府調查"
            : disabledByRequirement
              ? "請先選擇鼠跡分佈"
            : undefined,
        effectiveOn:
          layer.on &&
          !disabledByObservation &&
          !disabledByRequirement &&
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
  const supplementalLayerKeys = new Set(
    topic.supplementalSections?.flatMap((section) => section.layerKeys) ?? [],
  );

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

  function selectTopic(index: number) {
    const selectedTopic = MAP_TOPICS[index];
    if (!selectedTopic) return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("topic", selectedTopic.slug);
    setSearchParams(nextSearchParams);
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
      <main className="mx-auto flex w-full max-w-container flex-col gap-6 px-4 pb-14 sm:px-10">
        <PageHeading
          label="地圖探索"
          englishLabel="INTERACTIVE MAP"
          title="老鼠都在哪裡？"
          description="整合不同來源的數據與環境資料，一起探索台北市的鼠患線索。"
        />

        <div className="flex flex-col">
          <div
            role="tablist"
            aria-label="資料主題"
            className="grid grid-cols-3 gap-0.5 border-2 border-ink bg-ink lg:grid-cols-6"
          >
            {MAP_TOPICS.map((candidate, index) => {
              const active = index === activeTopic;
              return (
                <button
                  key={candidate.en}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`${String(index + 1).padStart(2, "0")} ${candidate.zh} ${candidate.en}`}
                  onClick={() => selectTopic(index)}
                  className={`flex min-h-11 items-center justify-start gap-2 border-0 px-2 py-1.5 text-left font-heading transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:min-h-[60px] sm:gap-3 sm:px-3.5 sm:py-2 lg:min-h-11 lg:gap-2 lg:px-2 lg:py-1.5 xl:min-h-[60px] xl:gap-3 xl:px-3.5 xl:py-2 ${
                    active ? "bg-accent" : "bg-paper hover:bg-card"
                  }`}
                >
                  <span className="tag flex h-6 w-6 flex-none items-center justify-center border border-ink bg-card font-label text-xs text-ink sm:h-[30px] sm:w-[30px] sm:border-[1.5px] sm:text-[15px] lg:h-6 lg:w-6 lg:border lg:text-xs xl:h-[30px] xl:w-[30px] xl:border-[1.5px] xl:text-[15px]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex min-w-0 flex-col items-start leading-tight">
                    <span className="text-sm font-black sm:hidden lg:inline xl:hidden">
                      {candidate.zh.slice(0, 2)}
                    </span>
                    <span className="hidden text-[17px] font-black sm:inline lg:hidden xl:inline">
                      {candidate.zh}
                    </span>
                    <span className="hidden font-label text-[11px] tracking-[0.1em] sm:inline lg:hidden xl:inline">
                      {candidate.en}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative -mt-0.5 h-[720px] overflow-hidden border-2 border-ink bg-card md:flex md:h-[680px]">
          {sidebarOpen ? (
          <aside
            id="map-sidebar"
            className="absolute inset-x-0 bottom-0 z-10 flex max-h-[52%] min-h-0 flex-col gap-[22px] overflow-y-auto overscroll-contain border-t-2 border-ink bg-card px-[22px] py-5 shadow-[0_-5px_0_rgb(0_0_0_/_18%)] md:static md:h-full md:max-h-full md:w-[320px] md:max-w-[320px] md:flex-[0_0_320px] md:border-r-2 md:border-t-0 md:shadow-none"
          >
            <div className="flex items-center justify-end border-b border-ink pb-2">
              <button
                type="button"
                aria-controls="map-sidebar"
                aria-expanded="true"
                onClick={() => setSidebarOpen(false)}
                className="inline-flex min-h-9 items-center gap-2 border-0 bg-transparent px-1 font-body text-xs font-bold text-ink hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                收合 <span aria-hidden="true">−</span>
              </button>
            </div>
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
                <>
                  {layers
                    .filter((layer) => !supplementalLayerKeys.has(layer.key))
                    .map(renderLayerControl)}
                  {topic.supplementalSections?.map((section) => (
                    <section
                      key={section.id}
                      className="mt-2 border-t border-ink/25 py-3"
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
                </>
              )}
            </div>

            {topic.note && (
              <p className="warning-card m-0 border-[1.5px] border-ink bg-activity-l1 px-3 py-2.5 font-body text-[13px] leading-[1.6]">
                {topic.note}
              </p>
            )}

            <div className="h-0.5 bg-ink" />

            <label className="flex flex-col gap-2 text-base font-black">
              時間範圍
              <select
                value={timeRange}
                onChange={(event) =>
                  setTimeRange(event.target.value as TimeRangeKey)
                }
                className="min-h-11 rounded-none border-[1.5px] border-ink bg-paper px-2.5 font-body text-sm font-normal focus:bg-card focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ink"
              >
                {TIME_RANGE_OPTIONS.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
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
          ) : (
            <>
            <div
              id="map-sidebar"
              className="absolute inset-x-0 bottom-0 z-20 border-t-2 border-ink bg-card px-[22px] py-4 shadow-[0_-5px_0_rgb(0_0_0_/_18%)] md:hidden"
            >
              <div className="flex min-h-11 items-center justify-between">
                <span className="font-label text-xs tracking-[0.08em]">
                  圖層與篩選
                </span>
                <button
                  type="button"
                  aria-controls="map-sidebar"
                  aria-expanded="false"
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex min-h-9 items-center gap-2 border-0 bg-transparent px-1 font-body text-xs font-bold text-ink hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  展開 <span aria-hidden="true">＋</span>
                </button>
              </div>
            </div>
            <button
              type="button"
              aria-controls="map-sidebar"
              aria-expanded="false"
              onClick={() => setSidebarOpen(true)}
              className="absolute left-3 top-3 z-20 hidden min-h-11 items-center gap-2 border-2 border-ink bg-card px-4 font-heading text-sm font-bold text-ink hover:bg-accent hover:text-card active:bg-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:inline-flex"
            >
              圖層與篩選 <span aria-hidden="true">＋</span>
            </button>
            </>
          )}

          <section
            className="absolute inset-0 overflow-hidden bg-[#E4E2DC] md:relative md:inset-auto md:h-full md:min-h-0 md:min-w-0 md:flex-1"
            aria-label="台北都市鼠患互動地圖"
          >
            <InteractiveMap
              visibleDataLayers={visibleDataLayers}
              selectedDistrict={selectedDistrict}
              timeRange={timeRange}
            />
          </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
