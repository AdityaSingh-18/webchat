import type { Socket } from "socket.io-client";
import { create } from "zustand";
import { createSocket } from "@/lib/socket/socket";

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
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface ChatStore {
  activeTab: Tabs;
  setActiveTab: (tab: Tabs) => void;

  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;

  openNewChat: boolean;
  setOpenNewChat: (value: boolean) => void;

  socket: Socket | null;
  connectSocket: (accessToken: string) => void;
  disconnectSocket: () => void;

  messages: Record<string, MessageRecord[]>;
  addMessage: (message: MessageRecord) => void;
  sendMessage: (
    receiverId: string,
    content: string
  ) => Promise<MessageRecord>;
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

  addMessage: (message) => {
    const currentUserId = get().currentUser?.id;

    if (!currentUserId) {
      return;
    }

    const conversationUserId = message.sender_id === currentUserId
      ? message.receiver_id
      : message.sender_id;

    set((state) => {
      const existingMessages = state.messages[conversationUserId] ?? [];

      if (existingMessages.some((existingMessage) => existingMessage.id === message.id)) {
        return state;
      }

      return {
        messages: {
          ...state.messages,
          [conversationUserId]: [
            ...existingMessages,
            message,
          ],
        },
      };
    });
  },


  connectSocket: (accessToken) => {
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

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

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
    const socket = get().socket;

    if (!socket) {
      return;
    }

    socket.disconnect();
    set({socket: null});
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
}));