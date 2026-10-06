"use client";

import { Sidebar } from "@/components/Sidebar";
import { ChatList } from "@/components/ChatList";
import { ChatWindow } from "@/components/ChatWindow";
import { RequestList } from "@/components/RequestList";
import { Settings } from "@/components/Settings";
import { Profile } from "@/components/Profile";
import { useChatStore, type Tabs } from "@/lib/store/chatStore";
import { useState } from "react";

export default function Home() {
  const activeTab = useChatStore((state) => state.activeTab);

  const [activeChat, setActiveChat] = useState<string | null>(null);

  return (
    <div className="flex flex-row h-screen">
      <Sidebar />

      {(activeTab === "chat" ||
        activeTab === "group" ||
        activeTab === "starred") && (
        <ChatList
          activeChat={activeChat}
          onSelectChat={setActiveChat}
        />
      )}

      {activeTab === "requests" && <RequestList />}
      {activeTab === "settings" && <Settings />}
      {activeTab === "profile" && <Profile />}

      <ChatWindow userId={activeChat} />
    </div>
  );
}