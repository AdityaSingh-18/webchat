"use client";

import { useState } from "react";
import {
  MessageSquare,
  Users,
  UserRoundPlus,
  Star,
  Settings,
  LucideIcon,
} from "lucide-react";

type Tabs =
  | "chat"
  | "group"
  | "requests"
  | "starred"
  | "settings";

interface TabItem {
  id: Tabs;
  label: string;
  icon: LucideIcon;
}

const TabOptions: TabItem[] = [
  { id: "chat", label: "Chats", icon: MessageSquare },
  { id: "group", label: "Groups", icon: Users},
  { id: "starred", label: "Starred", icon: Star },
  { id: "requests", label: "Requests", icon: UserRoundPlus },
  { id: "settings", label: "Settings", icon: Settings },
];

export const Sidebar = () => {
  const [activeTab, setActiveTab] = useState<Tabs>("chat");

  const pendingRequestCount = 3;

  return (
    <div className="px-2 py-4 flex flex-col items-center gap-4 bg-[#0a1220] h-screen">
      {TabOptions.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const showRequestBadge = tab.id === "requests" && pendingRequestCount > 0;
        return (
          <button 
            key={index}
            onClick={() => setActiveTab(tab.id)}
            className={`group flex flex-col items-center justify-center cursor-pointer ${isActive ? "gap-2" : ""}`}
          >
            <div className={`relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 group-hover:shadow-[0_0_10px_2px_rgba(255,255,255,0.4)]
                ${isActive 
                  ? "bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] text-white shadow-lg" 
                  : "text-slate-400 group-hover:text-white group-hover:bg-slate-800/50"}
              `}>
              <Icon />
              {showRequestBadge && (
                <span
                  className={`absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 p-1.5
                    rounded-full text-xs font-semibold text-white
                    ${isActive ? "bg-gray-700": "bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]"}
                  `}
                >
                  {pendingRequestCount > 99
                    ? "99+"
                    : pendingRequestCount}
                </span>
              )}
            </div>
            <div className={`text-sm font-medium transition-all duration-200 group-hover:text-white ${isActive ? "text-white" : "text-slate-400"}`}>
              {tab.label}
            </div>
          </button>
        )
      })}
      <div className="mt-auto">
        <div className="group relative">
          <img
            src="./post1.jpg"
            alt="profile photo"
            className="h-12 w-12 cursor-pointer rounded-full object-cover"
          />

          <span className="pointer-events-none absolute bottom-full left-1/2 mb-2
            -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-3 py-1
            text-sm text-white opacity-0 transition-opacity duration-200
            group-hover:opacity-100"
          >
            You
          </span>
        </div>
      </div>
    </div>
  )
}