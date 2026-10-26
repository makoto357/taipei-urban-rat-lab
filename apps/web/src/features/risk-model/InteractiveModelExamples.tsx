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
      className="h-[160px] w-full sm:h-[230px] lg:h-[290px]"
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
  pipeLength,
  connectivity,
}: {
  pipeLength: number;
  connectivity: number;
}) {
  const neighborLevel = getRiskLevel(connectivity);
  const neighborLabel = getLevelLabel(neighborLevel);

  return (
    <svg
      viewBox="0 0 900 360"
      role="img"
      aria-label={`下水道單邊示意：L1 觀測來源街廓 A 經兩個人孔與 ${pipeLength} 公尺管段連接至${neighborLabel}鄰近街廓 B，啟發式權重 ${connectivity.toFixed(3)}`}
      className="h-[160px] w-full sm:h-[230px] lg:h-[290px]"
    >
      <title>同一系統的人孔與地下管段連通示意</title>
      <rect x="0" y="185" width="900" height="175" fill={colors.map.teal} opacity="0.16" />
      <line x1="0" y1="185" x2="900" y2="185" stroke={colors.ink} strokeWidth="3" />
      <rect x="30" y="35" width="300" height="125" rx="4" fill={RISK_LEVEL_COLORS.L1} stroke={colors.ink} strokeWidth="3" />
      <rect x="570" y="35" width="300" height="125" rx="4" fill={RISK_LEVEL_COLORS[neighborLevel]} stroke={colors.ink} strokeWidth="3" />
      <text x="180" y="88" textAnchor="middle" fontSize="38" fontWeight="700" fill={colors.card}>A</text>
      <text x="180" y="128" textAnchor="middle" fontSize="23" fontWeight="700" fill={colors.card}>L1 · 觀測來源</text>
      <text x="720" y="88" textAnchor="middle" fontSize="38" fontWeight="700" fill={colors.ink}>B</text>
      <text x="720" y="128" textAnchor="middle" fontSize="23" fontWeight="700" fill={colors.ink}>{neighborLabel} · 鄰近街廓</text>
      <line x1="180" y1="160" x2="180" y2="245" stroke={colors.ink} strokeWidth="4" strokeDasharray="8 6" />
      <line x1="720" y1="160" x2="720" y2="245" stroke={colors.ink} strokeWidth="4" strokeDasharray="8 6" />
      <line x1="180" y1="245" x2="720" y2="245" stroke={colors.map.teal} strokeWidth="12" />
      <circle cx="180" cy="245" r="18" fill={colors.paper} stroke={colors.ink} strokeWidth="4" />
      <circle cx="720" cy="245" r="18" fill={colors.paper} stroke={colors.ink} strokeWidth="4" />
      <circle cx="180" cy="245" r="5" fill={colors.map.teal} />
      <circle cx="720" cy="245" r="5" fill={colors.map.teal} />
      <text x="180" y="285" textAnchor="middle" fontSize="16" fontWeight="700">MH-01 人孔</text>
      <text x="720" y="285" textAnchor="middle" fontSize="16" fontWeight="700">MH-02 人孔</text>
      <text x="450" y="246" textAnchor="middle" fontSize="17" fontWeight="700" fill={colors.ink}>下水道管段 · {pipeLength} m</text>
      <text x="450" y="327" textAnchor="middle" fontSize="16" fill={colors.muted}>兩端人孔已各自配對至 30 m 內街廓</text>
    </svg>
  );
}

