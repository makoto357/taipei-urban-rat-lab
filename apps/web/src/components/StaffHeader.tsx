import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

const SIDEBAR_ITEMS = [
  { label: "工作總覽", to: "/official" },
  { label: "新增紀錄", to: "/official/record" },
] as const;

/**
 * 市府作業平台共用外框，對應 Claude Artifact Staff.dc.html。
 * 「通報審核」「投藥紀錄（查核列表）」尚未實作——plan.md Phase 5 要求審核
 * 佇列待 Phase 0 核准資料契約後才能定案，這裡先不放連到不存在頁面的連結。
 */
export function StaffHeader() {
  return (
    <header className="mx-auto w-full max-w-container px-10 pt-7">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-ink pb-3.5">
        <div className="flex flex-wrap items-center gap-3.5">
          <Link to="/" className="font-brand text-[38px] font-bold leading-none text-ink no-underline">
            TAIPEI RAT LAB
          </Link>
          <span aria-hidden="true" className="h-[30px] w-0.5 bg-accent" />
          <span className="text-[26px] font-black text-accent-text">市府作業平台</span>
        </div>
        <StaffNavActions />
      </div>
      <div className="mt-[3px] h-px bg-ink" />
    </header>
  );
}

function StaffNavActions() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav aria-label="主要頁面" className="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-base font-bold">
      <Link to="/map" className="button-text gap-1.5 px-2.5">
        <span className="button-text__number font-label">01</span>
        <span className="button-text__label">地圖</span>
      </Link>
      <Link
        to="/official"
        aria-current="page"
        className="button-text gap-1.5 px-2.5"
      >
        <span className="button-text__number font-label">02</span>
        <span className="button-text__label underline decoration-2 underline-offset-[6px]">作業平台</span>
      </Link>
      <Link to="/literature" className="button-text gap-1.5 px-2.5">
        <span className="button-text__number font-label">03</span>
        <span className="button-text__label">知識</span>
      </Link>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          navigate("/");
        }}
        className="ml-2 inline-flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-ink bg-transparent px-5 text-[15px] text-accent-text"
      >
        登出
      </button>
    </nav>
  );
}

export function StaffSidebar() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="作業平台"
      className="flex max-w-[220px] flex-[1_1_180px] flex-col self-stretch border-r-2 border-ink pr-6 text-lg font-black"
    >
      {SIDEBAR_ITEMS.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 items-center no-underline ${
              active ? "underline decoration-2 underline-offset-[7px]" : ""
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
