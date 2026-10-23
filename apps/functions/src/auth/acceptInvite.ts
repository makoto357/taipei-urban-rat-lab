import {
  AuditLogConverter,
  type Membership,
  MembershipConverter,
  OfficialInviteConverter,
  UserProfileConverter,
} from '@taipei-rat-lab/contracts';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { adminAuth, adminDb, toAdminConverter } from '../admin.js';
import { allowedOfficialDomains, emailDomain, normalizeEmail } from './identity.js';
import { hasPasswordProvider, syncedUserProfile } from './profile.js';

const inviteIdFrom = (data: unknown): string => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'An invite ID is required.');
  }
  const inviteId = (data as { inviteId?: unknown }).inviteId;
  if (typeof inviteId !== 'string' || inviteId.length < 32 || inviteId.length > 256) {
    throw new HttpsError('invalid-argument', 'An invite ID is required.');
  }
  return inviteId;
};

export const acceptInvite = onCall({ region: 'asia-east1', maxInstances: 2 }, async (request) => {
  if (request.auth === undefined) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const inviteId = inviteIdFrom(request.data);
  const user = await adminAuth.getUser(request.auth.uid);
  if (!user.emailVerified || user.email === undefined) {
    throw new HttpsError('failed-precondition', 'Verify your email before accepting an invite.');
  }
  if (!hasPasswordProvider(user.providerData)) {
    throw new HttpsError('failed-precondition', 'Official accounts require an Email/Password sign-in method.');
  }
  const signInProvider = (request.auth.token.firebase as { sign_in_provider?: unknown } | undefined)?.sign_in_provider;
  if (signInProvider !== 'password') {
    throw new HttpsError('failed-precondition', 'Sign in with Email/Password before accepting an official invite.');
  }
  if (user.customClaims?.role === 'admin') {
    throw new HttpsError('failed-precondition', 'Administrators cannot accept an official invite.');
  }

  const emailNormalized = normalizeEmail(user.email);
  const domain = emailDomain(emailNormalized);
  const allowedDomains = allowedOfficialDomains();
  if (allowedDomains.size === 0 || !allowedDomains.has(domain)) {
    throw new HttpsError('permission-denied', 'This email domain is not eligible for an official account.');
  }

  const now = Timestamp.now();
  const inviteRef = adminDb.collection('officialInvites').doc(inviteId).withConverter(toAdminConverter(OfficialInviteConverter));
  const membershipRef = adminDb.collection('memberships').doc(user.uid).withConverter(toAdminConverter(MembershipConverter));
  const profileRef = adminDb.collection('users').doc(user.uid).withConverter(toAdminConverter(UserProfileConverter));

  await adminDb.runTransaction(async (transaction) => {
    const inviteSnapshot = await transaction.get(inviteRef);
    const profileSnapshot = await transaction.get(profileRef);
    if (!inviteSnapshot.exists) {
      throw new HttpsError('not-found', 'This invite is not available.');
    }

    const invite = inviteSnapshot.data();
    if (
      invite === undefined
      || invite.status !== 'pending'
      || invite.emailNormalized !== emailNormalized
      || invite.emailDomain !== domain
      || invite.expiresAt.toMillis() <= now.toMillis()
    ) {
      throw new HttpsError('failed-precondition', 'This invite is not available.');
    }

    const membership: Membership = {
      role: 'official',
      status: 'active',
      emailDomain: domain,
      ...(invite.organizationId === undefined ? {} : { organizationId: invite.organizationId }),
      ...(invite.agencyType === undefined ? {} : { agencyType: invite.agencyType }),
      ...(invite.employmentType === undefined ? {} : { employmentType: invite.employmentType }),
      jurisdictions: invite.jurisdictions,
      assignments: invite.assignments,
      invitedByUid: invite.invitedByUid,
      approvedByUid: invite.invitedByUid,
      approvedAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };

    transaction.update(inviteRef, {
      status: 'accepted',
      acceptedByUid: user.uid,
      acceptedAt: now,
    });
    transaction.set(membershipRef, membership);
    transaction.set(profileRef, syncedUserProfile(user, profileSnapshot.data(), 'official', 'active', now));
    transaction.create(adminDb.collection('auditLogs').doc().withConverter(toAdminConverter(AuditLogConverter)), {
      action: 'official_invite_accepted',
      actorUid: invite.invitedByUid,
      actorRole: 'admin',
      targetType: 'officialInvite',
      targetId: inviteId,
      createdAt: now,
      schemaVersion: 1,
    });
    transaction.create(adminDb.collection('auditLogs').doc().withConverter(toAdminConverter(AuditLogConverter)), {
      action: 'role_granted',
      actorUid: invite.invitedByUid,
      actorRole: 'admin',
      targetType: 'membership',
      targetId: user.uid,
      metadata: { role: 'official', status: 'active' },
      createdAt: now,
      schemaVersion: 1,
    });
  });

  // Claims are set only after the one-time invitation transaction commits.
  await adminAuth.setCustomUserClaims(user.uid, { ...user.customClaims, role: 'official' });
  return { role: 'official' };
});
