import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { CitizenRoleIcon, GoogleIcon, OfficialRoleIcon } from "../features/login/GoogleIcon";

type Role = "citizen" | "official";

/**
 * 示意用的登入結果狀態（對應 Claude Artifact Login.dc.html 的 statusOpts）：
 * 目前還沒有接 Firebase Authentication，先保留三種狀態的 UI 切換，方便檢視設計，
 * 實際驗證邏輯待 apps/functions 的 auth 流程與前端整合後取代。
 */
type LoginOutcome = "ok" | "unverified" | "noAccess";

const OUTCOME_OPTIONS: { value: LoginOutcome; label: string }[] = [
  { value: "ok", label: "正常登入" },
  { value: "unverified", label: "信箱未驗證" },
  { value: "noAccess", label: "沒有權限" },
];

const OUTCOME_MESSAGES: Record<Exclude<LoginOutcome, "ok">, string> = {
  unverified: "信箱尚未驗證：請點擊註冊信中的驗證連結。",
  noAccess: "沒有權限：此帳號無法使用作業平台，請聯絡平台管理員。",
};

export function LoginPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [outcome, setOutcome] = useState<LoginOutcome>("ok");
  const navigate = useNavigate();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (outcome !== "ok") return;
    navigate(role === "citizen" ? "/report" : "/official");
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col items-center gap-8 px-5 pb-18 pt-14">
        {role === null ? (
          <RoleChoice onPick={setRole} />
        ) : (
          <LoginForm
            role={role}
            outcome={outcome}
            onOutcomeChange={setOutcome}
            onBack={() => setRole(null)}
            onSubmit={handleSubmit}
          />
        )}
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

function LoginForm({
  role,
  outcome,
  onOutcomeChange,
  onBack,
  onSubmit,
}: {
  role: Role;
  outcome: LoginOutcome;
  onOutcomeChange: (outcome: LoginOutcome) => void;
  onBack: () => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const isCitizen = role === "citizen";

  return (
    <div className="flex w-full max-w-[440px] flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-1.5 self-start border-0 bg-transparent p-0 font-heading text-[15px] font-bold text-ink"
      >
        ← 重新選擇身分
      </button>
      <form onSubmit={onSubmit} className="box-border flex flex-col gap-4 border-2 border-ink bg-card px-9 pb-7 pt-8">
        <div className="flex flex-col gap-1">
          <span className="font-label text-[13px] tracking-[0.1em] text-accent-text">{isCitizen ? "CITIZEN" : "STAFF"}</span>
          <h1 className="m-0 text-[28px] font-black">{isCitizen ? "市民登入" : "市府／合作單位登入"}</h1>
        </div>

        {isCitizen ? (
          <>
            <button
              type="button"
              className="flex min-h-12 items-center justify-center gap-2.5 border-[1.5px] border-ink bg-card font-heading text-base font-bold"
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
          <input type="email" autoComplete="email" required className="border-0 bg-transparent py-0.5 text-[15px] outline-none" />
        </label>
        <label className="flex flex-col gap-0.5 border-[1.5px] border-ink bg-paper px-3 py-1.5 font-body">
          <span className="font-label text-[11px] tracking-[0.1em]">PASSWORD</span>
          <input type="password" autoComplete="current-password" required className="border-0 bg-transparent py-0.5 text-[15px] outline-none" />
        </label>
        <a href="#" className="self-end font-body text-[13px]">
          忘記密碼？
        </a>

        {outcome === "ok" ? (
          <button
            type="submit"
            className="flex min-h-[50px] items-center justify-center bg-ink text-[17px] font-bold text-card"
          >
            登入
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="flex min-h-[50px] w-full items-center justify-center border-0 bg-unknown font-heading text-[17px] font-bold text-muted"
          >
            登入
          </button>
        )}

        <p className="m-0 mt-1 text-center font-body text-[13px]">
          {isCitizen ? (
            <>
              還沒有帳號？<Link to="/signup" className="font-medium">建立帳號</Link>
            </>
          ) : (
            "帳號由管理員邀請建立。"
          )}
        </p>

        <div className="flex flex-col gap-2">
          <p className="m-0 font-body text-xs text-[#4A463C]">登入結果（示意，一次只會出現一種）</p>
          <div role="radiogroup" aria-label="登入結果" className="grid grid-cols-3 border-[1.5px] border-ink">
            {OUTCOME_OPTIONS.map((option) => {
              const checked = outcome === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => onOutcomeChange(option.value)}
                  className={`min-h-11 border-0 font-body text-[13px] font-bold ${
                    checked ? "bg-ink text-card" : "bg-card text-ink"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {outcome !== "ok" && (
            <p className="m-0 border-[1.5px] border-ink bg-activity-l1 px-3.5 py-3 font-body text-[13px] leading-[1.6]">
              {OUTCOME_MESSAGES[outcome]}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
