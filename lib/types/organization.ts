import { PlanType } from "@prisma/client";

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  plan?: PlanType;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  createdAt: Date;
  updatedAt: Date;
}