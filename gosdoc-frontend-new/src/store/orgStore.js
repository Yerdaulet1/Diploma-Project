import { create } from "zustand";

// Активная организация (контейнер проектов). Хранится в localStorage,
// чтобы выбор сохранялся между перезагрузками. Проекты (Workspace) всегда
// принадлежат организации; здесь хранится id выбранной в свитчере организации.
const KEY = "activeOrgId";

const useOrgStore = create((set) => ({
  activeOrgId: localStorage.getItem(KEY) || null,
  setActiveOrg: (id) => {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
    set({ activeOrgId: id || null });
  },
}));

export default useOrgStore;
