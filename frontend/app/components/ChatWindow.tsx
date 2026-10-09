"use client";

import { useEffect, useState, useRef} from "react";
import { useChatStore, type MessageRecord } from "@/lib/store/chatStore";

import {
  Info,
  Plus,
  ShieldCheck,
} from "lucide-react";

import {
  UserDetails,
  type UserDetailsData,
} from "@/components/UserDetails";
import toast from "react-hot-toast";

type ChatWindowProps = {
  userId: string | null;
};

const EMPTY_MESSAGES: MessageRecord[] = [];

export const ChatWindow = ({
  userId,
}: ChatWindowProps) => {
  const [messageInput, setMessageInput] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const [user, setUser] = useState<UserDetailsData | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState("");

  const currentUser = useChatStore((state) => state.currentUser);
  const messages = useChatStore((state) => userId ? state.messages[userId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const prependMessages = useChatStore((state) => state.prependMessages);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const previousScrollHeightRef = useRef<number | null>(null);
  const initialLoadRef = useRef(true);

  const handleSendMessage = async () => {
    const content = messageInput.trim();

    if (!content || !userId) {
      return;
    }

    try {
      await sendMessage(userId, content);
      setMessageInput("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message.");
    }
  };

  const loadMessages = async (before?: string) => {
    if (!userId) {
      return;
    }

    if (before) {
      if (loadingOlder || !hasMoreMessages) {
        return;
      }
      setLoadingOlder(true);
    } else {
      setHistoryLoading(true);
    }

    try {
      const params = new URLSearchParams({
        userId,
        limit: "30",
      });

      if (before) {
        params.set("before", before);
      }

      const response = await fetch(`/api/messages?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load messages.");
      }

      prependMessages(userId, data.messages);

      setHasMoreMessages(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load messages.");
    } finally {
      setHistoryLoading(false);
      setLoadingOlder(false);
    }
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;

    if (
      !container ||
      !nextCursor ||
      !hasMoreMessages ||
      loadingOlder
    ) {
      return;
    }

    if (container.scrollTop > 100) {
      return;
    }

    previousScrollHeightRef.current = container.scrollHeight;
    void loadMessages(nextCursor);
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    if (initialLoadRef.current) {
      if (messages.length > 0) {
        container.scrollTop = container.scrollHeight;
      }

      initialLoadRef.current = false;
      return;
    }

    const previousScrollHeight = previousScrollHeightRef.current;
    if (previousScrollHeight === null) {
      return;
    }

    container.scrollTop = container.scrollHeight - previousScrollHeight;
    previousScrollHeightRef.current = null;
  }, [messages]);

  useEffect(() => {
    setShowDetails(false);

    if (!userId) {
      setUser(null);
      setUserError("");
      return;
    }

    const controller = new AbortController();

    const loadUser = async () => {
      setUserLoading(true);
      setUserError("");

      try {
        const response = await fetch(`/api/users/${userId}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load user.");
        }

        setUser({
          ...data,
          online: false,
          mediaCount: null,
          starredCount: null,
          commonGroupsCount: null,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setUser(null);
        setUserError(error instanceof Error ? error.message : "Failed to load user.");
      } finally {
        setUserLoading(false);
      }
    };

    loadUser();
    return () => {
      controller.abort();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setHasMoreMessages(true);
      setNextCursor(null);
      initialLoadRef.current = true;
      return;
    }

    setHasMoreMessages(true);
    setNextCursor(null);
    initialLoadRef.current = true;

    void loadMessages();
  }, [userId]);

  return (
    <>
      {!userId ?
        <div className="flex-1 h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#080f1c]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(6,100,130,0.25),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(70,25,120,0.25),_transparent_40%)]" />

          <div className="relative z-10 flex flex-col items-center text-center px-8">
            <img
              src="/Logo.svg"
              alt="WebChat"
              className="h-24 w-24 mb-4 drop-shadow-[0_0_20px_#c568f5]"
            />

            <h1 className="text-4xl font-semibold bg-gradient-to-br from-[#c568f5] via-[#68a8ff] to-[#4ee7e8] bg-clip-text text-transparent">
              WebChat
            </h1>

            <p className="text-xl text-gray-200 mt-3">
              Select a chat to start messaging
            </p>

            <p className="max-w-md text-sm text-gray-400 mt-2 leading-6">
              Choose a chat to start your conversation.
            </p>

            <div className="mt-8 flex items-center gap-1 text-xs text-gray-500">
              <ShieldCheck
                size={20}
                strokeWidth={2}
                className="shrink-0 text-cyan-400"
              />
              <span>
                Your messages are private and secure.
              </span>
            </div>
          </div>
        </div>
      :
        <>
          <div className="flex-1 h-screen flex flex-col">
            <div className="h-20 px-6 flex items-center justify-between gap-3 shrink-0 bg-[#0a1220] border-b-2 border-gray-800">
              <div className="flex items-center gap-3 shrink-0 min-w-0">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="shrink-0 h-12 w-12 object-cover rounded-full"
                  />
                ) : (
                  <div className="shrink-0 h-12 w-12 rounded-full flex items-center justify-center  text-white font-semibold
                    bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]"
                  >
                    {user?.name?.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                )}

                <div className="flex flex-col justify-center min-w-0">
                  <p className="font-semibold text-[18px] text-white truncate">
                    {userLoading ? "Loading..." : user?.name || "Select a chat"}
                  </p>

                  {user && (
                    <div className="flex gap-2 items-center">
                      <div className={`h-2 w-2 rounded-full ${user.online ? "bg-green-400" : "bg-gray-500"}`} />

                      <p className={`text-sm truncate ${user.online ? "text-green-400" : "text-gray-400"}`}>
                        {user.online ? "Online" : "Offline"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {user && (
                <button onClick={() => setShowDetails((value) => !value)} aria-label="Show user details">
                  <Info className="text-cyan-600 stroke-[3] cursor-pointer hover:text-cyan-500" />
                </button>
              )}
            </div>
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll} 
              className="flex-1 w-full min-h-0 overflow-y-auto bg-[#080f1c] 
                bg-[radial-gradient(circle_at_bottom_left,_rgba(6,100,130,0.35),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(70,25,120,0.3),_transparent_40%)]
                [&::-webkit-scrollbar]:w-[10px]
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:border-[2px]
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]"
            >
              
              {loadingOlder && (
                <div className="flex justify-center py-3">
                  <span className="text-xs text-gray-400">
                    Loading older messages...
                  </span>
                </div>
              )}
              {historyLoading ? (
                <div className="flex justify-center py-6">
                  <span className="text-sm text-gray-400">
                    Loading messages...
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 px-12 py-4">
                  {messages.map((data) => {
                    const me = data.sender_id === currentUser?.id;

                    return (
                      <div key={data.id}>
                        <div
                          className={`flex ${
                            me ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`w-fit min-w-50 px-4 py-3 text-white ${
                              me
                                ? "rounded-tl-xl rounded-bl-xl bg-gradient-to-r from-cyan-500/80 to-transparent"
                                : "rounded-tr-xl rounded-br-xl bg-gradient-to-l from-purple-500/50 to-transparent"
                            }`}
                          >
                            {data.content}
                          </div>
                        </div>

                        <div
                          className={`mt-1.5 text-gray-300 text-[10px] flex ${
                            me ? "justify-end" : "justify-start"
                          }`}
                        >
                          {new Date(data.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="shrink-0 flex gap-3 p-4 bg-[#0a1220] border-t-2 border-gray-800">
              <button className="rounded-full flex items-center justify-center px-2 shadow-lg text-gray-400 cursor-pointer 
                bg-[#0d1927] hover:bg-gray-800 border border-gray-800 hover:shadow-[0_0_10px_2px_rgba(255,255,255,0.4)]"
              >
                <Plus />
              </button>
              <input 
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                className="flex-1 px-3 py-2 placeholder:text-gray-400 text-white bg-[#0d1927] focus:bg-gray-800 outline-none border border-gray-800 rounded-2xl"
                placeholder="Write a message..."
              />
              <button onClick={handleSendMessage} className="flex items-center justify-center shrink-0 px-2.5 py-1.5
                rounded-full cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 
                bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] hover:shadow-[0_0_10px_2px_rgba(255,255,255,0.4)]">
                <img src="./send-icon.svg" alt="send icon" className="h-6 w-6 invert"/>
              </button>
            </div>
          </div>
          {showDetails && user && (
            <UserDetails
              user={user}
              onClose={() => setShowDetails(false)}
            />
          )}
        </>
      }
    </>
  );
}