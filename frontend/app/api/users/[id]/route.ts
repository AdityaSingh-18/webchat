import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    if (currentUser.id === id) {
      return NextResponse.json(
        { error: "You cannot open your own contact details here." },
        { status: 400 },
      );
    }

    const [outgoing, incoming] = await Promise.all([
      supabase
        .from("connections")
        .select("created_at")
        .eq("user_id", currentUser.id)
        .eq("contact_id", id)
        .eq("status", "accepted")
        .maybeSingle(),

      supabase
        .from("connections")
        .select("created_at")
        .eq("user_id", id)
        .eq("contact_id", currentUser.id)
        .eq("status", "accepted")
        .maybeSingle(),
    ]);

    if (outgoing.error || incoming.error) {
      console.error(
        "Connection lookup error:",
        outgoing.error || incoming.error,
      );

      return NextResponse.json(
        { error: "Failed to verify connection." },
        { status: 500 },
      );
    }

    const connection = outgoing.data ?? incoming.data;

    if (!connection) {
      return NextResponse.json(
        { error: "You are not connected with this user." },
        { status: 403 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        `
          id,
          full_name,
          username,
          email,
          phone_number,
          avatar_url,
          bio
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Profile lookup error:",
        profileError,
      );

      return NextResponse.json(
        { error: "Failed to fetch user profile." },
        { status: 500 },
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: String(profile.id),
      name:
        profile.full_name ||
        profile.username ||
        "Unknown User",
      username: profile.username ?? null,
      email: profile.email ?? null,
      phoneNumber: profile.phone_number ?? null,
      avatarUrl: profile.avatar_url ?? null,
      bio: profile.bio ?? null,
      connectedSince: connection.created_at ?? null,
    });
  } catch (error) {
    console.error(
      "User details API error:",
      error,
    );

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}