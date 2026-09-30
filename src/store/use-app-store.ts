import { create } from "zustand";

type AppState = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
