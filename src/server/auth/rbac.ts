/**
 * RBAC (Role-Based Access Control) System
 *
 * 基于角色的权限控制系统
 * 支持角色定义、权限分配、资源访问控制
 */

import { logger } from '@/lib/logger';
import { query } from '@/server/db';

// ============================================================================
// 类型定义
// ============================================================================

export type Permission =
  // 实例权限
  | 'instance:read'
  | 'instance:create'
  | 'instance:update'
  | 'instance:delete'
  | 'instance:sync'
  // 价格数据权限
  | 'price:read'
  | 'price:compare'
  | 'price:export'
  // 告警权限
  | 'alert:read'
  | 'alert:acknowledge'
  | 'alert:resolve'
  | 'alert:configure'
  // 用户管理权限
  | 'user:read'
  | 'user:create'
  | 'user:update'
  | 'user:delete'
  // 角色管理权限
  | 'role:read'
  | 'role:create'
  | 'role:update'
  | 'role:delete'
  // 系统权限
  | 'system:read'
  | 'system:configure'
  | 'system:audit'
  | 'system:admin';

export type ResourceType = 'instance' | 'price' | 'alert' | 'user' | 'role' | 'system';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
}

export interface ResourcePermission {
  id: string;
  roleId: string;
  resourceType: ResourceType;
  resourceId?: string;
  permission: Permission;
  granted: boolean;
  createdAt: Date;
}

export interface RBACContext {
  userId: string;
  roles: string[];
  permissions: Permission[];
  isAdmin: boolean;
}

// ============================================================================
// 预定义角色
// ============================================================================

export const SYSTEM_ROLES: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'super_admin',
    description: '超级管理员 - 拥有所有权限',
    permissions: ['system:admin'],
    isSystem: true,
  },
  {
    name: 'admin',
    description: '管理员 - 可以管理实例、用户和配置',
    permissions: [
      'instance:read',
      'instance:create',
      'instance:update',
      'instance:delete',
      'instance:sync',
      'price:read',
      'price:compare',
      'price:export',
      'alert:read',
      'alert:acknowledge',
      'alert:resolve',
      'alert:configure',
      'user:read',
      'user:create',
      'user:update',
      'role:read',
      'system:read',
      'system:configure',
      'system:audit',
    ],
    isSystem: true,
  },
  {
    name: 'operator',
    description: '操作员 - 可以管理实例和查看数据',
    permissions: [
      'instance:read',
      'instance:create',
      'instance:update',
      'instance:sync',
      'price:read',
      'price:compare',
      'alert:read',
      'alert:acknowledge',
      'alert:resolve',
      'system:read',
    ],
    isSystem: true,
  },
  {
    name: 'viewer',
    description: '观察者 - 只读权限',
    permissions: ['instance:read', 'price:read', 'price:compare', 'alert:read', 'system:read'],
    isSystem: true,
  },
  {
    name: 'api_user',
    description: 'API 用户 - 仅 API 访问权限',
    permissions: ['price:read', 'price:compare', 'price:export'],
    isSystem: true,
  },
];

// ============================================================================
// RBAC 管理器
// ============================================================================

