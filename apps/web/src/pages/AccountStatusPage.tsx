import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { useAuth } from "../features/auth/AuthProvider";

/**
 * 帳號狀態頁，對應 Claude Artifact AccountStatus.dc.html。狀態由真實的
 * auth/membership 狀態決定（不再是示意用的 radiogroup）：
 * - 已登入但信箱未驗證 → 請驗證信箱
 * - 已登入、信箱已驗證，但沒有 active 的 membership → 沒有權限（403）
 * - 其餘情況代表帳號正常，導回首頁。
 */
export function AccountStatusPage() {
  const { user, membership, loading, membershipLoading, resendVerificationEmail, signOut } = useAuth();
  const [resent, setResent] = useState(false);

  if (loading || (user && membershipLoading)) return null;
  if (!user) return <Navigate to="/login" replace />;

  const status: "unverified" | "noAccess" | "ok" = !user.emailVerified
    ? "unverified"
    : membership?.status === "active"
      ? "ok"
      : "noAccess";

  if (status === "ok") return <Navigate to="/" replace />;

  const content =
    status === "unverified"
      ? {
          en: "VERIFY EMAIL",
          title: "請先驗證你的信箱",
          desc: "我們已寄出驗證信。請到信箱點擊連結，完成後重新登入即可繼續。沒收到的話，請先檢查垃圾郵件匣，或重寄一封。",
        }
      : {
          en: "403 · NO ACCESS",
          title: "沒有使用權限",
          desc: "這個帳號沒有作業平台的權限，可能是尚未被管理員邀請開通，或權限已被停用。如有疑問請聯絡平台管理員。",
        };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col items-center gap-6 px-5 pb-[72px] pt-14">
        <div className="flex w-full max-w-[520px] flex-col gap-5">
          <div className="box-border flex flex-col gap-4 border-2 border-ink bg-card px-9 pb-7 pt-8">
            <span className="font-label text-[13px] tracking-[0.1em] text-accent-text">{content.en}</span>
            <h1 className="m-0 text-[30px] font-black leading-[1.3]">{content.title}</h1>
            <p className="m-0 font-body text-[15px] leading-[1.85]">{content.desc}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              {status === "unverified" && (
                <button
                  type="button"
                  onClick={async () => {
                    await resendVerificationEmail();
                    setResent(true);
                  }}
                  className="button-primary min-h-12 px-6 text-base"
                >
                  {resent ? "已重新寄出" : "重寄驗證信"}
                </button>
              )}
              {status === "noAccess" && (
                <Link
                  to="/report"
                  className="button-primary min-h-12 px-6 text-base"
                >
                  改用市民身分通報
                </Link>
              )}
              <Link
                to="/"
                className="button-secondary min-h-12 px-6 text-base"
              >
                回首頁
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="button-text px-3 text-[15px]"
              >
                <span className="button-text__label">登出</span>
              </button>
            </div>
            <p className="m-0 font-body text-xs text-[#4A463C]">需要協助？請聯絡平台管理員：[聯絡方式]</p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
