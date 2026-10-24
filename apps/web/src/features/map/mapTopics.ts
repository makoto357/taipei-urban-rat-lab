import { colors } from "@taipei-rat-lab/ui";

export type LegendShape =
  | "circle"
  | "ring"
  | "square"
  | "square-outline"
  | "triangle"
  | "cell"
  | "star"
  | "pipe"
  | "dashed-pipe"
  | "line-dot"
  | "solid-line"
  | "dashed-line";

export interface MapLayer {
  key: string;
  label: string;
  shape: LegendShape;
  color: string;
  parentKey?: string;
  indent?: boolean;
  lineWidth?: number;
  disabled?: boolean;
  /** 預設關閉（對應 Artifact 腳本中的 off: true） */
  defaultOff?: boolean;
}

export interface MapTopic {
  zh: string;
  en: string;
  note?: string;
  layerHeading?: string;
  alwaysVisibleLayerKeys?: string[];
  riskLevels?: Array<{ label: string; description: string; color?: string }>;
  riskLevelNote?: string;
  factorList?: boolean;
  factorSections?: Array<{
    id: "observation" | "environment" | "movement";
    number: string;
    label: string;
    layerKeys: string[];
    description?: string;
  }>;
  layers: MapLayer[];
}

/**
 * 資料主題與圖例遵循 docs/design/design-system.md §6；名稱只描述目前
 * 實際載入的資料；尚未校準的模型會明確標示為實驗性試算。
 */
