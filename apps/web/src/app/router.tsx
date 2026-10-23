import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./RootLayout";

const HomePage = lazy(() => import("../pages/HomePage").then((m) => ({ default: m.HomePage })));
const MapPage = lazy(() => import("../pages/MapPage").then((m) => ({ default: m.MapPage })));
const LoginPage = lazy(() => import("../pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("../pages/SignupPage").then((m) => ({ default: m.SignupPage })));
const AccountStatusPage = lazy(() =>
  import("../pages/AccountStatusPage").then((m) => ({ default: m.AccountStatusPage })),
);
const ReportPage = lazy(() => import("../pages/ReportPage").then((m) => ({ default: m.ReportPage })));

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

/**
 * 目前路由涵蓋首頁、地圖、登入、註冊、帳號狀態、通報，各頁都用 React.lazy
 * 做 code splitting（Firebase SDK 等依賴只在需要的頁面才載入）。登入/註冊/
 * 通報已接上真正的 Firebase Authentication（見 features/auth/AuthProvider）。
 * /literature、/official、/official/review 依 plan.md Phase 5/8 待實作。
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Lazy><HomePage /></Lazy> },
      { path: "/map", element: <Lazy><MapPage /></Lazy> },
      { path: "/login", element: <Lazy><LoginPage /></Lazy> },
      { path: "/signup", element: <Lazy><SignupPage /></Lazy> },
      { path: "/account-status", element: <Lazy><AccountStatusPage /></Lazy> },
      { path: "/report", element: <Lazy><ReportPage /></Lazy> },
    ],
  },
]);
