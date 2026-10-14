
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const filterUserId = new URL(request.url).searchParams.get("userId");

    const { data: starredRows, error: starredError } = await supabase
      .from("starred_messages")
      .select("message_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (starredError) {
      console.error("Load starred messages error:", starredError);
      return NextResponse.json(
        { success: false, error: "Failed to load starred messages." },
        { status: 500 },
      );
    }

    if (!starredRows?.length) {
      return NextResponse.json({
        success: true,
        items: [],
        count: 0,
      });
    }

    const messageIds = starredRows.map((row) => row.message_id);

    const { data: messageRows, error: messagesError } = await supabase
      .from("messages")
      .select(
        "id, conversation_id, sender_id, receiver_id, content, is_read, created_at, delivered_at, read_at",
      )
      .in("id", messageIds);

    if (messagesError) {
      console.error("Load starred message details error:", messagesError);
      return NextResponse.json(
        { success: false, error: "Failed to load starred messages." },
        { status: 500 },
      );
    }

    const messagesById = new Map(
      (messageRows ?? []).map((message) => [message.id, message]),
    );

    const conversationIds = [
      ...new Set((messageRows ?? []).map((message) => message.conversation_id)),
    ];

    const clearStateByConversation = new Map<string, string | null>();

    if (conversationIds.length > 0) {
      const { data: clearStates, error: clearStateError } = await supabase
        .from("conversation_user_state")
        .select("conversation_id, cleared_at")
        .eq("user_id", user.id)
        .in("conversation_id", conversationIds);

      if (clearStateError) {
        console.error("Load starred conversation state error:", clearStateError);
        return NextResponse.json(
          { success: false, error: "Failed to load starred messages." },
          { status: 500 },
        );
      }

      for (const state of clearStates ?? []) {
        clearStateByConversation.set(state.conversation_id, state.cleared_at);
      }
    }

    const visibleRows = starredRows.filter((row) => {
      const message = messagesById.get(row.message_id);

      if (!message) return false;

      const otherUserId =
        message.sender_id === user.id
          ? message.receiver_id
          : message.sender_id;

      if (filterUserId && filterUserId !== otherUserId) {
        return false;
      }

      const clearedAt = clearStateByConversation.get(message.conversation_id);

      if (
        clearedAt &&
        new Date(message.created_at).getTime() <= new Date(clearedAt).getTime()
      ) {
        return false;
      }

      return true;
    });

    if (visibleRows.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        count: 0,
      });
    }

    const visibleMessageIds = visibleRows.map((row) => row.message_id);

    const otherUserIds = [
      ...new Set(
        visibleRows.flatMap((row) => {
          const message = messagesById.get(row.message_id);

          if (!message) return [];

          return [
            message.sender_id === user.id
              ? message.receiver_id
              : message.sender_id,
          ];
        }),
      ),
    ];

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", otherUserIds);

    if (profilesError) {
      console.error("Load starred message profiles error:", profilesError);
      return NextResponse.json(
        { success: false, error: "Failed to load starred messages." },
        { status: 500 },
      );
    }

    const { data: attachments, error: attachmentsError } = await supabase
      .from("message_attachments")
      .select("id, message_id, file_name, mime_type, size_bytes")
      .in("message_id", visibleMessageIds)
      .order("created_at", { ascending: true });

    if (attachmentsError) {
      console.error("Load starred message attachments error:", attachmentsError);
      return NextResponse.json(
        { success: false, error: "Failed to load starred messages." },
        { status: 500 },
      );
    }

    const profilesById = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile]),
    );

    const attachmentsByMessageId = new Map<
      string,
      Array<{
        id: string;
        file_name: string;
        mime_type: string;
        size_bytes: number;
      }>
    >();

    for (const attachment of attachments ?? []) {
      const messageAttachments =
        attachmentsByMessageId.get(attachment.message_id) ?? [];

      messageAttachments.push({
        id: attachment.id,
        file_name: attachment.file_name,
        mime_type: attachment.mime_type,
        size_bytes: attachment.size_bytes,
      });

      attachmentsByMessageId.set(attachment.message_id, messageAttachments);
    }

    const items = visibleRows.flatMap((row) => {
      const message = messagesById.get(row.message_id);

      if (!message) return [];

      const otherUserId =
        message.sender_id === user.id
          ? message.receiver_id
          : message.sender_id;

      const profile = profilesById.get(otherUserId);

      return [
        {
          id: message.id,
          starred_at: row.created_at,
          message: {
            ...message,
            is_starred: true,
            attachments: attachmentsByMessageId.get(message.id) ?? [],
          },
          chat: {
            userId: otherUserId,
            name: profile?.full_name || profile?.username || "Unknown",
            username: profile?.username ?? null,
            avatarUrl: profile?.avatar_url ?? null,
          },
        },
      ];
    });

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
    });
  } catch (error) {
    console.error("GET Starred Messages API error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load starred messages." },
      { status: 500 },
    );
  }
}