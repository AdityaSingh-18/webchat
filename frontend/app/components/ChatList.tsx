"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {EllipsisVertical, LogOut, MessageSquarePlus, Search} from "lucide-react";

const ChatFilters = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
  { id: "online", label: "Online" },
]

const chatsData = [
  {
    id: "1",
    name: "Aditya",
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    lastChat: "10:00 AM",
    chat: "Hello bro kaise ho?",
    messageCount: "2",
  },
  {
    id: "2",
    name: "Aditya",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=461&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    lastChat: "10:00 AM",
    chat: "Hello bro kaise ho?",
    messageCount: "2",
  },
  {
    id: "3",
    name: "Aditya",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=461&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    lastChat: "10:00 AM",
    chat: "Hello bro kaise ho?",
    messageCount: "2",
  },
  {
    id: "4",
    name: "Aditya",
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    lastChat: "10:00 AM",
    chat: "Hello bro kaise ho?",
    messageCount: "2",
  },
  {
    id: "5",
    name: "Aditya",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=461&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    lastChat: "10:00 AM",
    chat: "Hello bro kaise ho?",
    messageCount: "2",
  },
  {
    id: "6",
    name: "Aditya",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=461&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    lastChat: "10:00 AM",
    chat: "Hello bro kaise ho?",
    messageCount: "2",
  },
  {
    id: "7",
    name: "Aditya",
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    lastChat: "10:00 AM",
    chat: "Hello bro kaise ho?",
    messageCount: "2",
  },
  {
    id: "8",
    name: "Aditya",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=461&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    lastChat: "10:00 AM",
    chat: "Hello bro kaise ho?",
    messageCount: "2",
  },
  {
    id: "9",
    name: "Aditya",
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=461&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    lastChat: "10:00 AM",
    chat: "Hello bro kaise ho?",
    messageCount: "2",
  },
]

export const ChatList = () => {
  const router = useRouter();
  
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeChat, setActiveChat] = useState("1");
  const [isOptionsVisible, setIsOptionVisible] = useState(false);
  
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        optionsRef.current &&
        !optionsRef.current.contains(event.target as Node)
      ) {
        setIsOptionVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data.error);
        return;
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="w-80 h-screen flex flex-col gap-4 shrink-0 pt-4 bg-[#0d1927] border-x-2 border-gray-800">
      <div className="flex flex-row items-center justify-between px-3">
        <h1 className="w-fit text-3xl font-bold bg-gradient-to-br from-[#c568f5] via-[#68a8ff] to-[#4ee7e8] bg-clip-text text-transparent">
          WebChat
        </h1>
        <div className="flex flex-row items-center gap-1">
          <div ref={optionsRef} className="relative">
            <button
              onClick={() => setIsOptionVisible(!isOptionsVisible)}
              className="text-white cursor-pointer p-2 rounded-full hover:bg-white/5 hover:text-white transition"
            >
              <EllipsisVertical size={22} />
            </button>
            {isOptionsVisible && (
              <div className="absolute left-0 top-12 z-50 w-50 rounded-xl bg-[#162235] border border-gray-700 shadow-lg shadow-white/5 p-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <LogOut size={17} />
                  Logout
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <LogOut size={17} />
                  Logout
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </div>
            )}
          </div>
          <div className="text-white cursor-pointer bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] p-3 rounded-full 
            hover:shadow-[0_0_10px_2px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-transform">
            <MessageSquarePlus size={22} />
          </div>
        </div>
      </div>
      <div className="relative w-full flex items-center px-3">
        <Search 
          size={18} 
          className="absolute left-6 text-gray-300 pointer-events-none" 
        />
        <input
          type="text"
          className="w-full rounded-xl h-10 border border-gray-700 bg-gray-800 outline-none focus:bg-gray-700 text-white pl-9 pr-3 text-[15px] placeholder:text-gray-400 transition-colors"
          placeholder="Search or start a new chat"
        />
      </div>
      <div className="w-full grid grid-cols-4 items-center gap-2 px-3">
        {ChatFilters.map((filter) => {
          const isActive = activeFilter === filter.id
          return (
            <div 
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-2 py-1 text-sm cursor-pointer font-medium rounded-lg border border-gray-800 transition-all duration-200
                hover:shadow-[0_0_8px_1px_rgba(255,255,255,0.4)]
                ${isActive 
                  ? "text-white bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]" 
                  : "hover:bg-white/5 hover:text-gray-200 text-gray-300"
                }`}
              >
              {filter.label}
            </div>
          )}
        )}
      </div>
      <div className="
        flex-1 min-h-0 overflow-y-auto px-2 flex flex-col
        [&::-webkit-scrollbar]:w-[8px]
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:border-[2px]
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]"
      >
        {chatsData.map((chat) => {
          const isActiveChat = activeChat === chat.id;
          return (
            <div 
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`p-2 rounded-md border-l-5 cursor-pointer transition-all duration-200 hover:bg-white/3
                ${isActiveChat 
                  ? "bg-gradient-to-r from-indigo-400/30 to-transparent border-indigo-500" 
                  : "border-transparent"
                }`
              }
            >
              <div className="flex flex-row gap-3">
                <img src={chat.img} alt={chat.name} className="shrink-0 h-12 w-12 object-cover rounded-full"/>
                <div className="w-full flex flex-col justify-center">
                  <div className="flex flex-row items-center justify-between gap-2">
                    <p className={`truncate font-medium ${isActiveChat ? "text-white" : "text-gray-300"}`}>
                      {chat.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className={`shrink-0 text-[11px] ${isActiveChat ? "text-cyan-400" : "text-gray-400"}`}>
                        {chat.lastChat}
                      </p>
                      {Number(chat.messageCount) > 0 && (
                        <span className="
                          flex items-center justify-center h-6 min-w-6 px-1 text-[13px] text-white font-semibold rounded-full
                          bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]
                        ">
                          {chat.messageCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="w-full text-[13px] truncate text-gray-300">
                    {chat.chat}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}