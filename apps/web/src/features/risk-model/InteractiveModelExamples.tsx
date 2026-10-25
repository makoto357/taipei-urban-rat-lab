import { useMemo, useState } from "react";
import { colors } from "@taipei-rat-lab/ui";
import {
  FACTOR_WEIGHTS,
  calculateFinalScore,
  getRiskLevel,
  type FactorScores,
  type RiskLevel,
} from "../map/engine/riskModel";

type FactorKey = keyof FactorScores;

const EXAMPLE_SCORES: FactorScores = {
  citizen: 0.72,
  government: 0.46,
  food: 0.64,
  shelter: 0.35,
};

const FACTORS: Array<{ key: FactorKey; label: string; mask: number }> = [
  { key: "citizen", label: "民眾通報", mask: 1 },
  { key: "government", label: "政府調查", mask: 2 },
  { key: "food", label: "食物來源", mask: 4 },
  { key: "shelter", label: "躲藏空間", mask: 8 },
];

const ROAD_BARRIERS = [
  { value: 1, label: "小於 8 m", note: "權重 1.00", visualWidth: 70 },
  { value: 0.6, label: "8–12 m", note: "權重 0.60", visualWidth: 100 },
  { value: 0.25, label: "12–20 m", note: "權重 0.25", visualWidth: 140 },
  { value: 0.08, label: "20–30 m", note: "權重 0.08", visualWidth: 185 },
  { value: 0.01, label: "30 m 以上", note: "權重 0.01", visualWidth: 230 },
] as const;

const EXAMPLE_DISTANCE_METERS = 20;

const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  L1: colors.activity.l4,
  L2: colors.activity.l3,
  L3: colors.activity.l2,
  L4: colors.activity.l1,
  L5: colors.activity.l0,
  unclassified: colors.unknown,
};

