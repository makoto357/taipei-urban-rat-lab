# Taipei Urban Rat Lab：產品、資料與實作計畫

> **給後續執行者：**本文件目前只是一份待核准的規劃，不代表已授權開始開發。使用者核准後，才可依相依關係逐項執行。程式與資料管線採 test-first，並以 Firebase Emulator 驗證 Security Rules；研究與設計工作則先定義可觀察的驗收方法。核准前只可修訂本文件，不得開始任何 Phase。

**Goal：**建立一個 mobile-first 的台北鼠患公共資訊與協作平台，讓市民能通報鼠跡、一般使用者能理解區域風險與資料可信度、市府人員能留下可稽核的調查與防治紀錄，並以文獻和官方資料說明判斷依據。

**Architecture：**專案採 pnpm workspace monorepo：`apps/web` 是市民與市府人員共用的 React 前端，`apps/functions` 是 Firebase Cloud Functions，`packages/contracts` 共用 schema、enum、validator 與 Firestore converter，`packages/ui` 共用 design tokens 與跨頁元件。前端採 TypeScript、Tailwind CSS 與 MapLibre GL JS；Firebase Authentication 負責 Email/Password 與 Google 身分驗證，Firestore 儲存結構化營運資料，Cloud Storage 儲存照片與原始資料，Cloud Functions 負責角色核准、照片處理、公開 projection 與資料匯入。資料分成私有 submission、內部 moderation、公開 projection 三個安全域。公開點位從 Firestore 的來源別 allowlist projection 讀取；公開街廓、建物、管線與風險面則從版本化 vector tiles／PMTiles 讀取。

**Tech Stack：**pnpm workspace、React、TypeScript、Vite、Tailwind CSS、Firebase Authentication／Firestore／Cloud Storage／Cloud Functions／App Check、MapLibre GL JS、Vitest、React Testing Library、Playwright、Firebase Emulator Suite；GIS 轉換使用 GDAL／ogr2ogr，較大型圖層使用 vector tiles 或 PMTiles。

**Spec：**本文件為自包含規格與實作計畫，需求基線來自 2026-10-19 的使用者 brief，並納入 2026-10-20 的決策回覆、首頁桌機／手機稿及兩份清潔箱 JSON。正式研究報告、資料授權與既有文獻網站匯出內容尚未收到，相關結論仍標為待確認。

## 0. 結論先行

### 建議的產品定位

第一版應定位為「可說明資料來源與不確定性的鼠患觀測平台」，而不是宣稱能精準預測老鼠活動或感染地點的即時風險地圖。網站上的每一個風險結果都要同時回答：

1. 這裡觀察到什麼？
2. 資料來自誰、何時更新？
3. 資料可信度如何？
4. 為什麼被判定為這個風險級別？
5. 使用者下一步能做什麼？

### 建議的 MVP 範圍

- 公開首頁、地圖、文獻列表與通報入口。
- 市民 Email/Password 或 Google 登入、鼠跡通報、照片上傳與自己的通報紀錄。
- 經核准的市府帳號、調查／捕捉／餌站／投藥／查核／移除等事件紀錄。
- 地圖顯示經審核的市民通報、市府調查／行動、垃圾桶、人孔與下水道圖層。
- 在方法尚未經專家校準前，顯示觀測活動、資料涵蓋率、證據可信度、判斷依據與最後更新日期；通過發布門檻後才稱為「風險級別」。
- 文獻 metadata、人工整理重點與來源連結。
- MVP 直接涵蓋臺北市全域；這是產品資料範圍，不代表已承諾市府正式推行或營運量能。

### 不納入第一版

- 以個案居住地、工作地或活動地推定「感染地點」。
- 公開個別病例點位、個資、完整內部投藥細節或未審核市民照片。
- 未經專家審查就由 AI 自動發布文獻分類或健康結論。
- 從少量採樣資料推論鼠群地理邊界，或將通報密度直接等同鼠群密度。
- 為了視覺效果而把所有圖層預設同時開啟。

## 1. 目前 brief 中需要修正或補充的地方

### 1.1 科學與用語

- 「只有溝鼠會傳漢他病毒」不正確。疾管署資料指出，臺灣至少有多種齧齒類與臭鼩曾被列為漢他病毒宿主；港埠研究中也曾在亞洲家鼠與臭鼩等物種發現抗體或帶原證據。網站不得使用單一鼠種才會傳播的說法。
- 「漢他不會人傳人」應改為「大多數型別未見人傳人；安地斯病毒的人傳人極罕見，但已有報告」。
- 「在台灣致死率低」需要指明疾病型別、時間範圍與資料來源。疾管署疾病介紹列出的致死率會依漢他病毒症候群類型而不同，不宜以一句無條件描述對外發布。
- 「西班牙郵輪」語意不完整，也可能把船籍、航線、病例國籍或病毒傳播情境混在一起。只可在取得正式事件來源後改寫。
- 「臭鴝」應確認是否為「臭鼩」；「錢鼠會傳狂犬病」目前不宜直接發布。疾管署教材指出錢鼠及齧齒類在狂犬病傳播上的角色並不明顯。
- 訪談內容應標記為「訪談紀錄／待查證」，與法規、官方指引、同儕審查研究分開。誘餌偏好、投藥慣例與回訪流程尤其需要來源、地區與日期。

### 1.2 研究推論限制

- 長期鼠群採樣要估計活動範圍，至少需要採樣設計、捕獲努力量、重複採樣、物種、時間、方法與零捕獲紀錄；只有捕獲點不能穩健推估地理邊界。
- 民眾通報有通報偏差：人口多、網站使用率高或議題受到關注的地方可能看起來風險更高。應把「通報量」與「經查核鼠跡」分開。
- 病例的居住地、工作地與活動地是可能暴露位置，不等於感染地點。若沒有流行病學調查結論，不得將其中任一位置畫成確定感染點。
- 防治行動不必然代表風險已下降；行動常發生在原本問題較嚴重的地點。「已移除」只描述一個事件完成，不代表現場完全安全。
- 不同來源的空間解析度、更新頻率和調查方法不同。疊圖只能幫助探索關聯，不能直接推論因果。

### 1.3 仍待補齊的必要輸入

- 市府帳號預計使用的實際網域、正式核准人與帳號撤銷負責人。
- 未成年人是否可以建立帳號與通報，以及對應的同意／隱私文字。
- 防治紀錄是否受採購契約、場域保全或其他不得公開的限制。
- 2023–2024 漢他個案結案報告的正式檔案、授權與可公開範圍。
- 文獻網站目前的資料來源、資料格式、內容授權與匯出方式。既有網址在本次研究工具中無法讀取，因此尚未完成內容層級盤點。

上述項目不妨礙先規劃；但必須在相應實作階段開始前補齊。

## 2. 使用者與權限設計

### 2.1 不建議用 role toggle 當登入機制

首頁保留一個「登入」按鈕，進入後用兩張清楚的選項卡：

- 「我是市民」：Email/Password 或 Google 登入。
- 「我是市府／合作單位人員」：Email/Password 登入；email 驗證完成後仍須通過 domain 白名單與邀請／人工核准。

角色不是使用者自己切換的偏好，因此不應用 toggle。前端可以依角色顯示不同入口，但真正的讀寫權限必須由 Firebase custom claims、Firestore／Storage Security Rules 與後端函式執行。

### 2.2 角色與能力

| 角色 | 可做的事 | 不可做的事 |
| --- | --- | --- |
| `public` | 看公開首頁、公開地圖、已發布文獻與方法說明 | 看原始通報、精確敏感點位、未審核照片 |
| `citizen` | 建立通報、看自己的通報與處理狀態 | 自行提高可信度、直接發布地圖資料、看他人個資 |
| `official` | MVP 共用的市府／受委託人員權限：建立調查／防治事件、審核通報、發布核准的公開資料 | 核准其他 official、修改安全規則、刪除稽核紀錄 |
| `admin` | 管理邀請、角色、單位、資料來源與模型版本 | 不可繞過稽核紀錄直接改寫歷史事件 |

MVP 先不在 UI 區分 `official` 與 `reviewer`，符合「市府人員先採同一種權限」的決策；但每次動作仍記錄 actor、所屬機關與事件種類。`admin` 只負責帳號與系統治理，不等於公衛內容簽核人。若正式上線後需要職務分離，再把 official capability 拆成 `field-worker`、`reviewer`、`publisher`，不必搬移既有資料。

### 2.3 市府 email 白名單

Firebase Console 的「Authorized domains」是網站可進行登入的來源網域，不是使用者 email 網域白名單。市府身分建議採以下流程：

