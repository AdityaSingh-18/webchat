"use client";

import { useCallback, useEffect, useState } from "react";
import { useChatStore } from "@/lib/store/chatStore";
import { getInitials } from "@/lib";

import {
  ArrowLeft,
  Clock3,
  Loader2,
  MessageSquare,
  Star,
  TriangleAlert,
} from "lucide-react";

type StarredAttachment = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
};

type StarredItem = {
  id: string;
  starred_at: string;
  message: {
    id: string;
    content: string | null;
    created_at: string;
    attachments: StarredAttachment[];
  };
  chat: {
    userId: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
  };
};

type StarredMessagesProps = {
  onSelectChat?: (userId: string) => void;
  conversationUserId?: string;
  embedded?: boolean;
  onMessageSelected?: () => void;
};

type LoadStatus = "loading" | "success" | "error";

const GRADIENT = "bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]";

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const StarredMessages = ({
  onSelectChat,
  conversationUserId,
  embedded = false,
  onMessageSelected,
}: StarredMessagesProps) => {
  const setActiveTab = useChatStore((state) => state.setActiveTab);
  const requestStarredMessageJump = useChatStore((state) => state.requestStarredMessageJump);

  const [items, setItems] = useState<StarredItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");

  const loadStarredMessages = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const params = new URLSearchParams();

      if (conversationUserId) {
        params.set("userId", conversationUserId);
      }

      const query = params.toString();
      const response = await fetch(
        `/api/messages/starred${query ? `?${query}` : ""}`,
        { cache: "no-store" },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load starred messages.");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
      setStatus("success");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load starred messages.",
      );
      setStatus("error");
    }
  }, [conversationUserId]);

  useEffect(() => {
    void loadStarredMessages();

    const handleStarredChange = () => {
      void loadStarredMessages();
    };

    window.addEventListener("webchat:starred-changed", handleStarredChange);

    return () => {
      window.removeEventListener(
        "webchat:starred-changed",
        handleStarredChange,
      );
    };
  }, [loadStarredMessages]);

  const handleSelectMessage = (item: StarredItem) => {
    if (onSelectChat) {
      onSelectChat(item.chat.userId);
    }

    requestStarredMessageJump(item.chat.userId, item.message.id);
    onMessageSelected?.();
  };

  return (
    <div
      className={
        embedded
          ? "flex h-full min-h-0 w-full flex-col bg-slate-900"
          : "flex h-screen w-80 shrink-0 flex-col gap-4 border-x-2 border-gray-800 bg-[#0d1927] pt-4"
      }
    >
      {!embedded && (
        <>
          <div className="flex items-center gap-2 px-2">
            <div className="group relative">
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                aria-label="Back to chats"
                className="cursor-pointer rounded-full p-2 text-gray-300 transition hover:bg-white/5 hover:text-white"
              >
                <ArrowLeft size={22} />
              </button>

              <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-md bg-black px-3 py-1 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Back
              </span>
            </div>

            <div className="flex flex-col justify-center">
              <p className="text-xl font-semibold text-white">
                Starred Messages
              </p>
              <p className="text-[12px] text-gray-300">
                Your saved messages
              </p>
            </div>
          </div>

          <div className="border border-slate-800" />
        </>
      )}

      {status === "loading" && (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          Loading starred messages...
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-gray-300">
            <TriangleAlert size={26} />
          </div>

          <div>
            <p className="font-semibold text-white">
              Couldn't load starred messages
            </p>
            <p className="mt-1 text-[13px] text-gray-400">
              {error || "Check your connection and try again."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadStarredMessages()}
            className="cursor-pointer rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            Try again
          </button>
        </div>
      )}

      {status === "success" && items.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white ${GRADIENT}`}>
            <Star size={26} />
          </div>

          <div>
            <p className="font-semibold text-white">
              No starred messages yet
            </p>
            <p className="mt-1 text-[13px] text-gray-400">
              {conversationUserId
                ? "Starred messages from this conversation will appear here."
                : "Messages you star in your conversations will appear here."}
            </p>
          </div>
        </div>
      )}

      {status === "success" && items.length > 0 && (
        <div
          className="min-h-0 flex-1 overflow-y-auto px-3 py-2
          [&::-webkit-scrollbar]:w-[8px]
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]"
        >
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const content = item.message.content?.trim();
              const attachments = item.message.attachments ?? [];
              const preview =
                content ||
                (attachments.length
                  ? attachments.map((attachment) => attachment.file_name).join(", ")
                  : "Message");

              return (
                <button
                  key={item.message.id}
                  type="button"
                  onClick={() => handleSelectMessage(item)}
                  className="flex w-full min-w-0 cursor-pointer flex-col gap-3 rounded-xl border border-slate-800 bg-slate-800/70 p-3 text-left transition hover:border-indigo-500/50 hover:bg-slate-800"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {item.chat.avatarUrl ? (
                      <img
                        src={item.chat.avatarUrl}
                        alt={item.chat.name}
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${GRADIENT}`}>
                        {getInitials(item.chat.name)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {item.chat.name}
                      </p>
                      {item.chat.username && (
                        <p className="truncate text-xs text-gray-400">
                          @{item.chat.username}
                        </p>
                      )}
                    </div>

                    <Star
                      size={17}
                      className="shrink-0 fill-yellow-400 text-yellow-400"
                    />
                  </div>

                  <p className="line-clamp-3 break-words text-sm text-gray-300">
                    {preview}
                  </p>

                  <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                    <MessageSquare size={13} />
                    <span>{formatDate(item.message.created_at)}</span>
                    <span className="mx-1">·</span>
                    <Clock3 size={13} />
                    <span>Starred {formatDate(item.starred_at)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};