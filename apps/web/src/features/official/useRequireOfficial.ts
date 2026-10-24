import { useAuth } from "../auth/AuthProvider";

export type OfficialGate =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "no-access" }
  | { status: "ok"; organizationId: string | undefined };

/**
 * 官方作業平台的存取檢查：真正的授權邊界永遠是 Firestore/Storage Security
 * Rules 與 apps/functions（見 firebase/firestore.rules 的 hasActiveOfficialMembership），
 * 這裡只是依前端已知的 membership 狀態決定要顯示哪個畫面，不是安全邊界本身。
 */
export function useRequireOfficial(): OfficialGate {
  const { user, membership, loading, membershipLoading } = useAuth();

  if (loading || (user && membershipLoading)) return { status: "loading" };
  if (!user) return { status: "signed-out" };
  const isActiveOfficial = membership?.status === "active" && (membership.role === "official" || membership.role === "admin");
  if (!isActiveOfficial) return { status: "no-access" };
  return { status: "ok", organizationId: membership?.organizationId };
}
