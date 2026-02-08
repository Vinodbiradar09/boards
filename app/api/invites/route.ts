import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { resend } from "@/lib/resend";
import { env } from "@/lib/types/env";

async function handler(req: Request) {
  try {
    const { emails, organization, user , baseUrl } = await req.json();
    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({
        message: "please send emails in array",
        success: false,
      });
    }
    const invited = await prisma.organizationInvite.createManyAndReturn({
      data: emails.map((email : string)=>({
        email,
        organizationId : organization.id,
        invitedById : user.id,
      })),
      skipDuplicates: true,
    });
    const batch = invited.map((invite)=>({
        from : env.EMAIL_FROM,
        to : invite.email,
        subject : `${user.name} invited you to join ${organization.name}`,
         html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You&apos;re invited to join ${organization.name}!</h2>
              <p>${user.name} (${user.email}) has invited you to join their organization on Gumboard.</p>
              <p>Click the link below to accept the invitation:</p>
              <a href="${baseUrl}/invite/accept?token=${invite.id}"
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
              <p style="margin-top: 20px; color: #666;">
                If you don&apos;t want to receive these emails, please ignore this message.
              </p>
            </div>
          `,
    }))
    const {data , error} = await resend.batch.send(batch);
    if(error){
       console.log("error in resend" , error);
    }else {
      console.log("data" ,data);
    }
    return NextResponse.json({ success: true , message : "the organization invitation has been sent"}, {status : 200});
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
