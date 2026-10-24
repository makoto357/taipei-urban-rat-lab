# Taipei Urban Rat Lab

臺北都市鼠患觀測實驗室是一個為 2026 PUMA 臺北公民科技黑客松開發的研究型原型。專案整合民眾通報、市府調查、都市環境、防治紀錄與空間資料，讓使用者從互動地圖探索臺北市的鼠跡線索及資料之間的關係。

> 本專案是研究與展演用原型，不是臺北市政府官方通報系統。地圖中的 L1–L4 是相對模型分級，不代表實際鼠口數量、感染風險或已確認的鼠群移動路徑。

## 專案目標

- 將分散的鼠跡、環境與防治資料放在同一張地圖中比較。
- 清楚區分民眾通報、政府調查、環境條件與研究資料。
- 保留資料來源、模型假設及不確定性，避免把通報量直接解讀為鼠群密度。
- 探索道路、下水道與都市土地使用對鼠跡空間分布的可能關係。
- 建立可持續擴充的公民參與及研究協作原型。

## 資料揭露：真實、衍生與模擬

「真實資料」只表示檔案來自現實的政府、社群或民眾資料源，不代表資料完整、每筆內容均已查證，也不必然代表本 repository 已取得再散布權。地圖中的政府調查、防治、捕獲與基因研究紀錄目前則為模擬資料。

### 可追溯的真實開放資料

