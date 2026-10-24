import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

const NAV_ITEMS = [
  { num: "01", label: "地圖", to: "/map" },
  { num: "02", label: "通報", to: "/report" },
  { num: "03", label: "知識", to: "/literature" },
] as const;

export function SiteHeader() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <header className="mx-auto w-full max-w-container px-10 pt-7">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-ink pb-3.5">
        <Link to="/" className="font-brand text-[38px] font-bold leading-none text-ink no-underline">
          TAIPEI RAT LAB
        </Link>
        <nav aria-label="主要頁面" className="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-base font-bold">
          {NAV_ITEMS.map((item, i) => {
            const active = pathname === item.to;
            return (
              <span key={item.to} className="flex items-center gap-1">
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-1.5 px-3 no-underline ${
                    active ? "underline decoration-2 underline-offset-[6px]" : ""
                  }`}
                >
                  <span className="font-label text-accent-text">{item.num}</span>
                  {item.label}
                </Link>
                {i < NAV_ITEMS.length - 1 && (
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
