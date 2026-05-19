import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../api/users";
import useAuthStore from "../store/authStore";

export default function useAuth() {
  const { user, isAuthenticated, isLoading, isRegistering, setUser, setLoading, logout } =
    useAuthStore();

  const hasToken = !!localStorage.getItem("gosdoc_access_token");

  const { data, isError, isSuccess, isLoading: queryLoading } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: hasToken && !isRegistering,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!hasToken) {
      setLoading(false);
      return;
    }
    if (isRegistering) {
      setLoading(false);
      return;
    }
    if (isSuccess && data) {
      setUser(data);
    }
    if (isError) {
      logout();
    }
  }, [hasToken, isRegistering, isSuccess, isError, data, setUser, setLoading, logout]);

  return {
    user,
    isAuthenticated: hasToken && isAuthenticated,
    isLoading: hasToken && !isRegistering ? queryLoading || isLoading : false,
  };
}