| 地圖檔案／內容 | 上游資料源 | 本專案的處理 | 重要限制 |
| --- | --- | --- | --- |
| `taipei-boundary.geojson`、`taipei-buildings.geojson`、`taipei-roads.geojson`、`taipei-water.geojson` | [OpenStreetMap](https://www.openstreetmap.org/copyright) / Geofabrik，ODbL 1.0 | 臺北市範圍裁切、轉為 GeoJSON | 必須署名 © OpenStreetMap contributors；完整度隨區域與時間改變 |
| `taipei-dist.geojson` | [臺北市區界圖](https://data.taipei/dataset/detail?id=1601ef3a-c253-4988-b047-943d9e786143)／臺北市民政局 | 座標轉換與 GeoJSON 轉檔 | 區界不是里界、地籍界或街廓界 |
| `taipei-landuse-detail.geojson` | [臺北市都市計畫使用分區圖](https://data.taipei/dataset/detail?id=3bab0a01-7936-4218-8cb5-f74dfcb43dda)／臺北市都發局 | 座標轉換、欄位整理與 GeoJSON 轉檔 | 都市計畫分區不等於當下實際土地利用 |
| `taipei-sewer-manholes.geojson`、`taipei-sewer-pipes.geojson` | [污水下水道人孔](https://data.taipei/dataset/detail?id=e858ba08-52d5-4afb-bc6e-ed1cd9a27a3b)、[污水下水道管線](https://data.taipei/dataset/detail?id=af1e6e42-5ffc-4be0-983f-51c03d5d1b17)／臺北市工務局衛工處 | 欄位正規化、座標轉換；管線幾何依端點重建 | 示意線不一定是實際管線路徑，也不證明鼠隻可通行 |
| `taipei-stormwater-manholes.geojson`、`taipei-stormwater-pipes.geojson` | [雨水下水道人孔](https://data.taipei/dataset/detail?id=3e62c860-0753-4c79-8fe1-bcb3e0243534)、[雨水下水道管線](https://data.taipei/dataset/detail?id=83048de2-7305-45e4-b022-e04c5155978e)／臺北市工務局水利處 | 欄位正規化、座標轉換與 GeoJSON 轉檔 | 雨水與污水系統分開；幾何交叉不表示相互連通 |

上述臺北市資料集頁面標示公開並連至政府資料開放授權條款；正式對外發布前，仍須逐檔補齊實際下載日期、上游版本、checksum、完整 ETL 步驟與適用授權版本。

### 真實來源，但授權或版本紀錄尚未完整

| 檔案 | 來源性質 | 目前狀態 |
| --- | --- | --- |
| `citizen-reports.geojson` | Rat Radar／見鼠地圖的民眾通報匯出 | 非市府標準化調查；逐筆再利用、照片與描述授權尚待確認 |
| `taipei-bins.geojson` | 使用者提供的臺北市行人專用清潔箱位置資料 | 真實設施資料，但正式資料集名稱、取得日期、授權與兩份原始檔的關係待補 |
| `taipei-garbage-truck-stops.geojson` | 臺北市垃圾車停靠點資料 | 僅顯示停留超過 30 分鐘的點；上游 URL、版本、取得日期與授權待補 |

這三類檔案不是虛構資料，但在 metadata 與授權補齊前，不應對外宣稱為「已完整確認授權的開放資料」。

### 專案衍生資料（不是實地觀測）

| 檔案／結果 | 產生方法 | 不能如何解讀 |
| --- | --- | --- |
| `taipei-landuse-detail-merged.geojson` | 依專案面積與鄰接規則合併官方土地使用 polygon | 不是官方街廓，也不是鼠群生物邊界 |
| `ground-connectivity.json` | 根據道路、水域與街廓幾何計算鄰接與距離衰減 | 不是已觀測的鼠隻移動路徑 |
| `underground-connectivity.json` | 將街廓與污水／雨水人孔及管線建立計算關聯 | 不是管網實測通行性或鼠群移動證據 |
| L1–L4 風險分級 | 通報、模擬政府調查及食物來源 proxy 的規則式相對分數 | 不是實際鼠口密度、疾病風險或已驗證的 AI 預測 |

### 明確為模擬資料

以下檔案均在檔內標記 `provenance: "synthetic_mock"`；內容、行動者、日期、防治事件、捕獲與基因結果均為測試用虛構資料。部分座標是由真實土地使用 polygon 內部產生，只是為了讓 demo 點位落在合理範圍，不代表該地發生過任何紀錄。

- `mock-official-observations.json`
- `mock-control-records.json`
- `mock-sample-records.json`
- `mock-rat-individuals.json`
- `mock-genetic-samples.json`
- `mock-genetic-analyses.json`
- `mock-genetic-relationships.json`

更完整的來源、授權、更新時間與使用限制請見[資料來源清單](docs/research/data-sources.md)與[原始資產清冊](docs/research/source-register.md)。

## 目前功能

### 互動地圖

- MapLibre GL JS 全螢幕地圖、縮放與行政區定位。
- 桌機側欄與手機版 bottom sheet。
- 圖層開關、點位 hover 詳情與資料來源說明。
- 六個地圖主題：
  - 風險模型
  - 投藥紀錄
  - 環境因子
  - 鼠群研究
  - 鼠跡分佈
  - 綜合比較

### 地圖資料

- 真實來源但授權待確認的民眾鼠跡通報，以及模擬防治紀錄。
- 模擬政府調查結果：確認鼠跡、已排除；無法判定不顯示。
- 市場、垃圾桶、停留超過 30 分鐘的垃圾車停靠點。
- 公園、雜物／閒置空間。
- 污水及雨水下水道管線與人孔。
- 模擬防治、標記再捕、基因樣本及親緣關係研究資料。

地圖中的政府調查、防治、捕獲、個體與基因研究紀錄目前全部使用 mock data，不能視為真實營運資料或正式研究結論。

## 探索性風險模型

模型以土地使用 polygon component 為分析單元，將三個被勾選的基礎因子等權重平均：

1. 民眾通報
2. 政府調查
3. 食物來源

民眾通報與政府調查屬於觀測證據，可以沿地面或下水道連通圖傳遞最多 2 hops。食物來源只代表當地潛在棲地適宜性，不會向其他街廓傳遞。

```text
final_score = (
  selected propagated_citizen_score
  + selected propagated_government_score
  + selected local_food_score
) / selected_factor_count
```

各因子先依面積調整，再以正分 component 的 P95 正規化。地面移動保留距離衰減與道路阻隔；污水及雨水系統分開計算，不會在同一條路徑中混接。

| 分級 | 分數 | 說明 |
| --- | --- | --- |
| L1 | `score >= 0.75` | 相對最高 |
| L2 | `0.50 <= score < 0.75` | 相對較高 |
| L3 | `0.25 <= score < 0.50` | 相對較低 |
| L4 | `0 < score < 0.25` | 相對最低 |
| 未分級 | `score = 0` | 不填色 |

完整積分、正規化、MultiPolygon 與空間傳遞規則請參考 [`docs/data/rules.md`](docs/data/rules.md)。

## 開源套件與 AI 工具揭露

### 主要開源套件

| 套件／工具 | 用途 |
| --- | --- |
| [React](https://react.dev/)、[React Router](https://reactrouter.com/)、[TypeScript](https://www.typescriptlang.org/) | 前端 UI、路由與型別安全 |
| [Vite](https://vite.dev/)、[esbuild](https://esbuild.github.io/)、[pnpm](https://pnpm.io/) | 開發伺服器、建置與 monorepo 套件管理 |
| [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)、[GeoJSON](https://geojson.org/) | 地圖渲染、圖層與空間資料交換 |
| [Tailwind CSS](https://tailwindcss.com/)、PostCSS、Autoprefixer | 介面樣式與 CSS 建置 |
| [Firebase JS SDK](https://github.com/firebase/firebase-js-sdk)、Firebase Admin SDK、Cloud Functions SDK | 驗證、Firestore、Storage 與後端函式；Firebase 雲端服務本身為外部托管服務 |
| [Zod](https://zod.dev/)、[Sharp](https://sharp.pixelplumbing.com/) | 資料 schema 驗證與上傳圖片處理 |
| [Vitest](https://vitest.dev/)、[Playwright](https://playwright.dev/) | 單元、整合與端對端測試 |
| [GeoPandas](https://geopandas.org/)、[Shapely](https://shapely.readthedocs.io/)、[PyProj](https://pyproj4.github.io/pyproj/)、[Pyogrio](https://pyogrio.readthedocs.io/) | 離線 GIS 轉檔、投影、幾何處理與連通圖產生 |

直接 JavaScript 依賴與版本以各 `package.json` 及 `pnpm-lock.yaml` 為準；間接依賴不在上表逐一列出。上述套件各自適用其授權條款，不代表本 repository 的程式碼已因此取得同樣授權；本專案目前仍未提供統一 `LICENSE`。

### AI 輔助工具

| 工具 | 本專案用途 | 人工責任與限制 |
| --- | --- | --- |
| [Claude Artifact](https://claude.ai/artifact/5T24PXoFggoxNmokB3vbbz) | UI design canvas、頁面構圖、design tokens 與匯出素材的參考基準 | 設計稿中的日期、數值與風險文字均為示意，不當作研究證據 |
| OpenAI Codex | 協助程式實作、文件整理、資料處理腳本、測試與查核 | 所有變更仍需由專案團隊 review；AI 輸出不是資料來源、政策核定或科學驗證 |
| ChatGPT Sites | [文獻整理網站](https://taipei-urban-rat-lab-literature.ijon-hsieh.chatgpt.site)與[專案進度網站](https://rat-project-steps.ijon-hsieh.chatgpt.site/)的參考環境 | 網站整理內容仍須回到原始文獻或官方資料複核 |

本應用目前沒有在執行時呼叫生成式 AI 模型；地圖的 L1–L4 結果由程式中公開的固定規則與參數計算，不是 AI 生成的鼠患預測。

專案採 monorepo 結構：

```text
taipei-urban-rat-lab/
├── apps/
│   ├── web/                 # React／MapLibre 前端
│   └── functions/           # Cloud Functions 開發骨架
├── packages/
│   ├── contracts/           # 共用型別與資料契約
│   └── ui/                  # 設計 token 與共用 UI
├── data/
│   ├── raw/                 # 不修改的原始資料快照
│   └── mock/                # 研究與介面測試資料
├── scripts/
│   ├── gis/                 # 連通圖產生器
│   └── mock-data/           # mock data 建立與驗證工具
└── docs/
    ├── data/                # 模型與資料規則
    ├── design/              # 設計系統與參考素材
    └── research/            # 資料來源清冊
```

## 本機啟動

### 環境需求

- Node.js 20 以上
- pnpm 9.15.9

### 安裝與執行

```bash
pnpm install
pnpm dev
```

開啟 Vite 顯示的本機網址，預設通常為 `http://localhost:5173`。

### 常用指令

| 指令 | 用途 |
| --- | --- |
| `pnpm dev` | 啟動前端開發伺服器 |
| `pnpm typecheck` | 執行 workspace TypeScript 型別檢查 |
| `pnpm build` | 建立 production bundle |
| `pnpm --filter @taipei-rat-lab/web test` | 執行風險模型測試 |
| `pnpm --filter @taipei-rat-lab/web preview` | 預覽 production build |

## GIS 連通圖

地面與下水道連通圖是離線產物，前端不會在每次開啟地圖時重新進行 GIS 幾何運算。

```bash
python3 scripts/gis/build-ground-connectivity.py
python3 scripts/gis/build-underground-connectivity.py
```

執行腳本需要 `geopandas`、`shapely`、`pyproj` 與 `pyogrio`。輸出位置：

- `apps/web/public/data/ground-connectivity.json`
- `apps/web/public/data/underground-connectivity.json`

除非連通邏輯或來源資料改變，否則不需要重建。請勿直接修改原始 GIS 檔案。

## 如果市府要在上任 100 天內落地

以 2 個核心示範區為試辦規模，建議由**臺北市環保局擔任業務主責**，負責鼠跡調查 SOP、防治、複查與現場品質；由**資訊局擔任技術共同主責**，負責資料治理、平台整合、權限、資安與維運。這是政策建議，不代表任何局處已同意分工或編列預算。

### 局處與單位分工

| 單位 | 100 天試辦的主要任務 |
| --- | --- |
| 環保局、區清潔隊 | 統籌、標準化鼠跡調查、防治與複查、現場資料品質 |
| 資訊局 | 平台承接、系統介接、角色權限、資安、個資與維運方案 |
| 衛生局、健康服務中心 | 鼠媒疾病說明、風險溝通、採樣與人員安全審查 |
| 產業發展局市場處及相關商業單位 | 市場、餐飲與商圈場域協調，清潔、廚餘、防治與複查紀錄 |
| 工務局公園處、新工處、水利處、衛工處 | 公園場域執行，提供並解釋道路、雨水與污水系統資料 |
| 都市發展局、地政局 | 土地使用、街廓、建物與空間定位資料，以及使用限制說明 |
| 民政局、區公所、里辦公處 | 後巷與里鄰場域協調、市民測試與試辦宣導 |
| 研考會 | 評估與 1999 流程的銜接、進度、服務品質與成效指標 |
| 主計處、採購與法制單位 | 確認財源、預算科目、採購路徑、契約與法遵 |
| 大學／研究機構 | CMR、族群遺傳、樣本量、統計設計與研究安全的先導方案 |

### 必須取得或建立的資料

1. **標準化調查資料**：`surveyId`、地點／路線、日期、方法、調查努力量（effort）、結果、人員與資料品質狀態。
2. **防治全歷程**：斷糧、封堵、清潔、捕鼠、藥站／投藥時間、產品、操作者、移除、安全措施與複查結果。
3. **民眾與 1999 資料**：通報時間、位置精度、鼠跡類型、處理狀態與重複案件關係；公開前必須去識別化。
4. **版本化 GIS 與環境資料**：行政區、土地使用、道路、建物、公園、市場、清潔箱、垃圾暴露／清運、污水與雨水系統；每份資料保留來源、日期、授權、CRS 與版本。
5. **可比較的成效資料**：使用相同方法與 effort 的基線、防治後複查、作業量、處理時間、清潔與封堵改善狀態。
6. **研究期資料**：只在許可、安全、倫理、採購與專業合作就緒後，建立捕獲／再捕獲、個體標記、檢體、物種鑑定、個體辨識及親緣／族群結構資料。百日內不以 DNA 筆數當作必達 KPI。

### 100 天時程

| 期間 | 重點 | 可驗收產出 |
| --- | --- | --- |
| Day 1–5 | 環保局組專案小組，確定 2 個試辦區、局處窗口、資料合法性與現有契約可用性 | 試辦邊界、RACI／負責人、資料與採購清單 |
| Day 6–20 | 將既有原型調整為市民通報與市府內部紀錄試用版，完成權限、資安、欄位與訓練 | 可實測的雙平台流程與資料字典 |
| Day 21–65 | 每個試辦區至少 2 輪標準化調查，連結防治、環境改善與複查；完成 CMR／基因研究設計 | 帶 effort 的基線與後測紀錄、防治歷程、研究先導方案 |
| Day 66–85 | 整合觀察層、管理層與實驗性指標層，檢查偏差、缺漏與空間自相關 | 地圖試用版、資料說明書、模型與不確定性說明 |
| Day 86–100 | 驗收現場流程、資料品質、資安、維運與政策指標，決定續辦、調整或停止 | 第 100 天公開報告與下一年度建議 |

### 成本情境：新臺幣 500 萬元

| 類別 | 概算 | 建議主責 |
| --- | ---: | --- |
| 平台與 GIS 導入 | 600,000 | 資訊局＋環保局 |
| 標準化鼠跡監測 | 1,400,000 | 環保局＋試辦單位 |
| 環境改善與防治試辦 | 900,000 | 環保局＋場域管理單位 |
| CMR／基因研究先導 | 1,300,000 | 研究機構＋環保局 |
| 訓練與成效評估 | 350,000 | 環保局＋研考會 |
| 預備費規劃額度（依法核列） | 450,000 | 主辦機關／主計審核 |
| **合計** | **5,000,000** |  |

這是 2026-10-23 政策提案草案的規劃情境，基於 2 個示範區、約 45 天現場試辦、已有 GIS 與網站原型可沿用。**數量、單價與 500 萬元總額均未經廠商詢價、機關核價、採購審核或成本效益分析**；不含市府既有人事、常態清潔防治、全市上線與多年研究成本。實際執行前必須由環保局、資訊局、主計、採購與法制單位確認財源、預算科目、契約範圍與百日內的採購可行性。

## 研究與資料限制

- 民眾通報會受到人口、網站使用率及關注度差異影響。
- 政府調查缺少完整調查努力量時，未發現跡證不等於確認無鼠。
- 市場、垃圾桶與垃圾車停靠點只是食物可及性的 proxy。
- 道路權重、距離衰減、hop 數與人孔配對距離仍是待實測校正的 heuristic。
- 下水道位置與連通性不證明鼠隻實際可通行。
- 空間相關性不等於因果關係；沒有資料也不等於低風險或安全。

## 相關文件

- [風險模型因子積分規範](docs/data/rules.md)
- [基因關係地圖規則](docs/data/genetic-relationship-map-rules.md)
- [設計系統](docs/design/design-system.md)
- [資料來源清單](docs/research/data-sources.md)
- [資料來源清冊](docs/research/source-register.md)
- [產品、資料與實作計畫](plan.md)
- [原始需求整理](project-brief.md)

## 專案狀態

目前版本以地圖探索、資料圖層與研究方法驗證為主。帳號、正式通報流程、Firebase 權限、資料審核及文獻頁仍屬後續開發範圍；README 中的現有功能不代表已具備正式營運、醫療判斷或政府決策用途。

## 授權與資料使用

此 repository 目前未提供統一的 `LICENSE`。程式碼、設計素材及各資料集可能具有不同授權條件；引用、再散布或部署前，請先確認資料來源清冊與原始提供者的授權範圍。
