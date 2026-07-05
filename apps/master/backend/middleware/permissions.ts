/**
 * Permission Middleware
 * 
 * Enforces role-based access control (RBAC) on API routes.
 * Works in conjunction with authMiddleware.
 */

import { Request, Response, NextFunction } from "express";
import AuditLogger from '../utils/auditLogger';

// Permission definitions
export const PERMISSIONS = {
  // Album management
  ALBUM_VIEW: "album:view",
  ALBUM_CREATE: "album:create",
  ALBUM_EDIT: "album:edit",
  ALBUM_DELETE: "album:delete",
  
  // Photo management
  PHOTO_VIEW: "photo:view",
  PHOTO_UPLOAD: "photo:upload",
  PHOTO_EDIT: "photo:edit",
  PHOTO_DELETE: "photo:delete",
  
  // Order management
  ORDER_VIEW: "order:view",
  ORDER_CREATE: "order:create",
  ORDER_EDIT: "order:edit",
  ORDER_DELETE: "order:delete",
  ORDER_PROCESS: "order:process",
  
  // User management
  USER_VIEW: "user:view",
  USER_CREATE: "user:create",
  USER_EDIT: "user:edit",
  USER_DELETE: "user:delete",
  
  // Settings
  SETTINGS_VIEW: "settings:view",
  SETTINGS_EDIT: "settings:edit",
  
  // Analytics
  ANALYTICS_VIEW: "analytics:view",
  
  // System
  SYSTEM_VIEW: "system:view",
  SYSTEM_ADMIN: "system:admin",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  CEO: [
    PERMISSIONS.ALBUM_VIEW, PERMISSIONS.ALBUM_CREATE, PERMISSIONS.ALBUM_EDIT, PERMISSIONS.ALBUM_DELETE,
    PERMISSIONS.PHOTO_VIEW, PERMISSIONS.PHOTO_UPLOAD, PERMISSIONS.PHOTO_EDIT, PERMISSIONS.PHOTO_DELETE,
    PERMISSIONS.ORDER_VIEW, PERMISSIONS.ORDER_CREATE, PERMISSIONS.ORDER_EDIT, PERMISSIONS.ORDER_DELETE, PERMISSIONS.ORDER_PROCESS,
    PERMISSIONS.USER_VIEW, PERMISSIONS.USER_CREATE, PERMISSIONS.USER_EDIT, PERMISSIONS.USER_DELETE,
    PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_ADMIN,
  ],
  Manager: [
    PERMISSIONS.ALBUM_VIEW, PERMISSIONS.ALBUM_CREATE, PERMISSIONS.ALBUM_EDIT,
    PERMISSIONS.PHOTO_VIEW, PERMISSIONS.PHOTO_UPLOAD, PERMISSIONS.PHOTO_EDIT,
    PERMISSIONS.ORDER_VIEW, PERMISSIONS.ORDER_CREATE, PERMISSIONS.ORDER_EDIT, PERMISSIONS.ORDER_PROCESS,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  "Team Leader": [
    PERMISSIONS.ALBUM_VIEW, PERMISSIONS.ALBUM_CREATE, PERMISSIONS.ALBUM_EDIT,
    PERMISSIONS.PHOTO_VIEW, PERMISSIONS.PHOTO_UPLOAD, PERMISSIONS.PHOTO_EDIT,
    PERMISSIONS.ORDER_VIEW, PERMISSIONS.ORDER_CREATE, PERMISSIONS.ORDER_EDIT,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  Photographer: [
    PERMISSIONS.ALBUM_VIEW,
    PERMISSIONS.PHOTO_VIEW, PERMISSIONS.PHOTO_UPLOAD, PERMISSIONS.PHOTO_EDIT,
    PERMISSIONS.ORDER_VIEW, PERMISSIONS.ORDER_CREATE,
  ],
  Admin: [
    PERMISSIONS.USER_VIEW, PERMISSIONS.USER_CREATE, PERMISSIONS.USER_EDIT, PERMISSIONS.USER_DELETE,
    PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_ADMIN,
  ],
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userRole: string, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userRole: string, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Middleware factory to require specific permission
 */
export function requirePermission(
  permission: Permission,
  auditLogger?: AuditLogger
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    const userRole = (user as any).role || "Photographer";
    
    if (!hasPermission(userRole, permission)) {
      const clientIp = req.socket.remoteAddress || "unknown";
      
      if (auditLogger) {
        auditLogger.logSecurityEvent("PERMISSION_DENIED", {
          userId: (user as any).id,
          role: userRole,
          requiredPermission: permission,
          path: req.path,
          ip: clientIp,
        });
      }

      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: `Permission '${permission}' required`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory to require any of the specified permissions
 */
export function requireAnyPermission(
  permissions: Permission[],
  auditLogger?: AuditLogger
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    const userRole = (user as any).role || "Photographer";
    
    if (!hasAnyPermission(userRole, permissions)) {
      const clientIp = req.socket.remoteAddress || "unknown";
      
      if (auditLogger) {
        auditLogger.logSecurityEvent("PERMISSION_DENIED", {
          userId: (user as any).id,
          role: userRole,
          requiredPermissions: permissions,
          path: req.path,
          ip: clientIp,
        });
      }

      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: `One of the following permissions required: ${permissions.join(", ")}`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require ownership or admin permission
 * Used for resources that users should only access if they own them
 */
export function requireOwnershipOrPermission(
  getResourceOwner: (req: Request) => Promise<string | null>,
  permission: Permission,
  auditLogger?: AuditLogger
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    const userId = (user as any).id;
    const userRole = (user as any).role || "Photographer";
    
    // Check if user has the permission (admin/manager)
    if (hasPermission(userRole, permission)) {
      next();
      return;
    }

    // Check ownership
    try {
      const ownerId = await getResourceOwner(req);
      
      if (ownerId === userId) {
        next();
        return;
      }

      const clientIp = req.socket.remoteAddress || "unknown";
      
      if (auditLogger) {
        auditLogger.logSecurityEvent("OWNERSHIP_CHECK_FAILED", {
          userId,
          resourceOwnerId: ownerId,
          path: req.path,
          ip: clientIp,
        });
      }

      res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "Access denied. You don't have permission to access this resource.",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "Failed to verify resource ownership",
      });
    }
  };
}

export default {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission,
  requireAnyPermission,
  requireOwnershipOrPermission,
};
