import {
  AuditLogConverter,
  MembershipConverter,
  type Membership,
  UserProfileConverter,
} from '@taipei-rat-lab/contracts';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { adminAuth, adminDb, toAdminConverter } from '../admin.js';
import { requireAdmin } from './authorization.js';
import { syncedUserProfile } from './profile.js';

const revokeInputFrom = (data: unknown): { uid: string; reason: string } => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'A user ID and reason are required.');
  }
  const { uid, reason } = data as { uid?: unknown; reason?: unknown };
  if (typeof uid !== 'string' || uid.length === 0 || typeof reason !== 'string' || reason.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'A user ID and reason are required.');
  }
  return { uid, reason: reason.trim() };
};

export const revokeOfficial = onCall({ region: 'asia-east1', maxInstances: 2 }, async (request) => {
  const actorUid = requireAdmin(request);
  const { uid, reason } = revokeInputFrom(request.data);
  const membershipRef = adminDb.collection('memberships').doc(uid).withConverter(toAdminConverter(MembershipConverter));
  const currentMembership = await membershipRef.get();
  const currentMembershipData = currentMembership.data();
  if (!currentMembership.exists || currentMembershipData === undefined) {
    throw new HttpsError('not-found', 'Official membership was not found.');
  }
  if (currentMembershipData.role !== 'official') {
    throw new HttpsError('failed-precondition', 'Only official memberships can be revoked here.');
  }

  const user = await adminAuth.getUser(uid);
  if (user.customClaims?.role === 'admin') {
    throw new HttpsError('failed-precondition', 'Administrators must use the protected admin role flow.');
  }

  const claims = { ...user.customClaims };
  delete claims.role;
  await adminAuth.setCustomUserClaims(uid, claims);
  await adminAuth.revokeRefreshTokens(uid);

  const now = Timestamp.now();
  const profileRef = adminDb.collection('users').doc(uid).withConverter(toAdminConverter(UserProfileConverter));
  await adminDb.runTransaction(async (transaction) => {
    const membershipSnapshot = await transaction.get(membershipRef);
    const profileSnapshot = await transaction.get(profileRef);
    if (!membershipSnapshot.exists) {
      throw new HttpsError('not-found', 'Official membership was not found.');
    }
    const membership = membershipSnapshot.data();
    if (membership === undefined || membership.role !== 'official') {
      throw new HttpsError('failed-precondition', 'Only official memberships can be revoked here.');
    }

    const revokedMembership: Membership = {
      ...membership,
      status: 'revoked',
      revokedAt: now,
      revocationReason: reason,
      updatedAt: now,
    };
    transaction.set(membershipRef, revokedMembership);
    transaction.set(profileRef, syncedUserProfile(user, profileSnapshot.data(), 'official', 'revoked', now));
    transaction.create(adminDb.collection('auditLogs').doc().withConverter(toAdminConverter(AuditLogConverter)), {
      action: 'role_revoked',
      actorUid,
      actorRole: 'admin',
      targetType: 'membership',
      targetId: uid,
      reason,
      metadata: { role: 'official', status: 'revoked' },
      createdAt: now,
      schemaVersion: 1,
    });
  });

  return { revokedUid: uid };
});
