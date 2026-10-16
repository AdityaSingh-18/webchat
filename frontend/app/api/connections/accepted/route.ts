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
        { success: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const { data: connections, error: connectionsError } = await supabase
      .from("connections")
      .select("user_id, contact_id, custom_name")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},contact_id.eq.${user.id}`);

    if (connectionsError) {
      console.error("Load forward contacts error:", connectionsError);

      return NextResponse.json(
        { success: false, error: "Failed to load contacts." },
        { status: 500 },
      );
    }

    const contactIds = [
      ...new Set(
        (connections ?? [])
          .map((connection) =>
            connection.user_id === user.id
              ? connection.contact_id
              : connection.user_id,
          )
          .filter((id) => id !== user.id),
      ),
    ];

    if (contactIds.length === 0) {
      return NextResponse.json({
        success: true,
        contacts: [],
      });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", contactIds)
      .order("full_name", { ascending: true });

    if (profilesError) {
      console.error("Load forward contact profiles error:", profilesError);

      return NextResponse.json(
        { success: false, error: "Failed to load contacts." },
        { status: 500 },
      );
    }

    const customNames = new Map<string, string>();

    for (const connection of connections ?? []) {
      if (
        connection.user_id === user.id &&
        connection.custom_name?.trim()
      ) {
        customNames.set(
          connection.contact_id,
          connection.custom_name.trim(),
        );
      }
    }

    const contacts = (profiles ?? []).map((profile) => ({
      ...profile,
      display_name:
        customNames.get(profile.id) ??
        profile.full_name ??
        profile.username,
    }));

    return NextResponse.json({
      success: true,
      contacts,
    });
  } catch (error) {
    console.error("Forward contacts API error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load contacts." },
      { status: 500 },
    );
  }
}