export class RBACManager {
  private static instance: RBACManager;
  private permissionCache: Map<string, Permission[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

  private constructor() {}

  static getInstance(): RBACManager {
    if (!RBACManager.instance) {
      RBACManager.instance = new RBACManager();
    }
    return RBACManager.instance;
  }

  // ============================================================================
  // 角色管理
  // ============================================================================

  async initializeSystemRoles(): Promise<void> {
    for (const role of SYSTEM_ROLES) {
      const existing = await this.getRoleByName(role.name);
      if (!existing) {
        await this.createRole(role);
        logger.info('System role created', { role: role.name });
      }
    }
  }

  async createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const result = await query(
      `INSERT INTO rbac_roles (name, description, permissions, is_system, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [role.name, role.description, JSON.stringify(role.permissions), role.isSystem],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to create role');
    }
    return this.mapRoleFromDb(row as Record<string, unknown>);
  }

  async getRoleById(id: string): Promise<Role | null> {
    const result = await query('SELECT * FROM rbac_roles WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRoleFromDb(result.rows[0] as Record<string, unknown>) : null;
  }

  async getRoleByName(name: string): Promise<Role | null> {
    const result = await query('SELECT * FROM rbac_roles WHERE name = $1', [name]);
    return result.rows[0] ? this.mapRoleFromDb(result.rows[0] as Record<string, unknown>) : null;
  }

  async getAllRoles(): Promise<Role[]> {
    const result = await query('SELECT * FROM rbac_roles ORDER BY created_at DESC');
    return result.rows.map(this.mapRoleFromDb);
  }

  async updateRole(
    id: string,
    updates: Partial<Omit<Role, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Role | null> {
    const role = await this.getRoleById(id);
    if (!role) return null;

    // 系统角色不能修改
    if (role.isSystem && updates.permissions) {
      throw new Error('Cannot modify system role permissions');
    }

    const sets: string[] = [];
    const values: (string | boolean)[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      sets.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      sets.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.permissions !== undefined) {
      sets.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(updates.permissions));
    }

    sets.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE rbac_roles SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    // 清除缓存
    this.invalidateCache();

    return result.rows[0] ? this.mapRoleFromDb(result.rows[0]) : null;
  }

  async deleteRole(id: string): Promise<boolean> {
    const role = await this.getRoleById(id);
    if (!role) return false;

    // 系统角色不能删除
    if (role.isSystem) {
      throw new Error('Cannot delete system role');
    }

    // 检查是否有用户正在使用此角色
    const usersWithRole = await query(
      'SELECT COUNT(*) as count FROM rbac_user_roles WHERE role_id = $1',
      [id],
    );

    const userCount = usersWithRole.rows[0]?.count;
    if (userCount && parseInt(String(userCount)) > 0) {
      throw new Error('Cannot delete role with assigned users');
    }

    const result = await query('DELETE FROM rbac_roles WHERE id = $1', [id]);

    // 清除缓存
    this.invalidateCache();

    return (result.rowCount ?? 0) > 0;
  }

  // ============================================================================
  // 用户角色管理
  // ============================================================================

  async assignRole(userId: string, roleId: string, assignedBy: string): Promise<void> {
    await query(
      `INSERT INTO rbac_user_roles (user_id, role_id, assigned_by, assigned_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, role_id) DO UPDATE SET
       assigned_by = EXCLUDED.assigned_by,
       assigned_at = EXCLUDED.assigned_at`,
      [userId, roleId, assignedBy],
    );

    // 清除用户权限缓存
    this.clearUserCache(userId);

    logger.info('Role assigned to user', { userId, roleId, assignedBy });
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await query('DELETE FROM rbac_user_roles WHERE user_id = $1 AND role_id = $2', [
      userId,
      roleId,
    ]);

    // 清除用户权限缓存
    this.clearUserCache(userId);

    logger.info('Role removed from user', { userId, roleId });
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const result = await query(
      `SELECT r.* FROM rbac_roles r
       INNER JOIN rbac_user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId],
    );

