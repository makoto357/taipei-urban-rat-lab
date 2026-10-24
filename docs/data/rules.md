# 風險模型因子積分規範

## 1. 模型定位

本文件記錄地圖頁「風險模型」目前實作的積分、正規化與空間傳遞規則。

此模型是研究導向的探索性試算，尚未使用臺北實測 CMR、基因或標準化鼠跡調查資料校正。L1–L5 是相對分級，不代表：

- 老鼠數量或族群密度；
- 鼠隻實際移動路徑；
- 病原體傳播或人類感染機率；
- 應直接投藥或可宣稱安全的依據。

模型分成兩類參數：

1. **基礎因子**：民眾通報、政府調查、食物來源、躲藏空間。民眾與政府觀測的權重各為 3，食物與躲藏環境的權重各為 1。
2. **移動開關**：地面移動、下水道移動。兩者不另占權重，只傳遞被勾選的觀測因子；食物來源與躲藏空間永遠保留在原 component。

食物來源與躲藏空間只表示環境中可能存在相關條件，不是已確認的鼠隻活動、鼠口密度或鼠患證據。

## 2. 分析單元與排除分區

分析單元使用 `taipei-landuse-detail-merged.geojson` 的土地使用 `MultiPolygon`。feature ID 與 `編號` 維持原值。每個不連續 polygon component 分開計分及傳遞，最後才以最大值彙總回原 feature。

feature 面積取 `area_m2`，轉換為公頃：

```text
area_ha = area_m2 / 10,000
```

`MultiPolygon` 的 feature 面積依各 component 的幾何面積比例分配。若幾何面積總和為 0，則等分 feature 面積；`area_m2` 缺失、非有限值或小於等於 0 的 feature 不進行積分，避免除以 0。

下列分區不產生分數、不顯示 L1–L5，也不作為地面或地下連通圖的節點：

- `河川區`
- `河道用地`
- `行水區`
- `高速公路用地`

一般的 `排水溝用地` 不一律排除，因為部分合併 feature 同時包含住宅、商業、公園等分區，整塊排除會遺失有效分析區域。

## 3. 共用點位積分規則

民眾通報、政府調查、餐館、垃圾設施及躲藏空間觀測點位使用相同的點對 polygon 計分規則。每個點對同一 feature 最多計分一次，並只指派給距離最近的一個 component：

| 點位與 polygon 的關係 | 分數 |
| --- | ---: |
| 位於 polygon 內 | 1 |
| 位於 polygon 外，距離邊界不超過 3 m | 1 |
| 距離邊界超過 3 m、不超過 5 m | 0.5 |
| 距離邊界超過 5 m | 0 |

距離以點位到 polygon 最近邊界計算。經緯度依臺北所在地緯度換算為公尺，不直接將經緯度差視為平面距離。

若 feature 是 `MultiPolygon`，採點位至其中最近 polygon 的距離；即使命中多個 component 或剛好落在共用邊界，仍只建立一筆 component source score，不複製到同 feature 的其他 component。

## 4. 基礎因子

### 4.1 民眾通報

資料來源：`citizen-reports.geojson`。

只採計：

```text
reportType === "rat"
```

`bait` 與其他通報類型不納入此因子。各 polygon 的原始分數為所有有效鼠跡通報點分數總和：

```text
citizen_raw = Σ point_score
citizen_area_adjusted = citizen_raw / component_area_ha ^ beta
```

### 4.2 政府調查

資料來源：`mock-official-observations.json`。

`surveyResult` 的處理：

| `surveyResult` | 積分處理 |
| --- | --- |
| `evidence_found` | 依共用點位規則計分 |
| `no_evidence_found` | 不加分，也不作負分 |
| `unable_to_assess` | 排除 |

目前沒有調查努力量、巡查範圍或重複陰性調查資料，因此 `no_evidence_found` 不能直接證明整個 polygon 無鼠，也不能作為扣分依據。

```text
government_raw = Σ evidence_found_point_score
government_area_adjusted = government_raw / component_area_ha ^ beta
```

### 4.3 食物來源

資料來源：

- 土地使用分區中的市場；
- `taipei-restaurants.geojson` 的餐館；
- `taipei-bins.geojson` 的垃圾桶；
- `taipei-garbage-truck-stops.geojson` 中停留時間嚴格超過 30 分鐘的垃圾車停靠點。

市場判定：

```text
使用分區 contains "市場"
```

