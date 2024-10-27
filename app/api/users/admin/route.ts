import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { withTenant } from "@/lib/middleware/withTenant";
import { Organization, Role } from "@prisma/client";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum([Role.USER, Role.ADMIN]).optional().default(Role.USER),
});

async function handler(req: Request, organization: Organization) {
  if (req.method === "POST") {
    try {
      const session = (req as any).session;
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (!currentUser || (currentUser.role !== Role.ADMIN && currentUser.role !== Role.OWNER)) {
        return NextResponse.json(
          { error: "Unauthorized: Only admins can create users" },
          { status: 403 }
        );
      }

      const body = await req.json();
      const validatedData = userSchema.parse(body);
      
      const exists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (exists) {
        return NextResponse.json(
          { error: "User already exists" },
          { status: 400 }
        );
      }

      const hashedPassword = await hash(validatedData.password, 10);

      const user = await prisma.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          role: validatedData.role,
          organizationId: organization.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      return NextResponse.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", details: error.errors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Error creating user" },
        { status: 500 }
      );
    }
  }

  if (req.method === "GET") {
    try {
      const users = await prisma.user.findMany({
        where: {
          organizationId: organization.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json(users);
    } catch (error) {
      return NextResponse.json(
        { error: "Error fetching users" },
        { status: 500 }
      );
    }
  }

  if (req.method === "DELETE") {
    try {
      const session = (req as any).session;
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (!currentUser || (currentUser.role !== Role.ADMIN && currentUser.role !== Role.OWNER)) {
        return NextResponse.json(
          { error: "Unauthorized: Only admins can delete users" },
          { status: 403 }
        );
      }

      const { userId } = await req.json();

      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 }
        );
      }

      const userToDelete = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userToDelete || userToDelete.organizationId !== organization.id) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      if (userToDelete.role === Role.OWNER) {
        return NextResponse.json(
          { error: "Cannot delete organization owner" },
          { status: 403 }
        );
      }

      await prisma.user.delete({
        where: { id: userId },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        { error: "Error deleting user" },
        { status: 500 }
      );
    }
  }

  if (req.method === "PATCH") {
    try {
      const session = (req as any).session;
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (!currentUser || (currentUser.role !== Role.ADMIN && currentUser.role !== Role.OWNER)) {
        return NextResponse.json(
          { error: "Unauthorized: Only admins can update users" },
          { status: 403 }
        );
      }

      const { userId, ...updateData } = await req.json();

      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 }
        );
      }

      const userToUpdate = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userToUpdate || userToUpdate.organizationId !== organization.id) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      if (userToUpdate.role === Role.OWNER && currentUser.role !== Role.OWNER) {
        return NextResponse.json(
          { error: "Only owners can modify owner accounts" },
          { status: 403 }
        );
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      return NextResponse.json(updatedUser);
    } catch (error) {
      return NextResponse.json(
        { error: "Error updating user" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export const GET = withTenant(handler);
export const POST = withTenant(handler);
export const DELETE = withTenant(handler);
export const PATCH = withTenant(handler);