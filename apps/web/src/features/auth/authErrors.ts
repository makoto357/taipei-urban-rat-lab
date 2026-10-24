import { FirebaseError } from "firebase/app";

/**
 * 中性錯誤訊息，刻意不區分「帳號不存在」與「密碼錯誤」，搭配專案已啟用的
 * Firebase Authentication email-enumeration protection（plan.md §8）。
 */
export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "帳號或密碼不正確，請再試一次。";
      case "auth/too-many-requests":
        return "嘗試次數過多，請稍後再試。";
      case "auth/email-already-in-use":
        return "這個 Email 已經有帳號了，請改用登入。";
      case "auth/weak-password":
        return "密碼至少需要 8 碼。";
      case "auth/popup-blocked":
        return "瀏覽器擋住了登入視窗，請允許彈出視窗後再試。";
      case "auth/unauthorized-domain":
        return "這個網址尚未加入 Firebase 授權網域，Google 登入暫時無法使用。";
      case "auth/popup-closed-by-user":
        return "登入視窗已關閉，請再試一次。";
      default:
        return "發生問題，請稍後再試。";
    }
  }
  return "發生問題，請稍後再試。";
}
