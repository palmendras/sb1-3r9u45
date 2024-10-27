import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function withTenant(handler: Function) {
  return async (req: Request) => {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { organization: true },
      });

      if (!user?.organization) {
        return NextResponse.json(
          { error: "No organization found" },
          { status: 404 }
        );
      }

      return handler(req, user.organization);
    } catch (error) {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}