    return result.rows.map(this.mapRoleFromDb);
  }

  async getUsersWithRole(roleId: string): Promise<string[]> {
    const result = await query('SELECT user_id FROM rbac_user_roles WHERE role_id = $1', [roleId]);

    return result.rows.map((row) => row.user_id);
  }

  // ============================================================================
  // 权限检查
  // ============================================================================

  async getUserPermissions(userId: string): Promise<Permission[]> {
    // 检查缓存
    const cached = this.getCachedPermissions(userId);
    if (cached) return cached;

    const roles = await this.getUserRoles(userId);
    const permissions = new Set<Permission>();

    for (const role of roles) {
      for (const permission of role.permissions) {
        permissions.add(permission);
      }
    }

    const permissionList = Array.from(permissions);

    // 缓存权限
    this.cachePermissions(userId, permissionList);

    return permissionList;
  }

  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);

    // 超级管理员拥有所有权限
    if (permissions.includes('system:admin')) return true;

    return permissions.includes(permission);
  }

  async hasAnyPermission(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);

    // 超级管理员拥有所有权限
    if (userPermissions.includes('system:admin')) return true;

    return permissions.some((p) => userPermissions.includes(p));
  }

  async hasAllPermissions(userId: string, permissions: Permission[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);

    // 超级管理员拥有所有权限
    if (userPermissions.includes('system:admin')) return true;

    return permissions.every((p) => userPermissions.includes(p));
  }

  async checkPermission(userId: string, permission: Permission): Promise<void> {
    const hasPerm = await this.hasPermission(userId, permission);
    if (!hasPerm) {
      throw new PermissionDeniedError(permission);
    }
  }

  // ============================================================================
  // 资源级权限
  // ============================================================================

  async grantResourcePermission(
    roleId: string,
    resourceType: ResourceType,
    resourceId: string | undefined,
    permission: Permission,
    granted: boolean = true,
  ): Promise<void> {
    await query(
      `INSERT INTO rbac_resource_permissions 
       (role_id, resource_type, resource_id, permission, granted, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (role_id, resource_type, resource_id, permission) DO UPDATE SET
       granted = EXCLUDED.granted,
       created_at = EXCLUDED.created_at`,
      [roleId, resourceType, resourceId || null, permission, granted],
    );

    this.invalidateCache();
  }

  async revokeResourcePermission(
    roleId: string,
    resourceType: ResourceType,
    resourceId: string | undefined,
    permission: Permission,
  ): Promise<void> {
    await query(
      `DELETE FROM rbac_resource_permissions 
       WHERE role_id = $1 AND resource_type = $2 
       AND resource_id = $3 AND permission = $4`,
      [roleId, resourceType, resourceId || null, permission],
    );

    this.invalidateCache();
  }

  async checkResourcePermission(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    permission: Permission,
  ): Promise<boolean> {
    // 首先检查基础权限
    const hasBasePerm = await this.hasPermission(userId, permission);
    if (!hasBasePerm) return false;

    // 检查资源级权限
    const roles = await this.getUserRoles(userId);

    for (const role of roles) {
      // 检查特定资源的权限
      const specificResult = await query(
        `SELECT granted FROM rbac_resource_permissions
         WHERE role_id = $1 AND resource_type = $2 
         AND resource_id = $3 AND permission = $4`,
        [role.id, resourceType, resourceId, permission],
      );

      if (specificResult.rows.length > 0) {
        return Boolean(specificResult.rows[0]?.granted);
      }

      // 检查资源类型的通用权限
      const genericResult = await query(
        `SELECT granted FROM rbac_resource_permissions
         WHERE role_id = $1 AND resource_type = $2 
         AND resource_id IS NULL AND permission = $3`,
        [role.id, resourceType, permission],
      );

      if (genericResult.rows.length > 0) {
        return Boolean(genericResult.rows[0]?.granted);
      }
    }

    // 如果没有特定的资源权限限制，默认允许
    return true;
  }

  // ============================================================================
  // 上下文获取
  // ============================================================================

  async getRBACContext(userId: string): Promise<RBACContext> {
    const [roles, permissions] = await Promise.all([
      this.getUserRoles(userId),
      this.getUserPermissions(userId),
    ]);

    return {
      userId,
      roles: roles.map((r) => r.name),
      permissions,
      isAdmin: permissions.includes('system:admin'),
    };
  }

  // ============================================================================
  // 缓存管理
  // ============================================================================

  private getCachedPermissions(userId: string): Permission[] | null {
    const expiry = this.cacheExpiry.get(userId);
    if (!expiry || Date.now() > expiry) {
      return null;
    }
    return this.permissionCache.get(userId) || null;
  }

  private cachePermissions(userId: string, permissions: Permission[]): void {
    this.permissionCache.set(userId, permissions);
    this.cacheExpiry.set(userId, Date.now() + this.CACHE_TTL);
  }

  private clearUserCache(userId: string): void {
    this.permissionCache.delete(userId);
    this.cacheExpiry.delete(userId);
  }

  private invalidateCache(): void {
    this.permissionCache.clear();
    this.cacheExpiry.clear();
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private mapRoleFromDb(row: Record<string, unknown>): Role {
    return {
      id: String(row.id),
      name: String(row.name),
      description: row.description ? String(row.description) : undefined,
      permissions: Array.isArray(row.permissions) ? (row.permissions as Permission[]) : [],
      isSystem: Boolean(row.is_system),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    };
  }
}

// ============================================================================
// 权限拒绝错误
// ============================================================================

export class PermissionDeniedError extends Error {
  permission: Permission;

  constructor(permission: Permission) {
    super(`Permission denied: ${permission}`);
    this.name = 'PermissionDeniedError';
    this.permission = permission;
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

export const rbac = RBACManager.getInstance();

export async function requirePermission(userId: string, permission: Permission): Promise<void> {
  return rbac.checkPermission(userId, permission);
}

export async function requireAnyPermission(
  userId: string,
  permissions: Permission[],
): Promise<void> {
  const hasPerm = await rbac.hasAnyPermission(userId, permissions);
  if (!hasPerm) {
    const firstPerm = permissions[0];
    if (firstPerm) {
      throw new PermissionDeniedError(firstPerm);
    } else {
      throw new PermissionDeniedError('unknown' as Permission);
    }
  }
}

export async function getUserRBACContext(userId: string): Promise<RBACContext> {
  return rbac.getRBACContext(userId);
}

// ============================================================================
// 中间件
// ============================================================================

export function createPermissionMiddleware(permission: Permission) {
  return async (userId: string): Promise<void> => {
    await requirePermission(userId, permission);
  };
}

export function createResourcePermissionMiddleware(
  resourceType: ResourceType,
  getResourceId: (context: Record<string, unknown>) => string,
) {
  return async (userId: string, context: Record<string, unknown>): Promise<void> => {
    const resourceId = getResourceId(context);
    const hasPerm = await rbac.checkResourcePermission(
      userId,
      resourceType,
      resourceId,
      `${resourceType}:read` as Permission,
    );

    if (!hasPerm) {
      throw new PermissionDeniedError(`${resourceType}:read` as Permission);
    }
  };
}
