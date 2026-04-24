import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem("gosdoc_access_token"),
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  logout: () => {
    localStorage.removeItem("gosdoc_access_token");
    localStorage.removeItem("gosdoc_refresh_token");
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));

export default useAuthStore;
