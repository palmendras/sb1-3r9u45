import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { CreateOrganizationInput } from "@/lib/types/organization";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { name, slug, plan, user }: CreateOrganizationInput & {
      user: { name: string; email: string; password: string };
    } = await req.json();

    if (!name || !slug || !user.email || !user.password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if organization slug is unique
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization slug already exists" },
        { status: 400 }
      );
    }

    // Check if user email is unique
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(user.password, 10);

    // Create organization and owner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name,
          slug,
          plan: plan || undefined,
        },
      });

      const owner = await tx.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role: Role.OWNER,
          organizationId: organization.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
            },
          },
        },
      });

      return { organization, owner };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating organization" },
      { status: 500 }
    );
  }
}