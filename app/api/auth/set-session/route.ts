import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { env } from "@/lib/types/env";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const sessionToken = searchParams.get("token");
  const redirectTo = searchParams.get("redirectTo");

  if (!sessionToken || !redirectTo) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }
  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });
    if (!session || session.expires < new Date()) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }
    const response = NextResponse.redirect(new URL(redirectTo, req.url));
    response.cookies.set("authjs.session-token", sessionToken, {
      expires: session.expires,
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (error) {
     console.error("Set session error:", error);
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }
}
