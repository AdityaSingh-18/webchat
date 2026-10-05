import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createVerificationToken } from "@/lib/auth/verificationToken";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {fullname, username, email, phoneNumber, password} = body;

    if (!fullname || !username || !email || !phoneNumber || !password) {
      return NextResponse.json(
        {
          error: "Please fill the form before creating account",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "Password must be at least 8 characters",
        },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.toLowerCase().replace(/\s+/g, "");

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullname.trim(),
          username: cleanUsername,
          phone_number: phoneNumber.trim(),
        },
      },
    });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 }
      );
    }

    if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
      return NextResponse.json(
        {
          error: "Unable to create account. Please try again.",
        },
        { status: 400 }
      );
    }

    const verificationToken = await createVerificationToken(cleanEmail);
    const response = NextResponse.json(
      {
        message: "Registration successful. Please verify your email.",
        user: data.user,
      },
      { status: 201 }
    );

    response.cookies.set("email_verification",
      verificationToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/verify-email",
      }
    );

    return response;
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      { status: 500 }
    );
  }
}