import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { GoogleIcon } from "../features/login/GoogleIcon";
import { useAuth } from "../features/auth/AuthProvider";
import { authErrorMessage } from "../features/auth/authErrors";

/**
 * 市民註冊頁，對應 Claude Artifact Signup.dc.html。市府／合作單位帳號由
 * admin 邀請建立，不開放自行註冊（plan.md §2.1、§2.3）。
 */
export function SignupPage() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleEmailSignup(event: React.FormEvent) {
    event.preventDefault();
    if (!agreed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signUpWithEmail(email, password);
      navigate("/account-status");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignup() {
    if (!agreed) return;
    setError(null);
    try {
      await signInWithGoogle();
      navigate("/report");
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col items-center gap-6 px-5 pb-[72px] pt-14">
        <div className="flex w-full max-w-[480px] flex-col gap-4">
          <Link to="/login" className="button-text text-[15px]">
            <span className="button-text__label">← 回登入</span>
          </Link>
          <form
            onSubmit={handleEmailSignup}
            className="box-border flex flex-col gap-4 border-2 border-ink bg-card px-9 pb-7 pt-8"
          >
            <div className="flex flex-col gap-1">
              <span className="font-label text-[13px] tracking-[0.1em] text-accent-text">SIGN UP</span>
              <h1 className="m-0 text-[28px] font-black">建立市民帳號</h1>
              <p className="m-0 mt-1.5 font-body text-[13px] leading-[1.7] text-[#4A463C]">
                市府／合作單位人員帳號由管理員邀請建立，不開放自行註冊。
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={!agreed}
              className="button-secondary min-h-12 gap-2.5 text-base"
            >
              <GoogleIcon />
              用 Google 註冊
            </button>
            <p className="m-0 text-center font-body text-[13px] text-[#4A463C]">或使用 Email</p>

            <label className="flex flex-col gap-0.5 border-[1.5px] border-ink bg-paper px-3 py-1.5 font-body">
              <span className="font-label text-[11px] tracking-[0.1em]">EMAIL</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-0 bg-transparent py-0.5 text-[15px] outline-none"
              />
            </label>
            <label className="flex flex-col gap-0.5 border-[1.5px] border-ink bg-paper px-3 py-1.5 font-body">
              <span className="font-label text-[11px] tracking-[0.1em]">PASSWORD（至少 8 碼）</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-0 bg-transparent py-0.5 text-[15px] outline-none"
              />
            </label>

            <label className="flex min-h-11 cursor-pointer items-start gap-2.5 font-body text-[13px] leading-[1.7]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-5 w-5 flex-none accent-ink"
              />
              我已閱讀隱私權說明，了解通報內容會經審核後公開，帳號資料不會公開。
            </label>

            {error && (
              <p className="warning-card m-0 border-[1.5px] border-ink bg-activity-l1 px-3.5 py-3 font-body text-[13px] leading-[1.6]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!agreed || submitting}
              className="button-primary min-h-[50px] text-[17px]"
            >
              建立帳號
            </button>
            <p className="m-0 text-center font-body text-[13px]">
              已經有帳號？<Link to="/login" className="font-medium">登入</Link>
            </p>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
