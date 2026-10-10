import type { Socket } from "socket.io-client";
import { create } from "zustand";
import { createSocket } from "@/lib/socket/socket";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/supabaseClient";

const deliveryRequestsInFlight = new Set<string>();
const readRequestsInFlight = new Set<string>();

const requestDeliveredReceipt = async (messageId: string) => {
  if (deliveryRequestsInFlight.has(messageId)) {
    return;
  }

  deliveryRequestsInFlight.add(messageId);

  try {
    const { error } = await supabase.rpc("mark_message_delivered", {
      p_message_id: messageId,
    });

    if (error) {
      console.error("Mark message delivered error:", error);
    }
  } catch (error) {
    console.error("Mark message delivered error:", error);
  } finally {
    deliveryRequestsInFlight.delete(messageId);
  }
};

export type Tabs =
  | "chat"
  | "group"
  | "requests"
  | "starred"
  | "settings"
  | "profile"

export interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone_number: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

interface ChatStore {
  activeTab: Tabs;
  setActiveTab: (tab: Tabs) => void;

  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;

  openNewChat: boolean;
  setOpenNewChat: (value: boolean) => void;

  socket: Socket | null;
  realtimeChannel: RealtimeChannel | null;
  connectSocket: (accessToken: string) => void;
  disconnectSocket: () => void;
  connectRealtime: (userId: string) => void;
  disconnectRealtime: () => void;

  messages: Record<string, MessageRecord[]>;
  addMessage: (message: MessageRecord) => void;
  sendMessage: (
    receiverId: string,
    content: string
  ) => Promise<MessageRecord>;

  prependMessages: (
    userId: string,
    messages: MessageRecord[],
  ) => void;

  updateMessage: (message: MessageRecord) => void;
  markMessagesRead: (userId: string) => Promise<void>;

  typingUsers: Record<string, boolean>;
  setTypingStatus: (
    userId: string,
    isTyping: boolean,
  ) => void;

  startTyping: (receiverId: string) => void;
  stopTyping: (receiverId: string) => void;

  typingToUsers: Record<string, boolean>;

  onlineUsers: Record<string, boolean>;
  setOnlineUsers: (userIds: string[]) => void;
  setUserPresence: (
    userId: string,
    isOnline: boolean,
  ) => void;

  clearConversationMessages: (userId: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  activeTab: "chat",
  setActiveTab: (tab) => set({ activeTab: tab }),

  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  openNewChat: false,
  setOpenNewChat: (value) => set({ openNewChat: value }),

  messages: {},
  socket: null,
  realtimeChannel: null,
  typingUsers: {},
  typingToUsers: {},
  onlineUsers: {},

  setOnlineUsers: (userIds) => {
    set({
      onlineUsers: Object.fromEntries(
        userIds.map((userId) => [userId, true]),
      ),
    });
  },

  setUserPresence: (userId, isOnline) => {
    set((state) => {
      const onlineUsers = { ...state.onlineUsers };

      if (isOnline) {
        onlineUsers[userId] = true;
      } else {
        delete onlineUsers[userId];
      }

      return { onlineUsers };
    });
  },

  setTypingStatus: (userId, isTyping) => {
    set((state) => {
      const typingUsers = { ...state.typingUsers };

      if (isTyping) {
        typingUsers[userId] = true;
      } else {
        delete typingUsers[userId];
      }

      return { typingUsers };
    });
  },

  startTyping: (receiverId) => {
    set((state) => ({
      typingToUsers: {
        ...state.typingToUsers,
        [receiverId]: true,
      },
    }));

    const socket = get().socket;
    if (socket?.connected) {
      socket.emit("typing", {
        receiverId,
        isTyping: true,
      });
    }
  },

  stopTyping: (receiverId) => {
    set((state) => {
      const typingToUsers = { ...state.typingToUsers };
      delete typingToUsers[receiverId];

      return { typingToUsers };
    });

    const socket = get().socket;
    if (socket?.connected) {
      socket.emit("typing", {
        receiverId,
        isTyping: false,
      });
    }
  },

  addMessage: (message) => {
    const currentUserId = get().currentUser?.id;

    if (!currentUserId) {
      return;
    }

    const conversationUserId = message.sender_id === currentUserId
      ? message.receiver_id
      : message.sender_id;

    if (message.receiver_id === currentUserId && !message.delivered_at) {
      void requestDeliveredReceipt(message.id);
    }

    set((state) => {
      const existingMessages = state.messages[conversationUserId] ?? [];

      if (existingMessages.some((existingMessage) => existingMessage.id === message.id,)) {
        return state;
      }

      return {
        messages: {
          ...state.messages,
          [conversationUserId]: [...existingMessages, message],
        },
      };
    });
  },

  prependMessages: (userId, messages) => {
    if (messages.length === 0) {
      return;
    }

    set((state) => {
      const existingMessages = state.messages[userId] ?? [];
      const combinedMessages = [...messages, ...existingMessages];

      const uniqueMessages = Array.from(
        new Map(
          combinedMessages.map((message) => [message.id, message]),
        ).values(),
      );

      uniqueMessages.sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime(),
      );

      return {
        messages: {
          ...state.messages,
          [userId]: uniqueMessages,
        },
      };
    });
  },

  updateMessage: (message) => {
    set((state) => {
      const currentUserId = state.currentUser?.id;

      if (!currentUserId) {
        return state;
      }

      const conversationUserId = message.sender_id === currentUserId
        ? message.receiver_id
        : message.sender_id;

      const existingMessages = state.messages[conversationUserId];

      if (!existingMessages) {
        return state;
      }

      const messageExists = existingMessages.some((existingMessage) => existingMessage.id === message.id);

      if (!messageExists) {
        return state;
      }

      return {
        messages: {
          ...state.messages,
          [conversationUserId]: existingMessages.map(
            (existingMessage) =>
              existingMessage.id === message.id
                ? { ...existingMessage, ...message }
                : existingMessage,
          ),
        },
      };
    });
  },

