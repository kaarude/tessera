import { create } from "zustand";

interface AppState {
  currentTeamId: string | null;
  setCurrentTeamId: (id: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentTeamId: null,
  setCurrentTeamId: (id) => set({ currentTeamId: id }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  theme: "dark",
  setTheme: (theme) => set({ theme }),
}));
