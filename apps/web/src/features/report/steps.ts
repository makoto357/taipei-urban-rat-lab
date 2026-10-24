export const REPORT_STEPS = [
  { title: "通報類型與照片", desc: "選擇類型，照片選填" },
  { title: "地點", desc: "搜尋地址或在地圖上標記" },
  { title: "日期與確認", desc: "確認內容與公開方式後送出" },
] as const;

export type ReportType = "rat" | "bait";

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  rat: "看到老鼠／鼠跡",
  bait: "看到餌劑／餌站",
};

export const SAFETY_NOTE: Record<ReportType, string> = {
  bait: "請不要觸碰或移動餌劑、餌站，並讓寵物與小孩遠離。照片只拍餌劑、餌站或警示標示，不要拍到他人臉部或私人住宅內部。",
  rat: "請保持距離，不要為了拍照接近、追逐或觸碰老鼠。照片只拍鼠隻、死鼠或鼠跡，不要拍到他人臉部或私人住宅內部。",
};

export const DISTRICTS = [
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
