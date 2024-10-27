import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withTenant } from "@/lib/middleware/withTenant";
import { Organization } from "@prisma/client";

async function handler(req: Request, organization: Organization) {
  if (req.method === "POST") {
    const { title, content } = await req.json();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        organizationId: organization.id,
        authorId: (req as any).session.user.id,
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(post);
  }

  if (req.method === "GET") {
    const posts = await prisma.post.findMany({
      where: {
        organizationId: organization.id,
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(posts);
  }
}

export const GET = withTenant(handler);
export const POST = withTenant(handler);