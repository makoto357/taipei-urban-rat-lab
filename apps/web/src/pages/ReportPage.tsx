import { useState } from "react";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { REPORT_STEPS, REPORT_TYPE_LABEL, SAFETY_NOTE, type ReportType } from "../features/report/steps";

/**
 * 通報頁對應 Claude Artifact Report.dc.html：未登入時顯示 gate（示意，真正的
 * 登入閘門待整合 apps/web 的 auth context），登入後是三步驟表單，送出後顯示完成畫面。
 * 地點步驟的地圖標記、照片上傳/壓縮狀態目前都是靜態示意，尚未接 MapLibre 與
 * Cloud Storage 上傳管線（見 plan.md §3 media 與 apps/functions processUpload）。
 */
export function ReportPage() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);

  const signedIn = started;
  const canNext = step !== 1 || reportType !== null;

  function restart() {
    setStep(1);
    setAgreed(false);
    setDone(false);
    setReportType(null);
  }

  return (
    <>
      <SiteHeader signedIn={signedIn} />
      <main className="mx-auto flex w-full max-w-container flex-col gap-7 px-10 pb-16 pt-8">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 border-b-2 border-ink pb-5">
          <div>
            <p className="m-0 mb-1.5 text-[15px] font-bold text-accent-text">
              鼠跡通報 <span className="font-label font-normal tracking-[0.1em]">/ REPORT</span>
            </p>
            <h1 className="m-0 text-[46px] font-black leading-[1.2]">發現鼠跡？告訴我們。</h1>
          </div>
          <p className="m-0 mb-2 text-[15px] leading-[1.7]">三個步驟完成通報。你的觀察可以幫助我們掌握都市環境的鼠跡狀況。</p>
        </div>

        <div className="flex flex-wrap items-start gap-x-12 gap-y-8">
          <StepList step={done ? 4 : step} />

          <div className="min-w-0 flex-[999_1_560px] max-w-[720px]">
            {!signedIn ? (
              <GateCard onStart={() => setStarted(true)} />
            ) : done ? (
              <DoneCard reportType={reportType} onRestart={restart} />
            ) : (
              <ReportForm
                step={step}
                reportType={reportType}
                setReportType={setReportType}
                agreed={agreed}
                setAgreed={setAgreed}
                canNext={canNext}
                onNext={() => setStep((s) => s + 1)}
                onBack={() => setStep((s) => s - 1)}
                onSubmit={() => {
                  if (agreed) setDone(true);
                }}
              />
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function StepList({ step }: { step: number }) {
  return (
    <ol aria-label="通報步驟" className="m-0 flex max-w-[320px] flex-1 flex-col list-none p-0" style={{ flexBasis: "240px" }}>
      {REPORT_STEPS.map((s, i) => {
        const n = i + 1;
        const isDone = n < step;
        const active = n === step;
        const bg = active ? "bg-accent" : isDone ? "bg-ink" : "bg-card";
        const fg = isDone ? "text-card" : "text-ink";
        return (
          <li key={s.title} aria-current={active ? "step" : undefined} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-ink font-label text-[15px] ${bg} ${fg}`}
              >
                {String(n).padStart(2, "0")}
              </span>
              {i < REPORT_STEPS.length - 1 && <span aria-hidden="true" className="h-[30px] w-[1.5px] bg-ink" />}
            </div>
            <div className="pt-1.5">
              <p className="m-0 text-[17px] font-black">{s.title}</p>
              <p className="m-0 mt-0.5 font-body text-xs text-[#4A463C]">{s.desc}</p>
            </div>
          </li>
        );
      })}
      <li className="mt-6 border-[1.5px] border-ink bg-card px-3.5 py-3 font-body text-xs leading-[1.7]">
        通報需要登入，才能讓你之後查看處理狀態。
      </li>
    </ol>
  );
}

function GateCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex aspect-[16/11] flex-col items-center justify-center gap-6 overflow-hidden border-2 border-ink bg-card">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true" className="absolute inset-0">
        <line x1="0" y1="0" x2="100" y2="100" stroke="#000000" strokeWidth="0.25" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="#000000" strokeWidth="0.25" />
      </svg>
      <svg width="72" height="72" viewBox="0 0 90 90" fill="none" aria-hidden="true" className="relative rounded-full bg-card">
        <path d="M55.2273 32.7273C55.2273 27.0789 50.6484 22.5 45 22.5C39.3516 22.5 34.7727 27.0789 34.7727 32.7273C34.7727 38.3756 39.3516 42.9545 45 42.9545V51.1364C34.8329 51.1364 26.5909 42.8943 26.5909 32.7273C26.5909 22.5602 34.8329 14.3182 45 14.3182C55.1671 14.3182 63.4091 22.5602 63.4091 32.7273C63.4091 42.8943 55.1671 51.1364 45 51.1364V42.9545C50.6484 42.9545 55.2273 38.3756 55.2273 32.7273Z" fill="#000000" />
        <path d="M45 42.9545C52.6157 42.9545 59.9736 45.2997 65.3786 51.2243C70.7375 57.0985 73.6364 65.9027 73.6364 77.7273H65.4545C65.4545 67.1407 62.8589 60.6033 59.3342 56.7394C55.8555 52.9262 50.9402 51.1364 45 51.1364C39.0598 51.1364 34.1445 52.9262 30.6658 56.7394C27.1411 60.6033 24.5455 67.1407 24.5455 77.7273H16.3636C16.3636 65.9027 19.2625 57.0985 24.6214 51.2243C30.0264 45.2997 37.3843 42.9545 45 42.9545Z" fill="#000000" />
        <path d="M81.8182 45C81.8182 24.6659 65.3341 8.18182 45 8.18182C24.6659 8.18182 8.18182 24.6659 8.18182 45C8.18182 65.3341 24.6659 81.8182 45 81.8182V90C20.1472 90 0 69.8528 0 45C0 20.1472 20.1472 0 45 0C69.8528 0 90 20.1472 90 45C90 69.8528 69.8528 90 45 90V81.8182C65.3341 81.8182 81.8182 65.3341 81.8182 45Z" fill="#000000" />
      </svg>
      <p className="relative m-0 bg-card px-3 text-center font-body text-[15px]">登入後即可開始填寫通報。</p>
      <button
        type="button"
        onClick={onStart}
        className="relative min-h-12 border-2 border-ink bg-ink px-7 font-heading text-base font-bold text-card"
      >
        登入開始填表
      </button>
    </div>
  );
}

function ReportForm({
  step,
  reportType,
  setReportType,
  agreed,
  setAgreed,
  canNext,
  onNext,
  onBack,
  onSubmit,
}: {
  step: number;
  reportType: ReportType | null;
  setReportType: (t: ReportType) => void;
  agreed: boolean;
  setAgreed: (v: boolean) => void;
  canNext: boolean;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const typeLabel = reportType ? REPORT_TYPE_LABEL[reportType] : REPORT_TYPE_LABEL.rat;

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-6 border-2 border-ink bg-card px-8 py-7"
    >
      {step === 1 && (
        <section className="flex flex-col gap-[18px]">
          <h2 className="m-0 text-[26px] font-black">1. 通報類型與照片</h2>
          <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
            <legend className="mb-2.5 p-0 text-base font-bold">你看到的是什麼？</legend>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3 font-body">
              <ReportTypeCard
                active={reportType === "rat"}
                title="看到老鼠／鼠跡"
                description="活鼠、死鼠、排泄物、咬痕或鼠洞"
                onSelect={() => setReportType("rat")}
              />
              <ReportTypeCard
                active={reportType === "bait"}
                title="看到餌劑／餌站"
                description="餌盒、散放藥餌或警示標示"
                onSelect={() => setReportType("bait")}
              />
            </div>
          </fieldset>
          <div role="note" className="flex items-start gap-3 border-[1.5px] border-ink bg-activity-l1 px-3.5 py-3 font-body text-[13px] leading-[1.7]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth={2} aria-hidden="true" className="mt-0.5 flex-none">
              <path d="M12 3 L22 20 H2 Z" strokeLinejoin="round" />
              <path d="M12 10v5M12 17.5v.5" />
            </svg>
            <p className="m-0">{SAFETY_NOTE[reportType ?? "rat"]}</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="m-0 text-base font-bold">
              照片 <span className="font-body text-[13px] font-normal text-[#4A463C]">（選填，最多 3 張；JPEG／PNG／WebP，每張 8 MB 以內）</span>
            </p>
            <div className="grid grid-cols-3 gap-3 font-body">
              <label className="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 border-2 border-dashed border-ink bg-paper text-center">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth={1.8} aria-hidden="true">
                  <rect x="3" y="6" width="18" height="14" rx="1" />
                  <circle cx="12" cy="13" r="3.5" />
                  <path d="M8 6 L9.5 3.5 H14.5 L16 6" />
                </svg>
                <span className="text-sm font-medium">拍照或選擇照片</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="absolute h-px w-px opacity-0" />
              </label>
            </div>
            <p className="m-0 font-body text-xs text-[#4A463C]">上傳失敗時可以重試；照片處理完成前無法送出通報。</p>
          </div>
          <label className="flex flex-col gap-2 text-base font-bold">
            描述 <span className="font-body text-[13px] font-normal text-[#4A463C]">（選填）</span>
            <textarea
              rows={3}
              placeholder="例如：晚上在巷口垃圾集中處看到一隻老鼠跑進水溝"
              className="rounded-none border-[1.5px] border-ink bg-paper px-3 py-2.5 font-body text-[15px] font-normal leading-[1.6]"
            />
          </label>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-3.5">
          <h2 className="m-0 text-[26px] font-black">2. 地點</h2>
          <div className="flex flex-wrap gap-2.5">
            <label className="flex min-h-11 flex-[1_1_280px] items-center gap-2.5 border-[1.5px] border-ink bg-paper px-3 font-body">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth={2} aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M16.5 16.5 L21 21" />
              </svg>
              <span className="sr-only">搜尋地址或地標</span>
              <input type="search" placeholder="搜尋地址或地標" className="min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none" />
            </label>
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 border-[1.5px] border-ink bg-card px-4 font-heading text-[15px] font-bold"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth={2} aria-hidden="true">
                <circle cx="12" cy="12" r="7" />
                <circle cx="12" cy="12" r="2.5" fill="#000000" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              使用目前位置
            </button>
          </div>
          <div
            role="img"
            aria-label="選擇地點的地圖（尺寸預留，地圖引擎尚未接入）"
            className="relative flex h-[300px] items-center justify-center border-[1.5px] border-ink bg-[#E4E2DC]"
          >
            <p className="m-0 font-body text-sm text-muted">地圖區域（尺寸預留）</p>
            <p className="absolute left-3 top-3 m-0 border-[1.5px] border-ink bg-card px-2.5 py-1.5 font-body text-xs">
              拖曳地圖，把標記對準發現鼠跡的位置
            </p>
          </div>
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1.5 font-body text-[13px]">
            <p className="m-0">
              <strong className="font-medium">地址：</strong>[依標記位置帶入的地址]・[行政區]
            </p>
            <p className="m-0 text-[#4A463C]">定位精度約 ±[N] 公尺</p>
          </div>
          <p className="m-0 font-body text-xs text-[#4A463C]">你確認地點前，我們不會送出任何定位資料。</p>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-[18px]">
          <h2 className="m-0 text-[26px] font-black">3. 日期與確認</h2>
          <div className="flex flex-wrap gap-3 font-body">
            <label className="flex flex-[1_1_160px] flex-col gap-1.5 text-[13px]">
              觀察日期
              <input type="date" defaultValue="2026-10-22" className="min-h-11 border-[1.5px] border-ink bg-paper px-2.5 text-[15px]" />
            </label>
            <label className="flex flex-[1_1_140px] flex-col gap-1.5 text-[13px]">
              大約時間
              <input type="time" defaultValue="21:30" className="min-h-11 border-[1.5px] border-ink bg-paper px-2.5 text-[15px]" />
            </label>
          </div>
          <dl className="m-0 grid grid-cols-[96px_1fr] gap-x-4 gap-y-2.5 border-[1.5px] border-ink bg-paper px-[18px] py-4 font-body text-sm">
            <dt className="font-medium">類型</dt>
            <dd className="m-0">{typeLabel}</dd>
            <dt className="font-medium">地點</dt>
            <dd className="m-0">[地址]・[行政區]</dd>
          </dl>
          <div className="flex flex-col gap-2.5 border-2 border-ink bg-card px-[18px] py-4">
            <p className="m-0 text-base font-black">公開方式</p>
            <ul className="m-0 list-disc pl-5 font-body text-[13px] leading-[1.8]">
              <li>通報先經人工審核，通過後才會顯示在公開地圖上。</li>
              <li>公開時會顯示精確點位；若位於私人住宅或可能辨識住戶，會改以區域顯示。</li>
              <li>照片會移除拍攝位置等資訊，並遮蔽可辨識的人臉、門牌或車牌。</li>
              <li>你的帳號資料不會公開。</li>
            </ul>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 font-body text-sm font-medium">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="m-0 h-5 w-5 accent-ink" />
              我了解公開方式
            </label>
          </div>
        </section>
      )}

      <div className="flex flex-wrap justify-between gap-3 border-t-2 border-ink pt-4">
        {step > 1 && (
          <button
            type="button"
            onClick={onBack}
            className="min-h-[52px] border-2 border-ink bg-card px-7 font-heading text-base font-bold"
          >
            ← 上一步
          </button>
        )}
        <span className="flex-1" />
        {step < 3 && (
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className={`min-h-[52px] border-2 px-10 font-heading text-base font-bold ${
              canNext ? "border-ink bg-ink text-card" : "cursor-not-allowed border-unknown bg-unknown text-muted"
            }`}
          >
            下一步 →
          </button>
        )}
        {step === 3 && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!agreed}
            className={`min-h-[52px] border-2 px-10 font-heading text-base font-bold ${
              agreed ? "border-ink bg-ink text-card" : "cursor-not-allowed border-unknown bg-unknown text-muted"
            }`}
          >
            送出通報
          </button>
        )}
      </div>
    </form>
  );
}

function ReportTypeCard({
  active,
  title,
  description,
  onSelect,
}: {
  active: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <label className={`flex items-start gap-3 border-2 border-ink p-4 ${active ? "bg-activity-l1" : "bg-paper"}`}>
      <input type="radio" name="reportType" checked={active} onChange={onSelect} className="mt-0.5 h-5 w-5 flex-none accent-ink" />
      <span className="flex flex-col gap-1">
        <span className="font-heading text-lg font-black">{title}</span>
        <span className="text-[13px] leading-[1.6] text-[#4A463C]">{description}</span>
      </span>
    </label>
  );
}

function DoneCard({ reportType, onRestart }: { reportType: ReportType | null; onRestart: () => void }) {
  return (
    <div className="flex flex-col gap-[18px] border-2 border-ink bg-card px-9 py-10">
      <p className="m-0 font-label text-[14px] tracking-[0.1em] text-accent-text">REPORT RECEIVED</p>
      <h2 className="m-0 text-[32px] font-black">已收到你的通報，謝謝。</h2>
      <dl className="m-0 grid grid-cols-[96px_1fr] gap-x-4 gap-y-2.5 font-body text-[15px]">
        <dt className="font-medium">通報類型</dt>
        <dd className="m-0">{reportType ? REPORT_TYPE_LABEL[reportType] : REPORT_TYPE_LABEL.rat}</dd>
        <dt className="font-medium">通報編號</dt>
        <dd className="m-0 font-label text-lg tracking-[0.06em]">RPT-[編號]</dd>
        <dt className="font-medium">目前狀態</dt>
        <dd className="m-0">
          <span className="border-[1.5px] border-ink bg-activity-l1 px-2.5 py-0.5 text-[13px]">待審核</span>
        </dd>
      </dl>
      <p className="m-0 font-body text-sm leading-[1.8]">
        審核通過後，這筆通報才會出現在公開地圖上。公開前，照片會移除拍攝位置等資訊，並遮蔽可辨識的人臉、門牌或車牌。
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="min-h-12 border-2 border-ink bg-card px-6 font-heading text-base font-bold"
        >
          再通報一筆
        </button>
      </div>
    </div>
  );
}