export function FactorWeightExample() {
  const [selected, setSelected] = useState<Record<FactorKey, boolean>>({
    citizen: true,
    government: true,
    food: true,
    shelter: true,
  });

  const result = useMemo(() => {
    const mask = FACTORS.reduce(
      (value, factor) => value | (selected[factor.key] ? factor.mask : 0),
      0,
    );
    const selectedWeight = FACTORS.reduce(
      (value, factor) =>
        value + (selected[factor.key] ? FACTOR_WEIGHTS[factor.key] : 0),
      0,
    );
    const weightedTerms = FACTORS.filter((factor) => selected[factor.key]).map(
      (factor) =>
        `${EXAMPLE_SCORES[factor.key].toFixed(2)} × ${FACTOR_WEIGHTS[factor.key]}`,
    );
    const score = calculateFinalScore({
      mask,
      local: EXAMPLE_SCORES,
      groundEnabled: false,
      undergroundEnabled: false,
    });
    return { score, selectedWeight, weightedTerms };
  }, [selected]);

  return (
    <div className="border-2 border-ink bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 font-label text-xs tracking-[0.12em] text-accent-text">
            SYNTHETIC EXAMPLE
          </p>
          <h3 className="m-0 mt-1 text-xl font-black">切換因子，看權重如何改變結果</h3>
        </div>
        <span className="border border-ink px-2 py-1 font-label text-xs">非真實街廓資料</span>
      </div>

      <fieldset className="m-0 mt-5 grid gap-2 border-0 p-0 sm:grid-cols-2">
        <legend className="sr-only">選擇範例計分因子</legend>
        {FACTORS.map((factor) => (
          <label
            key={factor.key}
            className="flex min-h-12 cursor-pointer items-center gap-3 border border-ink px-3 py-2"
          >
            <input
              type="checkbox"
              checked={selected[factor.key]}
              onChange={(event) =>
                setSelected((current) => ({
                  ...current,
                  [factor.key]: event.target.checked,
                }))
              }
              className="h-5 w-5 accent-ink"
            />
            <span className="font-bold">{factor.label}</span>
            <span className="ml-auto font-label text-sm text-accent-text">
              ×{FACTOR_WEIGHTS[factor.key]}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="mt-5 grid gap-4 border-t-2 border-ink pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="font-body text-sm leading-[1.75]">
          {result.selectedWeight > 0 ? (
            <>
              <p className="m-0 text-muted">所選因子的示例正規化值</p>
              <p className="m-0 mt-1 break-words font-label">
                ({result.weightedTerms.join(" + ")}) ÷ {result.selectedWeight}
              </p>
            </>
          ) : (
            <p className="m-0 text-muted">未選擇因子時不計分。</p>
          )}
        </div>
        <div className="flex items-baseline gap-2 sm:text-right">
          <span className="font-label text-xs text-muted">加權分數</span>
          <output className="font-label text-4xl font-bold">{result.score.toFixed(2)}</output>
        </div>
      </div>
    </div>
  );
}

type ConnectivityMode = "ground" | "underground";
type UndergroundSystem = "sewer" | "stormwater";
type RoadBarrier = (typeof ROAD_BARRIERS)[number];

const getLevelLabel = (level: RiskLevel) =>
  level === "unclassified" ? "資料不足" : level;

function GroundConnectivityDiagram({
  barrier,
  connectivity,
}: {
  barrier: RoadBarrier;
  connectivity: number;
}) {
  const neighborLevel = getRiskLevel(connectivity);
  const neighborLabel = getLevelLabel(neighborLevel);
  const roadX = (900 - barrier.visualWidth) / 2;
  const leftBlockWidth = roadX - 55;
  const rightBlockX = roadX + barrier.visualWidth + 25;
  const rightBlockWidth = 870 - rightBlockX;

  return (
    <svg
      viewBox="0 0 900 330"
      role="img"
      aria-label={`L1 觀測來源街廓 A 與${neighborLabel}鄰近街廓 B，中間道路寬度為${barrier.label}，啟發式權重 ${connectivity.toFixed(3)}`}
      className="h-[230px] w-full sm:h-auto"
    >
      <title>道路寬度與觀測證據傳遞示意</title>
      <rect x="30" y="45" width={leftBlockWidth} height="220" rx="4" fill={RISK_LEVEL_COLORS.L1} stroke={colors.ink} strokeWidth="3" />
      <rect x={rightBlockX} y="45" width={rightBlockWidth} height="220" rx="4" fill={RISK_LEVEL_COLORS[neighborLevel]} stroke={colors.ink} strokeWidth="3" />
      <rect x={roadX} y="22" width={barrier.visualWidth} height="266" fill={colors.muted} />
      <line x1="450" y1="22" x2="450" y2="288" stroke={colors.paper} strokeWidth="5" strokeDasharray="20 16" opacity="0.7" />
      <line x1="110" y1="155" x2="790" y2="155" stroke={colors.card} strokeWidth="7" strokeDasharray="20 16" />
      <text x={30 + leftBlockWidth / 2} y="135" textAnchor="middle" fontSize="42" fontWeight="700" fill={colors.card}>A</text>
      <text x={30 + leftBlockWidth / 2} y="195" textAnchor="middle" fontSize="25" fontWeight="700" fill={colors.card}>L1 · 觀測來源</text>
      <text x={rightBlockX + rightBlockWidth / 2} y="135" textAnchor="middle" fontSize="42" fontWeight="700" fill={colors.ink}>B</text>
      <text x={rightBlockX + rightBlockWidth / 2} y="195" textAnchor="middle" fontSize="25" fontWeight="700" fill={colors.ink}>{neighborLabel} · 鄰近街廓</text>
      <text x="450" y="314" textAnchor="middle" fontSize="17" fontWeight="700" fill={colors.ink}>道路阻隔權重 {barrier.value.toFixed(2)}</text>
    </svg>
  );
}

function UndergroundConnectivityDiagram({
  system,
  pipeLength,
  connectivity,
}: {
  system: UndergroundSystem;
  pipeLength: number;
  connectivity: number;
}) {
  const neighborLevel = getRiskLevel(connectivity);
  const neighborLabel = getLevelLabel(neighborLevel);
  const pipeColor = system === "sewer" ? colors.map.teal : colors.map.water;
  const systemLabel = system === "sewer" ? "污水系統" : "雨水系統";
  const manholePrefix = system === "sewer" ? "S" : "SW";

  return (
    <svg
      viewBox="0 0 900 360"
      role="img"
      aria-label={`${systemLabel}單邊示意：L1 觀測來源街廓 A 經兩個人孔與 ${pipeLength} 公尺管段連接至${neighborLabel}鄰近街廓 B，啟發式權重 ${connectivity.toFixed(3)}`}
      className="h-[250px] w-full sm:h-auto"
    >
      <title>同一系統的人孔與地下管段連通示意</title>
      <rect x="0" y="185" width="900" height="175" fill={colors.map.water} opacity="0.16" />
      <line x1="0" y1="185" x2="900" y2="185" stroke={colors.ink} strokeWidth="3" />
      <rect x="30" y="35" width="300" height="125" rx="4" fill={RISK_LEVEL_COLORS.L1} stroke={colors.ink} strokeWidth="3" />
      <rect x="570" y="35" width="300" height="125" rx="4" fill={RISK_LEVEL_COLORS[neighborLevel]} stroke={colors.ink} strokeWidth="3" />
      <text x="180" y="88" textAnchor="middle" fontSize="38" fontWeight="700" fill={colors.card}>A</text>
      <text x="180" y="128" textAnchor="middle" fontSize="23" fontWeight="700" fill={colors.card}>L1 · 觀測來源</text>
      <text x="720" y="88" textAnchor="middle" fontSize="38" fontWeight="700" fill={colors.ink}>B</text>
      <text x="720" y="128" textAnchor="middle" fontSize="23" fontWeight="700" fill={colors.ink}>{neighborLabel} · 鄰近街廓</text>
      <line x1="180" y1="160" x2="180" y2="245" stroke={colors.ink} strokeWidth="4" strokeDasharray="8 6" />
      <line x1="720" y1="160" x2="720" y2="245" stroke={colors.ink} strokeWidth="4" strokeDasharray="8 6" />
      <line x1="180" y1="245" x2="720" y2="245" stroke={pipeColor} strokeWidth="12" />
      <circle cx="180" cy="245" r="18" fill={colors.paper} stroke={colors.ink} strokeWidth="4" />
      <circle cx="720" cy="245" r="18" fill={colors.paper} stroke={colors.ink} strokeWidth="4" />
      <circle cx="180" cy="245" r="5" fill={pipeColor} />
      <circle cx="720" cy="245" r="5" fill={pipeColor} />
      <text x="180" y="285" textAnchor="middle" fontSize="16" fontWeight="700">{manholePrefix}-01 人孔</text>
      <text x="720" y="285" textAnchor="middle" fontSize="16" fontWeight="700">{manholePrefix}-02 人孔</text>
      {/* <rect x="330" y="218" width="240" height="42" fill={colors.ink} /> */}
      <text x="450" y="246" textAnchor="middle" fontSize="17" fontWeight="700" fill={colors.ink}>{systemLabel} · 管長 {pipeLength} m</text>
      <text x="450" y="327" textAnchor="middle" fontSize="16" fill={colors.muted}>兩端人孔已各自配對至 30 m 內街廓</text>
    </svg>
  );
}

export function ConnectivityExample() {
  const [mode, setMode] = useState<ConnectivityMode>("ground");
  const [barrier, setBarrier] = useState<number>(0.6);
  const [undergroundSystem, setUndergroundSystem] =
    useState<UndergroundSystem>("sewer");
  const [pipeLength, setPipeLength] = useState(100);
  const selectedBarrier =
    ROAD_BARRIERS.find((option) => option.value === barrier) ?? ROAD_BARRIERS[1];
  const groundWeight =
    Math.exp(-Math.max(EXAMPLE_DISTANCE_METERS, 1) / 50) * barrier;
  const undergroundWeight = Math.exp(-Math.max(pipeLength, 1) / 100);
  const connectivity = mode === "ground" ? groundWeight : undergroundWeight;
  const formula =
    mode === "ground"
      ? `exp(−${EXAMPLE_DISTANCE_METERS} / 50) × ${barrier.toFixed(2)}`
      : `exp(−${pipeLength} / 100)`;

  return (
    <div className="border-2 border-ink bg-card p-5 sm:p-6">
      <p className="m-0 font-label text-xs tracking-[0.12em] text-accent-text">
        單邊互動示例
      </p>
      <h3 className="m-0 mt-1 text-2xl font-black">空間連通性模擬器</h3>
      <p className="m-0 mt-2 font-body text-sm leading-[1.75] text-muted">
        切換地面與下水道模式，觀察單一連通邊的啟發式權重。這不是完整的風險分數計算。
      </p>

      <div role="group" aria-label="選擇空間連通模式" className="mt-5 grid grid-cols-2 border-2 border-ink">
        {([
          ["ground", "地面移動"],
          ["underground", "下水道移動"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={`min-h-12 border-0 px-4 font-heading text-base font-bold first:border-r-2 first:border-ink ${
              mode === value ? "bg-ink text-card" : "bg-paper text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 border-y-2 border-ink bg-paper">
        {mode === "ground" ? (
          <GroundConnectivityDiagram barrier={selectedBarrier} connectivity={connectivity} />
        ) : (
          <UndergroundConnectivityDiagram
            system={undergroundSystem}
            pipeLength={pipeLength}
            connectivity={connectivity}
          />
        )}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_250px]">
        {mode === "ground" ? (
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 font-bold">選擇道路寬度</legend>
            <p className="m-0 mb-3 font-body text-sm text-muted">
              街廓間距固定為 {EXAMPLE_DISTANCE_METERS} m；保留規範中的距離衰減與道路阻隔權重。
            </p>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
              {ROAD_BARRIERS.map((option) => {
                const checked = barrier === option.value;
                return (
                  <label
                    key={option.label}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-2 ${
                      checked ? "border-ink bg-ink text-card" : "border-muted bg-paper"
                    }`}
                  >
                    <input
                      type="radio"
                      name="road-barrier"
                      value={option.value}
                      checked={checked}
                      onChange={() => setBarrier(option.value)}
                      className="h-5 w-5 shrink-0 accent-accent"
                    />
                    <span className="font-bold">{option.label}</span>
                    <span className={`ml-auto font-label text-sm ${checked ? "text-activity-l2" : "text-muted"}`}>
                      {option.note}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <div>
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 font-bold">選擇管網系統</legend>
              <div className="grid grid-cols-2 border-2 border-ink">
                {([
                  ["sewer", "污水系統"],
                  ["stormwater", "雨水系統"],
                ] as const).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 px-3 font-bold first:border-r-2 first:border-ink ${
                      undergroundSystem === value ? "bg-ink text-card" : "bg-paper text-ink"
                    }`}
                  >
                    <input
                      type="radio"
                      name="underground-system"
                      value={value}
                      checked={undergroundSystem === value}
                      onChange={() => setUndergroundSystem(value)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-5">
              <div className="flex items-baseline justify-between gap-4">
                <label className="font-bold" htmlFor="pipe-length">管段長度</label>
                <output htmlFor="pipe-length" className="font-label text-lg font-bold text-accent-text">
                  {pipeLength} m
                </output>
              </div>
              <input
                id="pipe-length"
                type="range"
                min="10"
                max="300"
                step="10"
                value={pipeLength}
                onChange={(event) => setPipeLength(Number(event.target.value))}
                className="h-11 w-full accent-ink"
              />
            </div>

            <p className="m-0 mt-3 border-l-4 border-map-water pl-3 font-body text-sm leading-[1.75] text-muted">
              管段只以同一系統內完全相符的人孔 ID 連接；污水與雨水網路分開。本圖假設兩端人孔已各自配對至 30 m 內的街廓。
            </p>
          </div>
        )}

        <div aria-live="polite" className="flex flex-col justify-between bg-ink p-5 text-card">
          <div>
            <span className="font-label text-xs tracking-[0.1em] text-activity-l2">
              啟發式相對連通權重
            </span>
            <output className="mt-2 block font-label text-5xl font-bold">
              {connectivity.toFixed(3)}
            </output>
          </div>
          <p className="m-0 mt-6 break-words font-label text-sm leading-[1.7] text-card">
            {formula}
            <br />= {connectivity.toFixed(3)}
          </p>
        </div>
      </div>

      <p className="m-0 mt-5 border-l-4 border-accent pl-3 font-body text-sm leading-[1.75] text-muted">
        這是單一連通邊的教育示例。權重是探索性的結構化假設，不是實際鼠群移動路徑或穿越機率。
      </p>

      <section aria-labelledby="movement-combination-title" className="mt-6 border-t-2 border-ink pt-5">
        <h4 id="movement-combination-title" className="m-0 text-lg font-black">兩種移動模式如何一起作用？</h4>
        <ul className="mb-0 mt-3 grid gap-x-8 gap-y-2 pl-5 font-body text-sm leading-[1.75] sm:grid-cols-2">
          <li>只有民眾通報與政府調查會傳遞；食物來源與躲藏空間留在原街廓。</li>
          <li>地面、污水與雨水網路各自最多傳遞 2 跳。</li>
          <li>地面與下水道同時啟用時，對每個觀測因子分別取兩者最大值，絕不相加。</li>
          <li>同一路徑不混用地面與下水道邊，污水與雨水邊也不互相切換。</li>
        </ul>
      </section>
    </div>
  );
}
