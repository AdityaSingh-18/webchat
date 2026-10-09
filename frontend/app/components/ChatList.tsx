"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/supabaseClient";
import { useChatStore } from "@/lib/store/chatStore";
import { getInitials } from "@/lib";

import {
  ArrowLeft, 
  EllipsisVertical, 
  LogOut, 
  MessageSquarePlus, 
  Search, 
  SearchX, 
  TriangleAlert, 
  UserPlus, 
  X
} from "lucide-react";

const ChatFilters = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
  { id: "online", label: "Online" },
]

type ChatListProps = {
  activeChat: string | null;
  onSelectChat: (userId: string) => void;
};

type ChatItem = {
  id: string;
  name: string;
  username?: string | null;
  img?: string | null;
  lastChat?: string;
  chat?: string;
  messageCount?: string | number;
};
 
type ConnectedUser = {
  id: string;
  name: string;
  username?: string | null;
  img?: string | null;
  connectionStatus?: "none" | "pending_sent" | "pending_received" | "connected";
}

type SearchStatus = "idle" | "loading" | "success" | "error";

const formatChatTime = (value?: string | null) => {
  if (!value){
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())){
    return "";
  }

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
};

export const ChatList = ({
  activeChat,
  onSelectChat,
}: ChatListProps) => {
  const router = useRouter();
  
  const [activeFilter, setActiveFilter] = useState("all");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [isOptionsVisible, setIsOptionVisible] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ConnectedUser[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [retryKey, setRetryKey] = useState(0);

  const [newChat, setNewChat] = useState(false);
  const [newQuery, setNewQuery] = useState("");
  const [newResults, setNewResults] = useState<ConnectedUser[]>([]);
  const [newStatus, setNewStatus] = useState<SearchStatus>("idle");
  const [chatListStatus, setChatListStatus] = useState<"loading" | "success" | "error">("loading");
  const [newRetryKey, setNewRetryKey] = useState(0);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const openNewChat = useChatStore((state) => state.openNewChat);
  const setOpenNewChat = useChatStore((state) => state.setOpenNewChat);

  const currentUserId = useChatStore((state) => state.currentUser?.id ?? null);
  const onlineUsers = useChatStore((state) => state.onlineUsers);

  const typingUsers = useChatStore((state) => state.typingUsers);
  const typingToUsers = useChatStore((state) => state.typingToUsers);
  
  const optionsRef = useRef<HTMLDivElement>(null);

  const loadChats = useCallback(async () => {
    if (!currentUserId){
      return;
    }

    setChatListStatus("loading");
    try {
      const response = await fetch("/api/chats", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load chats");
      }

      const rows = Array.isArray(data.chats) ? data.chats : [];
      setChats(
        rows.map((row: {
          user_id: string;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
          conversation_id: string | null;
          last_message: string | null;
          last_message_at: string | null;
          last_message_sender_id: string | null;
          unread_count: number | string | null;
        }) => {
          const lastMessage = row.last_message ?? "";
          const isOwnMessage = row.last_message_sender_id === currentUserId;

          return {
            id: row.user_id,
            name: row.full_name ?? row.username ?? "Unknown",
            username: row.username,
            img: row.avatar_url,
            lastChat: formatChatTime(row.last_message_at),
            chat: lastMessage
              ? `${isOwnMessage ? "You: " : ""}${lastMessage}`
              : "No messages yet",
            messageCount: Number(row.unread_count ?? 0),
          };
        }),
      );

      setChatListStatus("success");
    } catch (error) {
      console.error("Failed to load chats:", error);
      setChatListStatus("error");
    }
  }, [currentUserId]);

  useEffect(() => {
    void loadChats();

    const handleFocus = () => {
      void loadChats();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadChats]);

  useEffect(() => {
    if (!currentUserId){
      return;
    }

    const refreshChats = () => {
      void loadChats();
    };

    const channel = supabase.channel(`chat-list:${currentUserId}`).on("postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${currentUserId}`,
      },
      refreshChats,
    )
    .on("postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `sender_id=eq.${currentUserId}`,
      },
      refreshChats,
    )
    .on("postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${currentUserId}`,
      },
      refreshChats,
    )
    .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, loadChats]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setIsOptionVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!openNewChat) {
      return;
    }

    setNewChat(true);
    setOpenNewChat(false);
  }, [openNewChat, setOpenNewChat]);

  useEffect(() => {
    const term = query.trim();
 
    if (!term) {
      setResults([]);
      setStatus("idle");
      return;
    }
 
    setStatus("loading");
    const controller = new AbortController();
 
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/connected-search?q=${encodeURIComponent(term)}`,
          { 
            signal: controller.signal 
          }
        );
        if (!res.ok){
          throw new Error();
        }
 
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.users ?? [];
 
        setResults(
          list.map((u: any) => ({
            id: String(u.id),
            name: u.name ?? u.full_name ?? u.username ?? "Unknown",
            username: u.username ?? null,
            img: u.img ?? u.avatar_url ?? null,
          }))
        );
        setStatus("success");
      } catch (err) {
        if ((err as Error).name === "AbortError"){
          return;
        }
        setResults([]);
        setStatus("error");
      }
    }, 350);
 
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, retryKey]);

  useEffect(() => {
    const term = newQuery.trim();

    if (!newChat || !term) {
      setNewResults([]);
      setNewStatus("idle");
      return;
    }

    setNewStatus("loading");
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(term)}`,
          { 
            signal: controller.signal 
          }
        );
        
        if (!res.ok){
          throw new Error();
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : data.users ?? [];

        setNewResults(
          list.map((u: any) => ({
            id: String(u.id),
            name: u.name ?? u.full_name ?? u.username ?? "Unknown",
            username: u.username ?? null,
            img: u.img ?? u.avatar_url ?? null,
            connectionStatus: u.connection_status ?? "none",
          }))
        );
        setNewStatus("success");
      } catch (err) {
        if ((err as Error).name === "AbortError"){
          return;
        }
        setNewResults([]);
        setNewStatus("error");
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [newQuery, newChat, newRetryKey]);

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

  const handleConnect = async (userId: string) => {
    setSendingId(userId);
    try {
      const res = await fetch("/api/connections/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: userId }),
      });
      
      if (!res.ok){
        throw new Error();
      }
      
      setNewResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, connectionStatus: "pending_sent" } : u))
      );
    } catch (error) {
      console.error("Connection request failed:", error);
    } finally {
      setSendingId(null);
    }
  };

  const isSearching = query.trim().length > 0;
  const showList = isSearching ? status === "success" && results.length > 0 : chats.length > 0;
  const isNewSearching = newQuery.trim().length > 0;

  return (
    <div className="w-80 h-screen flex flex-col gap-4 shrink-0 pt-4 bg-[#0d1927] border-x-2 border-gray-800">
      {!newChat && 
        <>
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
              <div className="group relative">
                <button 
                  onClick={() => setNewChat(true)}
                  className="text-white cursor-pointer bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] p-3 rounded-full 
                    hover:shadow-[0_0_10px_2px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-transform">
                  <MessageSquarePlus size={22} />
                </button>
                <span className="pointer-events-none absolute z-10 top-full right-0 mt-2 whitespace-nowrap rounded-md 
                  bg-black px-3 py-1 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                >
                  New Chat
                </span>
              </div>
            </div>
          </div>
          <div className="border border-slate-800" />
          <div className="relative w-full flex items-center px-3">
            <Search 
              size={18} 
              className="absolute left-6 text-gray-300 pointer-events-none" 
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl h-10 border border-gray-700 bg-gray-800 outline-none focus:bg-gray-700 text-white 
                pl-9 pr-9 text-[15px] placeholder:text-gray-400 transition-colors"
              placeholder="Search or start a new chat"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-6 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {!isSearching && chats.length > 0 && (
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
          )}
          {isSearching && (status === "loading" || status === "idle") && (
            <div className="px-2 flex flex-col" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-gray-700/60" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-gray-700/60" />
                    <div className="h-3 w-3/4 rounded bg-gray-700/40" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {isSearching && status === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-8 pb-16">
              <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center text-gray-300">
                <TriangleAlert size={26} />
              </div>
              <div>
                <p className="text-white font-semibold">Couldn't search right now</p>
                <p className="text-[13px] text-gray-400 mt-1">Check your connection and try again.</p>
              </div>
              <button
                onClick={() => setRetryKey((k) => k + 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 cursor-pointer transition-colors"
              >
                Try again
              </button>
            </div>
          )}
          {isSearching && status === "success" && results.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-8 pb-16">
              <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center text-gray-300">
                <SearchX size={26} />
              </div>
              <div>
                <p className="text-white font-semibold">No connections found</p>
                <p className="text-[13px] text-gray-400 mt-1">
                  No one in your connections matches "{query.trim()}". Use New Chat to find new people.
                </p>
              </div>
              <button
                onClick={() => { setQuery(""); setNewChat(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white cursor-pointer
                  bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] hover:scale-105 active:scale-95 transition-transform"
              >
                <UserPlus size={16} />
                Find people
              </button>
            </div>
          )}
          {!isSearching && chatListStatus === "loading" && chats.length === 0 && (
            <div className="px-2 flex flex-col" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 animate-pulse"
                >
                  <div className="h-12 w-12 rounded-full bg-gray-700/60" />

                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-gray-700/60" />
                    <div className="h-3 w-3/4 rounded bg-gray-700/40" />
                  </div>
                </div>
              ))}
            </div>
          )}

        {!isSearching && chatListStatus === "error" && chats.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-8 pb-16">
              <TriangleAlert size={26} className="text-gray-300" />

              <div>
                <p className="text-white font-semibold">
                  Couldn't load chats
                </p>

                <p className="text-[13px] text-gray-400 mt-1">
                  Check your connection and try again.
                </p>
              </div>

              <button
                onClick={() => void loadChats()}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 cursor-pointer transition-colors"
              >
                Try again
              </button>
            </div>
          )}
          {!isSearching && chatListStatus === "success" && chats.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-8 pb-16">
              <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center text-gray-300">
                <UserPlus size={26} />
              </div>
              <div>
                <p className="text-white font-semibold">No chats yet</p>
                <p className="text-[13px] text-gray-400 mt-1">
                  Search your connections above, or find new people to connect with.
                </p>
              </div>
              <button
                onClick={() => setNewChat(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white cursor-pointer
                  bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] hover:scale-105 active:scale-95 transition-transform"
              >
                <UserPlus size={16} />
                Find people
              </button>
            </div>
          )}
          {showList && (
            <div className="
              flex-1 min-h-0 overflow-y-auto px-2 flex flex-col
              [&::-webkit-scrollbar]:w-[8px]
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:border-[2px]
              [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]"
            >
              {isSearching
                ? results.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        onSelectChat(user.id);
                        setQuery("");
                      }}
                      className="p-2 rounded-md cursor-pointer transition-all duration-200 hover:bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        {user.img ? (
                            <img src={user.img} alt={user.name} className="shrink-0 h-12 w-12 object-cover rounded-full" />
                          ) : (
                            <div className="shrink-0 h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold
                              bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]">
                              {user.name.trim().charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-300">{user.name}</p>
                          {user.username && (
                            <p className="truncate text-[13px] text-gray-400">@{user.username}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                : chats.map((chat) => {
                    const isActiveChat = activeChat === chat.id;
                    return (
                      <div 
                        key={chat.id}
                        onClick={() => onSelectChat(chat.id)}
                        className={`p-2 rounded-md border-l-5 cursor-pointer transition-all duration-200 hover:bg-white/3
                          ${isActiveChat 
                            ? "bg-gradient-to-r from-indigo-400/30 to-transparent border-indigo-500" 
                            : "border-transparent"
                          }`
                        }
                      >
                        <div className="flex gap-3">
                          <div className="relative shrink-0">
                            {chat.img ? (
                              <img
                                src={chat.img}
                                alt={chat.name}
                                className="h-12 w-12 object-cover rounded-full"
                              />
                            ) : (
                              <div className="h-12 w-12 text-lg rounded-full flex items-center justify-center
                                text-white font-semibold bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]"
                              >
                                {getInitials(chat.name ?? "?")}
                              </div>
                            )}

                            {onlineUsers[chat.id] && (
                              <span
                                title="Online"
                                aria-label={`${chat.name} is online`}
                                className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0d1927] bg-green-400"
                              />
                            )}
                          </div>
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
                            {(() => {
                              const otherIsTyping = typingUsers[chat.id] ?? false;
                              const meIsTyping = typingToUsers[chat.id] ?? false;

                              const isTyping = otherIsTyping || meIsTyping;
                              const preview = meIsTyping
                                ? "You: typing..."
                                : otherIsTyping
                                  ? `${chat.username?.trim() || chat.name}: typing...`
                                  : chat.chat;

                              return (
                                <p className={`w-full text-[13px] truncate ${isTyping ? "text-cyan-400 italic" : "text-gray-300"}`}>
                                  {preview}
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )
                  }
                )
              }
            </div>
          )}
        </>
      }
      {newChat && 
        <>
          <div className="flex items-center gap-2 px-2">
            <div className="group relative">
              <div 
                onClick={() => { setNewChat(false); setNewQuery(""); }} 
                className="hover:bg-white/5 text-gray-300 hover:text-white p-2 cursor-pointer rounded-full"
              >
                <ArrowLeft size={22} />
              </div>
              <span className="pointer-events-none absolute z-10 top-full -right-1/2 mt-2 whitespace-nowrap rounded-md 
                bg-black px-3 py-1 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              >
                Back
              </span>
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-xl text-white font-semibold">New Chat</p>
              <p className="text-[13px] text-gray-300">Find people and send a connection request</p>
            </div>
          </div>
          <div className="border border-slate-800" />
          <div className="relative w-full flex items-center px-3">
            <Search 
              size={18} 
              className="absolute left-6 text-gray-300 pointer-events-none" 
            />
            <input
              type="text"
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              className="w-full rounded-xl h-10 border border-gray-700 bg-gray-800 outline-none focus:bg-gray-700 text-white 
                pl-9 pr-9 text-[15px] placeholder:text-gray-400 transition-colors"
              placeholder="Search by username or phone number"
            />
            {newQuery && (
              <button
                onClick={() => setNewQuery("")}
                aria-label="Clear search"
                className="absolute right-6 text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {!isNewSearching && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-8 pb-16">
              <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center text-gray-300">
                <Search size={26} />
              </div>
              <div>
                <p className="text-white font-semibold">Find people</p>
                <p className="text-[13px] text-gray-400 mt-1">
                  Search by username or phone number to find people and send a connection request.
                </p>
              </div>
            </div>
          )}
          {isNewSearching && (newStatus === "loading" || newStatus === "idle") && (
            <div className="px-2 flex flex-col" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-gray-700/60" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-gray-700/60" />
                    <div className="h-3 w-3/4 rounded bg-gray-700/40" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {isNewSearching && newStatus === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-8 pb-16">
              <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center text-gray-300">
                <TriangleAlert size={26} />
              </div>
              <div>
                <p className="text-white font-semibold">Couldn't search right now</p>
                <p className="text-[13px] text-gray-400 mt-1">Check your connection and try again.</p>
              </div>
              <button
                onClick={() => setNewRetryKey((k) => k + 1)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 cursor-pointer transition-colors"
              >
                Try again
              </button>
            </div>
          )}
          {isNewSearching && newStatus === "success" && newResults.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-8 pb-16">
              <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center text-gray-300">
                <SearchX size={26} />
              </div>
              <div>
                <p className="text-white font-semibold">No people found</p>
                <p className="text-[13px] text-gray-400 mt-1">
                  No one matches "{newQuery.trim()}". Try a different username or phone number.
                </p>
              </div>
            </div>
          )}
          {isNewSearching && newStatus === "success" && newResults.length > 0 && (
            <div className="
              flex-1 min-h-0 overflow-y-auto px-2 flex flex-col
              [&::-webkit-scrollbar]:w-[8px]
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:border-[2px]
              [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]"
            >
              {newResults.map((user) => (
                <div
                  key={user.id}
                  className="p-2 rounded-md transition-all duration-200 hover:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    {user.img ? (
                      <img src={user.img} alt={user.name} className="shrink-0 h-12 w-12 object-cover rounded-full" />
                    ) : (
                      <div className="shrink-0 h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold
                        bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]">
                        {user.name.trim().charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-300">{user.name}</p>
                      {user.username && <p className="truncate text-[13px] text-gray-400">@{user.username}</p>}
                    </div>
                    {user.connectionStatus === "connected" ? (
                        <span className="shrink-0 text-sm text-gray-400">Connected</span>
                      ) : user.connectionStatus === "pending_sent" ? (
                        <span className="shrink-0 text-sm text-cyan-400">Pending</span>
                      ) : user.connectionStatus === "pending_received" ? (
                        <span className="shrink-0 text-sm text-cyan-400">Requested you</span>
                      ) : (
                        <button
                          onClick={() => handleConnect(user.id)}
                          disabled={sendingId === user.id}
                          className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                            bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]"
                        >
                          Connect
                        </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      }
    </div>
  )
}