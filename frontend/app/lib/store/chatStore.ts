import { create } from "zustand";

export type Tabs =
  | "chat"
  | "group"
  | "requests"
  | "starred"
  | "settings"
  | "profile"

interface ChatStore {
  activeTab: Tabs;
  setActiveTab: (tab: Tabs) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeTab: "chat",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));