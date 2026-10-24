export type MockPopupKind =
  | "controlRecords"
  | "sampleRecords"
  | "captureEncounters"
  | "captureConnections"
  | "geneticSamples"
  | "geneticRelationships";

const actionLabels: Record<string, string> = {
  bait_station_placed: "設置餌站",
  bait_placed: "放置餌劑",
  checked: "查核",
  replenished: "補充",
  removed: "移除",
  correction: "修正",
  trap_placed: "設置捕鼠器",
  trap_checked: "查核捕鼠器",
  trap_removed: "移除捕鼠器",
  sample_collected: "採集檢體",
};

const value = (properties: Record<string, unknown>, key: string) => {
  const raw = properties[key];
  if (raw === undefined || raw === null || raw === "") return "";
  return String(raw);
};

const dateTime = (raw: string) => {
  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
        hour12: false,
      });
};

const translateActions = (raw: string) =>
  raw
    .split("、")
    .map((action) => actionLabels[action] ?? action)
    .join("、");

const appendRow = (
  content: HTMLElement,
  labelText: string,
  detailText: string,
) => {
  if (!detailText) return;
  const row = document.createElement("div");
  row.className = "report-popup-row";
  const label = document.createElement("span");
  label.className = "report-popup-label";
  label.textContent = labelText;
  const detail = document.createElement("span");
  detail.className = "mock-popup-detail";
  detail.textContent = detailText;
  row.append(label, detail);
  content.append(row);
};

const appendNotice = (content: HTMLElement, text: string) => {
  const notice = document.createElement("p");
  notice.className = "mock-popup-notice";
  notice.textContent = text;
  content.append(notice);
};

const popupConfig = {
  controlRecords: {
    title: "防治紀錄",
    titleClass: "control-record-title",
  },
  sampleRecords: {
    title: "研究採樣",
    titleClass: "sample-record-title",
  },
  captureEncounters: { title: "CMR 捕捉", titleClass: "capture-title" },
  captureConnections: {
    title: "CMR 捕捉關聯",
    titleClass: "capture-title",
  },
  geneticSamples: {
    title: "基因檢體",
    titleClass: "genetic-sample-title",
  },
  geneticRelationships: {
    title: "推估親緣關係",
    titleClass: "genetic-relationship-title",
  },
} satisfies Record<MockPopupKind, { title: string; titleClass: string }>;

export const createMockPopupContent = (
  kind: MockPopupKind,
  properties: Record<string, unknown>,
) => {
  const content = document.createElement("div");
  content.className = "report-popup mock-data-popup";
  const config = popupConfig[kind];
  const title = document.createElement("strong");
  title.className = `report-popup-title ${config.titleClass}`;
  title.textContent = config.title;
  content.append(title);

  if (kind === "controlRecords") {
    appendRow(content, "地點", value(properties, "addressText"));
    appendRow(
      content,
      "最新事件",
      dateTime(value(properties, "latestEventTime")),
    );
    appendRow(
      content,
      "最新作業",
      translateActions(value(properties, "latestActions")),
    );
    appendRow(content, "事件數", value(properties, "eventCount"));
    appendRow(
      content,
      "承包單位",
      value(properties, "contractorOrganizationId"),
    );
    appendRow(content, "產品", value(properties, "productDetails"));
    appendRow(content, "作業歷程", value(properties, "timeline"));
    if (properties.hasRemovedAction === true) {
      appendNotice(
        content,
        "「已移除」只代表曾執行移除作業，不代表現場已無殘餌或風險。",
      );
    }
  }

  if (kind === "sampleRecords") {
    appendRow(content, "地點", value(properties, "addressText"));
    appendRow(content, "採樣方法", value(properties, "sampleMethod"));
    appendRow(content, "採樣數", value(properties, "sampleCount"));
    appendRow(content, "捕捉數", value(properties, "captureCount"));
    appendRow(content, "採樣努力", value(properties, "samplingEffort"));
    appendRow(content, "作業歷程", value(properties, "timeline"));
    appendRow(
      content,
      "巡查關聯",
      value(properties, "linkedOfficialObservationId"),
    );
    appendNotice(content, "採樣數與捕捉次數不能直接解讀為鼠口密度或捕獲率。");
  }

  if (kind === "captureEncounters") {
    appendRow(content, "個體 ID", value(properties, "ratId") || "無法確認");
    appendRow(content, "標記碼", value(properties, "markCode") || "無");
    appendRow(content, "捕捉狀態", value(properties, "captureStatus"));
    appendRow(content, "時間", dateTime(value(properties, "capturedAt")));
    const weight = value(properties, "weightG");
    appendRow(content, "體重", weight ? `${weight} g` : "未記錄");
    const released = properties.released;
    appendRow(
      content,
      "是否釋放",
      typeof released === "boolean" ? (released ? "是" : "否") : "未記錄",
    );
    appendRow(content, "座標來源", value(properties, "locationSource"));
    appendNotice(
      content,
      "捕捉點是單次遭遇紀錄；點位差異不等同已驗證的移動路徑。",
    );
  }

  if (kind === "captureConnections") {
    appendRow(content, "個體 ID", value(properties, "ratId"));
    appendRow(content, "標記碼", value(properties, "markCode") || "無");
    appendRow(
      content,
      "前次捕捉",
      dateTime(value(properties, "fromCapturedAt")),
    );
    appendRow(content, "後次捕捉", dateTime(value(properties, "toCapturedAt")));
    appendNotice(
      content,
      "此直線只連接同一個體的兩次捕捉位置，不代表實際移動路徑、距離或行進方向。",
    );
  }

  if (kind === "geneticSamples") {
    appendRow(content, "檢體 ID", value(properties, "sampleId"));
    appendRow(
      content,
      "個體",
      properties.individualKnown === true
        ? value(properties, "ratId")
        : "未知／無法確認",
    );
    appendRow(content, "檢體類型", value(properties, "sampleType"));
    appendRow(content, "採集時間", dateTime(value(properties, "collectedAt")));
    appendRow(content, "分析狀態", value(properties, "analysisStatus"));
    appendRow(content, "保存位置", value(properties, "storageLocation"));
    appendNotice(content, "保存位置是實體檢體資訊，不是可下載檔案或公開 URL。");
  }

  if (kind === "geneticRelationships") {
    appendRow(
      content,
      "個體配對",
      `${value(properties, "ratIdA")} ↔ ${value(properties, "ratIdB")}`,
    );
    appendRow(content, "關係類型", value(properties, "relationshipType"));
    appendRow(content, "估計係數", value(properties, "relatednessCoefficient"));
    appendRow(content, "信心水準", value(properties, "confidence"));
    appendRow(content, "分析版本", value(properties, "analysisVersion"));
    appendNotice(
      content,
      "此連線為模擬的推估親緣關係，不代表鼠隻實際移動路徑。",
    );
  }

  appendNotice(content, "合成 mock 資料，僅供介面與資料模型測試。");
  return content;
};
