import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { MembershipSchema } from "@taipei-rat-lab/contracts";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { CitizenRoleIcon, GoogleIcon, OfficialRoleIcon } from "../features/login/GoogleIcon";
import { useAuth } from "../features/auth/AuthProvider";
import { authErrorMessage } from "../features/auth/authErrors";
import { db } from "../lib/firebase";
import type { User } from "firebase/auth";

type Role = "citizen" | "official";

export function LoginPage() {
  const [role, setRole] = useState<Role | null>(null);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col items-center gap-8 px-5 pb-[72px] pt-14">
        {role === null ? <RoleChoice onPick={setRole} /> : <LoginForm role={role} onBack={() => setRole(null)} />}
      </main>
      <SiteFooter />
    </>
  );
}

function RoleChoice({ onPick }: { onPick: (role: Role) => void }) {
  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="m-0 font-label text-sm tracking-[0.1em] text-accent-text">SIGN IN</p>
        <h1 className="m-0 text-[40px] font-black">你是哪一種使用者？</h1>
        <p className="m-0 font-body text-[15px] text-[#4A463C]">瀏覽地圖與知識不需要登入;通報鼠跡與工作紀錄才需要。</p>
      </div>
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
        <button
          type="button"
          onClick={() => onPick("citizen")}
          className="flex flex-col items-start gap-4 border-2 border-ink bg-card px-7 pb-6 pt-7 text-left font-heading text-ink"
        >
          <CitizenRoleIcon />
          <span className="font-label text-[13px] tracking-[0.1em] text-accent-text">CITIZEN</span>
          <span className="text-[28px] font-black">我是市民</span>
          <span className="font-body text-[15px] leading-[1.7]">通報你看到的鼠跡，並查看自己的通報處理狀態。</span>
          <span className="font-body text-[13px] text-[#4A463C]">Google 或 Email 登入</span>
          <span className="mt-1 flex w-full justify-end border-t-[1.5px] border-ink pt-3.5 text-base font-bold">
            選擇 →
          </span>
        </button>
        <button
          type="button"
          onClick={() => onPick("official")}
          className="flex flex-col items-start gap-4 border-2 border-ink bg-card px-7 pb-6 pt-7 text-left font-heading text-ink"
        >
          <OfficialRoleIcon />
          <span className="font-label text-[13px] tracking-[0.1em] text-accent-text">STAFF</span>
          <span className="text-[28px] font-black">我是市府／合作單位人員</span>
          <span className="font-body text-[15px] leading-[1.7]">建立鼠跡調查與防治紀錄，審核市民通報。</span>
          <span className="font-body text-[13px] text-[#4A463C]">Email 登入；帳號由管理員邀請建立，需完成信箱驗證</span>
          <span className="mt-1 flex w-full justify-end border-t-[1.5px] border-ink pt-3.5 text-base font-bold">
            選擇 →
          </span>
        </button>
      </div>
    </div>
  );
}

