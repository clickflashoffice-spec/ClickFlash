import "express";
import "express-session";

interface AuthenticatedUser {
  id?: string;
  email?: string;
  role?: string;
  name?: string;
  [key: string]: unknown;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      dbManager?: unknown;
      file?: unknown;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    user?: AuthenticatedUser;
    sessionId?: string;
    csrfToken?: string;
  }
}

export {};
