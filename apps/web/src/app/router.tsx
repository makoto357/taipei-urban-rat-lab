import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "./RootLayout";
import { HomePage } from "../pages/HomePage";
import { MapPage } from "../pages/MapPage";

/**
 * MVP 路由只先建立首頁與地圖頁（本次使用者請求範圍）。
 * /report、/literature、/login、/official、/official/review 依 plan.md Phase 2
 * 待 Phase 0 的資料治理與權限決策核准後再加入。
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/map", element: <MapPage /> },
    ],
  },
]);
