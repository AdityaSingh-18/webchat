import type { Server, Socket } from "socket.io";

import { createAuthenticatedSupabaseClient } from "../lib/supabase";
import { getUserRoom } from "../lib/socket/rooms";

type ConnectionRecord = {
  user_id: string;
  contact_id: string;
};

const socketsByUser = new Map<string, Set<string>>();
const contactsBySocket = new Map<string, Set<string>>();

export const registerPresenceHandlers = (
  io: Server,
  socket: Socket,
) => {
  const userId: unknown = socket.data.userId;
  const accessToken: unknown = socket.data.accessToken;

  if (
    typeof userId !== "string" ||
    typeof accessToken !== "string" ||
    !accessToken
  ) {
    return;
  }

  let disconnected = false;
  socket.on("disconnect", () => {
    disconnected = true;

    const contactIds = contactsBySocket.get(socket.id);
    contactsBySocket.delete(socket.id);

    const userSockets = socketsByUser.get(userId);
    if (!userSockets) {
      return;
    }

    userSockets.delete(socket.id);

    if (userSockets.size > 0) {
      return;
    }

    socketsByUser.delete(userId);

    for (const contactId of contactIds ?? []) {
      io.to(getUserRoom(contactId)).emit("user_presence", {
        userId,
        isOnline: false,
      });
    }
  });

  const initializePresence = async () => {
    try {
      const supabase = createAuthenticatedSupabaseClient(accessToken);

      const { data, error } = await supabase
        .from("connections")
        .select("user_id, contact_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${userId},contact_id.eq.${userId}`);

      if (error) {
        console.error("Load presence connections error:", error);
        return;
      }

      if (disconnected) {
        return;
      }

      const contactIds = new Set(
        ((data ?? []) as ConnectionRecord[])
          .map((connection) =>
            connection.user_id === userId
              ? connection.contact_id
              : connection.user_id,
          )
          .filter(
            (contactId) =>
              Boolean(contactId) && contactId !== userId,
          ),
      );

      contactsBySocket.set(socket.id, contactIds);

      let userSockets = socketsByUser.get(userId);
      const isFirstConnection = !userSockets?.size;

      if (!userSockets) {
        userSockets = new Set<string>();
        socketsByUser.set(userId, userSockets);
      }

      userSockets.add(socket.id);

      const onlineUserIds = [...contactIds].filter(
        (contactId) => socketsByUser.has(contactId),
      );

      socket.emit("presence_snapshot", { onlineUserIds });

      if (isFirstConnection) {
        for (const contactId of contactIds) {
          io.to(getUserRoom(contactId)).emit("user_presence", {
            userId,
            isOnline: true,
          });
        }
      }
    } catch (error) {
      console.error("Initialize presence error:", error);
    }
  };

  void initializePresence();
};