  markMessagesRead: async (userId) => {
    const currentUserId = get().currentUser?.id;

    if (!currentUserId) {
      return;
    }

    const unreadMessages = (get().messages[userId] ?? []).filter((message) =>
      message.receiver_id === currentUserId && (!message.is_read || !message.read_at),
    );

    await Promise.all(unreadMessages.map(async (message) => {
        if (readRequestsInFlight.has(message.id)) {
          return;
        }

        readRequestsInFlight.add(message.id);
        try {
          const { data, error } = await supabase.rpc("mark_message_read",
            {
              p_message_id: message.id,
            },
          );

          if (error) {
            console.error("Mark message read error:", error);
            return;
          }

          if (data) {
            const latestMessage = (get().messages[userId] ?? []).find((item) => item.id === message.id) ?? message;
            const receiptTime = new Date().toISOString();

            get().updateMessage({
              ...latestMessage,
              is_read: true,
              delivered_at: latestMessage.delivered_at ?? receiptTime,
              read_at: latestMessage.read_at ?? receiptTime,
            });
          }
        } catch (error) {
          console.error("Mark message read error:", error);
        } finally {
          readRequestsInFlight.delete(message.id);
        }
      }),
    );
  },

  clearConversationMessages: (userId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [userId]: [],
      },
    }));
  },

  connectSocket: (accessToken) => {
    const currentUser = get().currentUser;
    if (currentUser) {
      get().connectRealtime(currentUser.id);
    }

    const existingSocket = get().socket;
    if (existingSocket) {
      const currentAuth = existingSocket.auth;

      const currentAccessToken =
        typeof currentAuth === "object" &&
        currentAuth !== null &&
        "accessToken" in currentAuth
          ? currentAuth.accessToken
          : undefined;

      existingSocket.auth = {
        accessToken,
      };

      if (currentAccessToken === accessToken) {
        if (!existingSocket.connected) {
          existingSocket.connect();
        }

        return;
      }

      if (existingSocket.connected) {
        existingSocket.disconnect();
      }

      existingSocket.connect();
      return;
    }

    const socket = createSocket(accessToken);
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    socket.on("presence_snapshot",
      (payload: { onlineUserIds?: unknown }) => {
        if (!Array.isArray(payload?.onlineUserIds)) {
          return;
        }

        const onlineUserIds = payload.onlineUserIds.filter(
          (id): id is string => typeof id === "string",
        );

        console.log("[Presence] Snapshot received:", onlineUserIds);
        get().setOnlineUsers(onlineUserIds);
      },
    );

    socket.on("user_presence",
      (payload: { userId: string; isOnline: boolean }) => {
        if (typeof payload?.userId !== "string" || typeof payload?.isOnline !== "boolean") {
          return;
        }

        console.log("[Presence] Status received:", payload);
        get().setUserPresence(payload.userId, payload.isOnline);
      },
    );

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      set({ onlineUsers: {} });
    });

    socket.on("user_typing",
      (payload: { userId: string; isTyping: boolean }) => {
        if (typeof payload?.userId !== "string" || typeof payload?.isTyping !== "boolean") {
          return;
        }

        get().setTypingStatus(
          payload.userId,
          payload.isTyping,
        );
      },
    );

    socket.on("new_message", (message: MessageRecord) => {
      get().addMessage(message);
    });

    socket.on("message_sent", (message: MessageRecord) => {
      get().addMessage(message);
    });

    set({socket});
    socket.connect();
  },

  disconnectSocket: () => {
    get().disconnectRealtime();

    const socket = get().socket;

    if (!socket) {
      return;
    }

    socket.disconnect();
    set({ socket: null });
  },

  sendMessage: (receiverId, content) => {
    const socket = get().socket;

    if (!socket || !socket.connected) {
      return Promise.reject(new Error("Socket is not connected"));
    }

    return new Promise((resolve, reject) => {
      socket.timeout(5000).emit("send_message",
        {receiverId, content},
          (
            error: Error | null,
            response: {
              success: boolean;
              message?: MessageRecord;
              error?: string;
            }
          ) => {
            if (error) {
              reject(new Error("Message send timed out"));
              return;
            }

            if (!response?.success || !response.message) {
              reject(new Error(response?.error ?? "Failed to send message"));
              return;
            }

            get().addMessage(response.message);
            resolve(response.message);
          }
        );
    });
  },
  
  connectRealtime: (userId) => {
    const existingChannel = get().realtimeChannel;

    if (existingChannel) {
      return;
    }

    const channel = supabase.channel(`messages:${userId}`).on("postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        const message = payload.new as MessageRecord;
        get().addMessage(message);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        const message = payload.new as MessageRecord;

        if (
          message.sender_id !== userId &&
          message.receiver_id !== userId
        ) {
          return;
        }

        console.log("Message receipt UPDATE received:", {
          id: message.id,
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          delivered_at: message.delivered_at,
          read_at: message.read_at,
          is_read: message.is_read,
        });

        get().updateMessage(message);
      },
    )
    .subscribe((status, error) => {
      console.log("Supabase Realtime status:", status);

      if (error) {
        console.error("Supabase Realtime subscription error:", error);
      }
    });

    set({ realtimeChannel: channel });
  },
  
  disconnectRealtime: () => {
    const channel = get().realtimeChannel;

    if (!channel) {
      return;
    }

    void supabase.removeChannel(channel);
    set({ realtimeChannel: null });
  },
}));