"use client";

import { Sidebar } from "./components/Sidebar";
import { ChatList } from "./components/ChatList";
import { ChatWindow } from "./components/ChatWindow";
import { RequestList } from "./components/RequestList";
import { useChatStore } from "./lib/store/chatStore";

export default function Home() {
  const requestOpen = useChatStore((state) => state.requestOpen);

  return (
    <div className="flex flex-row">
      <Sidebar />
      {requestOpen ? <RequestList /> : <ChatList />}
      <ChatWindow />
    </div>
  );
}
