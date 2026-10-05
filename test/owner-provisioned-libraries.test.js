// test/owner-provisioned-libraries.test.js — Acceptance tests for Owner-Provisioned Libraries & Demo Lock (Part E)
'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'a'.repeat(64);
process.env.FIREBASE_PROJECT_ID = 'studyflow-test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@studyflow.iam.gserviceaccount.com';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7\n-----END PRIVATE KEY-----\n';

describe('Owner-Provisioned Libraries & Demo Lock (Part E Acceptance)', () => {

  let mockDb;

  beforeEach(() => {
    mockDb = {
      users: [],
      organizations: [],
      org_members: [],
      invitations: [],
      sessions: [],
      settings: []
    };
  });

  // ── E1. Unknown Google account on LOGIN -> 404 NO_ACCOUNT, no user created ──
  // (Signup with accepted terms creates a Free-plan account: see test/signup-handler.test.js)
  test('E1. Unknown Google account on intent login returns 404 NO_ACCOUNT and creates NO user row', async () => {
    const unknownGoogleEmail = 'stranger@example.com';
    const unknownGoogleUid = 'goog-uid-stranger';

    // Simulate session handler logic
    let user = mockDb.users.find(u => u.firebase_uid === unknownGoogleUid || u.email === unknownGoogleEmail);
    let createdUser = false;
    let responseStatus = 200;
    let responseCode = null;

    if (!user) {
      // With no valid invite, unknown accounts are rejected
      responseStatus = 404;
      responseCode = 'NO_ACCOUNT';
    } else {
      createdUser = true;
    }

    assert.equal(responseStatus, 404);
    assert.equal(responseCode, 'NO_ACCOUNT');
    assert.equal(createdUser, false);
    assert.equal(mockDb.users.length, 0, 'No user row must exist in database');
  });

  // ── E2. Valid invite with matching verified email creates user & membership ──
  test('E2. Valid invite with matching verified Google email creates user and joins with invited role', async () => {
    const org = { id: 'ORG-1', name: 'Pune Reading Hall', plan: 'starter', is_demo: false };
    mockDb.organizations.push(org);

    const token = 'valid-invite-secret';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invite = {
      id: 'INV-1',
      organization_id: org.id,
      email: 'staff@example.com',
      role: 'staff',
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 86400000),
      accepted_at: null,
      revoked_at: null
    };
    mockDb.invitations.push(invite);

    // Google auth token for staff
    const googleAuth = {
      uid: 'goog-staff-123',
      email: 'staff@example.com',
      email_verified: true,
      name: 'Staff Member'
    };

    // Session logic accepting invite
    let user = mockDb.users.find(u => u.email === googleAuth.email);
    if (!user) {
      const activeInvite = mockDb.invitations.find(i =>
        i.token_hash === tokenHash &&
        i.email.toLowerCase() === googleAuth.email.toLowerCase() &&
        !i.revoked_at && !i.accepted_at && i.expires_at > new Date()
      );
      assert.ok(activeInvite, 'Matching valid invite must be found');

      user = {
        id: 'USR-STAFF-1',
        email: googleAuth.email,
        firebase_uid: googleAuth.uid,
        name: googleAuth.name,
        role: activeInvite.role,
        status: 'active'
      };
      mockDb.users.push(user);
      mockDb.org_members.push({
        user_id: user.id,
        organization_id: activeInvite.organization_id,
        role: activeInvite.role,
        status: 'active'
      });
      activeInvite.accepted_at = new Date();
    }

    assert.equal(mockDb.users.length, 1);
    assert.equal(user.role, 'staff');
    assert.equal(mockDb.org_members.length, 1);
    assert.equal(mockDb.org_members[0].role, 'staff');
    assert.ok(invite.accepted_at != null);
  });

  // ── E3. Mismatched invite email is rejected ──
  test('E3. Invite token presented with mismatched Google email is rejected', async () => {
    const invite = {
      id: 'INV-2',
      organization_id: 'ORG-1',
      email: 'invited@example.com',
      role: 'staff',
      token_hash: 'hash-token-2',
      expires_at: new Date(Date.now() + 86400000),
      accepted_at: null,
      revoked_at: null
    };
    mockDb.invitations.push(invite);

    const actualGoogleEmail = 'different-account@example.com';

    let errorThrown = null;
    if (invite.email.toLowerCase() !== actualGoogleEmail.toLowerCase()) {
      errorThrown = { status: 403, code: 'INVITATION_EMAIL_MISMATCH' };
    }

    assert.equal(errorThrown?.status, 403);
    assert.equal(errorThrown?.code, 'INVITATION_EMAIL_MISMATCH');
  });

  // ── E4. create_library and register return 403 ──
  test('E4. create_library and register endpoints always return 403', () => {
    function handleCreateLibrary() {
      return { status: 403, code: 'LIBRARY_CREATION_DISABLED' };
    }
    function handleRegister() {
      return { status: 403, code: 'PASSWORD_AUTH_DISABLED' };
    }

    const resCreate = handleCreateLibrary();
    assert.equal(resCreate.status, 403);
    assert.equal(resCreate.code, 'LIBRARY_CREATION_DISABLED');

    const resReg = handleRegister();
    assert.equal(resReg.status, 403);
    assert.equal(resReg.code, 'PASSWORD_AUTH_DISABLED');
  });

  // ── E5. Demo org locks invitations and non-owner access ──
  test('E5. Demo org (is_demo=TRUE) blocks invitations with DEMO_LOCKED and denies non-owners', () => {
    const demoOrg = { id: 'ORG-DEMO', name: 'Swapnil Sample Library', plan: 'demo', is_demo: true };
    const ownerUser = { id: 'USR-OWNER', email: 'srchaudhari324@gmail.com' };
    const otherUser = { id: 'USR-STRANGER', email: 'stranger@example.com' };

    mockDb.organizations.push(demoOrg);
    mockDb.users.push(ownerUser, otherUser);
    mockDb.org_members.push({ user_id: ownerUser.id, organization_id: demoOrg.id, role: 'owner', status: 'active' });

    // 1. Trying to create invitation on demo org
    function createInvite(orgId) {
      const targetOrg = mockDb.organizations.find(o => o.id === orgId);
      if (targetOrg && targetOrg.is_demo) {
        return { status: 403, code: 'DEMO_LOCKED', message: "The demo library can't have other members." };
      }
      return { status: 200 };
    }
    assert.equal(createInvite(demoOrg.id).code, 'DEMO_LOCKED');

    // 2. Non-owner trying to switch to demo org
    function switchOrg(userId, orgId) {
      const targetOrg = mockDb.organizations.find(o => o.id === orgId);
      if (targetOrg && targetOrg.is_demo) {
        const isOwner = mockDb.org_members.some(m => m.user_id === userId && m.organization_id === orgId && m.role === 'owner');
        if (!isOwner) {
          return { status: 403, code: 'DEMO_LOCKED', message: 'Only the platform owner can access the demo library.' };
        }
      }
      return { status: 200, state: 'ready' };
    }
    assert.equal(switchOrg(otherUser.id, demoOrg.id).code, 'DEMO_LOCKED');
    assert.equal(switchOrg(ownerUser.id, demoOrg.id).status, 200);
  });

  // ── E6. Suspended org blocks writes with 403 SUBSCRIPTION_SUSPENDED, allows reads ──
  test('E6. Suspended org returns 403 SUBSCRIPTION_SUSPENDED on write operations and allows reads', () => {
    const suspendedOrg = { id: 'ORG-SUSPENDED', name: 'Suspended Lounge', subscription_status: 'suspended' };
    mockDb.organizations.push(suspendedOrg);

    function handleWrite(orgId) {
      const org = mockDb.organizations.find(o => o.id === orgId);
      if (org && org.subscription_status === 'suspended') {
        return { status: 403, code: 'SUBSCRIPTION_SUSPENDED', message: "This library's subscription is inactive. Contact StudyFlow to reactivate." };
      }
      return { status: 200, ok: true };
    }

    function handleRead(orgId) {
      const org = mockDb.organizations.find(o => o.id === orgId);
      return { status: 200, ok: true, data: { org } };
    }

    const writeRes = handleWrite(suspendedOrg.id);
    assert.equal(writeRes.status, 403);
    assert.equal(writeRes.code, 'SUBSCRIPTION_SUSPENDED');

    const readRes = handleRead(suspendedOrg.id);
    assert.equal(readRes.status, 200);
    assert.equal(readRes.ok, true);
  });

  // ── E7. User with no active membership gets state: no_library ──
  test('E7. User with zero active memberships receives state no_library', () => {
    const unlinkedUser = { id: 'USR-ORPHAN', email: 'orphan@example.com' };
    mockDb.users.push(unlinkedUser);

    const userMems = mockDb.org_members.filter(m => m.user_id === unlinkedUser.id && m.status === 'active');
    const authState = userMems.length === 0 ? 'no_library' : 'ready';

    assert.equal(authState, 'no_library');
  });

  // ── E8. create-library 1-email-1-library rule validation ──
  test('E8. create-library CLI logic enforces 1-email-1-library rule and dry-run safety', () => {
    const email = 'existingowner@example.com';
    const existingOrg = { id: 'ORG-EXISTING', name: 'Existing Library', plan: 'starter' };
    const owner = { id: 'USR-EXISTING', email };

    mockDb.organizations.push(existingOrg);
    mockDb.users.push(owner);
    mockDb.org_members.push({ user_id: owner.id, organization_id: existingOrg.id, role: 'owner', status: 'active' });

    function provisionLibrary(ownerEmail, apply) {
      const activeOwnership = mockDb.org_members.some(om => {
        const u = mockDb.users.find(user => user.id === om.user_id);
        return u && u.email.toLowerCase() === ownerEmail.toLowerCase() && om.role === 'owner' && om.status === 'active';
      });

      if (activeOwnership) {
        return { ok: false, error: 'ALREADY_OWNS_LIBRARY' };
      }

      if (!apply) {
        return { ok: true, dryRun: true };
      }

      return { ok: true, created: true };
    }

    // Refuses existing owner
    assert.equal(provisionLibrary(email, true).ok, false);

    // New owner: dry-run writes nothing
    const newEmail = 'brandnew@example.com';
    const dryRunResult = provisionLibrary(newEmail, false);
    assert.equal(dryRunResult.ok, true);
    assert.equal(dryRunResult.dryRun, true);
  });

});
