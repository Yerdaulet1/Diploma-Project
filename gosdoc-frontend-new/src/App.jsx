import { useEffect } from "react";
import { useRoutes, useNavigate } from "react-router-dom";
import { routes } from "./router";
import useAuthStore from "./store/authStore";

export default function App() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const isRegistering = useAuthStore((s) => s.isRegistering);

  useEffect(() => {
    const handler = () => {
      // Don't kick the user out while they're in the middle of registration —
      // the 401 is likely a transient cold-start issue, not real auth loss.
      if (isRegistering) return;
      logout();
      navigate("/login", { replace: true });
    };
    window.addEventListener("auth:lost", handler);
    return () => window.removeEventListener("auth:lost", handler);
  }, [logout, navigate, isRegistering]);

  return useRoutes(routes);
}
