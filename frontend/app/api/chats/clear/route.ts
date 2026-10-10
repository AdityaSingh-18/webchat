import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const clearChatSchema = z.object({
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const result = clearChatSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid conversation user ID is required.",
        },
        { status: 400 },
      );
    }

    if (result.data.userId === user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "You cannot clear a conversation with yourself.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc("clear_my_conversation",
      {
        p_other_user_id: result.data.userId,
      },
    );

    if (error) {
      console.error("Clear chat error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to clear chat.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        clearedAt: data,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Clear chat API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to clear chat.",
      },
      { status: 500 },
    );
  }
}