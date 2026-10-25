import { Navigate, Link } from "react-router-dom";
import { StaffHeader, StaffSidebar } from "../../components/StaffHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { useRequireOfficial } from "../../features/official/useRequireOfficial";
import { useOverviewData } from "../../features/official/overview";
import { baitPointStatus, FETCH_LIMIT, summarizeOverview, type OverviewData } from "../../features/official/overviewStats";
import { BAIT_ACTIONS, SURVEY_RESULTS } from "../../features/official/recordOptions";
import { REPORT_TYPE_LABEL } from "../../features/report/steps";

const label = <T extends string>(options: { value: T; label: string }[], value: T) =>
  options.find((o) => o.value === value)?.label ?? value;

const formatDate = (date: Date) =>
  `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;

const BAIT_STATUS_LABEL = {
  tracking: "追蹤中",
  removed: "已移除（不代表現場已安全）",
  not_started: "尚無事件",
} as const;

/**
 * 對應 Claude Artifact Staff.dc.html 的「工作總覽」。統計與近期作業都直接來自 Firestore
 * 真實資料。「待審核通報」「待執行調查」仍沒有資料來源（審核狀態欄位要等 Phase 0 核准
 * 資料契約），所以不放假數字，也不用「已處理／待處理」之類尚未定義的狀態。
 */
export function OfficialOverviewPage() {
  const gate = useRequireOfficial();
  const state = useOverviewData();

  if (gate.status === "loading") return null;
  if (gate.status === "signed-out") return <Navigate to="/login" replace />;
  if (gate.status === "no-access") return <Navigate to="/account-status" replace />;

  return (
    <>
      <StaffHeader />
      <main className="mx-auto flex w-full max-w-container flex-wrap items-start gap-x-12 gap-y-8 px-10 pb-16 pt-8">
        <StaffSidebar />
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="m-0 text-[30px] font-black">工作總覽</h1>
            <Link
              to="/official/record"
              className="button-primary min-h-12 w-fit px-6 text-base"
            >
              + 新增紀錄
            </Link>
          </div>

          {state.status === "loading" && <p className="m-0 font-body">載入中…</p>}
          {state.status === "error" && (
            <p role="alert" className="m-0 border-[1.5px] border-ink bg-activity-l1 px-3.5 py-3 font-body text-sm">
              資料暫時無法載入，請稍後重新整理。
            </p>
          )}
          {state.status === "ready" && <Overview data={state.data} />}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Overview({ data }: { data: OverviewData }) {
  const stats = summarizeOverview(data, Date.now());
  const plus = stats.truncated ? "+" : "";
  const cards = [
    { title: "近 30 天民眾通報", value: stats.reports30d },
    { title: "近 30 天現場調查", value: stats.observations30d },
    { title: "其中發現鼠跡", value: stats.evidenceFound30d },
    { title: "追蹤中的投藥點", value: stats.activeBaitPoints },
  ];

  return (
    <>
      <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        {cards.map((card) => (
          <div key={card.title} className="border-[1.5px] border-ink bg-card px-[18px] py-3.5">
            <dt className="font-body text-[13px]">{card.title}</dt>
            <dd className="m-0 mt-1.5 text-[30px] font-black">
              {card.value}
              {plus}
            </dd>
          </div>
        ))}
      </dl>
      {stats.truncated && (
        <p className="m-0 font-body text-xs text-[#4A463C]">
          資料量超過 {FETCH_LIMIT} 筆，統計只計入最近的 {FETCH_LIMIT} 筆，實際數字可能更高。
        </p>
      )}

      <Section title="最新民眾通報" empty="目前沒有民眾通報。" isEmpty={data.reports.length === 0}>
        {data.reports.slice(0, 8).map(({ id, data: r }) => (
          <Row
            key={id}
            title={`${r.district}・${r.addressText}`}
            meta={`${formatDate(r.createdAt.toDate())}　${REPORT_TYPE_LABEL[r.reportType]}${r.photoPaths.length ? `　${r.photoPaths.length} 張照片` : ""}`}
            body={r.description}
          />
        ))}
      </Section>

      <Section title="最近現場調查" empty="目前沒有調查紀錄。" isEmpty={data.observations.length === 0}>
        {data.observations.slice(0, 8).map(({ id, data: o }) => (
          <Row
            key={id}
            title={`${o.district}・${o.addressText}`}
            meta={`${formatDate(o.observedAt.toDate())}　${label(SURVEY_RESULTS, o.surveyResult)}`}
            body={o.description}
          />
        ))}
      </Section>

      <Section title="投藥點追蹤" empty="目前沒有投藥紀錄。" isEmpty={data.baitRecords.length === 0}>
        {data.baitRecords.slice(0, 8).map(({ id, data: b }) => {
          const last = b.events.at(-1);
          const actions = last ? last.actions.map((a) => label(BAIT_ACTIONS, a)).join("、") : "";
          return (
            <Row
              key={id}
              title={`${b.district}・${b.addressText}`}
              meta={`${BAIT_STATUS_LABEL[baitPointStatus(b)]}${last ? `　最近：${formatDate(last.time.toDate())} ${actions}` : ""}`}
            />
          );
        })}
      </Section>
    </>
  );
}

function Section({ title, empty, isEmpty, children }: { title: string; empty: string; isEmpty: boolean; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5" aria-label={title}>
      <h2 className="m-0 border-b-2 border-ink pb-2 text-xl font-black">{title}</h2>
      {isEmpty ? <p className="m-0 font-body text-sm text-[#4A463C]">{empty}</p> : <ul className="m-0 flex list-none flex-col gap-2 p-0">{children}</ul>}
    </section>
  );
}

function Row({ title, meta, body }: { title: string; meta: string; body?: string | undefined }) {
  return (
    <li className="flex flex-col gap-1 border-[1.5px] border-ink bg-card px-4 py-3 font-body">
      <span className="text-[15px] font-bold">{title}</span>
      <span className="text-[13px] text-[#4A463C]">{meta}</span>
      {body && <span className="text-sm leading-[1.7]">{body}</span>}
    </li>
  );
}
