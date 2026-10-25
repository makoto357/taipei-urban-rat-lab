import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./RootLayout";

const HomePage = lazy(() => import("../pages/HomePage").then((m) => ({ default: m.HomePage })));
const MapPage = lazy(() => import("../pages/MapPage").then((m) => ({ default: m.MapPage })));
const RiskModelPage = lazy(() =>
  import("../pages/RiskModelPage").then((m) => ({ default: m.RiskModelPage })),
);
const LoginPage = lazy(() => import("../pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("../pages/SignupPage").then((m) => ({ default: m.SignupPage })));
const AccountStatusPage = lazy(() =>
  import("../pages/AccountStatusPage").then((m) => ({ default: m.AccountStatusPage })),
);
const ReportPage = lazy(() => import("../pages/ReportPage").then((m) => ({ default: m.ReportPage })));
const OfficialOverviewPage = lazy(() =>
  import("../pages/official/OfficialOverviewPage").then((m) => ({ default: m.OfficialOverviewPage })),
);
const OfficialRecordPage = lazy(() =>
  import("../pages/official/OfficialRecordPage").then((m) => ({ default: m.OfficialRecordPage })),
);

const LiteraturePage = lazy(() =>
  import("../pages/LiteraturePage").then((m) => ({ default: m.LiteraturePage })),
);
const LiteratureDetailPage = lazy(() =>
  import("../pages/LiteratureDetailPage").then((m) => ({ default: m.LiteratureDetailPage })),
);

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

/**
 * 目前路由涵蓋首頁、地圖、登入、註冊、帳號狀態、通報、市府作業平台（工作總覽、
 * 新增紀錄），各頁都用 React.lazy 做 code splitting。登入/註冊/通報/官方紀錄
 * 都已接上真正的 Firebase Authentication 與 Firestore（見 features/auth、
 * features/official）。/literature 與 /literature/:id 是靜態文獻頁（資料由 scripts/build-literature.mts 產生）；
 * /official/review 依 plan.md Phase 5 待實作——審核佇列要等 Phase 0 核准資料契約後才能定案。
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Lazy><HomePage /></Lazy> },
      { path: "/map", element: <Lazy><MapPage /></Lazy> },
      { path: "/risk-model", element: <Lazy><RiskModelPage /></Lazy> },
      { path: "/login", element: <Lazy><LoginPage /></Lazy> },
      { path: "/signup", element: <Lazy><SignupPage /></Lazy> },
      { path: "/account-status", element: <Lazy><AccountStatusPage /></Lazy> },
      { path: "/report", element: <Lazy><ReportPage /></Lazy> },
      { path: "/literature", element: <Lazy><LiteraturePage /></Lazy> },
      { path: "/literature/:id", element: <Lazy><LiteratureDetailPage /></Lazy> },
      { path: "/official", element: <Lazy><OfficialOverviewPage /></Lazy> },
      { path: "/official/record", element: <Lazy><OfficialRecordPage /></Lazy> },
    ],
  },
]);
