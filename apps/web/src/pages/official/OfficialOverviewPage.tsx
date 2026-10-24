import { Navigate, Link } from "react-router-dom";
import { StaffHeader, StaffSidebar } from "../../components/StaffHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { useRequireOfficial } from "../../features/official/useRequireOfficial";

/**
 * 對應 Claude Artifact Staff.dc.html 的「工作總覽」。原設計有待審核通報／
 * 待執行調查／待追蹤投藥點等統計卡片與近期作業列表，但那些需要審核佇列
 * （plan.md Phase 5，待 Phase 0 核准資料契約）才有資料來源，這裡先不放
 * 假數字；只提供進入「新增紀錄」的入口。
 */
export function OfficialOverviewPage() {
  const gate = useRequireOfficial();

  if (gate.status === "loading") return null;
  if (gate.status === "signed-out") return <Navigate to="/login" replace />;
  if (gate.status === "no-access") return <Navigate to="/account-status" replace />;

  return (
    <>
      <StaffHeader />
      <main className="mx-auto flex w-full max-w-container flex-wrap items-start gap-x-12 gap-y-8 px-10 pb-16 pt-8">
        <StaffSidebar />
        <div className="min-w-0 flex-[999_1_560px] flex flex-col gap-5">
          <h1 className="m-0 text-[30px] font-black">工作總覽</h1>
          <p className="m-0 font-body text-sm text-[#4A463C]">
            通報審核佇列與統計摘要尚未開放（待 Phase 0 核准資料契約後實作）。
          </p>
          <Link
            to="/official/record"
            className="inline-flex min-h-12 w-fit items-center justify-center rounded-full bg-ink px-6 font-heading text-base font-bold text-card no-underline"
          >
            + 新增紀錄
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
