# Taipei Urban Rat Lab

臺北都市鼠患觀測實驗室是一個為 2026 PUMA 臺北公民科技黑客松開發的研究型原型。專案整合民眾通報、市府調查、都市環境、防治紀錄與空間資料，讓使用者從互動地圖探索臺北市的鼠跡線索及資料之間的關係。

> 本專案是研究與展演用原型，不是臺北市政府官方通報系統。地圖中的 L1–L4 是相對模型分級，不代表實際鼠口數量、感染風險或已確認的鼠群移動路徑。

## 專案目標

- 將分散的鼠跡、環境與防治資料放在同一張地圖中比較。
- 清楚區分民眾通報、政府調查、環境條件與研究資料。
- 保留資料來源、模型假設及不確定性，避免把通報量直接解讀為鼠群密度。
- 探索道路、下水道與都市土地使用對鼠跡空間分布的可能關係。
- 建立可持續擴充的公民參與及研究協作原型。

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

- 民眾鼠跡與餌劑通報。
- 政府調查結果：確認鼠跡、已排除；無法判定不顯示。
- 市場、垃圾桶、停留超過 30 分鐘的垃圾車停靠點。
- 公園、雜物／閒置空間。
- 污水及雨水下水道管線與人孔。
- 防治、標記再捕、基因樣本及親緣關係研究資料。

部分研究與官方紀錄目前使用 mock data，不能視為真實營運資料或正式研究結論。

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

## 技術架構

- React 18
- TypeScript
- Vite
- Tailwind CSS
- MapLibre GL JS
- GeoJSON
- pnpm workspace
- Python、GeoPandas、Shapely、PyProj、Pyogrio（離線 GIS 處理）

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
