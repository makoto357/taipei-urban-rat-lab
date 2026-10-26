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
      className="grid min-w-0 w-full grid-cols-2 gap-3 self-stretch border-b border-ink pb-3 text-base font-black lg:flex lg:max-w-[220px] lg:flex-[1_1_180px] lg:flex-col lg:gap-0 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6 lg:text-lg"
    >
      {SIDEBAR_ITEMS.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 min-w-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${active ? "underline decoration-2 underline-offset-[7px]" : "no-underline"
              }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
