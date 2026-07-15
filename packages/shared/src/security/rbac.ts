import { z } from 'zod';

// Define the core roles for the ClickFlash Ecosystem
export const RoleEnum = z.enum([
  'admin',
  'photographer',
  'customer',
  'kiosk'
]);

export type Role = z.infer<typeof RoleEnum>;

// Define Resource Types
export const ResourceEnum = z.enum([
  'users',
  'albums',
  'photos',
  'licenses',
  'payments',
  'kiosks'
]);

export type Resource = z.infer<typeof ResourceEnum>;

// Define Action Types
export const ActionEnum = z.enum([
  'create',
  'read',
  'update',
  'delete',
  'manage'
]);

export type Action = z.infer<typeof ActionEnum>;

/**
 * Creates a Zod validator for checking if a role is within an allowed set of roles.
 * @param allowedRoles Array of allowed roles
 */
export const createRoleValidator = (allowedRoles: Role[]) => {
  return z.string().refine(
    (role) => allowedRoles.includes(role as Role),
    {
      message: `Role must be one of: ${allowedRoles.join(', ')}`
    }
  );
};

// Granular permission matrix
export const RolePermissions: Record<Role, Partial<Record<Resource, Action[]>>> = {
  admin: {
    users: ['manage'],
    albums: ['manage'],
    photos: ['manage'],
    licenses: ['manage'],
    payments: ['manage'],
    kiosks: ['manage']
  },
  photographer: {
    albums: ['create', 'read', 'update', 'delete'],
    photos: ['create', 'read', 'update', 'delete'],
    kiosks: ['read', 'update'],
    payments: ['read']
  },
  kiosk: {
    albums: ['read', 'update'],
    photos: ['create', 'read'],
    payments: ['create']
  },
  customer: {
    albums: ['read'],
    photos: ['read'],
    payments: ['create', 'read']
  }
};

/**
 * Helper to verify if a role has a specific permission on a resource
 */
export const hasPermission = (role: Role, resource: Resource, action: Action): boolean => {
  const resourcePermissions = RolePermissions[role]?.[resource] || [];
  return resourcePermissions.includes('manage') || resourcePermissions.includes(action);
};
