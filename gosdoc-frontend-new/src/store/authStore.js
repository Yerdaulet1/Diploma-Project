import { create } from "zustand";
import { queryClient } from "../providers/QueryProvider";

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem("gosdoc_access_token"),
  isLoading: true,
  isRegistering: false,

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  setIsRegistering: (v) => set({ isRegistering: v }),

  logout: () => {
    localStorage.removeItem("gosdoc_access_token");
    localStorage.removeItem("gosdoc_refresh_token");
    queryClient.clear();
    set({ user: null, isAuthenticated: false, isLoading: false, isRegistering: false });
  },
}));

export default useAuthStore;
