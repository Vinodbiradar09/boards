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
        { status: 401 }
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
        { status: 404 }
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
      { status: 500 }
    );
  }
}

export async function POST(req : NextRequest ) {
  try {
    // const session = await auth();
    const session = "2125fbd2-db6a-4975-8380-715fd74cd36f";
    // if(!session?.user?.id){
    //   return NextResponse.json({
    //     message : "user not found",
    //   },{status : 404})
    // }
    const body = await req.json();
    if(!Array.isArray(body.emails)){
      return NextResponse.json({
        message : "incorrect data structure",
        success : false,
      },{status : 402})
    }
    const organization = await prisma.organization.create({
      data : {
        name : body.orgName,
        ownerId : session,
      },
    })
    if(!organization){
      return NextResponse.json({
        message : "failed to create the organization",
        success : false,
      },{status : 401});
    }
    const set = new Set(body.emails);
    const emails = [...set];
    const result = await client.publishJSON({
      url : "https://nonobvious-runtishly-regine.ngrok-free.dev/api/invites",
      body : {
        organization,
        ownerId : organization.ownerId,
        emails,
      }
    })
    console.log("res" ,result);
    return NextResponse.json({
      message : "your organization has successfully created",
      success : true,
    },{status : 200});
  } catch (error) {
      console.log(error);
      return NextResponse.json({
        message : "internal server error",
        success : false
      },{status : 500})
  }
}