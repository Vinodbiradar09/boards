import { auth } from "../auth/options";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/qstash";

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

export async function POST(req: NextRequest) {
  try {
    // const session = await auth();
    const session = "4be3415e-ff98-4484-8190-c4f8d8308f0b";
    // if (!session?.user?.id) {
    //   return NextResponse.json({ success: false }, { status: 401 });
    // }
    const body = await req.json();
    if (!Array.isArray(body.emails)) {
      return NextResponse.json(
        {
          message: "invalid playload",
          success: false,
        },
        { status: 400 },
      );
    }
    // const organization = await prisma.organization.create({
    //   data: {
    //     name: body.orgName,
    //     ownerId: session,
    //   },
    // });
    let organization;
    await prisma.$transaction(async( tx )=>{
      organization = await tx.organization.create({
        data : {
          name : body.orgName,
        }
      })
      await tx.user.update({
        where : {
          id : session,
        },data : {
          isAdmin : true,
        }
      })
    })

    client.publishJSON({
      url: "https://nonobvious-runtishly-regine.ngrok-free.dev/api/invites",
      body: {
        organization,
        user : {
          id : session,
          name : "vinod",
          email : "vinod07@gmail.com",
        },
        emails : [... new Set(body.emails)],
      },
    }).catch(console.error);
    return NextResponse.json(
      {
        message: "your organization has successfully created",
        success: true,
        organization,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        message: "internal server error",
        success: false,
      },
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