1. 市民可用 Email/Password 或 Google 建立帳號；市府／合作單位人員使用 Email/Password。
2. Email/Password 帳號必須完成 email verification；新帳號預設為 `citizen`，申請市府身分時另記錄 `pending` membership。
3. 管理員先建立一次性邀請或匯入核准 email 清單。
4. 後端正規化 email、解析完整 domain，驗證 `email_verified`、domain 白名單與邀請／人工核准紀錄。
5. 核准後由 Admin SDK 設定 `official` custom claim；`admin` 只能由既有 admin 透過受保護流程指派，不可只靠 domain 自動升級。
6. Membership 另記錄 `organizationId`、`jurisdictions`、`assignments`、有效期限、核准者與承包商身分；後端每次高權限操作都檢查其資料範圍，不只看 `official` claim。
7. 離職、調職或合作結束時同步停權 profile、撤銷 refresh tokens 與 custom claim，並記錄操作者、理由與時間。Admin SDK handler 也必須自行做授權，因為它不受 Firestore Rules 保護。
8. 執行審核／發布的 `official` 與 `admin` 使用 MFA 或近期重新驗證；實際負責單位、SLA 與代理機制由 Phase 0 定義。

只檢查 `email.endsWith('@domain')` 的前端作法不構成權限保護。

### 2.4 臺北市可能的 official 單位與 MVP 責任矩陣

官方資料顯示臺北市鼠害防治採跨局處分工，並非只有衛生局。以下是規劃建議，正式 owner、核准與撤權流程仍須由市府確認：

| 候選單位 | 官方可查到的相關職掌 | 平台 MVP 建議 |
| --- | --- | --- |
| 臺北市環保局水質病媒管制科 | 病媒防治、環境用藥與鼠害防治；市府鼠患會議由環保局統籌幕僚 | 平台營運／資料治理候選 owner；公共環境防治資料 owner |
| 臺北市衛生局 | 漢他病例疫調、公衛衛教及病例住家／工作地周邊防疫協作 | 公衛文字與疾病資料使用方式的簽核候選；MVP 不匯入個案點位 |
| 臺北市市場處 | 市場清消、環境管理及委外病媒防治 | 市場場域防治紀錄 owner；受委託廠商可用同一 `official` 介面但保留 contractor 標記 |
| 公園路燈工程管理處 | 公園植栽、鼠洞與場域管理 | 公園場域事件填報／查核候選單位 |
| 民政局、區公所與里鄰系統 | 社區環境清潔與跨單位通報協作 | 轄區通報轉介與現勘候選單位 |
| 衛工處、水利處等下水道管理單位 | 污水／雨水下水道與人孔場域管理 | 設施圖層 owner；是否能看或填防治紀錄另行核准 |
| 都發局、建管處 | 建築、拆除與施工場域的防鼠要求 | 建物／工地事件或資料來源候選單位 |

疾管署是中央傳染病主管機關與研究／通報規範來源；日常平台 official 應以臺北市權責機關為主。除非另有正式資料共享與操作協議，不把疾管署人員預設成此平台的營運帳號。

建議由單一 platform admin 核准與撤銷所有 official，單位聯絡人只提出名單。即使 MVP 權限相同，`memberships` 仍必填 `organizationId`、`agencyType`、`employmentType: government | contractor`、`approvedBy`、`validUntil` 與 `revokedAt`，避免日後無法查明「誰以哪個單位身分做了什麼」。

## 3. 資料模型

### 3.1 共通原則

- 問卷文件保留 `observedAt`（觀察時間）、`createdAt`（系統建立時間）與 `updatedAt`（最後更新）；防治紀錄中每個 event 另保留自己的 `time`。目前無伺服器端草稿送出流程，因此不另存 `submittedAt`。
- 問卷地點以 WGS84 的 `latitude` 與 `longitude` 儲存，地址與行政區放在同一文件的獨立欄位。交給 MapLibre 時轉成 GeoJSON Point，座標順序固定為 `[longitude, latitude]`；公開資料另產生獨立 projection，依當時政策輸出精確點、區域化座標或彙整網格，絕不直接公開原始文件。
- `riskLevel` 與 `confidenceLevel` 必須是不同欄位。
- 不覆寫防治歷史；`controlRecords.events` 只能經授權流程新增，不就地刪除或改寫舊 event，修正另追加 `correction` action。
- 系統產生欄位只能由後端寫入，不能信任瀏覽器傳來的 role、confidence、公開狀態或風險分數。
- 所有公開內容都要有 `sourceUpdatedAt`、`publishedAt`、`modelVersion`／`methodVersion` 與可閱讀的 `reasonCodes`。
- Firestore 沒有欄位級讀取保護；含 UID、地址或精確座標的文件絕不與公開 projection 共用 collection。
- Client 不可直接改寫或刪除既有防治 event；新增 event 由授權後端以 transaction 寫入並記錄 actor 與 server timestamp。重要 audit log 另匯出到具保留政策的 log sink／不可變備份。

### 3.2 Firestore collections

通報頁依登入角色顯示不同問卷：`citizen` 只看到「市民通報鼠跡」；`official` 與 `admin` 看到兩個 tab：「鼠跡調查」與「防治／投藥紀錄」。前端顯示不是安全邊界，Firestore 與 Storage Security Rules 仍必須依 custom claim 限制各 collection 的讀寫。

#### `users/{uid}`

```ts
type UserProfile = {
  role: 'citizen' | 'official' | 'admin'
  status: 'pending' | 'active' | 'suspended' | 'revoked'
  displayName: string
  emailNormalized: string
  emailVerified: boolean
  authProviders: Array<'password' | 'google.com'>
  organizationId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

`role` 與 `status` 不允許一般 client 寫入。Custom claim 用於快速授權，Firestore profile 用於顯示與稽核；兩者由後端同步。

Firebase Authentication 是 uid、email、登入供應商、email verification 與密碼憑證的來源；密碼及其雜湊不存入 Firestore。Firestore 只保存 profile、membership、單位、狀態、核准／撤銷資訊與 audit log。真正讀寫授權由 Firestore／Storage Security Rules 檢查 `request.auth.token.role`，不得只依 Firestore 中可顯示的 role 或前端畫面判斷。

#### `memberships/{uid}`

```ts
type Membership = {
  role: 'citizen' | 'official' | 'admin'
  status: 'pending' | 'active' | 'suspended' | 'revoked'
  emailDomain: string
  organizationId?: string
  agencyType?: string
  employmentType?: 'government' | 'contractor'
  jurisdictions: string[]
  assignments: string[]
  invitedByUid?: string
  approvedByUid?: string
  approvedAt?: Timestamp
  validUntil?: Timestamp
  revokedAt?: Timestamp
  revocationReason?: string
  updatedAt: Timestamp
}
```

一般 client 不得建立或修改 membership。市民首次完成登入後，由受保護後端建立 `citizen/active`；official 申請先建立 `citizen` profile 與 `official/pending` 審核狀態，核准後才更新 membership、custom claim 與 audit log。Admin 角色只能由既有 admin 指派。

#### `citizenReports/{reportId}`

```ts
type CitizenReport = {
  reporterId: string
  observedAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
  location: {
    latitude: number
    longitude: number
  }
  addressText: string
  district: string
  blockId?: string | null
  blockVersion?: string | null
  description?: string
  photoPaths: string[]
  schemaVersion: 1
}
```

`observedAt` 由市民填寫；`createdAt` 與 `updatedAt` 使用 Firebase server timestamp。`photoPaths` 直接保存 Firebase Storage path，不另建 media ID 關聯。市民通報不儲存 observation category、數量、公開狀態或審核狀態。

照片在 MVP 為選填；若選擇上傳，只接受鼠類、死鼠或鼠跡相關照片，不接受人像。介面應提醒使用者不要為了拍攝接近、追逐或接觸老鼠，也不要拍入他人臉部或私人住宅內部。自動檢測只能輔助攔截，發布前仍需人工審核。

#### `officialObservations/{observationId}`

```ts
type SurveyMethod =
  | 'visual_inspection'
  | 'trap_survey'
  | 'routine_inspection'
  | 'environmental_inspection'
  | 'other'

type SurveyResult =
  | 'evidence_found'
  | 'no_evidence_found'
  | 'unable_to_assess'

type ObservationType =
  | 'live_rat'
  | 'dead_rat'
  | 'rat_droppings'
  | 'rat_burrow'
  | 'gnaw_marks'
  | 'waste_accumulation'
  | 'food_waste'
  | 'animal_feed_residue'
  | 'uncovered_bin'
  | 'standing_water'
  | 'drainage_issue'
  | 'clutter'
  | 'unused_space'

type SuspectedSpecies =
  | 'norway_rat'
  | 'roof_rat'
  | 'house_mouse'
  | 'shrew'
  | 'unknown'

