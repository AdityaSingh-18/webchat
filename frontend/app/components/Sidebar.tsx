"use client";

import { useEffect, useState } from "react";
import { useChatStore, type Tabs } from "@/lib/store/chatStore";
import { supabase } from "@/lib/supabase/supabaseClient";
import {
  MessageSquare,
  Users,
  UserRoundPlus,
  Star,
  Settings,
  LucideIcon,
} from "lucide-react";

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
  const currentUser = useChatStore((state) => state.currentUser);
  const activeTab = useChatStore((state) => state.activeTab);
  const setActiveTab = useChatStore((state) => state.setActiveTab);

  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const handleTabClick = (id: Tabs) => {
    setActiveTab(id);
  }

  useEffect(() => {
    if (!currentUser) return;

    const fetchPendingCount = async () => {
      const { count, error } = await supabase
        .from("connections")
        .select("*", { count: "exact", head: true })
        .eq("contact_id", currentUser.id)
        .eq("status", "pending");

      if (!error && count !== null) {
        setPendingRequestCount(count);
      }
    };

    fetchPendingCount();

    const channel = supabase
      .channel("realtime_pending_requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
          filter: `contact_id=eq.${currentUser.id}`,
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  return (
    <div className="px-2 py-4 flex flex-col items-center gap-4 bg-[#0a1220] h-screen">
      {TabOptions.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const showRequestBadge = tab.id === "requests" && pendingRequestCount > 0;
        return (
          <button 
            key={index}
            onClick={() => handleTabClick(tab.id)}
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
            <div className={`text-sm font-medium transition-all duration-200 group-hover:text-white 
              ${isActive ? "text-white" : "text-slate-400"}`}
            >
              {tab.label}
            </div>
          </button>
        )
      })}
      <div className="mt-auto">
        <div className="group relative">
          <img
            src={currentUser?.avatar_url || "./post1.jpg"}
            alt={`${currentUser?.full_name}'s profile`}
            onClick={() => handleTabClick("profile")}
            className="h-12 w-12 cursor-pointer rounded-full object-cover"
          />

          <span className="pointer-events-none absolute bottom-full left-1/2 mb-2
            -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-3 py-1
            text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            You
          </span>
        </div>
      </div>
    </div>
  )
}