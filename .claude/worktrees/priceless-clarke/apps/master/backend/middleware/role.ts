// backend/middleware/role.ts
// Role-based access control middleware

import { Request, Response, NextFunction } from "express";
import { sendAuthorizationError } from "../shared/errorHandler";

/**
 * Middleware to check if user has one of the allowed roles
 * @param allowedRoles Array of strings representing allowed roles
 */
export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !user.role) {
      return sendAuthorizationError(res, "Access denied: No role assigned.");
    }

    if (allowedRoles.includes(user.role)) {
      return next();
    }

    return sendAuthorizationError(
      res,
      `Access denied: Required role not met. Allowed: ${allowedRoles.join(", ")}`,
    );
  };
};

/**
 * Higher-level helper for Admin/Manager access
 */
export const isAdminOrManager = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user;
  const elevatedRoles = ["Admin", "CEO", "Manager"];

  if (user && user.role && elevatedRoles.includes(user.role)) {
    return next();
  }

  return sendAuthorizationError(
    res,
    "Access denied: Admin or Manager privileges required.",
  );
};
