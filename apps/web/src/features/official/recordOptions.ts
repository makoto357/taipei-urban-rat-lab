import type {
  BaitActionType,
  ObservationType,
  PlaceType,
  SpeciesConfidence,
  SurveyMethod,
  SurveyResult,
  SuspectedSpecies,
} from "@taipei-rat-lab/contracts";

export const SURVEY_METHODS: { value: SurveyMethod; label: string }[] = [
  { value: "visual_inspection", label: "目視檢查" },
  { value: "trap_survey", label: "捕捉調查" },
  { value: "routine_inspection", label: "例行巡查" },
  { value: "environmental_inspection", label: "環境檢查" },
  { value: "other", label: "其他" },
];

export const SURVEY_RESULTS: { value: SurveyResult; label: string }[] = [
  { value: "evidence_found", label: "發現鼠跡" },
  { value: "no_evidence_found", label: "未發現鼠跡" },
  { value: "unable_to_assess", label: "無法評估" },
];

export const TRACE_OBSERVATION_TYPES: { value: ObservationType; label: string }[] = [
  { value: "live_rat", label: "活鼠" },
  { value: "dead_rat", label: "死鼠" },
  { value: "rat_droppings", label: "鼠糞" },
  { value: "rat_burrow", label: "鼠洞" },
  { value: "gnaw_marks", label: "咬痕" },
];

export const ENVIRONMENT_OBSERVATION_TYPES: { value: ObservationType; label: string }[] = [
  { value: "waste_accumulation", label: "垃圾堆積" },
  { value: "food_waste", label: "廚餘" },
  { value: "animal_feed_residue", label: "動物飼料殘留" },
  { value: "uncovered_bin", label: "未加蓋垃圾桶" },
  { value: "standing_water", label: "積水" },
  { value: "drainage_issue", label: "排水問題" },
  { value: "clutter", label: "雜物堆積" },
  { value: "unused_space", label: "閒置空間" },
];

export const SUSPECTED_SPECIES: { value: SuspectedSpecies; label: string }[] = [
  { value: "unknown", label: "無法判斷" },
  { value: "norway_rat", label: "溝鼠（褐鼠）" },
  { value: "roof_rat", label: "屋頂鼠（家鼠）" },
  { value: "house_mouse", label: "小家鼠" },
  { value: "shrew", label: "臭鼩（錢鼠）" },
];

export const SPECIES_CONFIDENCE: { value: SpeciesConfidence; label: string }[] = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

export const PLACE_TYPES: { value: PlaceType; label: string }[] = [
  { value: "building_interior", label: "建物內部" },
  { value: "public_space", label: "公共空間" },
  { value: "sewer", label: "下水道" },
  { value: "market", label: "市場" },
  { value: "other", label: "其他" },
];

export const BAIT_ACTIONS: { value: BaitActionType; label: string }[] = [
  { value: "bait_station_placed", label: "設置餌站" },
  { value: "bait_placed", label: "投放餌劑" },
  { value: "checked", label: "查核" },
  { value: "replenished", label: "補充" },
  { value: "removed", label: "移除" },
];
