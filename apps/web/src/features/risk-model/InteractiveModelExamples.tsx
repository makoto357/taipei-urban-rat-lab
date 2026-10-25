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

export function ConnectivityExample() {
  const [barrier, setBarrier] = useState<number>(0.6);
  const selectedBarrier =
    ROAD_BARRIERS.find((option) => option.value === barrier) ?? ROAD_BARRIERS[1];
  const distanceDecay = Math.exp(-Math.max(EXAMPLE_DISTANCE_METERS, 1) / 50);
  const connectivity = distanceDecay * barrier;
  const neighborLevel = getRiskLevel(connectivity);
  const neighborLabel = neighborLevel === "unclassified" ? "資料不足" : neighborLevel;
  const roadX = (900 - selectedBarrier.visualWidth) / 2;
  const leftBlockWidth = roadX - 55;
  const rightBlockX = roadX + selectedBarrier.visualWidth + 25;
  const rightBlockWidth = 870 - rightBlockX;

  return (
    <div className="border-2 border-ink bg-card p-5 sm:p-6">
      <p className="m-0 font-label text-xs tracking-[0.12em] text-accent-text">
        INTERACTIVE GROUND EXAMPLE
      </p>
      <h3 className="m-0 mt-1 text-2xl font-black">道路阻隔模擬器</h3>
      <p className="m-0 mt-2 font-body text-sm leading-[1.75] text-muted">
        兩個街廓固定相距 <strong className="font-heading text-ink">{EXAMPLE_DISTANCE_METERS} m</strong>
        ，選擇道路寬度，觀察鄰近街廓的相對連通權重。
      </p>

      <div className="mt-5 border-y-2 border-ink bg-paper">
        <svg
          viewBox="0 0 900 330"
          role="img"
          aria-label={`L1 觀測來源街廓 A 與${neighborLabel}鄰近街廓 B，中間道路寬度為${selectedBarrier.label}，連通權重 ${connectivity.toFixed(3)}`}
          className="h-[230px] w-full sm:h-auto"
        >
          <title>道路寬度與觀測證據傳遞示意</title>
          <rect x="30" y="45" width={leftBlockWidth} height="220" rx="4" fill={RISK_LEVEL_COLORS.L1} stroke="#000" strokeWidth="3" />
          <rect
            x={rightBlockX}
            y="45"
            width={rightBlockWidth}
            height="220"
            rx="4"
            fill={RISK_LEVEL_COLORS[neighborLevel]}
            stroke="#000"
            strokeWidth="3"
          />
          <rect x={roadX} y="22" width={selectedBarrier.visualWidth} height="266" fill="#6B6658" />
          <line
            x1="450"
            y1="22"
            x2="450"
            y2="288"
            stroke="#F4EEDD"
            strokeWidth="5"
            strokeDasharray="20 16"
            opacity="0.7"
          />
          <line
            x1="110"
            y1="155"
            x2="790"
            y2="155"
            stroke="#FDF9ED"
            strokeWidth="7"
            strokeDasharray="20 16"
          />
          <text x={30 + leftBlockWidth / 2} y="135" textAnchor="middle" fontSize="42" fontWeight="700" fill={colors.ink}>A</text>
          <text x={30 + leftBlockWidth / 2} y="195" textAnchor="middle" fontSize="25" fontWeight="700" fill={colors.ink}>觀測來源</text>
          <text x={rightBlockX + rightBlockWidth / 2} y="135" textAnchor="middle" fontSize="42" fontWeight="700" fill={colors.ink}>B</text>
          <text x={rightBlockX + rightBlockWidth / 2} y="195" textAnchor="middle" fontSize="25" fontWeight="700" fill={colors.ink}>鄰近街廓</text>
          {/* <rect x="330" y="290" width="240" height="34" fill="#000" /> */}
          <text x="450" y="314" textAnchor="middle" fontSize="17" fontWeight="700" fill={colors.ink}>
            道路阻隔權重 {barrier.toFixed(2)}
          </text>
        </svg>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_250px]">
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 font-bold">選擇道路寬度</legend>
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

        <div aria-live="polite" className="flex flex-col justify-between bg-ink p-5 text-card">
          <div>
            <span className="font-label text-xs tracking-[0.1em] text-activity-l2">
              傳遞後的相對權重
            </span>
            <output className="mt-2 block font-label text-5xl font-bold">
              {connectivity.toFixed(3)}
            </output>
          </div>
          <p className="m-0 mt-6 break-words font-label text-sm leading-[1.7] text-card">
            exp(−{EXAMPLE_DISTANCE_METERS} / 50) × {barrier.toFixed(2)}
            <br />= {connectivity.toFixed(3)}
          </p>
        </div>
      </div>

      <p className="m-0 mt-5 border-l-4 border-accent pl-3 font-body text-sm leading-[1.75] text-muted">
        單條道路的簡化示例；色彩深淺只輔助理解權重變化，不是經實測校正的鼠隻穿越機率。
      </p>
    </div>
  );
}
