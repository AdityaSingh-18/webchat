import { z } from "zod";

import type { Server, Socket } from "socket.io";

import { createAuthenticatedSupabaseClient } from "../lib/supabase";
import { getUserRoom } from "../lib/socket/rooms";
import { createRateLimiter } from "../lib/socket/rateLimiter";

import { createMessage, getOrCreateConversation, type MessageRecord} from "../services/message.service";
import { sendMessageSchema } from "../schemas/message.schema";

interface SendMessageResponse {
  success: boolean;
  message?: MessageRecord;
  error?: string;
}

type SendMessageAck = (response: SendMessageResponse) => void;

interface PrepareAttachmentUploadResponse {
  success: boolean;
  conversationId?: string;
  error?: string;
}

type PrepareAttachmentUploadAck = (
  response: PrepareAttachmentUploadResponse,
) => void;

const prepareAttachmentUploadSchema = z.object({
  receiverId: z.uuid(),
});

const prepareAttachmentUploadRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 10_000,
});

const sendMessageRateLimiter = createRateLimiter({
  limit: 30,
  windowMs: 10_000,
});

const typingPayloadSchema = z.object({
  receiverId: z.string().uuid(),
  isTyping: z.boolean(),
});

const typingRateLimiter = createRateLimiter({
  limit: 60,
  windowMs: 10_000,
});

export const registerMessagingHandlers = (
  io: Server,
  socket: Socket,
) => {
  const activeTypingRecipients = new Set<string>();
  const typingEventVersions = new Map<string, number>();

  socket.on("prepare_attachment_upload",
    async (
      payload: unknown,
      ack?: PrepareAttachmentUploadAck,
    ) => {
      const respond = ack ?? (() => {});
      const senderId = socket.data.userId;

      if (!prepareAttachmentUploadRateLimiter.check(senderId)) {
        respond({
          success: false,
          error: "Too many upload requests. Please slow down.",
        });
        return;
      }

      const result = prepareAttachmentUploadSchema.safeParse(payload);
      if (!result.success) {
        respond({
          success: false,
          error: "Invalid attachment upload request.",
        });
        return;
      }

      const { receiverId } = result.data;
      if (receiverId === senderId) {
        respond({
          success: false,
          error: "You cannot send attachments to yourself.",
        });
        return;
      }

      const accessToken = socket.data.accessToken;
      if (typeof accessToken !== "string" || !accessToken) {
        respond({
          success: false,
          error: "Authentication required.",
        });
        return;
      }

      try {
        const supabase = createAuthenticatedSupabaseClient(accessToken);

        const { data: connection, error: connectionError } =
          await supabase
            .from("connections")
            .select("id")
            .eq("status", "accepted")
            .or(`and(user_id.eq.${senderId},contact_id.eq.${receiverId}),and(user_id.eq.${receiverId},contact_id.eq.${senderId})`)
            .limit(1)
            .maybeSingle();

        if (connectionError) {
          throw new Error("Failed to validate connection.", {
            cause: connectionError,
          });
        }

        if (!connection) {
          respond({
            success: false,
            error: "You can only send attachments to accepted connections.",
          });
          return;
        }

        const conversationId = await getOrCreateConversation({
          senderId,
          receiverId,
          accessToken,
        });

        respond({
          success: true,
          conversationId,
        });
      } catch (error) {
        console.error("Failed to prepare attachment upload:", error);

        respond({
          success: false,
          error: "Failed to prepare attachment upload.",
        });
      }
    },
  );

  socket.on("send_message",
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

      const { receiverId, content, attachments } = result.data;
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
            attachments,
          },
        });

        io.to(getUserRoom(message.receiver_id)).emit(
          "new_message",
          message,
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
    },
  );

  socket.on("typing", async (payload: unknown) => {
    const result = typingPayloadSchema.safeParse(payload);
    if (!result.success) {
      return;
    }

    const senderId = socket.data.userId;
    const { receiverId, isTyping } = result.data;
    if (receiverId === senderId) {
      return;
    }

    if (isTyping && !typingRateLimiter.check(senderId)) {
      return;
    }

    const eventVersion = (typingEventVersions.get(receiverId) ?? 0) + 1;
    typingEventVersions.set(receiverId, eventVersion);

    if (!isTyping) {
      if (activeTypingRecipients.delete(receiverId)) {
        io.to(getUserRoom(receiverId)).emit("user_typing", {
          userId: senderId,
          isTyping: false,
        });
      }

      return;
    }

    const accessToken = socket.data.accessToken;
    if (typeof accessToken !== "string" || !accessToken) {
      return;
    }

    try {
      const supabase = createAuthenticatedSupabaseClient(accessToken);
      const { data: connection, error } = await supabase
        .from("connections")
        .select("id")
        .eq("status", "accepted")
        .or(`and(user_id.eq.${senderId},contact_id.eq.${receiverId}),and(user_id.eq.${receiverId},contact_id.eq.${senderId})`)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Validate typing connection error:", error);
        return;
      }

      if (!connection) {
        return;
      }

      if (typingEventVersions.get(receiverId) !== eventVersion || !socket.connected) {
        return;
      }

      activeTypingRecipients.add(receiverId);
      io.to(getUserRoom(receiverId)).emit("user_typing", {
        userId: senderId,
        isTyping: true,
      });
    } catch (error) {
      console.error("Typing event error:", error);
    }
  });

  socket.on("disconnect", () => {
    const senderId = socket.data.userId;
    for (const receiverId of activeTypingRecipients) {
      typingEventVersions.set(
        receiverId,
        (typingEventVersions.get(receiverId) ?? 0) + 1,
      );

      io.to(getUserRoom(receiverId)).emit("user_typing", {
        userId: senderId,
        isTyping: false,
      });
    }

    activeTypingRecipients.clear();
  });
};