import { Link } from "react-router-dom";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import {
  ConnectivityExample,
  FactorWeightExample,
} from "../features/risk-model/InteractiveModelExamples";
import {
  AREA_ADJUSTMENT_BETA,
  FULL_SCORE_RADIUS_METERS,
  HALF_SCORE_RADIUS_METERS,
  MARKET_BASE_SCORE,
  MAX_PROPAGATION_HOPS,
} from "../features/map/engine/riskModel";
import { colors } from "@taipei-rat-lab/ui";

const GITHUB_DOCS =
  "https://github.com/makoto357/taipei-urban-rat-lab/blob/main/docs";

const WORKFLOW = [
  "觀測證據＋環境條件",
  "面積校正與正規化",
  "空間傳遞",
  "加權分數",
  "L1–L5 相對分級",
] as const;

const FACTOR_CARDS = [
  {
    number: "01",
    title: "民眾通報",
    weight: "×3",
    kind: "觀測證據",
    summary: "使用民眾提交並進入公開資料的鼠跡通報，反映被看見與被通報的活動證據。",
    rule: "通報點落在街廓內或距邊界 3 m 內計 1 分；3–5 m 計 0.5 分。",
    source: "Firestore 公開通報資料與開發用本機備援資料。",
  },
  {
    number: "02",
    title: "政府調查",
    weight: "×3",
    kind: "觀測證據",
    summary: "只納入能判定為「確認鼠跡」或「已排除」的市府調查結果。",
    rule: "確認鼠跡依點位規則加分；已排除不加分也不扣分；無法判定不計入。",
    source: "Firestore 已發布政府紀錄與專案內政府調查 GeoJSON。",
  },
  {
    number: "03",
    title: "食物來源",
    weight: "×1",
    kind: "環境代理變數",
    summary: "市場、餐館、垃圾桶與停靠超過 30 分鐘的垃圾車停靠站，代表潛在食物可得性。",
    rule: `市場固定 ${MARKET_BASE_SCORE} 分；其餘點位採 3 m／5 m 距離規則後加總。`,
    source: "臺北市市場、餐飲業者、環保局垃圾桶與垃圾車清運資料。",
  },
  {
    number: "04",
    title: "躲藏空間",
    weight: "×1",
    kind: "環境代理變數",
    summary: "以公園、綠地與環境觀察中的雜物、閒置空間描述潛在藏匿條件。",
    rule: "公園為 1、綠地為 0.75（同時符合時取較高值）；再加上雜物與閒置空間的點位分數。",
    source: "臺北市土地使用分區與專案環境觀察資料。",
  },
] as const;

const LEVELS = [
  { level: "L1", label: "相對最高", color: "#9E352F" },
  { level: "L2", label: "相對較高", color: "#D65B37" },
  { level: "L3", label: "相對中等", color: "#E99843" },
  { level: "L4", label: "相對較低", color: "#F2CC67" },
  { level: "L5", label: "相對最低", color: "#F8E8A8" },
] as const;

function SectionHeading({ number, title, intro }: { number: string; title: string; intro: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-[90px_1fr] md:gap-6">
      <span className="font-label text-sm tracking-[0.14em] text-accent-text">{number}</span>
      <div>
        <h2 className="m-0 text-3xl font-black leading-tight sm:text-[38px]">{title}</h2>
        <p className="m-0 mt-3 max-w-[780px] font-body text-base leading-[1.85] text-muted">{intro}</p>
      </div>
    </div>
  );
}