function LoginForm({ role, onBack }: { role: Role; onBack: () => void }) {
  const isCitizen = role === "citizen";
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  // 只在 dev server 預填測試帳號（值來自 gitignored 的 .env.local），production build 不會帶入。
  const prefill = import.meta.env.DEV && !isCitizen;
  // dev 時瀏覽器常把市府測試帳號記住並自動填進市民表單，所以市民表單在 dev 關閉自動填入；
  // production 保留，讓真正的市民可以用密碼管理員。
  const noAutofill = import.meta.env.DEV && isCitizen;
  // Chrome 會無視 autocomplete="off"，但不會自動填入 readonly 欄位：聚焦（使用者要輸入）前先設成 readonly。
  const [armed, setArmed] = useState(!noAutofill);
  const arm = () => setArmed(true);
  const [email, setEmail] = useState(prefill ? (import.meta.env.VITE_DEV_PREFILL_OFFICIAL_EMAIL ?? "") : "");
  const [password, setPassword] = useState(prefill ? (import.meta.env.VITE_DEV_PREFILL_OFFICIAL_PASSWORD ?? "") : "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * email-enumeration protection（plan.md §8）已在 Firebase Authentication 專案層級
   * 開啟：帳號不存在跟密碼錯誤都回傳同一個 auth/invalid-credential，這裡的錯誤訊息
   * 也刻意不區分兩者，見 authErrors.ts。
   */
  async function routeAfterSignIn(user: User) {
    if (!user.emailVerified) {
      navigate("/account-status");
      return;
    }
    if (role === "official") {
      const snapshot = await getDoc(doc(db, "memberships", user.uid));
      const parsed = snapshot.exists() ? MembershipSchema.safeParse(snapshot.data()) : null;
      const active = parsed?.success && parsed.data.role === "official" && parsed.data.status === "active";
      navigate(active ? "/official" : "/account-status");
      return;
    }
    navigate("/report");
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await signInWithEmail(email, password);
      await routeAfterSignIn(user);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    try {
      const user = await signInWithGoogle();
      await routeAfterSignIn(user);
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setError(authErrorMessage(err));
    }
  }

  return (
    <div className="flex w-full max-w-[440px] flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="button-text self-start text-[15px]"
      >
        <span className="button-text__label">← 重新選擇身分</span>
      </button>
      <form onSubmit={handleEmailSubmit} className="box-border flex flex-col gap-4 border-2 border-ink bg-card px-9 pb-7 pt-8">
        <div className="flex flex-col gap-1">
          <span className="font-label text-[13px] tracking-[0.1em] text-accent-text">{isCitizen ? "CITIZEN" : "STAFF"}</span>
          <h1 className="m-0 text-[28px] font-black">{isCitizen ? "市民登入" : "市府／合作單位登入"}</h1>
        </div>

        {isCitizen ? (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="button-secondary min-h-12 gap-2.5 text-base"
            >
              <GoogleIcon />
              用 Google 登入
            </button>
            <p className="m-0 text-center font-body text-[13px] text-[#4A463C]">或使用 Email</p>
          </>
        ) : (
          <p className="m-0 border-[1.5px] border-ink bg-paper px-3 py-2.5 font-body text-[13px] leading-[1.7]">
            請使用機關或合作單位核發的 Email。帳號由平台管理員邀請建立，需先完成信箱驗證才能使用作業平台。
          </p>
        )}

        <label className="flex flex-col gap-0.5 border-[1.5px] border-ink bg-paper px-3 py-1.5 font-body">
          <span className="font-label text-[11px] tracking-[0.1em]">EMAIL</span>
          <input
            type="email"
            autoComplete={noAutofill ? "off" : "email"}
            readOnly={!armed}
            onFocus={arm}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-0 bg-transparent py-0.5 text-[15px] outline-none"
          />
        </label>
        <label className="flex flex-col gap-0.5 border-[1.5px] border-ink bg-paper px-3 py-1.5 font-body">
          <span className="font-label text-[11px] tracking-[0.1em]">PASSWORD</span>
          <input
            type="password"
            autoComplete={noAutofill ? "new-password" : "current-password"}
            readOnly={!armed}
            onFocus={arm}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-0 bg-transparent py-0.5 text-[15px] outline-none"
          />
        </label>
        <a href="#" className="self-end font-body text-[13px]">
          忘記密碼？
        </a>

        {error && (
          <p className="warning-card m-0 border-[1.5px] border-ink bg-activity-l1 px-3.5 py-3 font-body text-[13px] leading-[1.6]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="button-primary min-h-[50px] text-[17px]"
        >
          登入
        </button>

        <p className="m-0 mt-1 text-center font-body text-[13px]">
          {isCitizen ? (
            <>
              還沒有帳號？<Link to="/signup" className="font-medium">建立帳號</Link>
            </>
          ) : (
            "帳號由管理員邀請建立。"
          )}
        </p>
      </form>
    </div>
  );
}
