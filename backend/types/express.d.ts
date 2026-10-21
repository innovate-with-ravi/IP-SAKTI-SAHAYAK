import type { Chat } from "../src/generated/prisma/client.js";

export interface AuthUser {
  id: string;
  userId?: string | undefined;
  email?: string | undefined;
  role?: string | undefined;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser | undefined;
      chat?: Chat | undefined;
    }
  }
}