function NetworkDiagram({ underground = false }: { underground?: boolean }) {
  const title = underground ? "下水道網路示意" : "地面街廓網路示意";
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox="0 0 520 190"
      className="mt-5 h-auto w-full border-y border-ink bg-paper"
    >
      <title>{title}</title>
      {underground ? (
        <>
          <text x="25" y="31" fontSize="13" fontWeight="700">污水</text>
          <path d="M105 52 H260 H430" fill="none" stroke={colors.map.teal} strokeWidth="5" />
          {[105, 260, 430].map((x) => (
            <g key={x}>
              <circle cx={x} cy="52" r="13" fill="#F4EEDD" stroke="#000" strokeWidth="3" />
              <circle cx={x} cy="52" r="4" fill={colors.map.teal} />
            </g>
          ))}
          <text x="105" y="83" textAnchor="middle" fontSize="12">S-01</text>
          <text x="260" y="83" textAnchor="middle" fontSize="12">S-02</text>
          <text x="430" y="83" textAnchor="middle" fontSize="12">S-03</text>

          <text x="25" y="116" fontSize="13" fontWeight="700">雨水</text>
          <path d="M105 138 H260 H430" fill="none" stroke={colors.map.water} strokeDasharray="9 7" strokeWidth="5" />
          {[105, 260, 430].map((x) => (
            <g key={x}>
              <circle cx={x} cy="138" r="13" fill="#F4EEDD" stroke="#000" strokeWidth="3" />
              <circle cx={x} cy="138" r="4" fill={colors.map.water} />
            </g>
          ))}
          <text x="105" y="171" textAnchor="middle" fontSize="12">SW-01</text>
          <text x="260" y="171" textAnchor="middle" fontSize="12">SW-02</text>
          <text x="430" y="171" textAnchor="middle" fontSize="12">SW-03</text>
        </>
      ) : (
        <>
          <path d="M120 92 L260 48 L400 115" fill="none" stroke="#000" strokeDasharray="8 6" strokeWidth="3" />
          <rect x="50" y="45" width="110" height="90" fill="#F2CC67" stroke="#000" strokeWidth="3" />
          <rect x="205" y="22" width="110" height="90" fill="#F8E8A8" stroke="#000" strokeWidth="3" />
          <rect x="360" y="70" width="110" height="90" fill="#F4EEDD" stroke="#000" strokeWidth="3" />
          <text x="105" y="94" textAnchor="middle" fontSize="16" fontWeight="700">來源街廓</text>
          <text x="260" y="70" textAnchor="middle" fontSize="16" fontWeight="700">第 1 跳</text>
          <text x="415" y="120" textAnchor="middle" fontSize="16" fontWeight="700">第 2 跳</text>
        </>
      )}
    </svg>
  );
}

