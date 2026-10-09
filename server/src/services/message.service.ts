import { createAuthenticatedSupabaseClient } from "../lib/supabase";
import type { SendMessageInput } from "../schemas/message.schema";

export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface CreateMessageParams {
  senderId: string;
  accessToken: string;
  input: SendMessageInput;
}

export const createMessage = async ({
  senderId,
  accessToken,
  input,
}: CreateMessageParams): Promise<MessageRecord> => {
  const supabase = createAuthenticatedSupabaseClient(accessToken);

  const [userOneId, userTwoId] = senderId < input.receiverId
    ? [senderId, input.receiverId]
    : [input.receiverId, senderId];

  const { data: conversation, error: conversationError } = await supabase
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

  if (conversationError || !conversation) {
    throw new Error("Failed to create conversation", {
      cause: conversationError,
    });
  }

  const { data, error } = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_id: senderId,
    receiver_id: input.receiverId,
    content: input.content,
  })
  .select("id, conversation_id, sender_id, receiver_id, content, is_read, created_at")
  .single();

  if (error) {
    throw new Error("Failed to create message", {
      cause: error,
    });
  }

  return data;
};