type OfficialObservation = {
  reporterId: string
  organizationId: string
  observedAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
  location: {
    latitude: number
    longitude: number
  }
  addressText: string
  district: string
  blockId?: string | null
  blockVersion?: string | null
  surveyMethod: SurveyMethod
  surveyResult: SurveyResult
  observationTypes: ObservationType[]
  suspectedSpecies?: SuspectedSpecies
  speciesConfidence?: 'low' | 'medium' | 'high'
  linkedCitizenReportId?: string
  description?: string
  recommendedActions?: string
  photoPaths: string[]
  schemaVersion: 1
}
```

`reporterId` 表示建立該筆調查的 official Firebase uid。`linkedCitizenReportId` 為 optional 且只關聯單一市民通報。`norway_rat` 對應溝鼠／褐鼠（*Rattus norvegicus*）。`no_evidence_found` 只能表示「本次調查未發現證據」，不能解讀成「此處沒有鼠患」。

#### `media/{mediaId}`

```ts
type MediaRecord = {
  ownerUid: string
  reportId?: string
  storagePath: string
  originalContentType: string
  processedContentType?: 'image/webp' | 'image/jpeg'
  originalBytes: number
  processedBytes?: number
  width?: number
  height?: number
  scanStatus: 'pending' | 'clean' | 'rejected'
  moderationStatus: 'private' | 'approved_public' | 'rejected'
  exifStripped: boolean
  createdAt: Timestamp
}
```

照片先放私有 staging path；原檔保持私有。處理函式在受限環境檢查 magic bytes、像素與解碼資源上限，重新編碼、移除 EXIF／GPS，再經人臉／門牌／車牌等辨識資訊審核後，建立獨立 sanitized derivative。公開服務不得沿用 staging download token，撤回／更正時要能使公開 URL／CDN 快取失效。

#### `controlRecords/{recordId}`

```ts
type PlaceType =
  | 'building_interior'
  | 'public_space'
  | 'sewer'
  | 'market'
  | 'other'

type ActionType =
  | 'inspection'
  | 'trap_placed'
  | 'bait_station_placed'
  | 'rodenticide_placed'
  | 'contraceptive_placed'
  | 'checked'
  | 'replenished'
  | 'removed'
  | 'environment_cleaned'
  | 'entry_point_sealed'
  | 'correction'

type ControlEvent = {
  time: Timestamp
  actions: ActionType[]
  photoPaths: string[]
  product?: {
    productName?: string
    productType?: string
    activeIngredient?: string
    registrationNumber?: string
  }
  notes?: string
}

