import { colors } from "@taipei-rat-lab/ui";

export type LegendShape = "circle" | "ring" | "square" | "cell";

export interface MapLayer {
  key: string;
  label: string;
  shape: LegendShape;
  color: string;
  /** 預設關閉（對應 Artifact 腳本中的 off: true） */
  defaultOff?: boolean;
}

export interface MapTopic {
  zh: string;
  en: string;
  note?: string;
  layers: MapLayer[];
}

/**
 * 資料主題分頁與圖層定義，對應 Claude Artifact Map.dc.html 的 TABS 常數與
 * docs/design/design-system.md §6 地圖語意色。地圖主體（底圖、點位渲染）
 * 尚未接入 MapLibre，這裡先只保留圖層面板可切換的 UI 狀態。
 */
export const MAP_TOPICS: MapTopic[] = [
  {
    zh: "鼠跡分佈",
    en: "OBSERVATIONS",
    layers: [
      { key: "cit-rat", label: "民眾通報：老鼠／鼠跡（未驗證）", shape: "circle", color: colors.accent },
      { key: "cit-bait", label: "民眾通報：餌劑／餌站（未驗證）", shape: "ring", color: colors.map.purple },
      { key: "gov", label: "市府調查（已驗證）", shape: "square", color: colors.accent },
    ],
  },
  {
    zh: "投藥紀錄",
    en: "BAIT MANAGEMENT",
    note: "「已移除」不代表完全安全：現場仍可能有殘餌、非市府投藥或中毒鼠隻。",
    layers: [
      { key: "placed", label: "已投放", shape: "circle", color: colors.map.purple },
      { key: "checked", label: "已檢查", shape: "square", color: colors.map.purple },
      { key: "removed", label: "已移除（一週內）", shape: "ring", color: colors.map.purple, defaultOff: true },
    ],
  },
  {
    zh: "環境因子",
    en: "ENVIRONMENT",
    layers: [
      { key: "food", label: "食物來源", shape: "circle", color: colors.map.green },
      { key: "shelter", label: "隱蔽空間", shape: "square", color: colors.map.green },
      { key: "water", label: "積水、排水問題", shape: "circle", color: colors.map.water, defaultOff: true },
    ],
  },
  {
    zh: "鼠群研究",
    en: "DISTRIBUTION",
    layers: [
      { key: "sample", label: "長期採樣點", shape: "circle", color: colors.ink },
      { key: "capture", label: "捕獲紀錄", shape: "square", color: colors.unknown },
    ],
  },
  {
    zh: "風險推估",
    en: "RISK MODELING",
    layers: [
      { key: "r1", label: "L1 低風險", shape: "cell", color: colors.activity.l1 },
      { key: "r2", label: "L2 中風險", shape: "cell", color: colors.activity.l2 },
      { key: "r3", label: "L3 高風險", shape: "cell", color: colors.activity.l3 },
      { key: "r4", label: "L4 極高風險", shape: "cell", color: colors.activity.l4 },
    ],
  },
  {
    zh: "綜合比較",
    en: "COMPARISON",
    layers: [
      { key: "cmp-obs", label: "鼠跡", shape: "circle", color: colors.accent },
      { key: "cmp-bait", label: "投藥點", shape: "circle", color: colors.map.purple },
      { key: "cmp-env", label: "環境因子", shape: "square", color: colors.map.green },
    ],
  },
];

const DISTRICTS = [
  "全部行政區",
  "中正區",
  "大同區",
  "中山區",
  "松山區",
  "大安區",
  "萬華區",
  "信義區",
  "士林區",
  "北投區",
  "內湖區",
  "南港區",
  "文山區",
] as const;

const TIME_RANGES = ["最近 3 個月", "最近 1 個月", "最近 1 年", "全部"] as const;

export { DISTRICTS, TIME_RANGES };

export function legendSwatchClass(shape: LegendShape): string {
  switch (shape) {
    case "circle":
      return "rounded-full border-[1.5px] border-ink";
    case "ring":
      return "rounded-full border-[3px] bg-card";
    case "square":
      return "border-[1.5px] border-ink";
    case "cell":
      return "border border-ink opacity-55";
  }
}
