import { Types } from 'mongoose';
import { createMethods, logger } from '@librechat/data-schemas';
import {
  CacheKeys,
  AccessRoleIds,
  PermissionBits,
  PrincipalType,
  ResourceType,
} from 'librechat-data-provider';
import type { AllMethods, IAclEntry } from '@librechat/data-schemas';
import type { ClientSession, DeleteResult } from 'mongoose';

import type { ResolvedPrincipal } from '~/types/principal';
import { userPrincipalsCache } from '~/cache';

export class AccessControlService {
  private _dbMethods: AllMethods;

  constructor(mongoose: typeof import('mongoose')) {
    this._dbMethods = createMethods(mongoose, {
      getCache: (key) => (key === CacheKeys.USER_PRINCIPALS ? userPrincipalsCache() : undefined),
    });
  }

  /**
   * Grant a permission to a principal for a resource using a role
   * @param {Object} params - Parameters for granting role-based permission
   * @param {string} params.principalType - PrincipalType.USER, PrincipalType.GROUP, or PrincipalType.PUBLIC
   * @param {string|mongoose.Types.ObjectId|null} params.principalId - The ID of the principal (null for PrincipalType.PUBLIC)
   * @param {string} params.resourceType - Type of resource (e.g., 'agent')
   * @param {string|mongoose.Types.ObjectId} params.resourceId - The ID of the resource
   * @param {string} params.accessRoleId - The ID of the role (e.g., AccessRoleIds.AGENT_VIEWER, AccessRoleIds.AGENT_EDITOR)
   * @param {Types.ObjectId} params.grantedBy - User ID granting the permission
   * @param {ClientSession} [params.session] - Optional MongoDB session for transactions
   * @param {Date} [params.expiredAt] - Optional expiration for resource-tied permissions
   * @returns {Promise<IAclEntry>} The created or updated ACL entry
   */
  public async grantPermission(args: {
    principalType: PrincipalType;
    principalId: string | Types.ObjectId | null;
    resourceType: string;
    resourceId: string | Types.ObjectId;
    accessRoleId: AccessRoleIds;

    grantedBy?: string | Types.ObjectId;
    session?: ClientSession;
    roleId?: string | Types.ObjectId;
    expiredAt?: Date;
  }): Promise<IAclEntry | null> {
    const {
      principalType,
      principalId,
      resourceType,
      resourceId,
      accessRoleId,
      grantedBy,
      session,
      expiredAt,
    } = args;
    try {
      if (!Object.values(PrincipalType).includes(principalType)) {
        throw new Error(`Invalid principal type: ${principalType}`);
      }

      if (principalType !== PrincipalType.PUBLIC && !principalId) {
        throw new Error('Principal ID is required for user, group, and role principals');
      }

      // Validate principalId based on type
      if (principalId && principalType === PrincipalType.ROLE) {
        // Role IDs are strings (role names)
        if (typeof principalId !== 'string' || principalId.trim().length === 0) {
          throw new Error(`Invalid role ID: ${principalId}`);
        }
      } else if (
        principalType &&
        principalType !== PrincipalType.PUBLIC &&
        (!principalId || !Types.ObjectId.isValid(principalId))
      ) {
        // User and Group IDs must be valid ObjectIds
        throw new Error(`Invalid principal ID: ${principalId}`);
      }

      if (!resourceId || !Types.ObjectId.isValid(resourceId)) {
        throw new Error(`Invalid resource ID: ${resourceId}`);
      }

      this.validateResourceType(resourceType as ResourceType);

      // Get the role to determine permission bits
      const role = await this._dbMethods.findRoleByIdentifier(accessRoleId);
      if (!role) {
        throw new Error(`Role ${accessRoleId} not found`);
      }

      // Ensure the role is for the correct resource type
      if (role.resourceType !== resourceType) {
        throw new Error(
          `Role ${accessRoleId} is for ${role.resourceType} resources, not ${resourceType}`,
        );
      }
      return await this._dbMethods.grantPermission(
        principalType,
        principalId,
        resourceType,
        resourceId,
        role.permBits,
        grantedBy,
        session,
        role._id,
        expiredAt,
      );
    } catch (error) {
      logger.error(
        `[PermissionService.grantPermission] Error: ${error instanceof Error ? error.message : ''}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find all resources of a specific type that a user has access to with specific permission bits
   * @param {Object} params - Parameters for finding accessible resources
   * @param {string | Types.ObjectId} params.userId - The ID of the user
   * @param {string} [params.role] - Optional user role (if not provided, will query from DB)
   * @param {string} params.resourceType - Type of resource (e.g., 'agent')
   * @param {number} params.requiredPermissions - The minimum permission bits required (e.g., 1 for VIEW, 3 for VIEW+EDIT)
   * @param {Types.ObjectId[]} [params.resourceIds] - Optional candidate bound; only these
   *   resources are considered, so the query cost scales with the candidate set
   * @returns {Promise<Array>} Array of resource IDs
   */
  public async findAccessibleResources({
    userId,
    role,
    resourceType,
    requiredPermissions,
    resourceIds,
  }: {
    userId: string | Types.ObjectId;
    role?: string;
    resourceType: string;
    requiredPermissions: number;
    resourceIds?: Types.ObjectId[];
  }): Promise<Types.ObjectId[]> {
    try {
      const principalsList = await this.getUserPrincipals({ userId, role });
      return await this.findAccessibleResourcesForPrincipals({
        principalsList,
        resourceType,
        requiredPermissions,
        resourceIds,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`[PermissionService.findAccessibleResources] Error: ${error.message}`);
        // Re-throw validation errors
        if (error.message.includes('requiredPermissions must be')) {
          throw error;
        }
      }
      return [];
    }
  }

  public async getUserPrincipals({
    userId,
    role,
  }: {
    userId: string | Types.ObjectId;
    role?: string;
  }): Promise<ResolvedPrincipal[]> {
    return await this._dbMethods.getUserPrincipals({ userId, role });
  }

  public async findAccessibleResourcesForPrincipals({
    principalsList,
    resourceType,
    requiredPermissions,
    resourceIds,
  }: {
    principalsList: ResolvedPrincipal[];
    resourceType: string;
    requiredPermissions: number;
    resourceIds?: Types.ObjectId[];
  }): Promise<Types.ObjectId[]> {
    try {
      if (typeof requiredPermissions !== 'number' || requiredPermissions < 1) {
        throw new Error('requiredPermissions must be a positive number');
      }

      this.validateResourceType(resourceType as ResourceType);

      if (principalsList.length === 0) {
        return [];
      }

      return await this._dbMethods.findAccessibleResources(
        principalsList,
        resourceType,
        requiredPermissions,
        resourceIds,
      );
    } catch (error) {
      if (error instanceof Error) {
        logger.error(
          `[PermissionService.findAccessibleResourcesForPrincipals] Error: ${error.message}`,
        );
        if (error.message.includes('requiredPermissions must be')) {
          throw error;
        }
      }
      return [];
    }
  }

  /**
   * Find all publicly accessible resources of a specific type
   * @param {Object} params - Parameters for finding publicly accessible resources
   * @param {ResourceType} params.resourceType - Type of resource (e.g., 'agent')
   * @param {number} params.requiredPermissions - The minimum permission bits required (e.g., 1 for VIEW, 3 for VIEW+EDIT)
   * @param {Types.ObjectId[]} [params.resourceIds] - Optional candidate bound; only these
   *   resources are considered, so the query cost scales with the candidate set
   * @returns {Promise<Types.ObjectId[]>} Array of resource IDs
   */
  public async findPubliclyAccessibleResources({
    resourceType,
    requiredPermissions,
    resourceIds,
  }: {
    resourceType: ResourceType;
    requiredPermissions: number;
    resourceIds?: Types.ObjectId[];
  }): Promise<Types.ObjectId[]> {
    try {
      if (typeof requiredPermissions !== 'number' || requiredPermissions < 1) {
        throw new Error('requiredPermissions must be a positive number');
      }

      this.validateResourceType(resourceType);

      return await this._dbMethods.findPublicResourceIds(
        resourceType,
        requiredPermissions,
        resourceIds,
      );
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`[PermissionService.findPubliclyAccessibleResources] Error: ${error.message}`);
        // Re-throw validation errors
        if (error.message.includes('requiredPermissions must be')) {
          throw error;
        }
      }
      return [];
    }
  }

  /**
   * Get effective permissions for multiple resources in a batch operation
   * Returns map of resourceId → effectivePermissionBits
   *
   * @param {Object} params - Parameters
   * @param {string|mongoose.Types.ObjectId} params.userId - User ID
   * @param {string} [params.role] - User role (for group membership)
   * @param {string} params.resourceType - Resource type (must be valid ResourceType)
   * @param {Array<mongoose.Types.ObjectId>} params.resourceIds - Array of resource IDs
   * @returns {Promise<Map<string, number>>} Map of resourceId string → permission bits
   * @throws {Error} If resourceType is invalid
   */
  public async getResourcePermissionsMap({
    userId,
    role,
    resourceType,
    resourceIds,
  }: {
    userId: string | Types.ObjectId;
    role: string;
    resourceType: ResourceType;
    resourceIds: (string | Types.ObjectId)[];
  }): Promise<Map<string, number>> {
    // Validate resource type - throw on invalid type
    this.validateResourceType(resourceType);

    // Handle empty input
    if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
      return new Map();
    }

    let principals: ResolvedPrincipal[];
    try {
      principals = await this._dbMethods.getUserPrincipals({ userId, role });
    } catch (error) {
      if (error instanceof Error) {
        logger.error(
          `[PermissionService.getResourcePermissionsMap] Error resolving principals: ${error.message}`,
          error,
        );
      }
      throw error;
    }
    return await this.getResourcePermissionsMapForPrincipals({
      principalsList: principals,
      resourceType,
      resourceIds,
    });
  }

  public async getResourcePermissionsMapForPrincipals({
    principalsList,
    resourceType,
    resourceIds,
  }: {
    principalsList: ResolvedPrincipal[];
    resourceType: ResourceType;
    resourceIds: (string | Types.ObjectId)[];
  }): Promise<Map<string, number>> {
    this.validateResourceType(resourceType);
    if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
      return new Map();
    }

    try {
      const permissionsMap = await this._dbMethods.getEffectivePermissionsForResources(
        principalsList,
        resourceType,
        resourceIds,
      );

      logger.debug(
        `[PermissionService.getResourcePermissionsMapForPrincipals] Computed permissions for ${resourceIds.length} resources, ${permissionsMap.size} have permissions`,
      );

      return permissionsMap;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(
          `[PermissionService.getResourcePermissionsMapForPrincipals] Error: ${error.message}`,
          error,
        );
      }
      throw error;
    }
  }

  /**
   * Remove all permissions for a resource (cleanup when resource is deleted)
   * @param {Object} params - Parameters for removing all permissions
   * @param {string} params.resourceType - Type of resource (e.g., 'agent', 'prompt')
   * @param {string|mongoose.Types.ObjectId} params.resourceId - The ID of the resource
   * @returns {Promise<DeleteResult>} Result of the deletion operation
   */
  public async removeAllPermissions({
    resourceType,
    resourceId,
  }: {
    resourceType: ResourceType;
    resourceId: string | Types.ObjectId;
  }): Promise<DeleteResult> {
    try {
      this.validateResourceType(resourceType);

      if (!resourceId || !Types.ObjectId.isValid(resourceId)) {
        throw new Error(`Invalid resource ID: ${resourceId}`);
      }

      const result = await this._dbMethods.deleteAclEntries({
        resourceType,
        resourceId,
      });

      return result;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`[PermissionService.removeAllPermissions] Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if a user has specific permission bits on a resource
   * @param {Object} params - Parameters for checking permissions
   * @param {string|mongoose.Types.ObjectId} params.userId - The ID of the user
   * @param {string} [params.role] - Optional user role (if not provided, will query from DB)
   * @param {string} params.resourceType - Type of resource (e.g., 'agent')
   * @param {string|mongoose.Types.ObjectId} params.resourceId - The ID of the resource
   * @param {number} params.requiredPermissions - The permission bits required (e.g., 1 for VIEW, 3 for VIEW+EDIT)
   * @returns {Promise<boolean>} Whether the user has the required permission bits
   */
  public async checkPermission({
    userId,
    role,
    resourceType,
    resourceId,
    requiredPermission,
  }: {
    userId: string;
    role?: string | null;
    resourceType: ResourceType;
    resourceId: string | Types.ObjectId;
    requiredPermission: number;
  }): Promise<boolean> {
    try {
      if (typeof requiredPermission !== 'number' || requiredPermission < 1) {
        throw new Error('requiredPermission must be a positive number');
      }

      this.validateResourceType(resourceType);

      // Get all principals for the user (user + groups + public)
      const principals = await this._dbMethods.getUserPrincipals({ userId, role });

      if (principals.length === 0) {
        return false;
      }

      return await this._dbMethods.hasPermission(
        principals,
        resourceType,
        resourceId,
        requiredPermission,
      );
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`[PermissionService.checkPermission] Error: ${error.message}`);
        // Re-throw validation errors
        if (error.message.includes('requiredPermission must be')) {
          throw error;
        }
      }
      return false;
    }
  }

  /**
   * Check if a resource has a PUBLIC AclEntry (accessible to everyone).
   * Unlike checkPermission, this does not require a user context.
   */
  public async hasPublicAccess({
    resourceType,
    resourceId,
  }: {
    resourceType: ResourceType;
    resourceId: string | Types.ObjectId;
  }): Promise<boolean> {
    try {
      this.validateResourceType(resourceType);
      return await this._dbMethods.hasPermission(
        [{ principalType: PrincipalType.PUBLIC }],
        resourceType,
        resourceId,
        PermissionBits.VIEW,
      );
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`[PermissionService.hasPublicAccess] Error: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Validates that the resourceType is one of the supported enum values
   * @param {string} resourceType - The resource type to validate
   * @throws {Error} If resourceType is not valid
   */
  private validateResourceType(resourceType: ResourceType): void {
    const validTypes = Object.values(ResourceType);
    if (!validTypes.includes(resourceType)) {
      throw new Error(
        `Invalid resourceType: ${resourceType}. Valid types: ${validTypes.join(', ')}`,
      );
    }
  }

  /**
   * Brand compat shim (brand-09): the deployed `librechat-dev` runtime image is
   * newer than this source base and its PermissionsController calls these two
   * methods. `bulkUpdateResourcePermissions` mirrors upstream semantics over the
   * pre-evolution primitives; insights tracking did not exist at this base, so
   * `insightsChanges` is always `[]` (documented gap — the insights Roles UI is
   * degraded until the next upstream rebase; chat/share/agent flows unaffected).
   */
  public async bulkUpdateResourcePermissions({
    resourceType,
    resourceId,
    updatedPrincipals = [],
    revokedPrincipals = [],
    grantedBy,
    session,
  }: {
    resourceType: ResourceType;
    resourceId: string | Types.ObjectId;
    updatedPrincipals?: Array<{
      type: PrincipalType;
      id?: string | Types.ObjectId | null;
      accessRoleId?: string;
    }>;
    revokedPrincipals?: Array<{ type: PrincipalType; id?: string | Types.ObjectId | null }>;
    grantedBy: string | Types.ObjectId;
    session?: ClientSession;
  }): Promise<{
    granted: unknown[];
    updated: unknown[];
    revoked: unknown[];
    insightsChanges: unknown[];
    errors: Array<{ principal: unknown; error: string }>;
  }> {
    if (!Array.isArray(updatedPrincipals)) {
      throw new Error('updatedPrincipals must be an array');
    }
    if (!Array.isArray(revokedPrincipals)) {
      throw new Error('revokedPrincipals must be an array');
    }
    if (!resourceId || !Types.ObjectId.isValid(resourceId)) {
      throw new Error(`Invalid resource ID: ${resourceId}`);
    }
    this.validateResourceType(resourceType);

    const results: {
      granted: unknown[];
      updated: unknown[];
      revoked: unknown[];
      insightsChanges: unknown[];
      errors: Array<{ principal: unknown; error: string }>;
    } = { granted: [], updated: [], revoked: [], insightsChanges: [], errors: [] };

    const principalKey = (type: PrincipalType, id: unknown) =>
      type === PrincipalType.PUBLIC ? `${type}:null` : `${type}:${String(id)}`;

    // Grant wins over revoke for the same non-public principal (mirrors upstream);
    // an explicit PUBLIC disable always wins.
    const grantedKeys = new Set<string>();
    const lastUpdateIndex = new Map<string, number>();
    updatedPrincipals.forEach((principal, index) => {
      if (principal?.type == null) {
        return;
      }
      lastUpdateIndex.set(principalKey(principal.type, principal.id), index);
    });
    const effectiveUpdated = updatedPrincipals.filter(
      (principal, index) =>
        principal?.type == null ||
        lastUpdateIndex.get(principalKey(principal.type, principal.id)) === index,
    );
    for (const principal of effectiveUpdated) {
      if (principal?.type != null) {
        grantedKeys.add(principalKey(principal.type, principal.id));
      }
    }

    let currentEntries: IAclEntry[] = [];
    try {
      currentEntries = await this._dbMethods.findEntriesByResource(resourceType, resourceId);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`[PermissionService.bulkUpdateResourcePermissions] Error: ${error.message}`);
      }
      throw error;
    }
    const currentKeys = new Set(
      currentEntries.map((entry) =>
        principalKey(
          entry.principalType as PrincipalType,
          entry.principalId == null ? null : String(entry.principalId),
        ),
      ),
    );

    const queryPrincipalId = (type: PrincipalType, id: unknown) => {
      if (type === PrincipalType.ROLE) {
        if (typeof id !== 'string' || id.trim().length === 0) {
          throw new Error(`Invalid role ID: ${String(id)}`);
        }
        return id;
      }
      const str = id?.toString() ?? '';
      if (!str || !Types.ObjectId.isValid(str)) {
        throw new Error(`Invalid principal ID: ${String(id)}`);
      }
      return new Types.ObjectId(str);
    };

    for (const principal of effectiveUpdated) {
      try {
        if (principal?.type == null) {
          results.errors.push({ principal, error: 'principal type is required' });
          continue;
        }
        if (!principal.accessRoleId) {
          results.errors.push({ principal, error: 'accessRoleId is required' });
          continue;
        }
        const role = await this._dbMethods.findRoleByIdentifier(principal.accessRoleId);
        if (!role) {
          results.errors.push({ principal, error: `Role ${principal.accessRoleId} not found` });
          continue;
        }
        await this.grantPermission({
          principalType: principal.type,
          principalId:
            principal.type === PrincipalType.PUBLIC
              ? null
              : (queryPrincipalId(principal.type, principal.id) as Types.ObjectId),
          resourceType,
          resourceId,
          accessRoleId: principal.accessRoleId,
          grantedBy,
          session,
        });
        const key = principalKey(principal.type, principal.id);
        if (currentKeys.has(key)) {
          results.updated.push(principal);
        } else {
          results.granted.push(principal);
          currentKeys.add(key);
        }
      } catch (error) {
        results.errors.push({
          principal,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    for (const principal of revokedPrincipals) {
      try {
        if (principal?.type == null) {
          continue;
        }
        const key = principalKey(principal.type, principal.id);
        if (grantedKeys.has(key) && principal.type !== PrincipalType.PUBLIC) {
          continue;
        }
        const filter: Record<string, unknown> = { principalType: principal.type, resourceType, resourceId };
        if (principal.type !== PrincipalType.PUBLIC) {
          filter.principalId = queryPrincipalId(principal.type, principal.id);
        }
        const res = await this._dbMethods.deleteAclEntries(filter);
        if ((res?.deletedCount ?? 0) > 0) {
          results.revoked.push(principal);
        }
      } catch (error) {
        results.errors.push({
          principal,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Brand compat shim (brand-09): insights permission tracking is post-base
   * upstream evolution; there is nothing to restore on this base.
   */
  public async restoreInsightsPermissionChanges(_args: {
    resourceType: ResourceType;
    resourceId: string | Types.ObjectId;
    changes: unknown[];
  }): Promise<unknown[]> {
    return [];
  }
}