type ControlRecord = {
  reporterId: string
  organizationId: string
  contractorOrganizationId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  location: {
    latitude: number
    longitude: number
  }
  addressText: string
  district: string
  blockId?: string | null
  blockVersion?: string | null
  placeType: PlaceType
  linkedOfficialObservationId?: string
  linkedCitizenReportId?: string
  events: ControlEvent[]
  schemaVersion: 1
}
```

`events` 以時間記錄每次行動，同一次到場可同時有多個 actions。照片放在所屬 event 的 `photoPaths`，因此自然對應該 event 的 `time`，不另存照片時間 mapping。最後查核時間可由最新一筆含 `checked` 的 event 推導；「已移除」只表示有 `removed` action，不代表現場已無殘餌、其他來源餌劑或中毒鼠隻風險。

MVP 先使用單一文件內的 event array。若未來單一紀錄的長期追蹤量增大，再遷移為 `controlRecords/{recordId}/events/{eventId}` subcollection，避免接近 Firestore 單一文件 1 MiB 上限。

#### 其他 collections

- `samplingEvents`：物種、方法、努力量、樣點、採樣期間、捕獲／零捕獲、檢驗結果與資料來源。
- `sourceDatasets`：資料集名稱、機關、授權、原始 URL、座標系統、更新頻率、最後同步、checksum、ETL 版本。
- `evidenceRuns`／`riskRuns`：run metadata、輸入資料版本、method／model checksum、有效期間、產製與發布狀態；大型結果 geometry 存 immutable tile artifact。
- `activePublications`：每類公開圖層目前使用的 artifact／run pointer；rollback 只切換指標，不改寫歷史結果。
- 來源別公開 projection（例如 `publicCitizenObservations`、`publicControlNotices`）：只含逐 schema allowlist 核准的最小欄位；不含 uid、原圖路徑、精確病例點或敏感營運細節。市民通報 MVP 暫定經審核後公開精確點，另存 `publicPrecision: exact | area | grid` 與 `precisionReason`，讓 reviewer 可因私領域或辨識風險降為區域／網格，日後也能整批調整政策。
- `literature`：來源 metadata、摘要、主題標籤、證據等級、公開狀態、分析版本。
- `auditLogs`：角色變更、審核、發布、撤回與模型變更；一般使用者不可寫入或刪除。

### 3.3 照片大小建議

- 每次最多 3 張。
- Client 選檔上限每張 8 MB；選擇後將長邊縮至 2,048 px，目標輸出每張小於 2 MB。
- Storage Rules 的硬上限設為每張 8 MB，並限制允許的 MIME type；後端仍需檢查 magic bytes，不能只信任副檔名或 `contentType`。
- 支援 JPEG、PNG、WebP；若要支援 iPhone HEIC／HEIF，需明列為後端轉檔需求，不假設所有瀏覽器可直接預覽。
- 行動網路中提供上傳進度、取消、重試與壓縮失敗提示；送出通報前要等照片處理狀態確定。

### 3.4 投藥／餌站公開與寵物安全建議

不建議一律延遲數天公開。環境部指引要求公共場所施作應警示並避免兒童與寵物接觸，也鼓勵公開防治動態；臺北市環保局亦曾表示願意精確標示投餌位置。延遲的合理目的只應是避免「尚未放置就先顯示」或現場回報尚未驗證，而不是隱藏已存在的安全風險。

- 公開時點：現場完成設置、位置與防護方式驗證後盡快同步；MVP 的營運目標可設「當班結束前，最遲 4 小時內」，正式 SLA 仍由 owner 確認。
- 空間精度：有固定、加蓋、標示且座標可信的市府餌站可顯示精確點；室內、私人場域、散放藥餌或座標不可靠時只顯示 25–50 公尺區域／場域名稱。不要在實際施作前公開工作路線。
- 公開欄位：由 events 推導的首次處置時間、處置類型（捕鼠籠／餌站／藥劑處置／生育控制）、目前狀態、最後查核時間、寵物安全提醒、資料來源與最後更新。
- 條件公開欄位：產品許可證字號與有效成分可放在展開的安全詳情，供疑似誤食時提供獸醫判斷；是否公開濃度與商品名由衛生／環保專業人員確認。
- 不公開欄位：投放數量、庫存地點、承攬人個資、內部設備識別、下一站工作路線與未驗證草稿。
- 安全訊息：提醒飼主繫繩、勿觸碰餌站或死鼠；疑似誤食時先拍下現場／產品標示並立即聯絡獸醫。清楚註明地圖只涵蓋已登錄的市府／合作單位作業，無法代表現場不存在私人或未登錄藥餌。

這種做法在寵物安全與妨礙作業之間取得平衡：安全資訊在施作後即公開，但不暴露未來路線、庫存或非必要營運細節；若發生破壞事件，可按場域將精度降級，而不是全市一律延遲。

## 4. 地圖資料與圖層方案

### 4.1 現有資料能否用於 MapLibre

可以，但要先做 schema 與座標系統檢查：

- 污水下水道管線已有官方開放資料中的 GeoJSON 版本，可直接作為原型資料；大型線資料正式上線時應轉 vector tiles／PMTiles。
- 雨水下水道人孔目前官方頁面列為 CSV，欄位包含 X、Y 座標；搜尋結果顯示欄位曾以 `X_97`、`Y_97` 命名，實作前須確認是 TWD97／TM2（常見 EPSG:3826），再轉為 MapLibre 使用的 WGS84（EPSG:4326）。不能直接把 X／Y 當經緯度。
- 兩份清潔箱 JSON 都是物件陣列，欄位為 `行政區`、`地址`、`經度`、`緯度`、`備註`；座標以字串保存，數值範圍看起來是 WGS84 經緯度，可轉為 GeoJSON `FeatureCollection<Point>`，但正式匯入仍需來源方確認 CRS。
- `7226e5cdf0e98ffe5f7084a53bc45eba_export.json` 有 130 筆、涵蓋臺北市 12 區、無缺漏座標；有 10 組重複座標，共涉及 20 筆。部分 `備註` 是「3處、7處、14處」等數量，因此該點可能是聚合地點，不能直接把 1 row 解讀為 1 個清潔箱。ETL 應另解析 `facilityCount`，解析失敗則保留原文。
- `4fa213b72aab66e0c80e4c52436ad5ba_export (2).json` 有 681 筆、涵蓋 11 區，資料中沒有北投區；有 1 組重複座標，共 2 筆。其中「指南路3段40巷8-4號對面停車場」的經度為 `?121.595369`，需在 ETL 移除前綴並留下 validation warning，不能靜默更改。
- 兩份檔案都沒有穩定 ID、資料日期、來源版本與授權欄位。正式圖層需建立 deterministic `sourceFeatureId`、保留原始 row index、加入 dataset manifest，並釐清兩份資料是互補、不同年度或不同清潔箱類型；在釐清前不可直接合併計數。
- API URL 與資料集頁面可能改版；`sourceDatasets` 要保留 resource URL、擷取日期與 checksum，ETL 失敗時保留最後一版成功資料並顯示資料日期。

### 4.2 SHP 不建議直接存進 Firestore

- 小型、低頻更新圖層：SHP 先轉 WGS84 GeoJSON，簡化 geometry 後放在 Cloud Storage／Hosting；Firestore 只存 metadata 與版本。
- 建物、街廓、下水道等大型或複雜圖層：轉成 Mapbox vector tiles 或 PMTiles，放 Mapbox Tileset／Cloud Storage＋CDN；不要把整份 GeoJSON 塞入單一 Firestore document。Firestore 單一 document 上限為 1 MiB，逐 feature 儲存也會造成大量讀取與成本。
- 需要逐筆後台編輯的營運資料才放 Firestore；靜態底圖與行政邊界使用 tile-based storage。
- 轉檔流程保留原 SHP、`.prj`、欄位字典、來源授權與 checksum，並記錄 `sourceCrs`、`targetCrs`、簡化容差與產製日期。
- MVP 在 Phase 0 依預算與授權二選一：Mapbox-hosted tileset，或 Cloud Storage／CDN 上的 PMTiles。選 PMTiles 時必須驗證 CORS、HTTP range requests、cache headers 與撤回／換版；兩者都以 manifest 保存 `version`、`checksum`、`bbox`、`sourceDate` 與 rollback target。

### 4.3 圖層資訊架構

方法尚未校準時，預設只開「觀測活動」與「最近已查核鼠跡」；通過發布門檻後才可改名為「綜合風險」。其餘由圖層面板選擇：

| 群組 | 資料 | 呈現方式 | 顯示規則 |
| --- | --- | --- | --- |
| 綜合判讀 | evidence／risk tile artifact | 街廓／六角網格分級色塊 | 顏色表達活動或已核准風險；斜線或透明度表達低涵蓋／低可信度 |
| 鼠跡 | 市民通報、市府調查、採樣 | 低 zoom 聚合圓；高 zoom 分類符號 | 來源用形狀，查核狀態用描邊，時間衰減用透明度 |
| 防治行動 | 捕鼠籠、餌站、投藥、查核、移除 | 分類 icon＋時間軸 | 依 3.4 節顯示精確點或區域；「移除」不可用安全綠勾 |
| 環境因子 | 攤販、清潔箱、垃圾熱點 | 小型 POI 或密度網格 | 不以紅色暗示單一設施造成鼠患 |
| 地下設施 | 污／雨水下水道、人孔 | 線與點 | 只在較高 zoom 顯示，避免壓過主要資訊 |
| 公共衛生 | 去識別病例／檢驗彙整 | 行政區或網格統計 | 小樣本抑制，不顯示個案點，不宣稱感染地 |

互動細節：

- 圖例固定說明「風險」與「可信度」是不同維度。
- 每個 popup／bottom sheet 顯示來源、觀察日期、發布日期、驗證狀態、判斷理由與資料限制。
- 風險色彩不可只靠紅黃綠；搭配文字、圖示與紋理，並通過色盲與對比測試。
- 手機版使用底部抽屜顯示圖層、篩選器與點位詳情；地圖上保留足夠大的縮放、定位與關閉按鈕。
- 同時開啟過多圖層時提示使用者，並提供「重設為建議檢視」。
- 熱圖只用於探索大量同質點，不能把熱圖顏色直接標成風險。正式風險圖優先使用有明確分母與方法的網格／街廓分級。

### 4.4 可參考的網站案例

1. [NYC Rat Information Portal](https://a816-dohbesp.nyc.gov/IndicatorPublic/rats/)：最接近本題；可參考地址搜尋、最近一次查核狀態、歷史紀錄、過久資料顯示灰色，以及「通報後查核」與「主動調查」並存的說明方式。
2. [Mapbox：GeoJSON 點位聚合](https://docs.mapbox.com/mapbox-gl-js/example/cluster/)：可參考低 zoom 聚合與高 zoom 展開點位。
3. [Mapbox：vector tile source](https://docs.mapbox.com/mapbox-gl-js/example/vector-source/)：適合建物、街廓和下水道等大型圖層。
4. [UN OCHA COVID-19 Map Explorer 案例](https://www.mapbox.com/showcase/un-ocha)：可參考多資料集疊加、只載入必要指標與 vector／raster tiles 分工。
5. [DataKind／Mapbox 案例](https://www.mapbox.com/showcase/datakind)：可參考區域邊界、CSV 點位與社區尺度指標的組合，但其商業成果數據不應直接推論本專案成效。

## 5. 風險與資料可信度模型

### 5.1 先分三個訊號

MVP 先輸出 `observedActivity`（觀察到的鼠跡／處置訊號）、`dataCoverage`（這個時空單元被調查得多完整）、`evidenceLevel`（證據能否支持判讀）。只有在分析單元、分母、採樣努力量、通報人口偏差、缺資料規則、權重、門檻與外部校準方法都經專家簽核後，才新增 `riskLevel`。高活動可以低可信；看似低活動也可能只是低涵蓋率。

### 5.2 MVP 的可說明規則

先採規則式、可版本化、經專家核准的觀測證據模型，不在第一版使用不透明機器學習，也不在未校準前把輸出命名為正式風險：

- 活動證據：最近的已查核活鼠、糞便、洞穴、咬痕與採樣結果。
- 時間：越近期權重越高；不同資料源使用不同有效期間。
- 重複性：不同日期或獨立來源的重複觀察提高可信度。
- 調查品質：市府查核、設計完善的採樣高於單次未查核通報。
- 暴露／吸引因子：垃圾、食物來源、環境條件只能當輔助因子，不可單獨宣告鼠患。
- 防治行動：顯示為處置狀態；只有後續查核才能支持風險下降，不能在投藥／移除當下直接扣分到「安全」。
- 疾病資料：只有取得合法、去識別、空間與時間尺度足夠的彙整資料後才納入；否則不進 MVP 分數。

每一個地圖區塊都要輸出 `reasonCodes`，例如「30 日內 2 筆已查核鼠跡」、「最近一次調查距今 8 個月」、「只有未查核市民通報」。Phase 0 必須產出可簽核的 `risk-methodology.md`：固定分析單元與分母、採樣／通報涵蓋率、缺資料語意、權重與門檻、時間衰減、校準資料、假陽性／假陰性處理、固定測試案例與發布門檻。未通過門檻時，產品只顯示觀測證據。

### 5.3 可信度建議

- `high`：近期、可重複、方法清楚的市府查核／標準化採樣，或多個獨立來源互相支持。
- `medium`：照片或細節充分、可定位但尚未現場查核，或資料已過一段時間。
- `low`：單次自述、位置模糊、缺少照片、時間不確定或高度可能重複。
- `unrated`：尚未處理；UI 不得把它顯示成低風險。

這些只是初始產品規則，不是已核准的流行病學標準。

### 5.4 版本化與回復

每次運算建立 immutable `runId`，記錄輸入 dataset versions、程式／規則 checksum、分析期間、建立者、結果 artifact 與 `draft → reviewed → published → withdrawn` 狀態。前端只讀 `activePublications` 指向的已發布版本；回復時切換 pointer，不覆寫舊 run。每個公開 tile artifact 都能由 manifest 與輸入快照重現。

## 6. 頁面與 UI／UX 規劃

### 6.1 全站導覽

- 桌機：左側 logo；中央「地圖、通報、文獻」；右側登入／個人選單。使用目前頁面底線、背景或 `aria-current` 明確標示 active tab。
- 手機：頂部精簡品牌列＋底部導覽「首頁、地圖、通報、文獻」；登入與市府功能放個人選單。
- 正式名稱統一用「文獻」，修正 brief 中的「文憲」。
- 公開內容不要求登入；只有送出通報、查看自己的紀錄與工作人員功能才要求登入。

### 6.2 首頁

已檢視 1896 × 1634 桌機稿與 572 × 1634 手機稿。現稿的品牌辨識強、黑／橘主次 CTA 清楚，桌機三欄與手機直列入口的響應式方向合理；手機把 CTA 放在插圖之前，也符合主要任務優先。建議保留報紙／研究檔案式視覺語言，再調整以下問題：

- 桌機 header 的「工作人員登入」改為中性的「登入」，進入後才顯示「市民」與「市府／合作單位」兩張入口卡；手機漢堡選單內也要保留同一流程，不能讓市民誤以為沒有帳號入口。
- Header、三張入口卡、研究方法、參考文獻與「資料來源與限制」目前都使用相似箭頭，但可點範圍不明。整張 nav item／card／row 都可點，提供 hover、focus-visible、pressed、active 狀態，觸控目標至少 44 × 44 px。
- 大量雙線分隔很有識別度，但手機上容易形成視覺噪音；雙線留在 header、主要 section 與 footer，卡片內改用單線或留白建立層級。
- 中文 display serif 適合標題，內文與小字需換成高可讀字型並設定足夠行高；手機的英文 eyebrow、圖片說明和 footer links 不可小到難讀。
- 地圖插圖可能被誤認為真實風險圖；現有「城市觀測示意」圖說應放大並加上「非即時資料」，直到接入正式圖層。
- 首屏價值主張應配合 MVP 用語，把「鼠患資訊」具體寫成「鼠跡觀測與防治紀錄」，避免暗示已有完整風險模型。
- 桌機三張入口卡可維持同列；手機直列項目要讓標題、說明與箭頭保持共同基線，避免只有箭頭可點。
- 手機漢堡展開後需有清楚的關閉按鈕、焦點鎖定、Esc／返回關閉與 `aria-expanded`；桌機和手機都要清楚標示目前頁面。

建議首頁內容順序：

1. Hero：一句明確價值主張＋簡短限制說明；主 CTA「探索鼠患地圖」，次 CTA「通報鼠跡」。
2. 即時摘要：最後更新、近期已查核鼠跡數、資料涵蓋期間；沒有可靠資料時不顯示看似精確的統計。
3. 三張入口卡：地圖、通報、文獻；整張卡可點擊，具 hover／focus／pressed 狀態與動詞型文案。
4. 「如何判讀」：用小範例說明風險、可信度與資料日期。
5. Footer：資料來源、方法、隱私權、無障礙、聯絡方式與版本。

登入不放市民／市府 toggle；使用單一登入按鈕開啟角色入口。所有可點擊元素要有一致的顏色、游標、focus ring 與觸控尺寸，不能只依賴卡片陰影讓使用者猜。

### 6.3 通報頁

- 先選「市民通報」或由已核准 official 進入「工作紀錄」；未具 official claim 的帳號不顯示可自行選角色的入口。
- 市民流程採 3 步：`鼠跡與照片 → 地點 → 日期與確認`。
- 地點步驟提供：地址／地標搜尋、地圖拖曳 pin、使用目前位置。顯示定位精度，禁止在使用者尚未確認前自動送出 GPS。
- 照片上傳在選檔後立即顯示壓縮結果、上傳進度與刪除按鈕。
- 成功頁顯示通報編號、審核狀態與公開前會進行去識別處理。
- Official 表單依 `eventType` 顯示相關欄位；「投放」、「查核」、「補充」、「移除」是不同事件，不用一個狀態欄覆寫歷史。

### 6.4 地圖頁

- 桌機左側為搜尋、時間、來源、驗證狀態與圖層；右側地圖。
- 手機全螢幕地圖＋底部抽屜；點選 feature 後抽屜顯示詳情，不用窄小 popup。
- 預設時間範圍、資料日期與資料限制在首屏可見。
- 提供「這個風險怎麼算」入口，展開因子、可信度與方法版本。

### 6.5 文獻頁

- 列表支援主題、年代、文獻類型、證據等級與「是否與台北直接相關」篩選。
- 每篇顯示題名、作者／機構、年份、原始連結、人工整理的關鍵重點、整理者與最後更新。
- 摘要與重點不是原文全文；保留頁碼／段落定位並遵守著作權與來源條款。

### 6.6 Design system 基準

使用者提供的 `UI reference.jpg` 已保存為 `docs/design/references/design-system-v01-reference.jpg`，並轉寫為 `docs/design/design-system.md`。後續頁面設計以該文件的 paper／ink／accent／teal 色彩、Noto Sans TC＋IBM Plex Mono 字體分工、44px controls、4–32px spacing、2px icon stroke、表單 states、地圖符號、卡片與警示語言為共同基準。

參考圖中的 L1–L4 是 visual proposal，不會凌駕第 5 節的方法門檻。MVP 仍顯示「觀測活動／資料涵蓋／證據可信度」；正式風險模型通過校準與簽核後，才可啟用對應的風險名稱與色帶。任何頁面若需要偏離 design system，須在設計稿註明原因，並仍符合 WCAG 2.2 AA、鍵盤操作與 44 × 44px 觸控目標。

## 7. 文獻儲存與人工整理

### 7.1 是否把文獻連結存 Firestore

建議存，而且不只存 URL。Firestore 適合保存可查詢的 metadata、人工標籤、摘要與審核狀態；完整 PDF／HTML 快照若有合法保存必要，放 Cloud Storage，Firestore 只存路徑、checksum 與授權資訊。

```ts
type Literature = {
  canonicalUrl: string
  title: string
  authors?: string[]
  publisher?: string
  publishedAt?: Timestamp
  sourceType: 'journal' | 'report' | 'government' | 'news' | 'other'
  topics: string[]
  taipeiRelevance: 'direct' | 'indirect' | 'background'
  evidenceLevel: string
  keyPoints: Array<{ text: string; locator?: string }>
  reviewedByUid?: string
  reviewedAt?: Timestamp
  publicationStatus: 'draft' | 'published' | 'withdrawn'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### 7.2 「第三方供應商處理資料」是什麼意思

- 使用 Mapbox geocoding 時，使用者輸入的地址文字會傳到 Mapbox，Mapbox 回傳候選地址與座標；這不只是「顯示地圖」。若要把 geocoding 結果長期寫入 Firestore，還必須使用其允許永久保存的方案／參數，不能把預設 temporary 結果直接永久存下來。Search Box API 的結果原則上是 temporary，不應拿來當永久報案地址資料庫。
- 使用 Mapbox 地圖服務時，Mapbox 仍會收到服務請求、裝置／網路資訊，以及依功能可能涉及的位置資料。精確點即使最後存在 Firebase，搜尋與地圖互動過程仍可能經過外部服務。
- 「預算上限」是設定每月可接受的第三方費用與告警／停用門檻；「每日配額」是限制 geocoding 請求次數，避免被濫用或意外產生高額帳單。具體金額應在選定方案、估算全臺北流量後決定，不在缺少用量資料時虛構。

MVP 建議：地點搜尋選用可合法永久保存結果的 geocoder，或只把使用者最後確認的座標／文字視為使用者輸入保存；在隱私政策列出供應商與資料種類。後端對 geocoding 加 per-user／per-day rate limit、全站每日上限與月費警示，正式配額在 Phase 0 用預估通報量與單次成本計算。

## 8. 隱私、安全與資料治理

- 病例健康資料屬高度敏感個資。公開產品只接受合法、去識別且無法回推個人的彙整資料；精確居住／工作／活動點不進公開 Firestore collection。
- 公開鼠跡照片在發布前移除 EXIF／GPS，審核可辨識的人臉、門牌、車牌與私領域資訊。
- 市民通報 MVP 暫定經審核後公開精確點；送出前明示公開方式並讓使用者預覽。若點位位於私人住宅、照片／文字可識別住戶，或 reviewer 判定有安全疑慮，可降為 25–100 公尺區域或街廓；公開精度是可版本化政策，不與內部原始座標綁死。
- Firestore 與 Storage 預設 deny-all，再逐 collection／path 開放；對規則使用 Emulator unit tests。
- 啟用 App Check，搭配速率限制、用量監控、預算警示與濫用通報流程。App Check 是附加保護，不取代 Authentication 或 Security Rules。
- Official 帳號要求已驗證 email、domain 白名單、邀請／核准、定期複核、撤銷流程與稽核紀錄；高權限操作可再要求近期重新驗證。
- API key 依用途分開並限制；Firebase client config 不是授權機制，真正安全邊界在 Rules／IAM／後端。
- MVP 暫不設定自動到期刪除，也不提供一般使用者自行撤回流程；但不能設計成「永遠不可刪」。至少保留 admin 對誤報、個資、安全事件與合法請求執行 soft-withdraw／停止公開的能力，並保留不可公開的稽核軌跡。正式上線前仍須定義精確地址、原始照片、公開衍生圖與 audit log 各自的保存期限及請求處理方式。
- Phase 0 指定資料控制者、各資料 owner、公衛文字與方法最終簽核者；建立 RACI、審核 SLA、佇列容量、補件／申訴、錯誤發布撤回與事件通報流程。
- 上線前由台灣個資／公衛資料專業人員檢查；本計畫不是法律意見。

## 9. 建議專案結構

```text
taipei-urban-rat-lab/
├── AGENTS.md
├── apps/
│   ├── web/                         # 市民＋市府人員共用前端
│   │   └── src/
│   │       ├── app/                     # router、providers、layout
│   │       ├── components/              # app 內共用、無領域狀態元件
│   │       ├── features/
│   │       │   ├── auth/
│   │       │   ├── citizen-reports/
│   │       │   ├── official-observations/
│   │       │   ├── control-records/
│   │       │   ├── map/
│   │       │   ├── risk/
│   │       │   └── literature/
│   │       └── pages/
│   └── functions/                   # Firebase Cloud Functions
│       └── src/
│           ├── auth/
│           ├── media/
│           ├── publication/
│           └── control-records/
├── packages/
│   ├── contracts/                   # schema、enum、validator、converter
│   └── ui/                          # tokens 與跨頁共用元件
├── firebase/
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── storage.rules
├── data/
│   ├── raw/                         # immutable 原始資料
│   └── processed/                   # ETL 產物，不與 raw 混放
├── scripts/
│   └── gis/                         # 可重現的 CRS、GeoJSON、tile ETL
├── tests/
│   ├── rules/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── product/
│   │   ├── product-spec.md
│   │   ├── data-schema.md
│   │   ├── security-spec.md
│   │   └── privacy-publication-policy.md
│   ├── design/
│   │   ├── design-system.md
│   │   └── references/                  # immutable 視覺參考
│   ├── map/
│   │   └── map-spec.md
│   ├── research/
│   │   └── source-register.md
│   └── demo-script.md
├── .agents/
│   └── skills/                      # 只放已完成且會重複使用的 skills
├── plan.md
├── project-brief.md
├── firebase.json
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── tsconfig.base.json
```

`apps/web` 同時提供市民與市府介面，MVP 不另建 `apps/staff`；實際權限仍由 Firebase custom claims、Firestore／Storage Rules 與後端授權檢查執行，不以前端目錄分隔當作安全邊界。`packages/contracts` 是三份問卷 schema 與前後端驗證邏輯的單一來源；`packages/ui` 不放領域資料存取或頁面業務邏輯。`.agents/skills` 不預先建立空 skill，只在有完整 `SKILL.md`、可重複工作流與驗證方式時新增。

`project-brief.md` 保留使用者需求、訪談與已確認修正；`docs/product/product-spec.md` 收旂可交付的產品行為；`docs/product/data-schema.md` 說明資料契約，其可執行版本位於 `packages/contracts`；`plan.md` 負責階段、相依與驗收。同一規則不在多份文件各自維護不同版本。

### 9.1 執行 checklist 網站比對結果（2026-10-21）

比對來源為 [Rat Project Steps](https://rat-project-steps.ijon-hsieh.chatgpt.site/)；目前網站共有 28 個主工作項目，PREP 區共 55 個細項。已決定所有衝突一律採用 `plan.md`：它是需求、架構、資料契約與相依關係的單一真實來源，網站只作為待同步的執行進度介面，不得反向覆寫本計畫。網站內容尚未同步前，不可直接執行其中的舊路徑、collection 名稱或建置指令；每次同步應在網站標示對應的 plan 版本或更新日期。

| 比對範圍 | 網站現況 | 本計畫決策／需修正內容 | 衝突等級 |
|---|---|---|---|
| 專案結構 | `apps/web`＋`apps/staff`、`packages/shared` | 改為單一 `apps/web`、`apps/functions`、`packages/contracts`、`packages/ui`；不可建立第二套 staff frontend | 已決定採 plan |
| 資料 collections | `reports`、`ratSurveys`、`baiting`、`attachments` 等舊命名 | 以本文件定義的 `citizenReports`、`officialObservations`、`controlRecords`、`media`、`memberships`、公開 projections、採樣／來源／稽核資料為準 | 已決定採 plan |
| 市民通報表單 | 要求 `observationTypes` 複選 | 使用者已明確要求從 `citizenReports` 移除該欄位；MVP 只保留照片、地點、日期與可選描述 | 已決定採 plan |
| 市府表單 | 以 `ratSurveys` 與 `baiting` 分表 | 改為 `officialObservations` 與 `controlRecords`；防治歷程使用 `events[].actions`，包含 `contraceptive` | 已決定採 plan |
| Authentication／角色 | citizen／staff，主要描述前端分流 | 統一稱 `citizen`／`official`／`admin`；domain 只可作 official 候選條件，仍須邀請或人工核准；角色由 custom claims 強制執行，Firestore 保存 membership／profile／稽核資料 | 已決定採 plan |
| Firebase 與 Hosting | 兩個前端 app、兩個 Hosting targets | MVP 為一個 Web App＋Functions backend；補 Emulator、App Check、dev／staging／production 分離、Rules tests 與環境變數管理 | 已決定採 plan |
| 「我的通報」與後台審核 | 市民需看處理狀態，市府可更新狀態 | 與先前移除 `citizenReports.status` 的決定衝突；不得擅自把欄位加回原始通報 | 待產品決策 |
| GIS／模擬資料 | 有來源、CRS、GeoJSON、底圖與 demo data 項目 | 保留並補 licensing、資料品質、PMTiles／vector tiles、可重跑 ETL、偏差揭露；模擬資料放 Emulator fixtures／來源 metadata，不在三份問卷加入 `isDemo` | 需擴充 |
| 風險、文獻與研究誠信 | 網站涵蓋不足 | 補上觀測證據／資料涵蓋引擎、方法簽核、來源登錄、訪談待查證標記、文獻工作流及不得發布的未驗證健康敘述 | 重大缺漏 |
| 測試與營運 | 主要只有最終手動驗證 | 補 Rules／integration／E2E／WCAG、CI、監控、備份與還原、發布 rollback、成本與配額告警 | 重大缺漏 |

網站中至少 PREP 02／03／04／08 與 BUILD 03／07／09／12／15 必須重寫後才能使用；其餘涉及頁面、GIS、驗證與部署的項目需依本計畫補細項。BUILD 工作目前沒有可逐項驗收的子 checklist，後續同步時要把各 Phase 的測試、產出與驗收條件拆入，而不是只保留一個完成勾選框。

「我的通報／審核狀態」是目前唯一需要新增資料契約決策、且不能只靠改名解決的衝突。建議候選方案是把原始 `citizenReports` 保持不含 `status`，另設 official-only 的 `reportModeration/{reportId}` 保存審核流程，再由後端提供只含安全欄位的市民狀態 projection；市民不得讀取 reviewer、內部備註或其他管理資訊。collection 名稱、狀態 enum、讀取方式與保存政策須在 Phase 0 核准後才加入正式 schema。

## 10. 分階段實作計畫與相依關係

Phase 不是完全線性：Phase 2 完成後，通報／權限、GIS 與文獻三個工作流可並行；Phase 7 必須等待資料品質盤點與方法簽核；任何公開發布都必須通過 Phase 0 的隱私與資料治理 gate。核准執行後，每個 Phase 啟動前再補 owner、估時、輸入與 blocking decisions，不在本次尚未定團隊與預算時虛構時程。

### Phase 0：需求、資料與倫理閘門

**產出：**完整資料清冊、權限矩陣、公開／內部欄位表、研究聲明校正版與風險模型工作坊紀錄。

- [x] 收齊並初步盤點首頁桌機／手機稿與兩份清潔箱 JSON。
- [x] 保存使用者提供的原始資料與圖片、建立 checksum 清冊，並把 UI reference 轉成 design-system 規格。
- [ ] 收齊正式研究報告、清潔箱資料來源日期／授權／兩檔關係，以及既有文獻網站可匯出內容。
- [ ] 與公衛／病媒專家逐條核對漢他病毒、鼠種、狂犬病與防治流程文字。
- [x] 產品決策：公開瀏覽免登入、通報需登入；市民點位暫定精確公開；病例完全排除於 MVP；產品只稱「觀測證據／資料涵蓋」。
- [ ] 由市府確認資料控制者、資料 owner、公衛／方法最終簽核人、official 名單核准／撤權 owner、RACI、審核 SLA、申訴與緊急撤回責任；2.4 節只是假設性的候選矩陣。
- [ ] 決定未成年人政策、第三方 Mapbox／geocoder 的契約與永久儲存條件、月費上限及服務配額。
- [ ] 決定「我的通報」可見的處理狀態、狀態轉移與保存位置；評估 `reportModeration/{reportId}`＋市民安全 projection，且不得把內部審核欄位加回 `citizenReports`。
- [ ] 定義 pet-safety use case：飼主能看到的區域級提醒、有效期間、處置類型、安全注意事項與疑似誤食的官方聯絡來源。
- [ ] 為每一資料源記錄 owner、license、schema、CRS、更新頻率、缺值、可公開欄位與品質限制。
- [ ] 完成資料保留、管理員撤回、照片公開與個資事件處理政策；MVP 不做自動刪除，但必須保有緊急停止公開能力。

**驗收：**任何敏感欄位都能對應到允許讀取的角色；任何公開健康或風險敘述都有來源與負責審核者。

### Phase 1：資訊架構與 mobile-first 原型

**產出：**首頁、登入選擇、市民通報鼠跡、市府鼠跡調查、市府防治／投藥紀錄、地圖與文獻頁的桌機／手機 wireframes，以及可用性測試腳本。

- [x] 完成第一輪首頁稿的點擊暗示、層級、導覽與響應式評審；實作前仍需補互動 states 與無障礙標註稿。
- [ ] 依 `docs/design/design-system.md` 產出 responsive components 與完整 default／hover／pressed／focus／disabled／error states；L1–L4 暫不作正式風險文案。
- [ ] 定義設計 tokens、focus／hover／pressed／disabled／error／loading／empty states。
- [ ] 以 5–8 位市民和 3–5 位工作人員測試：能否找到地圖、完成通報、理解風險與可信度、正確理解「已移除」。
- [ ] 根據測試修正流程後再核准視覺設計。

**驗收：**360 px 寬度不出現橫向捲動；鍵盤可完成主要流程；主要任務成功率目標至少 80%；「低資料量」被誤解為「低風險」的比例為 0%。若樣本太少，結果只用於發現問題，不宣稱統計代表性。

### Phase 2：工程骨架與品質基線

**產出：**pnpm workspace monorepo、React／TypeScript Web App、Firebase Functions、共用 contracts／UI packages、路由、測試、Firebase Emulator、CI 與環境設定範例。

- [ ] 建立根目錄 `package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml` 與 `tsconfig.base.json`，workspace 只包含 `apps/*` 與 `packages/*`。
- [ ] 建立 `apps/web`、`apps/functions`、`packages/contracts` 與 `packages/ui`；不建立 `apps/staff`。
- [ ] 在 `packages/contracts` 建立三份問卷的 TypeScript types、enum、runtime validators 與 Firestore converters，並由 `apps/web` 與 `apps/functions` 共用。
- [ ] 在 `apps/web` 建立 `/`、`/map`、`/report`、`/literature`、`/login`、`/official`、`/official/review` 路由與 lazy loading。
- [ ] 建立 `tests/rules`、`tests/integration`、`tests/e2e` 的 Vitest／RTL、Playwright、Emulator Rules tests 與無障礙檢查。
- [ ] 建立 `firebase/firestore.rules`、`firebase/firestore.indexes.json`、`firebase/storage.rules` 與根目錄 `firebase.json`，並確認 Emulator 指向正確路徑。
- [ ] 保留 `docs/design/design-system.md`、`docs/design/references/` 與 `docs/research/source-register.md` 現有資產，並建立 `docs/product/product-spec.md`、`docs/product/data-schema.md`、`docs/product/security-spec.md`、`docs/product/privacy-publication-policy.md`、`docs/map/map-spec.md` 與 `docs/demo-script.md`，每份文件只負責第 9 節定義的職責。
- [ ] 建立 dev／staging／production Firebase projects；禁止 production secrets 出現在 repo。
- [ ] 建立 `AGENTS.md`，只記錄 repo 工作規則、驗證指令與安全約束，不複製 product spec。
- [ ] 將 Rat Project Steps 網站同步為本計畫第 9.1 節的結構、collection、角色與驗收條件，並標示同步日期；同步完成前不執行網站中的舊指令。
- [ ] 先寫首頁、workspace package boundary 與路由 smoke tests，再實作最小 layout。

**驗收：**根目錄單一指令可完成全 workspace 的型別檢查、lint、unit、rules 與基本 E2E；`apps/web` 與 `apps/functions` 都使用 `packages/contracts` 而非複製 schema。

### Phase 3：Authentication、RBAC 與稽核

**產出：**市民 Email/Password／Google 登入、official Email/Password 登入與邀請／核准／撤銷、custom claims、Security Rules 與管理稽核。

- [ ] 先寫角色矩陣的 Rules tests，包含偽造 client role、停權 official、跨使用者讀取、未驗證 email、偽造 domain 與未受邀政府信箱。
- [ ] 實作共用 Email/Password 登入、市民 Google 登入、email verification 與 official 核准工作流程。
- [ ] 後端精確比對正規化 domain＋邀請／人工核准後，才以 Admin SDK 設定 `official` claim；`admin` 不可由 domain 自動指派。
- [ ] 實作 Custom claims 同步、token refresh、403／無資料 UI 與撤銷測試。
- [ ] 所有角色與發布操作寫入 `auditLogs`。

**驗收：**隱藏按鈕不是唯一防線；直接呼叫 Firebase SDK 也無法越權。

### Phase 4：市民通報與照片管線

**產出：**mobile-first 通報流程、地點搜尋／選點、上傳與審核佇列。

- [ ] 先寫表單驗證、日期不能在不合理未來、缺少座標、上傳超量／超大／錯誤格式等測試。
- [ ] 實作照片、地點、日期、可選描述與確認步驟；草稿只存本機或明確標示保存方式。
- [ ] 實作直接上傳私有 staging path、進度、取消、重試與 orphan cleanup。
- [ ] 後端處理格式驗證、縮圖、EXIF 移除、media metadata 與審核狀態。
- [ ] 依 Phase 0 核准的安全狀態來源實作「我的通報」；不得讓市民直接讀取內部 moderation 文件。

**驗收：**以 Playwright／DevTools Fast 3G profile 測試，上傳介面在整段傳輸中持續顯示進度或可理解狀態；重試不重複建立通報；未審核照片與精確位置不會被公開讀取。

### Phase 5：市府防治事件與審核後台

**產出：**市府鼠跡調查表單、防治紀錄＋只可追加的 action events、查核到期、通報審核與公開投影。

- [ ] 先寫事件狀態測試，特別測試「removed 不等於 safe」、更正不刪歷史、不同單位不可互改。
- [ ] 實作 official 的「鼠跡調查」與「防治／投藥紀錄」兩個 tab；防治紀錄以 `events[].actions` 複選當次行動，照片寫入該 event 的 `photoPaths`。
- [ ] Phase 0 核准資料契約後，實作 review queue、duplicate merge、needs-info、verified／rejected 與理由；內部狀態與市民可見狀態分離。
- [ ] 由受保護函式依來源別 allowlist 產生公開 projection，並用 fixture 測試敏感 key 永不出現在公開文件。

**驗收：**能依 `controlRecords.events` 完整重建防治行動歷史，且新增事件不會覆寫既有事件；公開資料與內部資料有自動化欄位差異測試。

### Phase 6：GIS ETL 與地圖

**產出：**來源登錄、可重跑 ETL、MapLibre 圖層、篩選器、圖例與資料詳情。

- [ ] 對三組官方資料與 SHP 執行 schema／CRS audit，建立固定 fixture 與轉換測試。
- [ ] 將小型點資料轉 GeoJSON；將建物、街廓、管線轉 vector tiles／PMTiles。
- [ ] 測試經緯度順序、台北 bounding box、空 geometry、重複 ID、錯誤 CRS 與極大 feature。
- [ ] 實作 cluster、zoom-dependent visibility、layer panel、時間／來源／可信度篩選與 mobile bottom sheet。
- [ ] 實作資料過期／同步失敗提示，不用舊資料假裝即時。

**驗收：**Phase 0 定義代表性資料量與一台基準 Android 裝置；在該條件下量測首次可互動時間與 pan／zoom frame rate 並訂預算。可用性測試中，受試者能正確回答「活動、涵蓋率、證據可信度是否相同」；未達門檻前不得標示正式風險。

### Phase 7：風險與可信度引擎

**產出：**版本化、可解釋、可重算的觀測證據引擎與方法頁；只有校準通過後才升級為風險引擎。

- [ ] 先由專家核准因子、門檻、有效期間、空間單元、小樣本規則與禁用推論。
- [ ] 用固定案例寫測試：高活動低可信、低活動低涵蓋、資料不足、資料過期、處置後未查核；核准風險模型後才加入高／低風險案例。
- [ ] 後端批次產生 immutable run artifact 與 `reasonCodes`，前端只讀 active publication 與方法說明。
- [ ] 建立模型版本比較與 rollback；模型變更不改寫歷史顯示所使用的版本。

**驗收：**任一公開級別都能由輸入資料、版本規則與 checksum 重現；「無資料」永不自動等於低活動或低風險；未完成校準時 UI 不出現正式風險字樣。

### Phase 8：文獻庫與人工整理

**產出：**文獻列表、人工維護流程、來源定位、授權資訊與發布審核。

- [ ] 先匯出既有文獻網站內容並做 canonical URL 去重與授權盤點。
- [ ] 建立人工新增／編輯流程、必填來源 URL、頁碼／段落定位、授權與重複 URL 檢查。
- [ ] 只有 official／admin 可建立、編輯與發布文獻重點；一般市民只能閱讀已發布內容。

**驗收：**每個已發布重點都有原始來源、定位資訊、整理者與審核狀態；市民端沒有提交連結或自動分析入口。

### Phase 9：整合與全臺北 MVP 上線前檢查

**產出：**安全、隱私、無障礙、效能、備份／回復與營運手冊。

- [ ] 進行 Rules／IAM／App Check／API restrictions／濫用與成本檢查。
- [ ] 進行 WCAG 2.2 AA、鍵盤、螢幕閱讀器、色盲與 360／768／1280 px 視窗測試。
- [ ] 測試離線／斷線、定位拒絕、上傳中斷、資料同步失敗、MapLibre 底圖／tile provider 或其他第三方服務 unavailable。
- [ ] 定義 SLO、錯誤告警、資料更新失敗告警、預算告警、備份與復原演練。
- [ ] 以全臺北資料範圍做 MVP 測試；用 staged rollout／feature flag 控制流量與高風險圖層，不另設 1–2 行政區試辦前提。推行成效與擴散門檻暫不納入本版規劃。

**驗收：**由指定 security／privacy owner 定義並簽核 P0／P1 標準，且沒有未解決的 P0／P1 安全與個資問題；營運者完成演練：處理錯誤資料、撤回照片並使快取失效、停權帳號與 refresh token、回復前一版公開圖層。

## 11. 全域測試重點

1. **權限偽造：**client 自寫 `role: official`、改 uid 或直接讀 path 時，Rules 必須拒絕。
2. **敏感資料外洩：**公開 map projection、圖片 URL、log 與錯誤訊息都不能含精確病例位置、email、原圖 EXIF 或內部藥劑細節。
3. **地理資料錯誤：**TWD97 當 WGS84、lat/lng 對調、geometry 超出台北範圍時，ETL 必須失敗並告警。
4. **錯誤風險語意：**無資料、舊資料、只有通報、已投藥與已移除，不得被顯示成已確認安全。
5. **不受信任內容：**照片、外部 URL 與 PDF 都視為不受信任；需格式驗證、審核與輸出轉義。

## 12. 主要決策與待確認事項

### 本計畫先採用的建議

- 一個登入按鈕＋兩種入口卡，不用 role toggle。
- 公開瀏覽免登入；市民送出通報需登入。若要允許匿名通報，需新增濫用防護與聯絡／撤回策略後再調整。
- 公開點位讀來源別 allowlist projection；大型區域、管線與風險／證據面讀版本化 tile artifact，不直接讀原始通報或內部防治紀錄。
- 市民點位暫定經審核後公開精確點，但資料模型支援 reviewer 降級與未來改為區域／網格；病例資料完全排除 MVP。
- MVP 直接涵蓋全臺北，對外只稱「觀測證據／資料涵蓋」，不發布正式風險等級。
- 市府與受委託人員 MVP 共用 `official` 權限；資料仍記錄所屬機關、政府／承包商身分與完整稽核。正式核准／撤權 owner 待市府確認。
- 投藥／餌站不採固定天數延遲；現場設置並驗證後儘快公開安全資訊。固定安全餌站可精確，室內／散放／座標不可靠則區域化。
- 照片選填；只接受鼠類、死鼠或鼠跡相關照片，不接受人像。
- 不設 MVP 自動刪除排程，但保留管理員停止公開、更正與處理個資／安全事件的能力。
- GeoJSON 用於小型／原型圖層；大型 SHP 轉 vector tiles／PMTiles；Firestore 不當 GIS 檔案倉庫。
- 照片原檔每張硬上限 8 MB，client 目標壓至 2 MB 以下，每次最多 3 張。
- 文獻 metadata 與人工整理重點存 Firestore；受授權的原始檔存 Storage；MVP 不提供民眾提交連結或自動分析功能。

### 尚待補資料或外部 owner 確認

1. 正式資料控制者與各資料 owner 是誰？誰可核准／撤銷 official，誰簽核公衛文字與方法，審核 SLA 是多少？本計畫建議環保局作平台／公共環境候選 owner、衛生局作公衛內容候選簽核單位，但不能代替市府決定。
2. 市府與委外人員實際可使用的 email 網域、名單來源、有效期限及合約終止撤權通知流程。
3. 未成年人是否可以建立帳號與通報；照片已暫定選填且不得含人像。
4. 精確地址、原始照片與公開衍生圖的正式保存期限，以及刪除／查閱／更正請求流程。MVP 只確定不做自動刪除，不能據此宣稱資料永久不可撤回。
5. Mapbox／geocoder 的選定方案、永久保存授權、隱私揭露、月預算與請求上限。
6. 清潔箱資料的正式名稱、來源日期、授權與兩檔關係；正式漢他結案報告及既有文獻網站匯出資料。

## 13. 查證來源

- [疾管署：漢他病毒症候群疾病介紹](https://www.cdc.gov.tw/Category/Page/oR_-fHp0c7x0RCdpK0q7FQ)
- [疾管署：2010–2013 年臺灣國際港埠鼠類媒介漢他病毒調查](https://www.cdc.gov.tw/EpidemicTheme/Detail/zKNFqsVWxUoUqE6fyhmBNA?archiveId=fEs1i4LVRvZvbnVqQS0ysw)
- [疾管署：漢他病毒症候群為第二類法定傳染病，24 小時內通報](https://www.cdc.gov.tw/Category/MPage/se5mz5TwK6_abjPN3UV03A)
- [臺北市政府：第 2398 次市政會議鼠患跨局處分工](https://sec.gov.taipei/News_Content.aspx?n=0661423027099106&s=163448944F51CBB9&sms=14AEF9A8536E3B5E)
- [臺北市環保局：水質病媒管制科職掌](https://www.dep.gov.taipei/News_Content.aspx?n=5317E7A3195A15CA&s=17CEA1BC6437D5BE)
- [臺北市政府：環保、衛生、民政、市場、公園與建管的鼠害分工](https://www.gov.taipei/News_Content.aspx?n=74806083EBDF5A03&s=865740804F8292A5)
- [臺北市市場處：市場委託專業廠商執行病媒防治](https://www.gov.taipei/News_Content.aspx?n=F0DDAF49B89E9413&s=F64079A55E8DCE34)
- [臺北市衛生局：漢他個案疫調與住家、工作地周邊防疫](https://health.gov.taipei/News_Content.aspx?n=4F01EBDF8F61F315&s=05E35CB5710E7B4E&sms=72544237BBE4C5F6)
- [環境部：環境鼠害防治專區](https://www.moenv.gov.tw/affairs/issues/environmental-rodent-control-zone/3916.html)
- [環境部：公開防治動態與兒童、寵物安全提醒](https://enews.moenv.gov.tw/moenv-news/zh-tw/News/1762)
- [臺北市環保局：願意公開精確標示投餌位置](https://www.dep.gov.taipei/News_Content.aspx?n=CB6D5C560DE4D2DD&s=E08C376104E132FD&sms=72544237BBE4C5F6)
- [臺北市動保處：餌站與寵物誤食處理提醒](https://nhdo.gov.taipei/News_Content.aspx?n=E604685ABB2F0678&s=BCC6F16A82EE6056&sms=78D644F2755ACCAA)
- [全國法規資料庫：個人資料保護法](https://law.moj.gov.tw/LawClass/LawAll.aspx?PCode=I0050021)
- [臺北市水利處雨水下水道人孔資料](https://data.gov.taipei/dataset/detail?id=3e62c860-0753-4c79-8fe1-bcb3e0243534)
- [政府資料開放平臺：臺北市水綠地圖集](https://data.gov.tw/dataset/166231)
- [Firebase：Custom claims 與 Security Rules](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firebase：Cloud Storage Security Rules 與 size／contentType 驗證](https://firebase.google.com/docs/storage/security)
- [Firebase：Firestore Geoqueries 與 geohash 限制](https://firebase.google.com/docs/firestore/solutions/geoqueries)
- [Firebase：Firestore 使用量與單一 document 1 MiB 上限](https://firebase.google.com/docs/firestore/quotas)
- [Firebase：App Check](https://firebase.google.com/docs/app-check)
- [Firebase：安全檢查清單](https://firebase.google.com/support/guides/security-checklist)
- [Mapbox GL JS：cluster example](https://docs.mapbox.com/mapbox-gl-js/example/cluster/)
- [Mapbox GL JS：vector source example](https://docs.mapbox.com/mapbox-gl-js/example/vector-source/)
- [Mapbox：Geocoding API](https://docs.mapbox.com/api/search/geocoding/)
- [Mapbox：temporary 與 permanent geocoding](https://docs.mapbox.com/help/dive-deeper/understand-temporary-vs-permanent-geocoding/)
- [Mapbox：Search Box API](https://docs.mapbox.com/api/search/search-box/)
- [Mapbox：Privacy Policy](https://www.mapbox.com/legal/privacy)
- [NYC Health：Rat Information Portal](https://a816-dohbesp.nyc.gov/IndicatorPublic/rats/)

---

**文件狀態：**Draft，等待使用者檢閱與核准。核准前只可修訂本文件，不得開始任何 Phase，也不得建立產品程式碼、Firebase 專案或雲端資源。
