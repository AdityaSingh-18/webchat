import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set(
    "email_verification",
    "",
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/verify-email",
    }
  );

  return response;
}