const TOPICS: MapTopic[] = [
  {
    zh: "鼠跡分佈",
    en: "OBSERVATIONS",
    layers: [
      {
        key: "cit-rat",
        label: "民眾通報",
        shape: "circle",
        color: colors.accent,
      },
      {
        key: "gov",
        label: "市府調查點",
        shape: "square",
        color: colors.accent,
      },
      {
        key: "gov-evidence",
        label: "確認鼠跡",
        shape: "square",
        color: colors.accent,
        parentKey: "gov",
        indent: true,
      },
      {
        key: "gov-excluded",
        label: "已排除",
        shape: "square-outline",
        color: colors.accent,
        parentKey: "gov",
        indent: true,
      },
    ],
  },
  {
    zh: "投藥紀錄",
    en: "BAIT MANAGEMENT",
    note: "「已移除」不代表完全安全：現場仍可能有殘餌、非市府投藥或中毒鼠隻。",
    layers: [
      {
        key: "bait-citizen",
        label: "民眾通報",
        shape: "circle",
        color: "#F35AAF",
      },
      {
        key: "control",
        label: "市府防治紀錄",
        shape: "circle",
        color: "#D90F7D",
      },
      {
        key: "control-contraceptive",
        label: "避孕藥",
        shape: "circle",
        color: "#D90F7D",
        parentKey: "control",
        indent: true,
      },
      {
        key: "control-rodenticide",
        label: "殺鼠藥",
        shape: "square",
        color: "#D90F7D",
        parentKey: "control",
        indent: true,
      },
      {
        key: "control-unknown",
        label: "不明",
        shape: "ring",
        color: "#D90F7D",
        parentKey: "control",
        indent: true,
      },
    ],
  },
  {
    zh: "環境因子",
    en: "ENVIRONMENT",
    layers: [
      {
        key: "food-source",
        label: "食物來源",
        shape: "circle",
        color: colors.map.green,
      },
      {
        key: "market",
        label: "市場",
        shape: "square",
        color: colors.map.green,
        parentKey: "food-source",
        indent: true,
      },
      {
        key: "restaurant",
        label: "餐館",
        shape: "triangle",
        color: colors.map.green,
        parentKey: "food-source",
        indent: true,
      },
      {
        key: "trash-bin",
        label: "垃圾桶",
        shape: "circle",
        color: colors.map.green,
        parentKey: "food-source",
        indent: true,
      },
      {
        key: "garbage-stop",
        label: "垃圾車停靠點",
        shape: "star",
        color: colors.map.green,
        parentKey: "food-source",
        indent: true,
      },
      {
        key: "shelter-space",
        label: "躲藏空間",
        shape: "circle",
        color: "#58A960",
        defaultOff: true,
      },
      {
        key: "park",
        label: "公園",
        shape: "square",
        color: "#58A960",
        parentKey: "shelter-space",
        indent: true,
        defaultOff: true,
      },
      {
        key: "vacant-space",
        label: "雜物閒置空間",
        shape: "circle",
        color: "#58A960",
        parentKey: "shelter-space",
        indent: true,
        defaultOff: true,
      },
      {
        key: "drainage-system",
        label: "排水系統",
        shape: "circle",
        color: colors.map.teal,
        defaultOff: true,
      },
      {
        key: "stormwater",
        label: "雨水下水道",
        shape: "dashed-pipe",
        color: colors.map.teal,
        parentKey: "drainage-system",
        indent: true,
        defaultOff: true,
      },
      {
        key: "sewer",
        label: "污水下水道",
        shape: "pipe",
        color: colors.map.teal,
        parentKey: "drainage-system",
        indent: true,
        defaultOff: true,
      },
    ],
  },
  {
    zh: "鼠群研究",
    en: "DISTRIBUTION",
    layers: [
      {
        key: "capture",
        label: "標記再捕 CMR",
        shape: "line-dot",
        color: "#4388E8",
      },
      {
        key: "genetic-relationship",
        label: "基因關聯",
        shape: "line-dot",
        color: colors.map.purple,
      },
      {
        key: "genetic-parent",
        label: "親子",
        shape: "solid-line",
        color: colors.map.purple,
        parentKey: "genetic-relationship",
        indent: true,
        lineWidth: 7,
      },
      {
        key: "genetic-sibling",
        label: "同胞",
        shape: "solid-line",
        color: colors.map.purple,
        parentKey: "genetic-relationship",
        indent: true,
        lineWidth: 4,
      },
      {
        key: "genetic-other",
        label: "其他親緣",
        shape: "dashed-line",
        color: colors.map.purple,
        parentKey: "genetic-relationship",
        indent: true,
        lineWidth: 4,
      },
    ],
  },
  {
    zh: "風險模型",
    en: "RISK MODEL",
    layerHeading: "風險模型",
    factorList: true,
    alwaysVisibleLayerKeys: ["rat-landuse"],
    riskLevels: [
      { label: "L1", description: "相對最高", color: colors.activity.l4 },
      { label: "L2", description: "相對較高", color: colors.activity.l3 },
      { label: "L3", description: "相對較低", color: colors.activity.l2 },
      { label: "L4", description: "相對最低", color: colors.activity.l1 },
      { label: "未分級", description: "No fill" },
    ],
    riskLevelNote: "相對模型分級，不代表實際鼠口數量或感染風險。",
    factorSections: [
      {
        id: "observation",
        number: "01",
        label: "鼠跡觀測",
        layerKeys: ["risk-citizen", "risk-government"],
      },
      {
        id: "environment",
        number: "02",
        label: "環境條件",
        layerKeys: ["risk-food-source"],
      },
      {
        id: "movement",
        number: "03",
        label: "空間傳遞",
        layerKeys: ["risk-ground-movement", "risk-underground-movement"],
        description:
          "依道路與管網連通性推估觀測證據的空間影響，不代表實際鼠群移動路徑。",
      },
    ],
    layers: [
      {
        key: "risk-citizen",
        label: "民眾通報",
        shape: "circle",
        color: colors.accent,
      },
      {
        key: "risk-government",
        label: "政府調查",
        shape: "square",
        color: colors.accent,
      },
      {
        key: "risk-food-source",
        label: "食物來源",
        shape: "circle",
        color: colors.map.green,
      },
      {
        key: "risk-ground-movement",
        label: "地面移動",
        shape: "circle",
        color: colors.ink,
      },
      {
        key: "risk-underground-movement",
        label: "下水道移動",
        shape: "circle",
        color: colors.ink,
      },
    ],
  },
  {
    zh: "綜合比較",
    en: "COMPARISON",
    layers: [
      {
        key: "cmp-obs",
        label: "鼠跡觀測",
        shape: "circle",
        color: colors.accent,
      },
      {
        key: "cmp-bait",
        label: "餌劑通報與防治作業",
        shape: "circle",
        color: colors.map.purple,
      },
      {
        key: "cmp-env",
        label: "下水道環境",
        shape: "square",
        color: colors.map.green,
        defaultOff: true,
      },
    ],
  },
];

export const MAP_TOPICS: MapTopic[] = [
  TOPICS[4]!,
  TOPICS[1]!,
  TOPICS[2]!,
  TOPICS[3]!,
  TOPICS[0]!,
  TOPICS[5]!,
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

const TIME_RANGES = [
  "最近 3 個月",
  "最近 1 個月",
  "最近 1 年",
  "全部",
] as const;

export { DISTRICTS, TIME_RANGES };

export function legendSwatchClass(shape: LegendShape): string {
  switch (shape) {
    case "circle":
      return "rounded-full border-[1.5px] border-ink";
    case "ring":
      return "rounded-full border-[3px] bg-card";
    case "square":
      return "border-[1.5px] border-ink";
    case "square-outline":
      return "border-[2px] bg-card";
    case "triangle":
      return "";
    case "cell":
      return "border border-ink opacity-55";
    case "star":
    case "pipe":
    case "dashed-pipe":
    case "line-dot":
    case "solid-line":
    case "dashed-line":
      return "";
  }
}
