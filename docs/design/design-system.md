# Taipei Urban Rat Lab Design System v01

## 1. 定位與來源

主要視覺與元件基準為 Claude Artifact 的 Design canvas：[`TAIPEI RAT LAB`](https://claude.ai/artifact/5T24PXoFggoxNmokB3vbbz)（含 `Main`、`Map`、`Report`、`Staff`、`Login`、`Style` 六塊 artboard，`Style` 為獨立樣式規範頁）。舊版靜態參考圖 [`references/design-system-v01-reference.jpg`](./references/design-system-v01-reference.jpg) 僅作早期構圖對照，欄位命名與色票皆以 Artifact 目前版本為準。圖片與 artboard 中的示例資料、日期與「風險」文字不是產品真實資料或研究結論。

視覺方向：公共資訊、城市田野研究、報紙／檔案編輯感。頁面需保持清楚、可信、可操作，不為了復古感犧牲手機可讀性、無障礙或狀態辨識。

**同步規則**：之後 Claude Artifact 有改動，重新讀取該連結並更新本文件對應章節；本文件的色票、字體與元件規格須與 Artifact 目前版本一致。

**素材檔案**：從 Artifact 匯出、可直接在程式碼中 `import`／`<img src>` 的 SVG、PNG 存放於 [`docs/design/assets/`](./assets/)：
- `assets/icons/` — 介面圖示（`map.svg`、`report.svg`、`knowledge.svg`、`log-out.svg`、`citizen.svg`、`staff.svg`）
- `assets/map-markers/` — 地圖定位標記（`located.svg`、`moving.svg`）
- `assets/illustrations/` — 插畫（`hero-rat-map.png`，首頁 hero 用圖）

前端專案建立後，若框架需要素材放在特定目錄（如 `src/assets/`、`public/`），可直接複製或 symlink 這裡的檔案，而非重新從 Artifact 匯出；Artifact 有新版本時，覆蓋這裡的對應檔案即可。

## 2. Color tokens

| Token | Hex | 用途 |
| --- | --- | --- |
| `paper` | `#F4EEDD` | 頁面主背景 |
| `card` | `#FDF9ED` | 卡片、主按鈕文字色、次按鈕背景 |
| `ink` | `#000000` | 主要文字、邊框、primary control |
| `accent` | `#D65B37` | 主要強調、hover、圖示主色、地圖選取 |
| `accent-text` | `#B4472A` | 連結 hover、編號標籤（01/02/03）文字色 |
| `unknown` | `#D7D4CC` | 未知／disabled 狀態；必須搭配文字或紋理 |
| `muted` | `#6B6658` | 次要文字、分隔符號、disabled 文字 |

### 觀測活動色帶（非正式風險等級）

| Token | Hex | 用途 |
| --- | --- | --- |
| L1 · 低 | `#F2CC67` | 觀測活動色帶／提示框背景 |
| L2 · 中 | `#E99843` | 觀測活動色帶／footer 標籤色 |
| L3 · 高 | `#D65B37` | 觀測活動色帶（同 accent） |
| L4 · 極高 | `#9E352F` | 觀測活動色帶／按鈕 pressed 狀態 |

MVP 未經模型校準前，不把四階色帶標成 L1–L4 正式風險；可保留作未來 proposal，或經方法簽核後映射為「觀測活動」級別。「未知」狀態必須用紋理／明確文字，不能只用灰色色塊。

### 地圖／資料語意色

| Token | Hex | 用途 |
| --- | --- | --- |
| `water` | `#B8CFCA` | 水域／積水圖例 |
| `teal` | `#8CC3BD` | 地圖輔色 |
| `green` | `#3E7B66` | 食物來源圖例 |
| `purple` | `#776A97` | 已投放圖例 |

圖例點位色（見第 6 節）：民眾通報 `#D65B37`（圓點）、市府調查 `#D65B37`（方塊）、已投放 `#776A97`（圓點）、食物來源 `#3E7B66`（圓點）、積水 `#B8CFCA`（圓點）。

所有前景／背景組合需通過 WCAG 2.2 AA；accent 上的文字色在實作時以實測對比決定，不直接假設白字或黑字合格。

## 3. Typography

| 字型 | 用途 |
| --- | --- |
| `Imbue`（700） | Logo／品牌字「TAIPEI RAT LAB」 |
| `Antonio`（400/600） | 全大寫小標、編號、標籤、UI 微文案；統一加 `letter-spacing: 0.08–0.1em` |
| `Noto Serif TC`（400/700/900） | 中文標題（H1/H2）、按鈕文字、內文品牌語氣段落 |
| `Noto Sans TC`（400/500） | 表單、輸入框、介面操作文字 |

字型載入順序固定走 Google Fonts；載入失敗時需 fallback 到系統中文字型，不得破壞版面或可讀性。

| Style | Size / line-height / weight | Font | 用途 |
| --- | --- | --- | --- |
| H1 (hero) | `clamp(44px,5.6vw,76px) / 1.15 / 900` | Noto Serif TC | 首頁主標 |
| H2 | `38px / 1.2 / 900` | Noto Serif TC | 區段標題（搭配 Antonio 英文副標 14px） |
| Card title (H3) | `30px / 1.2 / 900` | Noto Serif TC | Public Desk 卡片標題 |
| Body | `16–17px / 1.8–1.9 / 400` | Noto Serif TC | 主要說明文字 |
| Label / eyebrow | `15px / 1 / 700` | Noto Serif TC | 分類標籤（如「城市觀察」） |
| Nav / button | `15–18px / 1 / 700` | Noto Serif TC | 導覽列、按鈕文字 |
| Antonio label | `11–16px / 1–1.4 / 400–600` | Antonio | 編號、標籤、英文小標，字距 8–10% |
| Input / form | `15px / 1 / 400` | Noto Sans TC | 輸入框文字 |

## 4. Foundations

- Spacing scale：`4, 8, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 72px`（元件內距多落在 `16–28px`，section 間距 `48–72px`）。
- Container：最大寬度 `1360px`，桌機側邊 padding `40px`。
- 一般 controls：高度至少 `44–48px`、主按鈕水平 padding `32–36px`、border `2px`、多數元件直角（`radius: 0`），僅圓形 pill（如登入按鈕）用 `radius: 999px`，icon 色塊圖例用 `radius: 4px`。
- Icons：主要圖示（地圖／通報／知識／登出／市民／staff）走 `48–60px` 自訂 SVG 套色（ink + accent 雙色），地圖點位符號另見第 6 節；箭頭類小圖示 `20–28px`、`2–2.2px` stroke。圖示必須搭配可存取名稱（`aria-hidden` + 文字標籤，或 `aria-label`），不能單獨承載關鍵語意。
- 觸控目標：至少 `44 × 44px`。
- 狀態資訊使用「顏色＋文字＋形狀／紋理」，不可只靠顏色。
- 分隔線語言：header 與主要 section 用 `3px solid #000000` 粗分隔線，次要 section 用 `2px`，footer 欄位內用 `1px`。

## 5. Controls 與 states

- **主按鈕（Primary）**：`#000000` 背景、`#FDF9ED` 文字、`2px solid #000000` 邊框，Noto Serif TC 700。
- **副按鈕（Secondary）**：`#FDF9ED` 背景、`#000000` 文字、`2px solid #000000` 邊框。
- **文字／編號按鈕（Text）**：無背景與邊框；編號使用 `#D65B37`，文字使用 `#000000`，hover 時只替文字加 `2px` 底線。
- **Hover**：主／副按鈕背景改為 `#D65B37`（accent），文字改為 `#FDF9ED`。
- **Pressed**：背景改為 `#9E352F`，文字 `#FDF9ED`。
- **Focus**：`#000000` 背景＋`2px solid #000000` 邊框、淺色內框，外加 `outline: 2px solid #000000; outline-offset: 3px`（雙層對比）。
- **Disabled**：背景／邊框 `#D7D4CC`、文字 `#FDF9ED`，使用 `disabled` 屬性，不可操作但保留可讀標籤。
- 實作共用 class：`.button-primary`、`.button-secondary`、`.button-text`；tabs、filter chips、地圖控制與 icon-only controls 保留各自狀態語言。
- **Inputs**：標籤恆常可見（Antonio 11px 全大寫字距 0.1em），placeholder 不取代 label。
  - Default：`#F4EEDD` 背景、`1.5px solid #6B6658` 邊框。
  - Focus：`#FDF9ED` 背景、`2px solid #000000` 邊框。
  - Error：`#F4EEDD` 背景、`2px solid #9E352F` 邊框，標籤文字含錯誤訊息並變色為 `#9E352F`。
- Checkbox、toggle、dropdown、tabs 與 filter chips 依 Artifact 語言實作，但必須使用原生語意／ARIA，並可用鍵盤操作。
- Toggle 只用於即時開關，不用來選擇市民／staff 身分或互斥表單類型。

## 6. Map language（圖例點位）

| 符號 | 色票 | 語意 |
| --- | --- | --- |
| 實心圓點 | `#D65B37` | 民眾通報 |
| 實心方塊 | `#D65B37` | 市府調查 |
| 實心圓點 | `#776A97` | 已投放 |
| 實心圓點 | `#3E7B66` | 食物來源 |
| 實心圓點 | `#B8CFCA` | 積水 |

- 圖例點位統一 `18×18px`，`1.5px solid #000000` 邊框；圓形＝事件／通報類，方塊＝官方調查類，用形狀區分來源，不只靠顏色。
- 定位中（LOCATED）與移動中（MOVING）地圖標記：橘色橢圓底（`#D65B37`）＋黑色水滴圖標＋米白內圈（`#F4EEDD`）；MOVING 版本加 `feGaussianBlur` 光暈效果表示動態。
- Unknown／insufficient data：延用 `unknown` token（`#D7D4CC`）＋虛線 outline 或斜線紋理＋明確文字，不能單獨用色塊。
- 每個符號與面狀色帶都必須在圖例中同時列出名稱、日期語意與資料來源。
- 地圖中的北箭頭與比例尺只有在地圖引擎能正確計算時才顯示，不把裝飾直接做成靜態假控制。

## 7. Components（依 Artifact 實作）

- **Header / Nav**：Logo（Imbue 700, 38px）靠左，右側導覽（Antonio 編號「01/02/03」+ Noto Serif TC 連結文字）＋黑底圓角（pill）登入按鈕；底部雙線（`3px` + `1px`）。
- **Hero**：左側文案（eyebrow 標籤 + H1 + 說明段落 + 主/副 CTA 按鈕），右側 1:1 ~ 2:1 插畫圖片（`object-fit: cover`，需提供完整 alt 文字）。
- **Public Desk card**：直角卡片，`border-top` + `border-right` 各 `2px solid #000000`，內含編號（Antonio，accent-text 色）+ 箭頭 icon（hover 可位移）+ 60px 雙色 SVG 圖示 + H3 標題 + 說明文字。
- **About section**：左側標題（H2 + Antonio 英文副標），右側長文說明段落（`line-height: 1.9`）。
- **Footer**：黑底（`#000000`）／米白文字（`#FDF9ED`），分欄導覽（`EXPLORE` / `ACCESS`，Antonio 標籤 `#E99843`），右側黃色提示框（`#F2CC67` 背景、`2px solid #E99843` 邊框）顯示「研究及展演用原型」免責聲明，需含警示 icon。
- **Area／evidence card、Control notice card、Safety alert、Empty state**：延用既有規格 —
  - Area／evidence card：區域、調查日期、觀測活動或資料涵蓋、可信度、最後更新、查看詳情。
  - Control notice card：設置時間、移除狀態、最後查核、公開安全資訊與查看紀錄；「已移除」不顯示為安全完成。
  - Safety alert：icon＋標題＋具體行動文字；可關閉時需保留之後重新查看的入口。
  - Empty state：說明「尚無資料」不等於低風險，並提供可執行下一步。

## 8. Responsive use

- 桌機首頁沿用橫向 hero 與三欄 Public Desk 卡片；手機使用單欄、CTA 優先、插圖其次。
- 地圖桌機採側欄＋地圖，手機採全螢幕地圖＋bottom sheet。
- Container 最大寬度 `1360px`，小螢幕 padding 縮減但維持左右對齊；所有元件在 360px 寬度不可產生頁面級橫向捲動，資料表改為 cards 或可理解的局部捲動。

## 9. 治理

設計 token 是介面基準，研究語意則以 `plan.md`、方法文件與已發布 schema 為準。未經專家簽核，不得因 Artifact 或參考圖已出現「低／中／高／極高風險」就直接在產品發布正式風險等級。

本文件需隨 Claude Artifact（[連結](https://claude.ai/artifact/5T24PXoFggoxNmokB3vbbz)）更新而同步修訂；每次同步請在 PR／commit 說明中註記對應 Artifact 版本或改動重點。
