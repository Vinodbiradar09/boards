import { auth } from "../auth/options";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/qstash";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false }, { status: 401 });
    }
    const body = await req.json();
    console.log("body" , body);
    if (!Array.isArray(body.emails)) {
      return NextResponse.json(
        {
          message: "invalid playload",
          success: false,
        },
        { status: 400 },
      );
    }
    let organization;
    await prisma.$transaction(async( tx )=>{
      organization = await tx.organization.create({
        data : {
          name : body.orgName,
        }
      })
      await tx.user.update({
        where : {
          id : session.user?.id,
        },data : {
          isAdmin : true,
        }
      })
    })

    client.publishJSON({
      url: "https://nonobvious-runtishly-regine.ngrok-free.dev/api/invites",
      body: {
        organization,
        user : session.user,
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