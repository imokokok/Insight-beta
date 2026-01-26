export type Permission =
  | 'oracle:read'
  | 'oracle:write'
  | 'oracle:delete'
  | 'oracle:admin'
  | 'dispute:read'
  | 'dispute:create'
  | 'dispute:vote'
  | 'dispute:admin'
  | 'alert:read'
  | 'alert:write'
  | 'alert:admin'
  | 'user:read'
  | 'user:write'
  | 'user:delete'
  | 'user:admin'
  | 'admin:read'
  | 'admin:write'
  | 'admin:delete'
  | 'admin:super'
  | 'audit:read'
  | 'audit:export'
  | 'settings:read'
  | 'settings:write'
  | 'api:read'
  | 'api:write'
  | 'api:admin';

export type Role = 'viewer' | 'user' | 'moderator' | 'operator' | 'admin' | 'super_admin';

export interface RoleDefinition {
  name: Role;
  displayName: string;
  description: string;
  permissions: Permission[];
  priority: number;
  isSystem: boolean;
}

export interface UserPermission {
  userId: string;
  address: string;
  roles: Role[];
  customPermissions: Permission[];
  deniedPermissions: Permission[];
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionContext {
  userId: string | null;
  address: string | null;
  roles: Role[];
  permissions: Permission[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  viewer: {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to public data',
    permissions: ['oracle:read', 'dispute:read', 'alert:read'],
    priority: 1,
    isSystem: true,
  },
  user: {
    name: 'user',
    displayName: 'User',
    description: 'Standard user with basic interaction capabilities',
    permissions: ['oracle:read', 'dispute:read', 'dispute:create', 'alert:read', 'user:read'],
    priority: 2,
    isSystem: true,
  },
  moderator: {
    name: 'moderator',
    displayName: 'Moderator',
    description: 'Can manage disputes and alerts',
    permissions: [
      'oracle:read',
      'dispute:read',
      'dispute:create',
      'dispute:vote',
      'alert:read',
      'alert:write',
      'user:read',
      'audit:read',
    ],
    priority: 3,
    isSystem: true,
  },
  operator: {
    name: 'operator',
    displayName: 'Operator',
    description: 'Full operational access except user management',
    permissions: [
      'oracle:read',
      'oracle:write',
      'dispute:read',
      'dispute:create',
      'dispute:vote',
      'dispute:admin',
      'alert:read',
      'alert:write',
      'alert:admin',
      'user:read',
      'audit:read',
      'audit:export',
      'settings:read',
      'api:read',
    ],
    priority: 4,
    isSystem: true,
  },
  admin: {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access except super admin features',
    permissions: [
      'oracle:read',
      'oracle:write',
      'oracle:delete',
      'oracle:admin',
      'dispute:read',
      'dispute:create',
      'dispute:vote',
      'dispute:admin',
      'alert:read',
      'alert:write',
      'alert:admin',
      'user:read',
      'user:write',
      'user:admin',
      'admin:read',
      'admin:write',
      'audit:read',
      'audit:export',
      'settings:read',
      'settings:write',
      'api:read',
      'api:write',
    ],
    priority: 5,
    isSystem: true,
  },
  super_admin: {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Complete system control with all permissions',
    permissions: [
      'oracle:read',
      'oracle:write',
      'oracle:delete',
      'oracle:admin',
      'dispute:read',
      'dispute:create',
      'dispute:vote',
      'dispute:admin',
      'alert:read',
      'alert:write',
      'alert:admin',
      'user:read',
      'user:write',
      'user:delete',
      'user:admin',
      'admin:read',
      'admin:write',
      'admin:delete',
      'admin:super',
      'audit:read',
      'audit:export',
      'settings:read',
      'settings:write',
      'api:read',
      'api:write',
      'api:admin',
    ],
    priority: 100,
    isSystem: true,
  },
};

export const PERMISSION_GROUPS: Record<string, Permission[]> = {
  oracle: ['oracle:read', 'oracle:write', 'oracle:delete', 'oracle:admin'],
  dispute: ['dispute:read', 'dispute:create', 'dispute:vote', 'dispute:admin'],
  alert: ['alert:read', 'alert:write', 'alert:admin'],
  user: ['user:read', 'user:write', 'user:delete', 'user:admin'],
  admin: ['admin:read', 'admin:write', 'admin:delete', 'admin:super'],
  audit: ['audit:read', 'audit:export'],
  settings: ['settings:read', 'settings:write'],
  api: ['api:read', 'api:write', 'api:admin'],
};

export class PermissionManager {
  private userPermissions: Map<string, UserPermission> = new Map();
  private roleCache: Map<string, Set<Permission>> = new Map();

  constructor() {
    this.initializeRoleCache();
  }

  private initializeRoleCache(): void {
    Object.values(ROLE_DEFINITIONS).forEach((role) => {
      this.roleCache.set(role.name, new Set(role.permissions));
    });
  }

  getUserPermissions(userId: string): UserPermission | null {
    return this.userPermissions.get(userId) || null;
  }

  setUserPermissions(permission: UserPermission): void {
    this.userPermissions.set(permission.userId, permission);
  }

  deleteUserPermissions(userId: string): boolean {
    return this.userPermissions.delete(userId);
  }

  getEffectivePermissions(userId: string): Permission[] {
    const userPerm = this.userPermissions.get(userId);
    if (!userPerm) return [];

    const permissions = new Set<Permission>();

    userPerm.roles.forEach((role) => {
      const rolePerms = this.roleCache.get(role);
      if (rolePerms) {
        rolePerms.forEach((p) => permissions.add(p));
      }
    });

    userPerm.customPermissions.forEach((p) => {
      if (!userPerm.deniedPermissions.includes(p)) {
        permissions.add(p);
      }
    });

    userPerm.deniedPermissions.forEach((p) => {
      permissions.delete(p);
    });

    return Array.from(permissions);
  }

  hasPermission(userId: string, permission: Permission): boolean {
    const permissions = this.getEffectivePermissions(userId);
    return permissions.includes(permission);
  }

  hasAnyPermission(userId: string, permissions: Permission[]): boolean {
    return permissions.some((p) => this.hasPermission(userId, p));
  }

  hasAllPermissions(userId: string, permissions: Permission[]): boolean {
    return permissions.every((p) => this.hasPermission(userId, p));
  }

  hasRole(userId: string, role: Role): boolean {
    const userPerm = this.userPermissions.get(userId);
    return userPerm?.roles.includes(role) || false;
  }

  hasAnyRole(userId: string, roles: Role[]): boolean {
    const userPerm = this.userPermissions.get(userId);
    if (!userPerm) return false;
    return roles.some((r) => userPerm.roles.includes(r));
  }

  addRole(userId: string, role: Role): boolean {
    const userPerm = this.userPermissions.get(userId);
    if (!userPerm) return false;

    if (!userPerm.roles.includes(role)) {
      userPerm.roles.push(role);
      userPerm.updatedAt = new Date().toISOString();
    }

    return true;
  }

  removeRole(userId: string, role: Role): boolean {
    const userPerm = this.userPermissions.get(userId);
    if (!userPerm) return false;

    const index = userPerm.roles.indexOf(role);
    if (index > -1) {
      userPerm.roles.splice(index, 1);
      userPerm.updatedAt = new Date().toISOString();
    }

    return true;
  }

  grantPermission(userId: string, permission: Permission): boolean {
    const userPerm = this.userPermissions.get(userId);
    if (!userPerm) return false;

    if (!userPerm.customPermissions.includes(permission)) {
      userPerm.customPermissions.push(permission);
      userPerm.updatedAt = new Date().toISOString();
    }

    return true;
  }

  revokePermission(userId: string, permission: Permission): boolean {
    const userPerm = this.userPermissions.get(userId);
    if (!userPerm) return false;

    const index = userPerm.customPermissions.indexOf(permission);
    if (index > -1) {
      userPerm.customPermissions.splice(index, 1);
    }

    if (!userPerm.deniedPermissions.includes(permission)) {
      userPerm.deniedPermissions.push(permission);
      userPerm.updatedAt = new Date().toISOString();
    }

    return true;
  }

  isRoleEditable(role: Role): boolean {
    // Safe: role is a literal type from Role union, ROLE_DEFINITIONS is Record<Role, RoleDefinition>

    return !ROLE_DEFINITIONS[role]?.isSystem;
  }

  getRoleHierarchy(): Role[] {
    return Object.values(ROLE_DEFINITIONS)
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.name);
  }

  canAssignRole(assignerId: string, targetRole: Role): boolean {
    const assignerPerm = this.userPermissions.get(assignerId);
    if (!assignerPerm) return false;

    // Safe: targetRole is a literal type from Role union

    const targetRoleDef = ROLE_DEFINITIONS[targetRole];
    if (!targetRoleDef) return false;

    const assignerHighestRole = this.getHighestRole(assignerId);
    if (!assignerHighestRole) return false;

    // Safe: assignerHighestRole is a literal type from Role union

    const assignerRoleDef = ROLE_DEFINITIONS[assignerHighestRole];
    return assignerRoleDef.priority > targetRoleDef.priority;
  }

  getHighestRole(userId: string): Role | null {
    const userPerm = this.userPermissions.get(userId);
    if (!userPerm || userPerm.roles.length === 0) return null;

    return userPerm.roles.reduce((highest, current) => {
      // Safe: highest and current are literal types from Role union

      const highestDef = ROLE_DEFINITIONS[highest];

      const currentDef = ROLE_DEFINITIONS[current];
      return currentDef.priority > highestDef.priority ? current : highest;
    });
  }

  createContext(userId: string | null, address: string | null): PermissionContext {
    if (!userId || !address) {
      return {
        userId: null,
        address: null,
        roles: [],
        permissions: [],
        isAuthenticated: false,
        isAdmin: false,
        isSuperAdmin: false,
      };
    }

    const userPerm = this.userPermissions.get(userId);
    const roles = userPerm?.roles || [];
    const permissions = this.getEffectivePermissions(userId);

    return {
      userId,
      address,
      roles,
      permissions,
      isAuthenticated: true,
      isAdmin: roles.includes('admin') || roles.includes('super_admin'),
      isSuperAdmin: roles.includes('super_admin'),
    };
  }

  reset(): void {
    this.userPermissions.clear();
  }
}

export const permissionManager = new PermissionManager();

export function requirePermission(context: PermissionContext, permission: Permission): boolean {
  if (!context.isAuthenticated) return false;
  return context.permissions.includes(permission);
}

export function requireAnyPermission(
  context: PermissionContext,
  permissions: Permission[],
): boolean {
  if (!context.isAuthenticated) return false;
  return permissions.some((p) => context.permissions.includes(p));
}

export function requireAllPermissions(
  context: PermissionContext,
  permissions: Permission[],
): boolean {
  if (!context.isAuthenticated) return false;
  return permissions.every((p) => context.permissions.includes(p));
}

export function requireRole(context: PermissionContext, role: Role): boolean {
  if (!context.isAuthenticated) return false;
  return context.roles.includes(role);
}

export function requireAnyRole(context: PermissionContext, roles: Role[]): boolean {
  if (!context.isAuthenticated) return false;
  return roles.some((r) => context.roles.includes(r));
}

export function filterByPermission<T extends { id: string }>(
  items: T[],
  userId: string,
  _permission: Permission,
  getItemOwnerId: (item: T) => string,
): T[] {
  const context = permissionManager.createContext(userId, '');
  const hasAdmin =
    requirePermission(context, 'admin:super') || requirePermission(context, 'user:admin');

  if (hasAdmin) return items;

  return items.filter((item) => {
    const ownerId = getItemOwnerId(item);
    return ownerId === userId;
  });
}

export function getAccessibleResources<T extends { id: string; ownerId: string }>(
  resources: T[],
  userId: string,
  adminPermission: Permission,
): T[] {
  const context = permissionManager.createContext(userId, '');
  const hasAdmin = requirePermission(context, adminPermission);

  if (hasAdmin) return resources;

  return resources.filter((r) => r.ownerId === userId);
}
