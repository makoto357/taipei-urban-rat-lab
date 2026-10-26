import { Link, useLocation } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";

const SIDEBAR_ITEMS = [
  { label: "工作總覽", to: "/official" },
  { label: "新增紀錄", to: "/official/record" },
] as const;

/**
 * 市府作業平台沿用主站導覽；SiteHeader 依登入身分將「鼠跡通報」改成「作業平台」。
 * 「通報審核」「投藥紀錄（查核列表）」尚未實作——plan.md Phase 5 要求審核
 * 佇列待 Phase 0 核准資料契約後才能定案，這裡先不放連到不存在頁面的連結。
 */
export function StaffHeader() {
  return <SiteHeader />;
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
