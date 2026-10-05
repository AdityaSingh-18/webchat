import { create } from "zustand";

export type Tabs =
  | "chat"
  | "group"
  | "requests"
  | "starred"
  | "settings"
  | "profile"

export interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone_number: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

interface ChatStore {
  activeTab: Tabs;
  setActiveTab: (tab: Tabs) => void;

  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeTab: "chat",
  setActiveTab: (tab) => set({ activeTab: tab }),

  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
}));