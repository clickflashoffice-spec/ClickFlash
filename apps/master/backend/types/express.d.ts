import "express";
import "express-session";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id?: string;
      email?: string;
      role?: string;
      name?: string;
      [key: string]: any;
    };
    dbManager?: any;
    file?: any;
  }
}

declare module "express-session" {
  interface SessionData {
    user?: {
      id?: string;
      email?: string;
      role?: string;
      name?: string;
      [key: string]: any;
    };
    sessionId?: string;
    csrfToken?: string;
  }
}
