import { createAuthenticatedSupabaseClient } from "../lib/supabase";
import type { SendMessageInput } from "../schemas/message.schema";

export interface MessageAttachmentRecord {
  id: string;
  message_id: string;
  conversation_id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface MessageReplyPreviewRecord {
  id: string;
  sender_id: string;
  content: string;
  attachments: MessageAttachmentRecord[];
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
  attachments: MessageAttachmentRecord[];
  reply_to_message_id?: string | null;
  reply_to_message?: MessageReplyPreviewRecord | null;
}

interface ConversationParams {
  senderId: string;
  receiverId: string;
  accessToken: string;
}

interface CreateMessageParams {
  senderId: string;
  accessToken: string;
  input: SendMessageInput;
}

const ensureConversation = async (
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>,
  senderId: string,
  receiverId: string,
): Promise<string> => {
  const [userOneId, userTwoId] = senderId < receiverId
    ? [senderId, receiverId]
    : [receiverId, senderId];

  const { data: conversation, error } = await supabase
    .from("conversations")
    .upsert(
      {
        user_one_id: userOneId,
        user_two_id: userTwoId,
      },
      {
        onConflict: "user_one_id,user_two_id",
      },
    )
    .select("id")
    .single();

  if (error || !conversation) {
    throw new Error("Failed to create conversation", {
      cause: error,
    });
  }

  return conversation.id;
};

export const getOrCreateConversation = async ({
  senderId,
  receiverId,
  accessToken,
}: ConversationParams): Promise<string> => {
  const supabase = createAuthenticatedSupabaseClient(accessToken);
  return ensureConversation(supabase, senderId, receiverId);
};

export const createMessage = async ({
  senderId,
  accessToken,
  input,
}: CreateMessageParams): Promise<MessageRecord> => {
  const supabase = createAuthenticatedSupabaseClient(accessToken);

  const conversationId = await ensureConversation(
    supabase,
    senderId,
    input.receiverId,
  );

  const attachments = input.attachments ?? [];
  for (const attachment of attachments) {
    if (!attachment.storagePath.startsWith(`${conversationId}/`)) {
      throw new Error(
        "An attachment storage path does not belong to this conversation.",
      );
    }
  }
  
  const replyToMessageId = input.replyToMessageId ?? null;
  let replyToMessage: MessageReplyPreviewRecord | null = null;

  if (replyToMessageId) {
    const { data: originalMessage, error: originalMessageError } =
      await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, content")
        .eq("id", replyToMessageId)
        .maybeSingle();

    if (originalMessageError || !originalMessage) {
      throw new Error("The message you are replying to could not be found.", {
        cause: originalMessageError,
      });
    }

    if (originalMessage.conversation_id !== conversationId) {
      throw new Error(
        "You can only reply to messages in the current conversation.",
      );
    }

    const { data: originalAttachments, error: originalAttachmentsError } = await supabase
      .from("message_attachments")
      .select("id, message_id, conversation_id, uploaded_by, storage_path, file_name, mime_type, size_bytes, created_at")
      .eq("conversation_id", conversationId)
      .eq("message_id", replyToMessageId)
      .order("created_at", { ascending: true });

    if (originalAttachmentsError) {
      throw new Error("Failed to load the message being replied to.", {
        cause: originalAttachmentsError,
      });
    }

    replyToMessage = {
      id: originalMessage.id,
      sender_id: originalMessage.sender_id,
      content: originalMessage.content,
      attachments: (originalAttachments ?? []) as MessageAttachmentRecord[],
    };
  }

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      receiver_id: input.receiverId,
      content: input.content,
      reply_to_message_id: replyToMessageId,
    })
    .select("id, conversation_id, sender_id, receiver_id, content, is_read, created_at, delivered_at, read_at, reply_to_message_id")
    .single();

  if (messageError || !message) {
    throw new Error("Failed to create message", {
      cause: messageError,
    });
  }

  let savedAttachments: MessageAttachmentRecord[] = [];
  if (attachments.length > 0) {
    const attachmentRows = attachments.map((attachment) => ({
      message_id: message.id,
      conversation_id: conversationId,
      uploaded_by: senderId,
      storage_path: attachment.storagePath,
      file_name: attachment.fileName,
      mime_type: attachment.mimeType,
      size_bytes: attachment.sizeBytes,
    }));

    const { data, error: attachmentError } = await supabase
      .from("message_attachments")
      .insert(attachmentRows)
      .select("id, message_id, conversation_id, uploaded_by, storage_path, file_name, mime_type, size_bytes, created_at");

    if (attachmentError || !data) {
      const { error: cleanupError } = await supabase
        .from("messages")
        .delete()
        .eq("id", message.id)
        .eq("sender_id", senderId);

      if (cleanupError) {
        console.error("Failed to roll back message after attachment persistence failed:", cleanupError);
      }

      throw new Error("Failed to save message attachments", {
        cause: attachmentError,
      });
    }

    savedAttachments = data as MessageAttachmentRecord[];
  }

  return {
    ...message,
    attachments: savedAttachments,
    reply_to_message: replyToMessage,
  };
};