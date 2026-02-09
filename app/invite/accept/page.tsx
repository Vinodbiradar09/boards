import { auth } from "@/app/api/auth/options";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

async function acceptInvite(token: string) {
  "use server";
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("not authenticated");
  }

  const invite = await prisma.organizationInvite.findUnique({
    where: {
      id: token,
    },
    include: {
      organization: true,
    },
  });
  if (!invite) {
    throw new Error("Invalid or expired invitation");
  }
  if (invite.email !== session.user.email) {
    throw new Error("This invitation is not for your email address");
  }
  if (invite.status !== "PENDING") {
    throw new Error("This invitation has already been processed");
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user?.id },
      data: {
        organizationId: invite.organizationId,
      },
    });
    await tx.organizationInvite.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
      },
    });
  });
  redirect("/dashboard");
}

async function declineInvite(token: string) {
  "use server";
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Not authenticated");
  }
  const invite = await prisma.organizationInvite.findUnique({
    where: {
      id: token,
    },
  });
  if (!invite) {
    throw new Error("Invalid or expired invitation");
  }
  if (invite.email !== session.user.email) {
    throw new Error("This invitation is not for your email address");
  }
  await prisma.organizationInvite.update({
    where: { id: token },
    data: { status: "DECLINED" },
  });
  redirect("/dashboard");
}

async function autoVerifyAndCreateSession(email: string, token: string) {
  "use server";
  try {
    let user = await prisma.user.findUnique({
      where: { email: email },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          emailVerified: new Date(),
        },
      });
    } else if (!user.emailVerified) {
      user = await prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      });
    }
    const sessionToken = crypto.randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    });
    redirect(
      `/api/auth/set-session?token=${sessionToken}&redirectTo=${encodeURIComponent(`/invite/accept?token=${token}&verified=true`)}`,
    );
  } catch (error) {
    console.error("Auto-verification error:", error);
    redirect(
      `/auth/signin?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(`/invite/accept?token=${token}`)}`,
    );
  }
}

interface InviteAcceptPageProps {
  searchParams: Promise<{
    token?: string;
    verified?: string;
  }>;
}

export default async function InviteAcceptPage({
  searchParams,
}: InviteAcceptPageProps) {
  const session = await auth();
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams.token;
  const isJustVerified = resolvedSearchParams.verified;

  if (!token) {
    return (
      <div className="min-h-screen bg-linear-to-br from-white to-slate-50 dark:from-zinc-950 dark:to-zinc-900">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-sm sm:max-w-md mx-auto">
            <Card className="bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-800 shadow-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-red-700 dark:text-red-400">
                  Invalid Invitation
                </CardTitle>
                <CardDescription className="text-muted-foreground dark:text-zinc-400">
                  This invitation link is invalid or missing required
                  information.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const invite = await prisma.organizationInvite.findUnique({
    where: { id: token },
    include: {
      organization: true,
      invitedBy: true,
    },
  });

  if (!invite) {
    return (
      <div className="min-h-screen bg-linear-to-br from-white to-slate-50 dark:from-zinc-950 dark:to-zinc-900">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-sm sm:max-w-md mx-auto">
            <Card className="bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-800 shadow-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-red-700 dark:text-red-400">
                  Invalid Invitation
                </CardTitle>
                <CardDescription className="text-muted-foreground dark:text-zinc-400">
                  This invitation link is invalid or has expired.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-linear-to-br from-white to-slate-50 dark:from-zinc-950 dark:to-zinc-900">
        <div className="container mx-auto px-4 sm:px-6 pt-6 sm:py-8">
          <div className="max-w-sm sm:max-w-md mx-auto space-y-8">
            {/* Auto-verification Card */}
            <Card className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-linear-to-br from-green-500 to-blue-600 dark:from-zinc-800 dark:to-blue-900 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {invite.organization.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <CardTitle className="text-xl text-foreground dark:text-zinc-100">
                  {invite.organization.name}
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground dark:text-zinc-400">
                  {invite.invitedBy.name || invite.invitedBy.email} has invited
                  you to join their organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <form
                    action={autoVerifyAndCreateSession.bind(
                      null,
                      invite.email,
                      token,
                    )}
                  >
                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Continue to Invitation
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (invite.email !== session.user.email) {
    return (
      <div className="min-h-screen bg-linear-to-br from-white to-slate-50 dark:from-zinc-950 dark:to-zinc-900">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-sm sm:max-w-md mx-auto">
            <Card className="bg-white dark:bg-zinc-900 border border-yellow-200 dark:border-yellow-800 shadow-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-yellow-700 dark:text-yellow-400">
                  Wrong Account
                </CardTitle>
                <CardDescription className="text-muted-foreground dark:text-zinc-400">
                  This invitation is for {invite.email}, but you&apos;re signed
                  in as {session.user.email}. Please sign out and use the
                  invitation link again to sign in with the correct account.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form
                  action={autoVerifyAndCreateSession.bind(
                    null,
                    invite.email,
                    token,
                  )}
                >
                  <Button type="submit" className="w-full" variant="outline">
                    Sign in as {invite.email}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  if (invite.status !== "PENDING") {
    return (
      <div className="min-h-screen bg-linear-to-br from-white to-slate-50 dark:from-zinc-950 dark:to-zinc-900">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-sm sm:max-w-md mx-auto">
            <Card className="bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800 shadow-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-blue-700 dark:text-blue-400">
                  Invitation{" "}
                  {invite.status === "ACCEPTED"
                    ? "Already Accepted"
                    : "Already Declined"}
                </CardTitle>
                <CardDescription className="text-muted-foreground dark:text-zinc-400">
                  You have already{" "}
                  {invite.status === "ACCEPTED" ? "accepted" : "declined"} this
                  invitation.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-white to-slate-50 dark:from-zinc-950 dark:to-zinc-900">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-sm sm:max-w-md mx-auto space-y-8">
          {/* Success message if just verified */}
          {isJustVerified && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-sm text-green-700 dark:text-green-300 text-center">
                ✅ Account verified successfully! You can now accept or decline
                the invitation below.
              </p>
            </div>
          )}

          {/* Invitation Details Card */}
          <Card className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-linear-to-br from-green-500 to-blue-600 dark:from-zinc-800 dark:to-blue-900 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {invite.organization.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <CardTitle className="text-xl text-foreground dark:text-zinc-100">
                {invite.organization.name}
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground dark:text-zinc-400">
                {invite.invitedBy.name || invite.invitedBy.email} has invited you to join
                their organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground dark:text-zinc-400">
                  Invited: {invite.createdAt.toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground dark:text-zinc-400">
                  Your email: {invite.email}
                </p>
              </div>

              <div className="flex flex-col space-y-3">
                <form action={acceptInvite.bind(null, token)}>
                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Accept Invitation
                  </Button>
                </form>

                <form action={declineInvite.bind(null, token)}>
                  <Button
                    type="submit"
                    className="w-full border border-zinc-100 dark:border-zinc-700 bg-transparent dark:text-white dark:hover:bg-red-500 hover:bg-red-500 hover:text-white text-black"
                  >
                    Decline Invitation
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