符合市場條件的 feature 固定增加 3 分，並依 component 面積比例分配，避免 `MultiPolygon` 每個 component 都重複取得 3 分。餐館、垃圾桶與符合條件的垃圾車停靠點各以 1 分為基礎，依共用點位規則計分：

```text
food_raw = 3 × market_indicator
         + restaurant_point_score
         + bin_point_score
         + long_garbage_stop_point_score
food_area_adjusted = food_raw / component_area_ha ^ beta
```

在 component 計算時，`market_indicator` 是該 component 的面積比例；所有 component 的市場加分合計仍為 3，不因 `MultiPolygon` 數量增加。

垃圾車停留時間使用 `抵達時間`、`離開時間` 的 HHMM 值計算：

- `duration > 30` 分鐘才納入；
- 剛好 30 分鐘不納入；
- 支援跨午夜；
- 缺值或無效時間排除。

餐館登記、垃圾桶、市場及垃圾車停靠點只是食物可及性的 proxy。餐館清冊也不證明業者目前營業或食物可被鼠隻取得。

### 4.4 躲藏空間

此因子沿用地圖「環境因子 → 躲藏空間」已顯示的資料：

- `taipei-landuse-detail-merged.geojson` 中明確包含 `公園` 或 `綠地` 的土地使用分區；
- 官方觀測 `observationTypes` 包含 `clutter` 或 `unused_space` 的點位。

土地使用分類採小型、明確的規則表：

| `使用分區` 包含文字 | feature 基礎分數 |
| --- | ---: |
| `公園` | 1 |
| `綠地` | 0.75 |
| 其他 | 0 |

同時符合多項規則時取最高值，不相加。feature 基礎分數依 component 面積比例分配後，再加上該 component 的 `clutter`／`unused_space` 點位分數：

```text
shelter_raw = allocated_landuse_score
            + clutter_or_unused_space_point_score
shelter_area_adjusted = shelter_raw / component_area_ha ^ beta
```

這個分類刻意不把所有住宅、商業、工業、建物或開放空間視為藏匿環境，因為目前土地使用資料沒有建物孔洞、植被覆蓋、維護狀況或空置狀態。公園與綠地也不必然適合鼠隻躲藏；本分數只是待驗證的探索性 heuristic。

## 5. 基礎因子正規化

四個基礎因子分別正規化，不直接比較原始筆數。面積調整指數可設定，目前為：

```text
beta = 0.5
area_adjusted_score = raw_score / component_area_ha ^ beta
```

`beta = 0.5` 等同原本的 `sqrt(area_ha)` 校正。每項因子再取所有正分 component 的第 95 百分位（nearest-rank）作為參考值：

```text
factor_reference = P95(all positive area_adjusted scores)
factor_normalized = min(1, area_adjusted_score / factor_reference)
```

若某因子沒有任何正分，參考值設為 1。四個 P95 參考值、因子權重及 `beta` 儲存在輸出 FeatureCollection 的 `metadata.riskModel`。正規化結果介於 0–1：

- `risk_citizen`
- `risk_government`
- `risk_food_source`
- `risk_shelter`

第 95 百分位以上會截斷為 1，避免少數極端值壓縮其他 polygon 的顏色差異。這是展示與比較用的相對尺度，不是機率。

## 6. 觀測證據、環境條件與基礎綜合分數

概念分組：

```text
observationScore = weighted average(selected citizen, selected government)
habitatScore = weighted average(selected local food, selected local shelter)
```

`observationScore` 只包含被勾選的民眾通報、政府調查。`habitatScore` 包含正規化後的食物來源與躲藏空間，且只描述潛在環境條件。

只納入目前勾選的基礎因子，分母使用被選因子的權重總和：

```text
local_score = (
  3 × selected_citizen
  + 3 × selected_government
  + 1 × selected_food
  + 1 × selected_shelter
) / selected_weight_sum
```

範例：

```text
勾選「民眾通報、食物來源」：
local_score = (3 × risk_citizen + risk_food_source) / 4
```

若未勾選任何基礎因子：

```text
local_score = 0
```

此時即使移動開關仍勾選，也沒有來源分數可傳遞，地圖不著色。若只勾選食物來源及／或躲藏空間，移動開關不會改變結果。

## 7. 地面移動

地面移動不是基礎因子，而是民眾通報與政府調查兩項觀測分數的空間傳遞規則。離線連通圖由以下資料建立：

