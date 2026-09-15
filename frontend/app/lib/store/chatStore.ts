import { create } from "zustand";

export type Tabs =
  | "chat"
  | "group"
  | "requests"
  | "starred"
  | "settings";

interface ChatStore {
  requestOpen: boolean;
  activeTab: Tabs;

  setRequestOpen: (open: boolean) => void;
  setActiveTab: (tab: Tabs) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  requestOpen: false,
  activeTab: "chat",

  setRequestOpen: (open) =>
    set({ requestOpen: open }),

  setActiveTab: (tab) =>
    set({ activeTab: tab }),
}));