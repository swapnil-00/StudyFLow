// lib/authorize.js — Role-Based Access Control (RBAC) & Branch Scoping (SEC-008, SEC-009)
'use strict';
const { HttpError } = require('./errors');

/**
 * Role hierarchy & permissions:
 * - owner: full access to everything across all branches, settings, plans, staff management, destructive actions.
 * - manager: operational access across assigned branches; cannot manage billing plans, settings, or delete staff.
 * - staff: operational read/write within assigned branch(es) only. Cannot access settings, plans, staff management, or destructive deletes.
 */

const PERMISSIONS = {
  owner: {
    '*': ['*'],
  },
  manager: {
    branches: ['read'],
    floors: ['read', 'create', 'update'],
    rooms: ['read', 'create', 'update'],
    seats: ['read', 'create', 'update', 'batch_update'],
    students: ['read', 'create', 'update'],
    memberships: ['read', 'create', 'update'],
    seat_assignments: ['read', 'create', 'release', 'transfer'],
    bookings: ['read', 'create', 'renew'],
    payments: ['read', 'create'],
    expenses: ['read', 'create', 'update'],
    notifications: ['read', 'create', 'update'],
    activity_logs: ['read', 'create'],
    communication_logs: ['read', 'create'],
    waitlist: ['read', 'create', 'update', 'delete'],
    staff: ['read'],
    documents: ['read', 'create', 'update'],
    settings: ['read'],
  },
  staff: {
    branches: ['read'],
    floors: ['read'],
    rooms: ['read'],
    seats: ['read'],
    students: ['read', 'create', 'update'],
    memberships: ['read', 'create'],
    seat_assignments: ['read', 'create', 'release', 'transfer'],
    bookings: ['read', 'create', 'renew'],
    payments: ['read', 'create'],
    expenses: ['read', 'create'],
    notifications: ['read', 'create', 'update'],
    activity_logs: ['read', 'create'],
    communication_logs: ['read', 'create'],
    waitlist: ['read', 'create', 'update'],
    staff: [],
    documents: ['read', 'create', 'update'],
    settings: [],
  }
};

/**
 * Normalizes mutation action verbs to canonical permission verbs.
 * e.g. insert, save, batch_insert -> create
 *      update, markRead, batch_update_positions -> update
 */
function normalizeAction(action) {
  switch (action) {
    case 'insert':
    case 'save':
    case 'batch_insert':
      return 'create';
    case 'update':
    case 'markRead':
    case 'batch_update_positions':
    case 'batch_update':
    case 'set_status':
      return 'update';
    default:
      return action;
  }
}

/**
 * Check if a role has permission to perform an action on a resource.
 * @param {string} role - 'owner' | 'manager' | 'staff'
 * @param {string} resource - Table/entity name (e.g. 'students', 'settings')
 * @param {string} action - 'read' | 'create' | 'update' | 'delete' | '*' or action verbs
 * @returns {boolean}
 */
function can(role, resource, action) {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;

  // Owner wildcard
  if (rolePerms['*'] && (rolePerms['*'].includes('*') || rolePerms['*'].includes(action))) {
    return true;
  }

  const allowedActions = rolePerms[resource];
  if (!allowedActions) return false;

  const normalized = normalizeAction(action);
  return allowedActions.includes('*') ||
         allowedActions.includes(action) ||
         allowedActions.includes(normalized) ||
         (action === 'batch_update_positions' && allowedActions.includes('batch_update'));
}

/**
 * Asserts permission, throwing 403 HttpError if denied.
 */
function assertCan(session, resource, action) {
  const role = typeof session === 'string' ? session : (session?.role || 'staff');
  if (!can(role, resource, action)) {
    throw new HttpError(403, 'FORBIDDEN', `Role '${role}' is not authorized to ${action} ${resource}`);
  }
}

/**
 * Asserts that the caller's session has access to a specific branch.
 * Owners have access to all branches.
 * Managers and staff must have the branchId in their branchIds list.
 * @param {Object} session - { role, branchIds, orgId, userId }
 * @param {string} branchId - The branch to check
 */
function assertBranchAccess(session, branchId) {
  if (!session) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication required');
  }

  // Owner has universal branch access
  if (session.role === 'owner') {
    return;
  }

  if (!branchId) {
    return; // Non-branch-scoped resource
  }

  const userBranches = Array.isArray(session.branchIds) ? session.branchIds : [];
  if (!userBranches.includes(branchId)) {
    throw new HttpError(403, 'BRANCH_ACCESS_DENIED', `Access to branch '${branchId}' is not permitted for your account.`);
  }
}

module.exports = {
  can,
  assertCan,
  assertBranchAccess,
  PERMISSIONS,
};
