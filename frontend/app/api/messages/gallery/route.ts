import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 500;
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_URL_PUNCTUATION = /[.,!?;:]+$/;

interface MessageGalleryRow {
  id: string;
  content: string | null;
  created_at: string;
}

interface AttachmentGalleryRow {
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

const emptyGallery = () => ({
  success: true,
  media: [] as AttachmentGalleryRow[],
  docs: [] as AttachmentGalleryRow[],
  links: [] as Array<{ id: string; url: string; created_at: string }>,
  counts: { media: 0, docs: 0, links: 0 },
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "A user ID is required." },
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
      console.error("Load gallery conversation error:", conversationError);
      return NextResponse.json(
        { success: false, error: "Failed to load shared items." },
        { status: 500 },
      );
    }

    if (!conversation) {
      return NextResponse.json(emptyGallery());
    }

    const { data: clearState, error: clearStateError } = await supabase
      .from("conversation_user_state")
      .select("cleared_at")
      .eq("conversation_id", conversation.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (clearStateError) {
      console.error("Load gallery clear state error:", clearStateError);
      return NextResponse.json(
        { success: false, error: "Failed to load shared items." },
        { status: 500 },
      );
    }

    const messages: MessageGalleryRow[] = [];
    let messageOffset = 0;

    while (true) {
      let query = supabase
        .from("messages")
        .select("id, content, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .range(messageOffset, messageOffset + PAGE_SIZE - 1);

      if (clearState?.cleared_at) {
        query = query.gt("created_at", clearState.cleared_at);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Load gallery messages error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to load shared links." },
          { status: 500 },
        );
      }

      const rows = (data ?? []) as MessageGalleryRow[];
      messages.push(...rows);

      if (rows.length < PAGE_SIZE) {
        break;
      }

      messageOffset += PAGE_SIZE;
    }

    const visibleMessageIds = new Set(messages.map((message) => message.id));
    const allAttachments: AttachmentGalleryRow[] = [];
    let attachmentOffset = 0;

    while (true) {
      const { data, error } = await supabase
        .from("message_attachments")
        .select("id, message_id, conversation_id, uploaded_by, storage_path, file_name, mime_type, size_bytes, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .range(attachmentOffset, attachmentOffset + PAGE_SIZE - 1);

      if (error) {
        console.error("Load gallery attachments error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to load shared files." },
          { status: 500 },
        );
      }

      const rows = (data ?? []) as AttachmentGalleryRow[];
      allAttachments.push(...rows);

      if (rows.length < PAGE_SIZE) {
        break;
      }

      attachmentOffset += PAGE_SIZE;
    }

    const visibleAttachments = allAttachments.filter((attachment) =>
      visibleMessageIds.has(attachment.message_id),
    );

    const isMedia = (attachment: AttachmentGalleryRow) => {
      const mimeType = attachment.mime_type.toLowerCase();
      return (
        mimeType.startsWith("image/") ||
        mimeType.startsWith("video/") ||
        mimeType.startsWith("audio/")
      );
    };

    const media = visibleAttachments.filter(isMedia);
    const docs = visibleAttachments.filter((attachment) => !isMedia(attachment));
    const links: Array<{ id: string; url: string; created_at: string }> = [];

    for (const message of messages) {
      if (!message.content) {
        continue;
      }

      for (const match of message.content.matchAll(URL_PATTERN)) {
        const candidate = match[0].replace(TRAILING_URL_PUNCTUATION, "");

        try {
          const parsedUrl = new URL(candidate);
          if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            continue;
          }

          links.push({
            id: `${message.id}:${candidate}`,
            url: candidate,
            created_at: message.created_at,
          });
        } catch {
          continue;
        }
      }
    }

    links.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      success: true,
      media,
      docs,
      links,
      counts: {
        media: media.length,
        docs: docs.length,
        links: links.length,
      },
    });
  } catch (error) {
    console.error("GET Message Gallery API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load shared items." },
      { status: 500 },
    );
  }
}