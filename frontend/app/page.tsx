import { Sidebar } from "./components/Sidebar";
import { ChatList } from "./components/ChatList";
import { ChatWindow } from "./components/ChatWindow";

export default function Home() {
  return (
    <div className="flex flex-row">
      <Sidebar />
      <ChatList />
      <ChatWindow />
    </div>
  );
}