- `taipei-landuse-detail-merged.geojson`
- `taipei-road-8m.geojson`
- `taipei-road-size.geojson`

所有幾何計算使用 EPSG:3826，距離單位為公尺。`MultiPolygon` 的不連續 component 分開作為節點，避免形成零成本跨區捷徑。

### 7.1 候選連通邊

- 搜尋邊界距離 100 m 內的 component；
- component 間距最小採 1 m，避免共享邊界形成零成本長鏈；
- 道路面資料優先，中心線資料只作 fallback；
- 同一道路不因面與線資料重複計權。

### 7.2 距離衰減

```text
D = exp(-max(gap_distance_m, 1) / 50)
```

其中 50 m 是探索性距離衰減尺度，不是鼠隻穿越機率參數。

### 7.3 道路阻隔權重

| 道路寬度 | 權重 B |
| --- | ---: |
| `< 8 m` | 1.00 |
| `8–12 m` | 0.60 |
| `12–20 m` | 0.25 |
| `20–30 m` | 0.08 |
| `>= 30 m` | 0.01 |
| 未知 | 0.25 |

若確實穿越多條不同道路，權重相乘：

```text
ground_edge_weight = D × Π road_barrier_weight
```

未知路寬採保守情境 `0.25`。以上權重均為 MVP heuristic，不可解讀為穿越機率。

### 7.4 兩層傳遞

民眾通報與政府調查分開從各自具有本地分數的 component 向外傳遞最多 2 hops。一路徑的分數為該觀測因子的來源分數乘上各邊權重：

```text
path_factor_score = source_factor_score × Π edge_weight
```

每個目的 component 取自身分數與所有 1-hop、2-hop 候選路徑的最大值，不將多條路徑相加：

```text
ground_factor_score = max(
  local_factor_score,
  all ground factor path scores up to 2 hops
)
```

不加總不同路徑，也不先合併民眾與政府分數。食物來源與躲藏空間不進入地面圖。同一土地使用 feature 有多個 component 時，先在 component 上算完選定因子的最終分數，再採 component 最大值彙總。

## 8. 下水道移動

下水道移動同樣只傳遞民眾與政府兩項觀測因子，不另占權重。資料來源：

- `taipei-sewer-pipes.geojson`
- `taipei-sewer-manholes.geojson`
- `taipei-stormwater-pipes.geojson`
- `taipei-stormwater-manholes.geojson`

污水與雨水系統都納入，但分成兩張獨立連通圖。管網在模型中視為**無方向的潛在通道**；上下游或水流方向不被解讀為鼠隻移動方向。

### 8.1 人孔配對

- 人孔轉換至 EPSG:3826；
- 管段只使用 `upstreamId`、`downstreamId` 對應同系統內完全相符的 `manholeId`，不以鄰近管線或端點距離猜測連通；
- 配對至 30 m 內最近的非排除土地使用 component；
- 超過 30 m 或無候選 component 的人孔不建立連接；
- 管段兩端配對到同一 component 時，不建立跨街廓邊；
- 同一 component pair 有多條管段時，只保留權重最高者。

### 8.2 管段權重

目前只使用管段長度做衰減，不用管徑、材質、坡度或覆土深度推測鼠隻通行性：

```text
underground_edge_weight = exp(-max(pipe_length_m, 1) / 100)
```

100 m 是探索性衰減尺度，並非實測鼠隻地下移動距離。

### 8.3 兩層傳遞

污水與雨水連通圖各自傳遞最多 2 hops，再對同一觀測因子取兩者最大值：

```text
underground_factor_path_score = source_factor_score × Π underground_edge_weight

underground_factor_score = max(
  local_factor_score,
  all sewer factor path scores up to 2 hops,
  all stormwater factor path scores up to 2 hops
)
```

單一路徑不得從污水邊切換到雨水邊。食物來源與躲藏空間不進入下水道圖。

## 9. 最終分數

對每個被勾選的觀測因子，先依移動開關取得可用的最大分數：

| 地面移動 | 下水道移動 | 觀測因子採用值 |
| --- | --- | --- |
| 關 | 關 | `local_factor_score` |
| 開 | 關 | `ground_factor_score` |
| 關 | 開 | `underground_factor_score` |
| 開 | 開 | `max(ground_factor_score, underground_factor_score)` |

再以 `3:3:1:1` 組合被勾選的四個基礎因子：

```text
final_score = (
  3 × selected propagated_citizen_score
  + 3 × selected propagated_government_score
  + selected local_food_score
  + selected local_shelter_score
) / selected_weight_sum
```

