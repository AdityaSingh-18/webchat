import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const term = (request.nextUrl.searchParams.get("q") ?? "").trim().replace(/^@/, "");

    if (term.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const escaped = term.replace(/[\\%_]/g, "\\$&");
    const digits = term.replace(/\D/g, "");
    const looksLikePhone = /^\+?[\d\s\-()]+$/.test(term) && digits.length >= 3;

    const base = () =>
      supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .neq("id", user.id)
        .order("username")
        .limit(20);

    const queries = [base().ilike("username", `%${escaped}%`)];

    if (looksLikePhone) {
      queries.push(base().ilike("phone_number", `%${digits}%`));
    }

    const responses = await Promise.all(queries);

    const merged = new Map<string, any>();

    for (const response of responses) {
      if (response.error) throw response.error;
      for (const p of response.data ?? []) {
        merged.set(p.id, {
          id: p.id,
          name: p.full_name ?? p.username,
          username: p.username,
          avatar_url: p.avatar_url,
        });
      }
    }

    const users = Array.from(merged.values()).slice(0, 20);
    const ids = users.map((u) => u.id);
    const statusById = new Map<string, string>();

    if (ids.length > 0) {
      const [sent, received] = await Promise.all([
        supabase.from("connections").select("contact_id, status").eq("user_id", user.id).in("contact_id", ids),
        supabase.from("connections").select("user_id, status").eq("contact_id", user.id).in("user_id", ids),
      ]);

      if (sent.error) throw sent.error;
      if (received.error) throw received.error;

      for (const r of received.data ?? []) {
        if (r.status === "accepted") statusById.set(r.user_id, "connected");
        else if (r.status === "pending") statusById.set(r.user_id, "pending_received");
      }

      for (const r of sent.data ?? []) {
        if (r.status === "accepted") statusById.set(r.contact_id, "connected");
        else if (r.status === "pending") statusById.set(r.contact_id, "pending_sent");
      }
    }

    return NextResponse.json({
      users: users.map((u) => ({ ...u, connection_status: statusById.get(u.id) ?? "none" })),
    });
  } catch (error) {
    console.error("user search failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}