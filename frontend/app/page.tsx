"use client";

import { Sidebar } from "@/components/Sidebar";
import { ChatList } from "@/components/ChatList";
import { ChatWindow } from "@/components/ChatWindow";
import { RequestList } from "@/components/RequestList";
import { Settings } from "@/components/Settings";
import { Profile } from "@/components/Profile";
import { useChatStore, type Tabs } from "@/lib/store/chatStore";

const ActivePanelMap: Record<Tabs, React.ElementType> = {
  chat: ChatList,
  requests: RequestList,
  settings: Settings,
  group: ChatList, 
  starred: ChatList, 
  profile: Profile,
};

export default function Home() {
  const activeTab = useChatStore((state) => state.activeTab);

  const ActiveMiddlePanel = ActivePanelMap[activeTab];

  return (
    <div className="flex flex-row h-screen">
      <Sidebar />
      <ActiveMiddlePanel />
      <ChatWindow />
    </div>
  );
}
