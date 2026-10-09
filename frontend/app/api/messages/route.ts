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
    const requestedLimit = Number(searchParams.get("limit") ?? PAGE_SIZE,);

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
      console.error("Load conversation error:", conversationError,);

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

    let query = supabase
      .from("messages")
      .select("id, conversation_id, sender_id, receiver_id, content, is_read, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit + 1);

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

    const nextCursor = page.length > 0 ? page[0].created_at : null;

    return NextResponse.json({
      success: true,
      messages: page,
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