import prisma from "@/lib/prisma";
import { NextRequest , NextResponse} from "next/server";

export async function POST(req : NextRequest ) {
    try {
        await prisma.user.create({
            data : {
                email : "vinod",
                name : "gh",
            }
        })
        return NextResponse.json({
            message : "done",
            success : true,
        }, {status : 200})
    } catch (error) {
        console.log(error);
    }
}

