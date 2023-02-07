import { PrismaClient } from "@prisma/client";
import { ISODateString } from "next-auth";

export interface GraphQLContext {
  session: Session | null;
  prisma: PrismaClient;
}

// Users

export interface Session {
  user?: User;
  expires: Date;
}

export interface User {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean | null;
  name: string;
  image: string;
}
export interface CreateUsernameResponse {
  success?: boolean;
  error?: string;
}
