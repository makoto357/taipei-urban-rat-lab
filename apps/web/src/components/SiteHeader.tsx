import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

const NAV_ITEMS = [
  { num: "01", label: "地圖探索", to: "/map" },
  { num: "02", label: "風險模型", to: "/risk-model" },
  { num: "03", label: "鼠跡通報", to: "/report" },
  { num: "04", label: "文獻知識", to: "/literature" },
] as const;

/** 市府人員不使用市民通報表單（Rules 只允許 citizen 建立），改由作業平台新增紀錄。 */
const OFFICIAL_NAV_ITEMS = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  { num: "03", label: "作業平台", to: "/official" },
  NAV_ITEMS[3],
] as const;

export function SiteHeader() {
  const { pathname } = useLocation();
  const { user, membership, signOut } = useAuth();
  const isOfficial =
    membership?.status === "active" && (membership.role === "official" || membership.role === "admin");
  const navItems = isOfficial ? OFFICIAL_NAV_ITEMS : NAV_ITEMS;
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <header className="mx-auto w-full max-w-container px-4 pt-5 sm:px-10 sm:pt-7">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-ink pb-3.5">
        <Link to="/" className="font-brand text-[30px] font-bold leading-none text-ink no-underline sm:text-[38px]">
          TAIPEI RAT LAB
        </Link>
        <nav aria-label="主要頁面" className="flex w-full flex-wrap items-center gap-x-1 gap-y-1.5 text-sm font-bold lg:w-auto lg:text-base">
          {navItems.map((item, i) => {
            const active = pathname === item.to || (item.to === "/official" && pathname.startsWith("/official"));
            return (
              <span key={item.to} className="flex items-center gap-1">
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className="button-text gap-1.5 px-2 sm:px-3"
                >
                  <span className="button-text__number font-label">{item.num}</span>
                  <span
                    className={`button-text__label ${
                      active ? "underline decoration-2 underline-offset-[6px]" : ""
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
                {i < navItems.length - 1 && (
                  <span aria-hidden="true" className="text-muted">
                    /
                  </span>
                )}
              </span>
            );
          })}
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="ml-2 inline-flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-ink bg-transparent px-5 font-heading text-[15px] text-accent-text"
            >
              登出
            </button>
          ) : (
            <Link
              to="/login"
              aria-current={pathname === "/login" ? "page" : undefined}
              className="ml-3 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-[22px] text-[15px] text-card no-underline"
            >
              登入
            </Link>
          )}
        </nav>
      </div>
      <div className="mt-[3px] h-px bg-ink" />
    </header>
  );
}
