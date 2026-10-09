import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data, error } = await supabase.rpc("get_chat_list");

    if (error) {
      console.error("Failed to load chat list:", error);

      return NextResponse.json(
        { error: "Failed to load chats" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { chats: data ?? [] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Chat list API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}