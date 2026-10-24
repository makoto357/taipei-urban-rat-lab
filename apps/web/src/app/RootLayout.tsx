import { Outlet } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthProvider";

export function RootLayout() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-paper text-ink font-heading">
        <Outlet />
      </div>
    </AuthProvider>
  );
}
