import { Navigate, Outlet, useNavigate } from "react-router-dom";
import useAuth from "./hooks/useAuth";
import useAuthStore from "./store/authStore";

import AuthFlow from "./AuthFlow";
import Inbox from "./Inbox";
import Projects from "./Projects";
import Notifications from "./Notifications";
import HelpSupport from "./HelpSupport";
import Documents from "./Documents";
import Analytics from "./Analytics";

function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const isRegistering = useAuthStore((s) => s.isRegistering);
  if (isLoading) return <PageLoader />;
  if (isAuthenticated && !isRegistering) return <Navigate to="/inbox" replace />;
  return <Outlet />;
}

// Maps screen names used in original components to route paths
const SCREEN_TO_PATH = {
  auth: "/login",
  inbox: "/inbox",
  projects: "/projects",
  documents: "/documents",
  notifications: "/notifications",
  help: "/help",
  analytics: "/analytics",
};

function useNavAdapter() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const onNavigate = (screen) => {
    const path = SCREEN_TO_PATH[screen] || `/${screen}`;
    navigate(path);
  };

  const onGoToAuth = () => {
    logout();
    navigate("/login");
  };

  const onGoToDashboard = () => navigate("/inbox");
  const onGoBack = () => navigate(-1);

  return { onNavigate, onGoToAuth, onGoToDashboard, onGoBack };
}

function WrapAuth() {
  const { onGoToDashboard } = useNavAdapter();
  return <AuthFlow onGoToDashboard={onGoToDashboard} />;
}

function WrapInbox() {
  const { onNavigate, onGoToAuth } = useNavAdapter();
  return <Inbox onNavigate={onNavigate} onGoToAuth={onGoToAuth} />;
}

function WrapProjects() {
  const { onNavigate, onGoToAuth } = useNavAdapter();
  return <Projects onNavigate={onNavigate} onGoToAuth={onGoToAuth} />;
}

function WrapDocuments() {
  const { onNavigate, onGoToAuth } = useNavAdapter();
  return <Documents onNavigate={onNavigate} onGoToAuth={onGoToAuth} />;
}

function WrapNotifications() {
  const { onNavigate, onGoToAuth, onGoBack } = useNavAdapter();
  return <Notifications onNavigate={onNavigate} onGoToAuth={onGoToAuth} onGoBack={onGoBack} />;
}

function WrapHelp() {
  const { onNavigate, onGoToAuth } = useNavAdapter();
  return <HelpSupport onNavigate={onNavigate} onGoToAuth={onGoToAuth} />;
}

function WrapAnalytics() {
  const { onNavigate, onGoToAuth } = useNavAdapter();
  return <Analytics onNavigate={onNavigate} onGoToAuth={onGoToAuth} />;
}

export const routes = [
  {
    element: <PublicRoute />,
    children: [
      { path: "/login", element: <WrapAuth /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/inbox", element: <WrapInbox /> },
      { path: "/projects", element: <WrapProjects /> },
      { path: "/documents", element: <WrapDocuments /> },
      { path: "/notifications", element: <WrapNotifications /> },
      { path: "/help", element: <WrapHelp /> },
      { path: "/analytics", element: <WrapAnalytics /> },
    ],
  },
  { path: "*", element: <Navigate to="/inbox" replace /> },
];
