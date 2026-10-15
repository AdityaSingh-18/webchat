import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MessageAction =
  | "edit"
  | "delete_for_me"
  | "delete_for_everyone";

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export async function POST(request: Request) {
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

    const body = (await request.json().catch(() => null)) as {
      action?: unknown;
      messageId?: unknown;
      content?: unknown;
    } | null;

    const action = body?.action;
    const messageId = body?.messageId;

    if (
      !isUuid(messageId) ||
      !["edit", "delete_for_me", "delete_for_everyone"].includes(
        String(action),
      )
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid message action." },
        { status: 400 },
      );
    }

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, receiver_id, content, deleted_for_everyone_at")
      .eq("id", messageId)
      .maybeSingle();

    if (messageError) {
      console.error("Load message action target error:", messageError);

      return NextResponse.json(
        { success: false, error: "Failed to load the message." },
        { status: 500 },
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message not found." },
        { status: 404 },
      );
    }

    const isSender = message.sender_id === user.id;
    const isParticipant =
      isSender || message.receiver_id === user.id;

    if (!isParticipant) {
      return NextResponse.json(
        { success: false, error: "You cannot modify this message." },
        { status: 403 },
      );
    }

    if (action === "edit") {
      if (!isSender) {
        return NextResponse.json(
          {
            success: false,
            error: "You can only edit your own messages.",
          },
          { status: 403 },
        );
      }

      if (message.deleted_for_everyone_at) {
        return NextResponse.json(
          {
            success: false,
            error: "A deleted message cannot be edited.",
          },
          { status: 409 },
        );
      }

      const content =
        typeof body?.content === "string"
          ? body.content.trim()
          : "";

      if (!content || content.length > 5000) {
        return NextResponse.json(
          {
            success: false,
            error: "Message text must contain 1–5000 characters.",
          },
          { status: 400 },
        );
      }

      const { data: updatedMessage, error: updateError } =
        await supabase
          .from("messages")
          .update({
            content,
            edited_at: new Date().toISOString(),
          })
          .eq("id", message.id)
          .eq("sender_id", user.id)
          .is("deleted_for_everyone_at", null)
          .select("id, conversation_id, sender_id, receiver_id, content, is_read, created_at, delivered_at, read_at, reply_to_message_id, edited_at, deleted_for_everyone_at")
          .maybeSingle();

      if (updateError || !updatedMessage) {
        console.error("Edit message error:", updateError);

        return NextResponse.json(
          {
            success: false,
            error: "Failed to edit the message.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        action,
        message: updatedMessage,
      });
    }

    if (action === "delete_for_me") {
      const { error: hideError } = await supabase
        .from("message_user_deletions")
        .upsert(
          {
            user_id: user.id,
            message_id: message.id,
            conversation_id: message.conversation_id,
          },
          {
            onConflict: "user_id,message_id",
            ignoreDuplicates: true,
          },
        );

      if (hideError) {
        console.error("Delete message for me error:", hideError);

        return NextResponse.json(
          {
            success: false,
            error: "Failed to delete the message for you.",
          },
          { status: 500 },
        );
      }

      const { error: unstarError } = await supabase
        .from("starred_messages")
        .delete()
        .eq("user_id", user.id)
        .eq("message_id", message.id);

      if (unstarError) {
        console.error(
          "Remove deleted message from starred list error:",
          unstarError,
        );
      }

      return NextResponse.json({
        success: true,
        action,
        messageId: message.id,
      });
    }

    if (!isSender) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only delete your own message for everyone.",
        },
        { status: 403 },
      );
    }

    if (message.deleted_for_everyone_at) {
      return NextResponse.json(
        { success: false, error: "This message is already deleted." },
        { status: 409 },
      );
    }

    const { data: attachments, error: attachmentsError } =
      await supabase
        .from("message_attachments")
        .select("storage_path")
        .eq("message_id", message.id)
        .eq("conversation_id", message.conversation_id);

    if (attachmentsError) {
      console.error("Load message attachments for deletion error:", attachmentsError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to prepare the message for deletion.",
        },
        { status: 500 },
      );
    }

    const deletedAt = new Date().toISOString();

    const { data: deletedMessage, error: deleteError } =
      await supabase
        .from("messages")
        .update({
          content: "",
          deleted_for_everyone_at: deletedAt,
        })
        .eq("id", message.id)
        .eq("sender_id", user.id)
        .is("deleted_for_everyone_at", null)
        .select("id, conversation_id, sender_id, receiver_id, content, is_read, created_at, delivered_at, read_at, reply_to_message_id, edited_at, deleted_for_everyone_at")
        .maybeSingle();

    if (deleteError || !deletedMessage) {
      console.error("Delete message for everyone error:", deleteError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete the message for everyone.",
        },
        { status: 500 },
      );
    }

    const storagePaths = (attachments ?? []).map(
      (attachment) => attachment.storage_path,
    );

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("chat-media")
        .remove(storagePaths);

      if (storageError) {
        console.error("Clean up deleted message files error:", storageError);
      }

      const { error: attachmentDeleteError } = await supabase
        .from("message_attachments")
        .delete()
        .eq("message_id", message.id)
        .eq("conversation_id", message.conversation_id);

      if (attachmentDeleteError) {
        console.error(
          "Delete message attachment records error:",
          attachmentDeleteError,
        );
      }
    }

    const { error: unstarError } = await supabase
      .from("starred_messages")
      .delete()
      .eq("user_id", user.id)
      .eq("message_id", message.id);

    if (unstarError) {
      console.error(
        "Remove deleted message from starred list error:",
        unstarError,
      );
    }

    return NextResponse.json({
      success: true,
      action,
      message: {
        ...deletedMessage,
        attachments: [],
        reply_to_message: null,
      },
    });
  } catch (error) {
    console.error("Message action API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process the message action.",
      },
      { status: 500 },
    );
  }
}