未勾選的因子不進入分子或分母。食物與躲藏分數永遠使用原 component 的本地值。地面與下水道路徑分開計算，不允許在同一條 2-hop 路徑中由地面切換到下水道；兩種路徑的最大值是逐一觀測因子選取，而不是先合成兩個綜合分數再取最大值。

## 10. 加權分數 remap 與 L1–L5 分級

每個 `risk_local_*`、`risk_movement_*`、`risk_underground_*` 與 `risk_combined_movement_*` 欄位，分別使用該欄位所有正分 feature 的加權後最低值與最高值做 min–max remap：

```text
remapped_score = (weighted_score - positive_min) / (positive_max - positive_min)
```

- 原始 `weighted_score = 0` 不參與最低值與最高值計算，remap 後仍為 0，維持「未分級」。
- 最低的正分會保留極小正值 `0.000001`，使其落在 L5 而不與未分級混淆。
- 若某欄位所有正分都相同，無法形成範圍，統一設為 `0.5`，落在 L3。
- 各 checkbox bitmask 與移動模式獨立 remap，因此顏色表示當下組合內的相對位置，不能直接比較不同組合的絕對值。
- 每個欄位使用的原始 `positive_min`、`positive_max` 儲存在 `metadata.riskModel.weightedScoreRemap.ranges`。

remap 後的分數介於 0–1，依五個等寬級距著色：

| 分級 | 最終分數 | 顏色 |
| --- | --- | --- |
| L1 | `score >= 0.80` | `#9E352F` |
| L2 | `0.60 <= score < 0.80` | `#D65B37` |
| L3 | `0.40 <= score < 0.60` | `#E99843` |
| L4 | `0.20 <= score < 0.40` | `#F2CC67` |
| L5 | `0 < score < 0.20` | `#F8E8A8` |
| 未分級 | `score = 0` | 不著色 |

L1 表示此探索性模型中的相對高值，不代表已驗證的高鼠患、鼠口數量或公衛風險。

## 11. 前端衍生欄位

地圖載入時會產生：

- `area_ha`
- `risk_citizen`
- `risk_government`
- `risk_food_source`
- `risk_shelter`
- `risk_observation`
- `risk_habitat`
- `risk_local_1` 至 `risk_local_15`
- `risk_movement_1` 至 `risk_movement_15`
- `risk_underground_1` 至 `risk_underground_15`
- `risk_combined_movement_1` 至 `risk_combined_movement_15`

`1–15` 是四個基礎因子 checkbox 的 bitmask 組合：

| Bit | 因子 |
| ---: | --- |
| 1 | 民眾通報 |
| 2 | 政府調查 |
| 4 | 食物來源 |
| 8 | 躲藏空間 |

例如 `risk_movement_5` 表示：先對民眾通報（1）套用地面傳遞，食物來源（4）留在原 component，再按 `3:1` 加權。`risk_combined_movement_13` 則允許民眾通報（1）逐 component 取地面或下水道傳遞結果的最大值，食物來源（4）與躲藏空間（8）仍不傳遞。

離線連通產物同時保留 `blockIds` 與穩定的 `componentIds`（`編號:componentIndex`）。feature 本身的 ID、`編號` 與 GeoJSON geometry 不會被改寫。

## 12. 可重現性與限制

離線產物與腳本：

- `scripts/gis/build-ground-connectivity.py`
- `apps/web/public/data/ground-connectivity.json`
- `scripts/gis/build-underground-connectivity.py`
- `apps/web/public/data/underground-connectivity.json`

重要限制：

- 民眾通報存在人口、網站使用及關注度偏差；
- 政府調查缺少完整調查努力量，陰性紀錄不能直接作負分；
- 市場、餐館登記、垃圾桶及垃圾車停靠點不等於實際食物可及性；
- `clutter`／`unused_space` 是特定調查點的環境觀測，不能外推為整個街廓的空置程度；公園／綠地分區也不代表實際植被、孔洞或維護狀況；
- 道路權重、距離衰減、hop 數與人孔配對距離均為尚待實測校正的 heuristic；
- 地下管線位置不證明鼠隻可通行，管網方向也不是鼠隻移動方向；污水與雨水沒有明確連接資料時保持分離；
- 無資料永遠不應被解讀為低風險或安全。

任何參數調整都應同步更新本文件、離線產物的 metadata、固定測試案例及模型版本。
