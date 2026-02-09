import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [totalUsers, totalOrgs, totalBoards, totalNotes, totalChecklistItems] = await Promise.all(
      [
        prisma.user.count(),
        prisma.organization.count(),
        prisma.board.count(),
        prisma.note.count({ where: { deletedAt: null } }),
        prisma.checklistItem.count(),
      ]
    );

    const totals = {
      totalUsers,
      totalOrgs,
      totalBoards,
      totalNotes,
      totalChecklistItems,
    };

    return NextResponse.json({ totals });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}