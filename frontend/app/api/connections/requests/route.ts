import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Row = { id: string; user_id: string; contact_id: string; created_at: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("connections")
      .select("id, user_id, contact_id, created_at")
      .eq("status", "pending")
      .or(`user_id.eq.${user.id},contact_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows: Row[] = data ?? [];
    const otherId = (r: Row) => (r.user_id === user.id ? r.contact_id : r.user_id);
    const ids = Array.from(new Set(rows.map(otherId)));

    const profiles = new Map<string, any>();

    if (ids.length > 0) {
      const { data: profileRows, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", ids);

      if (profilesError) throw profilesError;
      for (const p of profileRows ?? []) profiles.set(p.id, p);
    }

    const toItem = (r: Row) => {
      const p = profiles.get(otherId(r));
      return {
        id: r.id,
        name: p?.full_name ?? p?.username ?? "Unknown",
        username: p?.username ?? null,
        avatar_url: p?.avatar_url ?? null,
        created_at: r.created_at,
      };
    };

    return NextResponse.json({
      received: rows.filter((r) => r.contact_id === user.id).map(toItem),
      sent: rows.filter((r) => r.user_id === user.id).map(toItem),
    });
  } catch (error) {
    console.error("list requests failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const contactId = body?.contactId;

    if (typeof contactId !== "string" || !UUID.test(contactId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    if (contactId === user.id) {
      return NextResponse.json({ error: "You can't send a request to yourself" }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("connections")
      .select("user_id, status")
      .or(
        `and(user_id.eq.${user.id},contact_id.eq.${contactId}),and(user_id.eq.${contactId},contact_id.eq.${user.id})`
      )
      .limit(1);

    if (existingError) throw existingError;

    if (existing && existing.length > 0) {
      const row = existing[0];
      const message =
        row.status === "accepted"
          ? "You are already connected"
          : row.user_id === user.id
            ? "Request already sent"
            : "This person already sent you a request";
      return NextResponse.json({ error: message }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("connections")
      .insert({ user_id: user.id, contact_id: contactId, status: "pending" })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ request: data }, { status: 201 });
  } catch (error) {
    console.error("send request failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}