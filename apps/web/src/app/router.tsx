import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./RootLayout";
import { HomePage } from "../pages/HomePage";
import { MapPage } from "../pages/MapPage";
import { LoginPage } from "../pages/LoginPage";
import { ReportPage } from "../pages/ReportPage";

/**
 * 目前路由涵蓋首頁、地圖、登入、通報（本次使用者請求範圍）。
 * /literature、/signup、/official、/official/review 依 plan.md Phase 2
 * 待 Phase 0 的資料治理與權限決策核准後再加入；登入/通報頁目前都還沒接
 * 真正的 Firebase Authentication，是純 UI。
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/map", element: <MapPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/report", element: <ReportPage /> },
    ],
  },
]);
