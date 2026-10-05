import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { verifyVerificationToken } from "@/lib/auth/verificationToken";

const verificationCookie = "email_verification";

function withSupabaseCookies(
  supabaseResponse: NextResponse,
  response: NextResponse
) {
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  return response;
}

function redirectTo(
  request: NextRequest,
  pathname: string,
  response: NextResponse
) {
  const url = request.nextUrl.clone();

  url.pathname = pathname;
  url.search = "";

  return withSupabaseCookies(
    response,
    NextResponse.redirect(url)
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    console.error("SUPABASE PROXY ERROR:", error);
  }

  const user = data?.claims;
  const pathname = request.nextUrl.pathname;

  const isAuthApiRoute = pathname.startsWith("/api/auth");
  const isLoginPage = pathname === "/login";
  const isSignupPage = pathname === "/signup";
  const isVerifyEmailPage = pathname === "/verify-email";

  if (isAuthApiRoute) {
    return response;
  }

  if (isLoginPage || isSignupPage) {
    return user ? redirectTo(request, "/", response) : response;
  }

  if (isVerifyEmailPage) {
    if (user) {
      return redirectTo(request, "/", response);
    }

    const token = request.cookies.get(verificationCookie)?.value;

    if (!token) {
      return redirectTo(request, "/signup", response);
    }

    const verification = await verifyVerificationToken(token);

    if (!verification) {
      const redirectResponse = redirectTo(
        request,
        "/signup",
        response
      );

      redirectResponse.cookies.set(verificationCookie, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/verify-email",
      });

      return redirectResponse;
    }

    const email = request.nextUrl.searchParams.get("email");

    if (
      !email ||
      email.trim().toLowerCase() !== verification.email
    ) {
      return redirectTo(request, "/signup", response);
    }

    return response;
  }

  if (!user) {
    return redirectTo(request, "/login", response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};