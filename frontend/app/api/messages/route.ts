import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId");
    const before = searchParams.get("before");
    const requestedLimit = Number(searchParams.get("limit") ?? PAGE_SIZE);

    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_PAGE_SIZE)
      : PAGE_SIZE;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "A user ID is required.",
        },
        { status: 400 },
      );
    }

    if (userId === user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "You cannot load a conversation with yourself.",
        },
        { status: 400 },
      );
    }

    const [userOneId, userTwoId] = user.id < userId
      ? [user.id, userId]
      : [userId, user.id];

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_one_id", userOneId)
      .eq("user_two_id", userTwoId)
      .maybeSingle();

    if (conversationError) {
      console.error("Load conversation error:", conversationError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to load conversation.",
        },
        { status: 500 },
      );
    }

    if (!conversation) {
      return NextResponse.json({
        success: true,
        messages: [],
        hasMore: false,
        nextCursor: null,
      });
    }

    const { data: clearState, error: clearStateError } = await supabase
      .from("conversation_user_state")
      .select("cleared_at")
      .eq("conversation_id", conversation.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (clearStateError) {
      console.error("Load chat clear state error:", clearStateError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to load messages.",
        },
        { status: 500 },
      );
    }

    let query = supabase
      .from("messages")
      .select("id, conversation_id, sender_id, receiver_id, content, is_read, created_at, delivered_at, read_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (clearState?.cleared_at) {
      query = query.gt("created_at", clearState.cleared_at);
    }

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Load messages error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to load messages.",
        },
        { status: 500 },
      );
    }

    const hasMore = data.length > limit;
    const page = data.slice(0, limit).reverse();
    const messageIds = page.map((message) => message.id);
    const starredMessageIds = new Set<string>();

    if (messageIds.length > 0) {
      const { data: starredRows, error: starredError } = await supabase
        .from("starred_messages")
        .select("message_id")
        .eq("user_id", user.id)
        .in("message_id", messageIds);

      if (starredError) {
        console.error("Load starred messages error:", starredError);

        return Response.json(
          {
            success: false,
            error: "Failed to load message star states.",
          },
          { status: 500 },
        );
      }

      for (const row of starredRows ?? []) {
        starredMessageIds.add(row.message_id);
      }
    }

    const nextCursor = page.length > 0 ? page[0].created_at : null;

    const attachmentsByMessageId = new Map<
      string,
      Array<{
        id: string;
        message_id: string;
        conversation_id: string;
        uploaded_by: string;
        storage_path: string;
        file_name: string;
        mime_type: string;
        size_bytes: number;
        created_at: string;
      }>
    >();

    if (page.length > 0) {
      const messageIds = page.map((message) => message.id);
      const { data: attachmentRows, error: attachmentsError } = await supabase
        .from("message_attachments")
        .select("id, message_id, conversation_id, uploaded_by, storage_path, file_name, mime_type, size_bytes, created_at")
        .eq("conversation_id", conversation.id)
        .in("message_id", messageIds)
        .order("created_at", { ascending: true });

      if (attachmentsError) {
        console.error("Load message attachments error:", attachmentsError);

        return NextResponse.json(
          {
            success: false,
            error: "Failed to load message attachments.",
          },
          { status: 500 },
        );
      }

      for (const attachment of attachmentRows ?? []) {
        const messageAttachments = attachmentsByMessageId.get(attachment.message_id) ?? [];
        messageAttachments.push(attachment);
        attachmentsByMessageId.set(attachment.message_id, messageAttachments);
      }
    }

    const messages = page.map((message) => ({
      ...message,
      is_starred: starredMessageIds.has(message.id),
      attachments: attachmentsByMessageId.get(message.id) ?? [],
    }));

    return NextResponse.json({
      success: true,
      messages,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error("GET Messages API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load messages.",
      },
      { status: 500 },
    );
  }
}