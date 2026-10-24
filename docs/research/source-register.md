# Source Register

本清冊記錄使用者提供的原始資料與設計參考。`data/raw` 與 `docs/design/references` 內的檔案視為 immutable source：後續轉檔、壓縮或清理應輸出到其他目錄，不直接覆寫。

候選與已使用的公開資料集、來源網址、格式、授權及使用限制，另見 [`data-sources.md`](data-sources.md)。

| 類型 | 原始檔名 | 專案內路徑 | SHA-256 | 狀態／用途 |
| --- | --- | --- | --- | --- |
| 清潔箱資料 | `7226e5cdf0e98ffe5f7084a53bc45eba_export.json` | `data/raw/taipei-cleaning-boxes/cleaning-boxes-summary.raw.json` | `cb9ca211cf32be1e30cbb01b9176f690bdbd6133c27b80d58c040365e8ae299a` | 130 筆聚合／摘要型點位；正式名稱、日期、授權待確認 |
| 清潔箱資料 | `4fa213b72aab66e0c80e4c52436ad5ba_export (2).json` | `data/raw/taipei-cleaning-boxes/cleaning-boxes-locations.raw.json` | `13c7af7e40bafab7efe414905f33dedc549ddce9937fdd03ee5955e017be9cd0` | 681 筆位置資料；正式名稱、日期、授權待確認 |
| 首頁參考 | `Screenshot 2026-10-19 at 11.30.06 PM.png` | `docs/design/references/home-mobile-reference.png` | `0f6b2e9adb1dc23501d6033ed73fbcd6e34d7e78b617af5d505a08ceb0b896ac` | 572 × 1634 手機首頁稿 |
| 首頁參考 | `Screenshot 2026-10-19 at 11.29.53 PM.png` | `docs/design/references/home-desktop-reference.png` | `67683c82e5fb219f9db6ce3e935819b3f97eca8b0a250b9c9aa89372fabe3930` | 1896 × 1634 桌機首頁稿 |
| Design system | `UI reference.jpg` | `docs/design/references/design-system-v01-reference.jpg` | `6989809e2b78177e23c665be7fee8dabcfaa841f10876b561e475ad966cc4f74` | 1086 × 1448；UI 視覺與元件設計基準 v01 |

## 待補 metadata

- 兩份清潔箱資料的官方資料集名稱、來源 URL、產製／更新日期、授權及彼此關係。
- 首頁稿與 design-system 圖的作者／版本日期；目前按使用者提供內容視為專案參考資產。