export function ConnectivityExample() {
  const [mode, setMode] = useState<ConnectivityMode>("ground");
  const [barrier, setBarrier] = useState<number>(0.6);
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
    <div className="border-2 border-ink bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 font-label text-xs tracking-[0.12em] text-accent-text">
            INTERACTIVE DEMO
          </p>
          <h3 className="m-0 mt-1 text-xl font-black">空間連通性模擬器</h3>
          <p className="m-0 mt-1 font-body text-sm leading-[1.6] text-muted">
            觀察單一連通邊的啟發式權重，不是完整風險分數。
          </p>
        </div>
        <div
          role="group"
          aria-label="選擇空間連通模式"
          className="grid w-full grid-cols-2 border-2 border-ink sm:w-[280px]"
        >
          {([
            ["ground", "地面移動"],
            ["underground", "下水道移動"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`min-h-10 border-0 px-3 font-heading text-sm font-bold transition-colors first:border-r-2 first:border-ink hover:bg-accent hover:text-card active:bg-accent-text focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-card ${
                mode === value ? "bg-ink text-card" : "bg-paper text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex h-[180px] items-center border-y border-ink bg-paper sm:h-[250px] lg:h-[310px]">
        {mode === "ground" ? (
          <GroundConnectivityDiagram
            barrier={selectedBarrier}
            connectivity={connectivity}
          />
        ) : (
          <UndergroundConnectivityDiagram
            pipeLength={pipeLength}
            connectivity={connectivity}
          />
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
        {mode === "ground" ? (
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
              <legend className="font-bold">選擇道路寬度</legend>
              <p className="m-0 font-body text-xs text-muted">
                街廓間距固定為 {EXAMPLE_DISTANCE_METERS} m
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px border border-ink bg-ink sm:grid-cols-5">
              {ROAD_BARRIERS.map((option) => {
                const checked = barrier === option.value;
                return (
                  <label
                    key={option.label}
                    className={`flex min-h-16 cursor-pointer items-center gap-2 px-3 py-2 last:col-span-2 sm:last:col-span-1 ${
                      checked ? "bg-accent" : "bg-paper hover:bg-card"
                    }`}
                  >
                    <input
                      type="radio"
                      name="road-barrier"
                      value={option.value}
                      checked={checked}
                      onChange={() => setBarrier(option.value)}
                      className="h-4 w-4 shrink-0 accent-ink"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-tight">
                        {option.label}
                      </span>
                      <span className="mt-1 block font-label text-[11px] text-ink">
                        {option.note}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-4">
              <label className="font-bold" htmlFor="pipe-length">
                管段長度
              </label>
              <output
                htmlFor="pipe-length"
                className="font-label text-xl font-bold text-accent-text"
              >
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
              className="h-10 w-full accent-ink"
            />
            <p className="m-0 border-l-4 border-map-water pl-3 font-body text-xs leading-[1.65] text-muted">
              假設兩端人孔已配對至 30 m 內街廓；實際模型只連接同一系統內相符的人孔 ID，污水與雨水仍分開計算。
            </p>
          </div>
        )}

        <div
          aria-live="polite"
          className="flex min-h-24 flex-col justify-between bg-ink px-4 pt-3 pb-5 text-card"
        >
          <span className="font-label text-[11px] tracking-[0.1em] text-activity-l2">
            相對連通權重
          </span>
          <div className="flex items-end justify-between gap-3">
            <p className="m-0 break-words font-label text-[11px] leading-[1.4] text-card">
              {formula}
            </p>
            <output className="font-label text-4xl font-bold leading-none">
              {connectivity.toFixed(3)}
            </output>
          </div>
        </div>
      </div>

      <section
        aria-labelledby="movement-combination-title"
        className="mt-4 border-t border-ink pt-4"
      >
        <h4
          id="movement-combination-title"
          className="m-0 text-base font-black"
        >
          兩種模式如何一起作用？
        </h4>
        <ol className="m-0 mt-3 grid list-none gap-3 p-0 font-body text-xs leading-[1.65] sm:grid-cols-2 lg:grid-cols-4">
          {[
            "只有民眾通報與政府調查會傳遞；環境因子留在原街廓。",
            "地面、污水與雨水網路各自最多傳遞 2 跳。",
            "兩種模式同時啟用時，對每個觀測因子分別取最大值。",
            "同一路徑不混用地面、污水或雨水連通邊。",
          ].map((rule, index) => (
            <li key={rule} className="border-t border-ink pt-2">
              <span className="mr-2 font-label text-accent-text">
                {String(index + 1).padStart(2, "0")}
              </span>
              {rule}
            </li>
          ))}
        </ol>
      </section>

      <aside className="warning-card mt-4 grid gap-2 border-l-4 border-accent bg-activity-l1 p-4 sm:grid-cols-[220px_1fr] sm:items-start">
        <div>
          <p className="m-0 font-label text-[11px] tracking-[0.12em] text-accent-text">
            HEURISTIC, NOT TRACKING
          </p>
          <h4 className="m-0 mt-1 text-base font-black">
            結構化推估，不是路徑追蹤
          </h4>
        </div>
        <p className="m-0 font-body text-xs leading-[1.7]">
          權重只表達既定距離、道路和管網規則下的相對影響程度，不能解讀為老鼠實際移動的方向、機率或路徑。
        </p>
      </aside>
    </div>
  );
}
