import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { resend } from "@/lib/resend";
import { env } from "@/lib/types/env";

async function handler(req: Request) {
  try {
    const n = "vinod";
    const e = "vinod@";
    // const session = await auth();
    // if (!session || !session.user?.id) {
    //   return NextResponse.json({
    //     message: "user not found",
    //     success: false,
    //   });
    // }
    const jobData = await req.json();
    console.log("jobData", jobData);
    if (!Array.isArray(jobData.emails)) {
      return NextResponse.json({
        message: "please send emails in array",
        success: false,
      });
    }
    if (jobData.emails.length > 0) {
      for (const email of jobData.emails) {
        try {
          const invite = await prisma.organizationInvite.create({
            data: {
              email,
              organizationId: jobData.organization.id,
              invitedBy: jobData.ownerId,
            },
          });
          const { data, error } = await resend.emails.send({
            from: env.EMAIL_FROM!,
            to: email,
            subject: `${n} invited you to join ${jobData.organization.name}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You&apos;re invited to join ${jobData.organization.name}!</h2>
              <p>${n} (${e}) has invited you to join their organization on Gumboard.</p>
              <p>Click the link below to accept the invitation:</p>
              <a href="${"hello"}/invite/accept?token=${invite.id}"
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
              <p style="margin-top: 20px; color: #666;">
                If you don&apos;t want to receive these emails, please ignore this message.
              </p>
            </div>
          `,
          });
          if(error){
            console.log("error in resend" , error);
          }
          console.log("invite", invite);
          console.log("data", data);
        } catch (error) {
          console.log("error in sending emails", error);
          return NextResponse.json(
            {
              message: "resend server failed",
              success: false,
            },
            { status: 411 },
          );
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("error in qstash queue", error);
    return NextResponse.json(
      {
        message: "qstash server failed",
        success: false,
      },
      { status: 500 },
    );
  }
}

export const POST = verifySignatureAppRouter(handler);