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

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      receiver_id: input.receiverId,
      content: input.content,
    })
    .select("id, conversation_id, sender_id, receiver_id, content, is_read, created_at, delivered_at, read_at")
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
  };
};