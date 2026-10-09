import type { Server, Socket } from "socket.io";

import { getUserRoom } from "../lib/socket/rooms";
import { createRateLimiter } from "../lib/socket/rateLimiter";
import { createMessage, type MessageRecord } from "../services/message.service";
import { sendMessageSchema } from "../schemas/message.schema";

interface SendMessageResponse {
  success: boolean;
  message?: MessageRecord;
  error?: string;
}

type SendMessageAck = (response: SendMessageResponse) => void;

const sendMessageRateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 10_000,
});

export const registerMessagingHandlers = (
  io: Server,
  socket: Socket
) => {
  socket.on(
    "send_message",
    async (payload: unknown, ack?: SendMessageAck) => {
      const respond = ack ?? (() => {});

      if (!sendMessageRateLimiter.check(socket.data.userId)) {
        respond({
          success: false,
          error: "Too many messages. Please slow down.",
        });

        return;
      }

      const result = sendMessageSchema.safeParse(payload);

      if (!result.success) {
        respond({
          success: false,
          error: "Invalid message payload.",
        });

        return;
      }

      const { receiverId, content } = result.data;

      if (receiverId === socket.data.userId) {
        respond({
          success: false,
          error: "You cannot send a message to yourself.",
        });

        return;
      }

      const accessToken = socket.data.accessToken;

      if (typeof accessToken !== "string" || accessToken.length === 0) {
        respond({
          success: false,
          error: "Authentication required.",
        });

        return;
      }

      try {
        const message = await createMessage({
          senderId: socket.data.userId,
          accessToken,
          input: {
            receiverId,
            content,
          },
        });

        io.to(getUserRoom(message.receiver_id)).emit(
          "new_message",
          message
        );

        socket.broadcast
          .to(getUserRoom(message.sender_id))
          .emit("new_message", message);

        socket.emit("message_sent", message);

        respond({
          success: true,
          message,
        });
      } catch (error) {
        console.error("Failed to send message:", error);

        respond({
          success: false,
          error: "Failed to send message.",
        });
      }
    }
  );
};