export function RiskModelPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-container flex-1 px-4 pb-20 pt-8 sm:px-10">
        <section aria-labelledby="risk-model-title" className="pb-8">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-2 pb-5">
            <div className="flex-none">
              <p className="m-0 mb-1.5 text-[15px] font-bold text-accent-text">
                風險模型{" "}
                <span className="font-label font-normal tracking-[0.1em]">
                  / MODEL EXPLAINER
                </span>
              </p>
              <h1
                id="risk-model-title"
                className="m-0 text-[clamp(36px,5vw,46px)] font-black leading-[1.2]"
              >
                城市鼠患，如何評估風險？
              </h1>
            </div>
            <p className="m-0 mb-2 min-w-[280px] flex-[1_1_420px] text-[15px] leading-[1.7]">
              以都市鼠類研究為基礎，建立街廓鼠患風險評估模型與分級方法。
            </p>
          </div>

          <div className="warning-card mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-l-4 border-accent bg-activity-l1 px-5 py-4">
            <div className="min-w-[240px] flex-[1_1_680px] sm:flex sm:items-baseline sm:gap-5">
              <p className="m-0 shrink-0 text-sm font-bold text-accent-text">
                閱讀前提醒
              </p>
              <p className="m-0 mt-1 font-body text-sm font-bold leading-[1.75] sm:mt-0">
                高分只代表在目前資料、選擇因子與計算規則下相對突出，不等於現場一定有更多老鼠；沒有資料也不等於安全。
              </p>
            </div>
            <Link
              to="/map"
              className="button-primary min-h-11 w-full shrink-0 px-5 sm:w-auto"
            >
              回到地圖比較 →
            </Link>
          </div>

          <nav
            aria-label="本頁章節"
            className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t-2 border-b border-ink py-4 text-sm font-bold"
          >
            <a href="#overview">01 模型概覽</a>
            <a href="#factors">02 基礎因子</a>
            <a href="#movement">03 空間傳遞</a>
            <a href="#calculation">04 分數計算</a>
            <a href="#limitations">05 資料與限制</a>
          </nav>
        </section>

        <section id="overview" className="scroll-mt-6 border-b-2 border-ink py-14">
          <SectionHeading
            number="01 — OVERVIEW"
            title="模型概覽"
            intro="先把不同資料轉成可比較的街廓分數，再讓觀測證據沿連通網路有限度地影響鄰近街廓，最後依目前選擇的因子重新分級。"
          />
          <ol className="m-0 mt-8 grid list-none gap-2 p-0 lg:grid-cols-5">
            {WORKFLOW.map((step, index) => (
              <li key={step} className="relative flex min-h-24 items-center border-2 border-ink bg-card p-4 pr-9 font-bold">
                <span className="mr-3 font-label text-accent-text">{String(index + 1).padStart(2, "0")}</span>
                {step}
                {index < WORKFLOW.length - 1 && (
                  <span aria-hidden="true" className="absolute -right-3 z-10 bg-ink px-1.5 py-1 text-card">→</span>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-6 grid gap-4 font-body text-sm leading-[1.8] md:grid-cols-3">
            <p className="m-0 border-t-4 border-ink pt-3"><strong className="font-heading">觀測不等於母體。</strong><br />通報與調查受到人流、通報意願、調查密度和時間影響。</p>
            <p className="m-0 border-t-4 border-ink pt-3"><strong className="font-heading">環境不是鼠跡。</strong><br />食物與躲藏空間只是棲地適宜性的代理變數。</p>
            <p className="m-0 border-t-4 border-ink pt-3"><strong className="font-heading">分級是相對的。</strong><br />每組因子各自重算，不能直接比較不同勾選組合的顏色。</p>
          </div>
        </section>

        <section id="factors" className="scroll-mt-6 border-b-2 border-ink py-14">
          <SectionHeading
            number="02 — FACTORS"
            title="四項基礎因子"
            intro="民眾通報與政府調查屬於觀測證據；食物來源與躲藏空間只描述可能支持鼠類活動的環境條件。四者不是同一種證據。"
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {FACTOR_CARDS.map((factor) => (
              <article key={factor.title} className="border-2 border-ink bg-card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 border-b border-ink pb-4">
                  <div>
                    <p className="m-0 font-label text-xs text-accent-text">{factor.number} / {factor.kind}</p>
                    <h3 className="m-0 mt-1 text-2xl font-black">{factor.title}</h3>
                  </div>
                  <strong className="font-label text-3xl text-accent-text">{factor.weight}</strong>
                </div>
                <p className="m-0 mt-4 font-body text-sm leading-[1.8]">{factor.summary}</p>
                <dl className="m-0 mt-4 grid gap-3 text-sm">
                  <div><dt className="font-bold">計分規則</dt><dd className="m-0 mt-1 font-body leading-[1.7] text-muted">{factor.rule}</dd></div>
                  <div><dt className="font-bold">資料來源</dt><dd className="m-0 mt-1 font-body leading-[1.7] text-muted">{factor.source}</dd></div>
                </dl>
              </article>
            ))}
          </div>
          <div className="mt-6"><FactorWeightExample /></div>
        </section>

        <section id="movement" className="scroll-mt-6 border-b-2 border-ink py-14">
          <SectionHeading
            number="03 — PROPAGATION"
            title="空間傳遞模型"
            intro="只有民眾通報與政府調查會傳遞。食物與躲藏條件留在原街廓；地面與下水道各走自己的連通圖，不會在同一路徑中混用。"
          />
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="border-2 border-ink bg-card p-5 sm:p-6">
              <p className="m-0 font-label text-xs text-accent-text">GROUND NETWORK</p>
              <h3 className="m-0 mt-1 text-2xl font-black">地面移動</h3>
              <NetworkDiagram />
              <ul className="mb-0 mt-5 space-y-2 pl-5 font-body text-sm leading-[1.75]">
                <li>只建立相距 100 m 內的候選街廓邊。</li>
                <li>距離衰減為 exp(−max(distance, 1) / 50)。</li>
                <li>再乘上道路寬度阻隔權重，最寬道路影響最小。</li>
                <li>最多 {MAX_PROPAGATION_HOPS} 跳；同一來源與目標保留最強路徑。</li>
              </ul>
            </article>
            <article className="border-2 border-ink bg-card p-5 sm:p-6">
              <p className="m-0 font-label text-xs text-accent-text">UNDERGROUND NETWORK</p>
              <h3 className="m-0 mt-1 text-2xl font-black">下水道移動</h3>
              <NetworkDiagram underground />
              <ul className="mb-0 mt-5 space-y-2 pl-5 font-body text-sm leading-[1.75]">
                <li>依管線兩端的實際人孔 ID 建立連通，不以管線距離猜測相連。</li>
                <li>人孔在 30 m 內配對街廓；邊權重依管線長度以 100 m 尺度衰減。</li>
                <li>污水與雨水系統分開，除非資料明確給出連接。</li>
                <li>最多 {MAX_PROPAGATION_HOPS} 跳，並保留最強路徑。</li>
              </ul>
            </article>
          </div>
          <div className="mt-6">
            <ConnectivityExample />
          </div>
        </section>

        <section id="calculation" className="scroll-mt-6 border-b-2 border-ink py-14">
          <SectionHeading
            number="04 — SCORING"
            title="分數計算與風險分級"
            intro="從點位歸屬、面積校正到相對分級，每一步都只在目前資料與所選因子下成立。"
          />
          <ol className="m-0 mt-8 grid list-none gap-x-6 gap-y-7 p-0 md:grid-cols-2 lg:grid-cols-3">
            {[
              ["01", "點位計分", `${FULL_SCORE_RADIUS_METERS} m 內為 1；${FULL_SCORE_RADIUS_METERS}–${HALF_SCORE_RADIUS_METERS} m 為 0.5，且一筆觀測不會在同一元件重複計分。`],
              ["02", "面積校正", `原始分數除以 area_ha^β，目前 β = ${AREA_ADJUSTMENT_BETA}；零面積安全回傳 0。`],
              ["03", "P95 正規化", "各因子用正值的第 95 百分位作參考值，並截在 0–1；參考值保存在模型 metadata。"],
              ["04", "觀測證據傳遞", "民眾與政府分別沿地面、下水道網路傳遞，與本地值取最大；環境因子不傳遞。"],
              ["05", "3:3:1:1 加權", "只納入勾選因子：民眾 3、政府 3、食物 1、躲藏 1，再除以所選權重總和。"],
              ["06", "依組合重新映射", "每種因子組合以正分的最低與最高值做 min–max remap；只有一種正分時設為 0.5。"],
              ["07", "L1–L5 相對分級", "重映射後依五個等寬級距著色；分數為 0 的街廓維持未分級，不填色。"],
            ].map(([number, title, body]) => (
              <li key={number} className="border-t-4 border-ink pt-4">
                <span className="font-label text-sm text-accent-text">{number}</span>
                <h3 className="m-0 mt-1 text-xl font-black">{title}</h3>
                <p className="m-0 mt-2 font-body text-sm leading-[1.8] text-muted">{body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 border-2 border-ink bg-card p-5 sm:p-6">
            <h3 className="m-0 text-2xl font-black">相對分級</h3>
            <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {LEVELS.map((item) => (
                <div key={item.level} className="border border-ink p-3" style={{ backgroundColor: item.color }}>
                  <strong className="font-label text-xl">{item.level}</strong>
                  <span className="mt-3 block text-sm font-bold">{item.label}</span>
                </div>
              ))}
              <div className="border-2 border-dashed border-ink bg-paper p-3">
                <strong className="font-label text-base">未分級／資料不足</strong>
                <span className="mt-3 block text-sm font-bold">不填色</span>
              </div>
            </div>
            <p className="m-0 mt-5 border-l-4 border-accent pl-4 font-body text-sm font-bold leading-[1.8]">
              地圖顏色會隨勾選因子重新分配。不同因子組合的 L1 與 L1 代表各自組合內的相對位置，不能直接當成同一把尺比較。
            </p>
          </div>

          <details className="mt-5 border-2 border-ink bg-card p-5">
            <summary className="cursor-pointer font-bold">查看技術公式</summary>
            <div className="mt-4 space-y-3 font-body text-sm leading-[1.8]">
              <p className="m-0"><code>areaAdjusted = rawScore / area_ha^β</code></p>
              <p className="m-0"><code>normalized = min(1, areaAdjusted / P95)</code></p>
              <p className="m-0"><code>groundEdge = exp(-max(distance, 1) / 50) × roadBarrier</code></p>
              <p className="m-0"><code>sewerEdge = exp(-max(pipeLength, 1) / 100)</code></p>
              <p className="m-0"><code>final = Σ(selectedFactorScore × weight) / Σ(selectedWeight)</code></p>
              <p className="m-0"><code>remapped = (final - minPositive) / (maxPositive - minPositive)</code></p>
            </div>
          </details>
        </section>

        <section id="limitations" className="scroll-mt-6 py-14">
          <SectionHeading
            number="05 — DATA & LIMITS"
            title="資料來源與限制"
            intro="理解資料是實測、推導還是示例，比單看一個分數更重要。模型保留可追溯的資料分類，也把目前無法回答的問題明確寫出來。"
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["實際資料", "REAL", "政府開放資料、已發布通報、政府調查與現場環境觀察。來源品質、時間與覆蓋範圍不一致。"],
              ["衍生資料", "DERIVED", "街廓元件、面積、P95 參考值、地面／下水道連通圖與最後相對分級。可重建，但依賴規則選擇。"],
              ["合成資料", "SYNTHETIC", "開發環境的 mock／seed 紀錄，以及本頁互動範例值。只用於展示與測試，不應當成研究觀測。"],
            ].map(([title, label, body]) => (
              <article key={title} className="border-2 border-ink bg-card p-5">
                <p className="m-0 font-label text-xs tracking-[0.12em] text-accent-text">{label}</p>
                <h3 className="m-0 mt-1 text-xl font-black">{title}</h3>
                <p className="m-0 mt-3 font-body text-sm leading-[1.8] text-muted">{body}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.75fr]">
            <div>
              <h3 className="m-0 text-2xl font-black">解讀時請保留這些限制</h3>
              <ul className="mb-0 mt-4 grid gap-3 pl-5 font-body text-sm leading-[1.8] sm:grid-cols-2">
                <li>民眾通報有可見度、人口、人流、數位使用與通報意願偏差。</li>
                <li>政府調查受作業範圍、頻率與記錄方式影響，不是全市等密度抽樣。</li>
                <li>食物與躲藏空間是代理變數，未經本專案證明為鼠患因果因子。</li>
                <li>地面與下水道連通是啟發式模型，不是個體追蹤或移動機率。</li>
                <li>空間相關不代表因果；同時出現可能來自共同的城市條件。</li>
                <li>資料缺漏或分數為零不代表該處沒有鼠類，也不代表安全。</li>
              </ul>
            </div>
            <aside className="border-l-4 border-ink pl-5">
              <h3 className="m-0 text-xl font-black">繼續閱讀</h3>
              <div className="mt-4 flex flex-col gap-3 text-sm font-bold">
                <Link to="/literature">研究文獻與防治知識 →</Link>
                <a href={`${GITHUB_DOCS}/research/data-sources.md`} target="_blank" rel="noreferrer">資料來源清單 ↗</a>
                <a href={`${GITHUB_DOCS}/data/rules.md`} target="_blank" rel="noreferrer">完整計分與連通規範 ↗</a>
                <Link to="/map">在地圖上比較因子 →</Link>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
