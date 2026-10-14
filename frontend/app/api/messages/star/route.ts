import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { success: false, error: "You must be logged in." },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid request body." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object" || !("messageId" in body) || !("starred" in body)) {
      return Response.json(
        { success: false, error: "Message ID and star state are required." },
        { status: 400 },
      );
    }

    const { messageId, starred } = body as {
      messageId: unknown;
      starred: unknown;
    };

    if (typeof messageId !== "string" || !UUID_PATTERN.test(messageId) || typeof starred !== "boolean") {
      return Response.json(
        { success: false, error: "Invalid message ID or star state." },
        { status: 400 },
      );
    }

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, receiver_id, created_at")
      .eq("id", messageId)
      .maybeSingle();

    if (messageError) {
      console.error("Load message for starring error:", messageError);

      return Response.json(
        { success: false, error: "Failed to load message." },
        { status: 500 },
      );
    }

    if (!message || (message.sender_id !== user.id && message.receiver_id !== user.id)) {
      return Response.json(
        { success: false, error: "Message not found." },
        { status: 404 },
      );
    }

    const { data: userState, error: userStateError } = await supabase
      .from("conversation_user_state")
      .select("cleared_at")
      .eq("conversation_id", message.conversation_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (userStateError) {
      console.error("Load conversation state error:", userStateError);

      return Response.json(
        { success: false, error: "Failed to verify conversation state." },
        { status: 500 },
      );
    }

    if (userState?.cleared_at && new Date(message.created_at).getTime() <= new Date(userState.cleared_at).getTime()) {
      return Response.json(
        { success: false, error: "This message is no longer visible in your chat." },
        { status: 404 },
      );
    }

    if (starred) {
      const { error } = await supabase
        .from("starred_messages")
        .upsert(
          {
            user_id: user.id,
            message_id: message.id,
          },
          {
            onConflict: "user_id,message_id",
            ignoreDuplicates: true,
          },
        );

      if (error) {
        console.error("Star message error:", error);

        return Response.json(
          { success: false, error: "Failed to star message." },
          { status: 500 },
        );
      }
    } else {
      const { error } = await supabase
        .from("starred_messages")
        .delete()
        .eq("user_id", user.id)
        .eq("message_id", message.id);

      if (error) {
        console.error("Unstar message error:", error);

        return Response.json(
          { success: false, error: "Failed to unstar message." },
          { status: 500 },
        );
      }
    }

    return Response.json({
      success: true,
      messageId: message.id,
      starred,
    });
  } catch (error) {
    console.error("Star message API error:", error);

    return Response.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}