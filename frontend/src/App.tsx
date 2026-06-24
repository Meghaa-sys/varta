import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { LoginPage } from "./pages/LoginPage";
import { ChatPage } from "./pages/ChatPage";
import { ProfileLinkPage } from "./pages/ProfileLinkPage";
import { appName } from "./constants/brand";
import { useAuth } from "./state/AuthContext";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7fafc] text-ink">
        <div className="flex flex-col items-center gap-5">
          <div className="relative grid h-20 w-20 place-items-center rounded-lg bg-ink text-3xl font-black text-white shadow-soft">
            V
            <span className="absolute inset-0 rounded-lg border-2 border-brand/20" />
          </div>
          <p className="text-2xl font-black tracking-normal">{appName}</p>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand" />
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

export const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<LoginPage initialMode="register" />} />
    <Route
      path="/app"
      element={
        <ProtectedRoute>
          <ChatPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/u/:username"
      element={
        <ProtectedRoute>
          <ProfileLinkPage />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<Navigate to="/app" replace />} />
  </Routes>
);
