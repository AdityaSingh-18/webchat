import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = ["accept", "reject", "cancel"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (!UUID.test(id) || !ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { data, error } =
      action === "accept"
        ? await supabase
            .from("connections")
            .update({ status: "accepted" })
            .eq("id", id)
            .eq("contact_id", user.id)
            .eq("status", "pending")
            .select("id")
        : await supabase
            .from("connections")
            .delete()
            .eq("id", id)
            .eq(action === "reject" ? "contact_id" : "user_id", user.id)
            .eq("status", "pending")
            .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Request not found or already handled" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("update request failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}