import { auth } from "@/app/api/auth/options";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { boardSchema } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;
    const board = await prisma.board.findUnique({
      where: {
        id,
      },
      include: {
        organization: true,
      },
    });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    if (board.isPublic) {
      const { organization, ...boardData } = board;
      return NextResponse.json({
        board: {
          ...boardData,
          organization: {
            id: organization.id,
            name: organization.name,
          },
        },
      });
    }
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userInOrg = await prisma.user.findUnique({
      where: {
        id: session.user.id,
        organizationId: board.organizationId,
      },
    });
    if (!userInOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const { organization, ...boardData } = board;
    return NextResponse.json({
      board: {
        ...boardData,
        organization: {
          id: organization.id,
          name: organization.name,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching board:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

