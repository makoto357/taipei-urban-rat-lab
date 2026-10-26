import { useEffect, useId, useRef, useState } from "react";
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
  const { pathname, key: locationKey } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationId = useId();
  const { user, membership, signOut } = useAuth();
  const isOfficial =
    membership?.status === "active" && (membership.role === "official" || membership.role === "admin");
  const navItems = isOfficial ? OFFICIAL_NAV_ITEMS : NAV_ITEMS;
  const navigate = useNavigate();

  useEffect(() => setMenuOpen(false), [locationKey]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    navigate("/");
  }

  return (
    <header className="relative z-30 mx-auto w-full max-w-container px-4 pt-5 sm:px-10 sm:pt-7">
      <div
        ref={containerRef}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
        }}
        className="relative min-w-0"
      >
        <div className="flex min-w-0 items-center justify-between gap-4 border-b-[3px] border-ink pb-3.5">
          <Link to="/" onClick={() => setMenuOpen(false)} className="min-w-0 truncate font-brand text-[38px] font-bold leading-none text-ink no-underline sm:text-[48px] xl:text-[38px]">
            TAIPEI RAT LAB
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={menuOpen ? "關閉導覽選單" : "開啟導覽選單"}
            aria-expanded={menuOpen}
            aria-controls={navigationId}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-11 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-ink hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink xl:hidden"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
              <path d="M3 5h18M3 12h18M3 19h18" />
            </svg>
          </button>
          <nav
            id={navigationId}
            aria-label="主要頁面"
            className={`${menuOpen ? "flex" : "hidden"} absolute right-0 top-full z-50 -mt-px max-h-[calc(100dvh-7rem)] w-[56%] min-w-[176px] flex-col overflow-y-auto overscroll-contain border-2 border-ink bg-card font-bold sm:w-[320px] xl:static xl:m-0 xl:flex xl:max-h-none xl:w-auto xl:min-w-0 xl:flex-row xl:items-center xl:gap-x-1 xl:overflow-visible xl:border-0 xl:bg-transparent xl:text-base`}
          >
            <div className="flex w-full flex-col py-4 xl:w-auto xl:flex-row xl:flex-wrap xl:items-center xl:gap-x-1 xl:gap-y-1.5 xl:py-0">
              {navItems.map((item, i) => {
                const active = pathname === item.to || (item.to === "/official" && pathname.startsWith("/official"));
                return (
                  <span key={item.to} className="flex w-full items-center gap-1 xl:w-auto">
                    <Link
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className="button-text !min-h-12 w-full justify-start gap-1.5 !px-6 !py-3 text-xl hover:bg-paper xl:!min-h-11 xl:w-auto xl:!px-0 xl:!py-0 xl:text-base xl:hover:bg-transparent"
                    >
                      <span className="button-text__number hidden font-label xl:inline">{item.num}</span>
                      <span
                        className={`button-text__label ${active ? "underline decoration-2 underline-offset-[6px]" : ""
                          }`}
                      >
                        {item.label}
                      </span>
                    </Link>
                    {i < navItems.length - 1 && (
                      <span aria-hidden="true" className="hidden text-muted xl:inline">
                        /
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
            <div className="border-t border-ink py-4 xl:border-0 xl:py-0">
              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex min-h-12 w-full items-center justify-start border-0 bg-transparent px-6 py-3 font-heading text-xl text-ink hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ink xl:ml-2 xl:min-h-11 xl:w-auto xl:justify-center xl:rounded-full xl:border-[1.5px] xl:border-ink xl:px-5 xl:py-0 xl:text-[15px] xl:text-accent-text"
                >
                  登出
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  aria-current={pathname === "/login" ? "page" : undefined}
                  className="inline-flex min-h-12 w-full items-center justify-start px-6 py-3 text-xl text-ink no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ink xl:ml-3 xl:min-h-11 xl:w-auto xl:justify-center xl:rounded-full xl:bg-ink xl:px-[22px] xl:py-0 xl:text-[15px] xl:text-card"
                >
                  登入
                </Link>
              )}
            </div>
          </nav>
        </div>
        <div className="mt-[3px] h-px bg-ink" />
      </div>
    </header>
  );
}
