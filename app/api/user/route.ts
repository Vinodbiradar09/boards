import { auth } from "../auth/options";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";


export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized", success: false },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        image: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found", success: false },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "User found",
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { message: "Internal server error", success: false },
      { status: 500 },
    );
  }
}

export function getBaseUrl(requestOrHeaders?: Request | Headers): string {
  if (requestOrHeaders && "url" in requestOrHeaders) {
    const url = new URL(requestOrHeaders.url);
    return `${url.protocol}//${url.host}`;
  }

  if (requestOrHeaders && "get" in requestOrHeaders) {
    const host = requestOrHeaders.get("host");
    const protocol = requestOrHeaders.get("x-forwarded-proto") || "http";
    return `${protocol}://${host}`;
  }

  return process.env.AUTH_URL || "http://localhost:3000";
}
