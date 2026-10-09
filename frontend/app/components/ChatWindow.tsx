"use client";

import { useEffect, useState, useRef} from "react";
import { useChatStore, type MessageRecord } from "@/lib/store/chatStore";

import {UserDetails, type UserDetailsData} from "@/components/UserDetails";
import { getInitials } from "@/lib";

import {
  ArrowDown,
  Calendar,
  Check,
  CheckCheck,
  Info,
  Plus,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

type ChatWindowProps = {
  userId: string | null;
};

const EMPTY_MESSAGES: MessageRecord[] = [];

const getDateKey = (date: Date) => {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const formatDateSeparator = (value: string) => {
  const date = new Date(value);

  const today = new Date();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (getDateKey(date) === getDateKey(today)) {
    return "Today";
  }

  if (getDateKey(date) === getDateKey(yesterday)) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
};

export const ChatWindow = ({
  userId,
}: ChatWindowProps) => {
  const [messageInput, setMessageInput] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const [user, setUser] = useState<UserDetailsData | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState("");

  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const currentUser = useChatStore((state) => state.currentUser);
  const messages = useChatStore((state) => userId ? state.messages[userId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const prependMessages = useChatStore((state) => state.prependMessages);
  const markMessagesRead = useChatStore((state) => state.markMessagesRead);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const previousScrollHeightRef = useRef<number | null>(null);
  const initialLoadRef = useRef(true);

  const lastMessageIdRef = useRef<string | null>(null);
  const activeChatUserIdRef = useRef<string | null>(null);
  const isNearBottomRef = useRef(true);

  const BOTTOM_THRESHOLD = 120;

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

    if (!container) {
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom <= BOTTOM_THRESHOLD;
    isNearBottomRef.current = isNearBottom;
    
    if (isNearBottom) {
      setShowScrollToBottom(false);
      setNewMessageCount(0);
    }

    if (!nextCursor || !hasMoreMessages || loadingOlder) {
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

    if (!container || !userId) {
      return;
    }

    const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    if (activeChatUserIdRef.current !== userId) {
      activeChatUserIdRef.current = userId;
      initialLoadRef.current = true;
      previousScrollHeightRef.current = null;
      lastMessageIdRef.current = null;
      isNearBottomRef.current = true;

      setShowScrollToBottom(false);
      setNewMessageCount(0);
    }

    if (initialLoadRef.current) {
      if (historyLoading) {
        return;
      }

      container.scrollTop = container.scrollHeight;

      initialLoadRef.current = false;
      previousScrollHeightRef.current = null;
      lastMessageIdRef.current = latestMessage?.id ?? null;
      isNearBottomRef.current = true;

      setShowScrollToBottom(false);
      setNewMessageCount(0);

      return;
    }

    const previousScrollHeight = previousScrollHeightRef.current;
    if (previousScrollHeight !== null) {
      container.scrollTop = container.scrollHeight - previousScrollHeight;
      previousScrollHeightRef.current = null;
      lastMessageIdRef.current = latestMessage?.id ?? null;

      return;
    }

    const hasNewLatestMessage = latestMessage !== null && latestMessage.id !== lastMessageIdRef.current;
    if (hasNewLatestMessage && latestMessage) {
      const isMyMessage = latestMessage.sender_id === currentUser?.id;

      if (isMyMessage || isNearBottomRef.current) {
        container.scrollTo({top: container.scrollHeight, behavior: "smooth"});
        isNearBottomRef.current = true;

        setShowScrollToBottom(false);
        setNewMessageCount(0);
      } else {
        setNewMessageCount((count) => count + 1);
        setShowScrollToBottom(true);
      }
    }

    lastMessageIdRef.current = latestMessage?.id ?? null;
  }, [messages, userId, historyLoading, currentUser?.id]);

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

  useEffect(() => {
    if (!userId || historyLoading || messages.length === 0) {
      return;
    }

    void markMessagesRead(userId);
  }, [userId, historyLoading, messages, markMessagesRead]);

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
                  <div className="shrink-0 h-12 w-12 text-lg rounded-full flex items-center justify-center text-white font-semibold
                    bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]"
                  >
                    {getInitials(user?.name ?? "?")}
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
            <div className="relative flex-1 w-full min-h-0">
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll} 
                className="h-full w-full overflow-y-auto bg-[#080f1c] 
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
                    {messages.map((data, index) => {
                      const me = data.sender_id === currentUser?.id;
                      const currentDateKey = getDateKey(new Date(data.created_at));

                      const previousDateKey = index > 0
                        ? getDateKey(new Date(messages[index - 1].created_at))
                        : null;
                      const showDateSeparator = currentDateKey !== previousDateKey;

                      return (
                        <div key={data.id}>
                          {showDateSeparator && (() => {
                            const dateLabel = formatDateSeparator(data.created_at);
                            const showCalendar = dateLabel !== "Today" && dateLabel !== "Yesterday";

                            return (
                              <div className="flex items-center justify-center py-2">
                                <div className="px-3 py-1.5 rounded-xl flex gap-1.5 items-center text-gray-200 text-sm bg-gray-700 border border-gray-600">
                                  {showCalendar && <Calendar size={16} />}
                                  {dateLabel}
                                </div>
                              </div>
                            );
                          })()}
                          <div className={`flex ${me ? "justify-end" : "justify-start"}`}>
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

                          <div className={`mt-1.5 text-gray-300 text-[10px] flex items-center gap-1.5 
                            ${me ? "justify-end" : "justify-start"}`}
                          >
                            <span>
                              {new Date(data.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>

                            {me && (
                              <span title={data.read_at || data.is_read
                                ? "Read"
                                : data.delivered_at
                                  ? "Delivered"
                                  : "Sent"
                                }
                                aria-label={data.read_at || data.is_read
                                  ? "Message read"
                                  : data.delivered_at
                                    ? "Message delivered"
                                    : "Message sent"
                                }
                                className={data.read_at || data.is_read
                                  ? "text-cyan-300"
                                  : data.delivered_at
                                    ? "text-gray-300"
                                    : "text-gray-500"
                                }
                              >
                                {data.read_at || data.is_read ? (
                                  <CheckCheck size={14} />
                                ) : data.delivered_at ? (
                                  <CheckCheck size={14} />
                                ) : (
                                  <Check size={14} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {showScrollToBottom && (
                <button
                  type="button"
                  onClick={() => {
                    const container = messagesContainerRef.current;

                    if (!container) {
                      return;
                    }

                    container.scrollTo({
                      top: container.scrollHeight,
                      behavior: "smooth",
                    });

                    isNearBottomRef.current = true;

                    setShowScrollToBottom(false);
                    setNewMessageCount(0);
                  }}
                  aria-label={`${newMessageCount} new messages.`}
                  className="absolute bottom-5 right-6 z-20 flex items-center gap-2 rounded-full border border-gray-700 bg-[#0d1927]/95
                    px-4 py-2 text-sm text-white shadow-lg transition-colors hover:bg-gray-800"
                >
                  <span>
                    {newMessageCount} new{" "}
                    {newMessageCount === 1 ? "message" : "messages"}
                  </span>

                  <ArrowDown size={18} />
                </button>
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