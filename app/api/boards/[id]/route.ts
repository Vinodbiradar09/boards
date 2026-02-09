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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    let validatedBody;
    try {
      validatedBody = await boardSchema
        .extend({
          name: z.string().optional(),
        })
        .parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error },
          { status: 400 },
        );
      }
      throw error;
    }
    const { name, description, isPublic, sendSlackUpdates } = validatedBody;
    const board = await prisma.board.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    const currentUser = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        organizationId: board.organizationId,
      },
      select: {
        id: true,
        isAdmin: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (
      (name !== undefined ||
        description !== undefined ||
        isPublic !== undefined) &&
      board.createdBy !== session.user.id &&
      !currentUser.isAdmin
    ) {
      return NextResponse.json(
        { error: "Only the board creator or admin can edit this board" },
        { status: 403 },
      );
    }
    const updatedData: {
      name?: string;
      description?: string | null;
      isPublic?: boolean;
      sendSlackUpdates?: boolean;
    } = {};
    if (name !== undefined) updatedData.name = name.trim() || board.name;
    if (description !== undefined) updatedData.description = description.trim();
    if (isPublic !== undefined) updatedData.isPublic = isPublic;
    if (sendSlackUpdates !== undefined)
      updatedData.sendSlackUpdates = sendSlackUpdates;

    const updatedBoard = await prisma.board.update({
      where: { id },
      data: updatedData,
      include: {
        _count: {
          select: {
            notes: {
              where: {
                deletedAt: null,
                archivedAt: null,
              },
            },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return NextResponse.json({ board: updatedBoard });
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    const currentUser = await prisma.user.findFirst({
        where : {
            id : session.user.id,
            organizationId : board.organizationId,
        },
        select : {
            id : true,
            isAdmin : true,
        }
    })
    if (!currentUser) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
     if (board.createdBy !== session.user.id && !currentUser.isAdmin) {
      return NextResponse.json(
        { error: "Only the board creator or admin can delete this board" },
        { status: 403 }
      );
    }
    await prisma.board.delete({
        where : {id}
    })
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
