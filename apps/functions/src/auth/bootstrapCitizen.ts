import { beforeUserCreated } from 'firebase-functions/v2/identity';
import { Timestamp } from 'firebase-admin/firestore';
import {
  MembershipConverter,
  UserProfileConverter,
  type AuthProvider,
} from '@taipei-rat-lab/contracts';

import { adminDb, toAdminConverter } from '../admin.js';
import { normalizeEmail, emailDomain } from './identity.js';

const isAuthProvider = (providerId: string): providerId is AuthProvider =>
  providerId === 'password' || providerId === 'google.com';

/**
 * plan.md §2.3 步驟 2：「自助註冊只開放市民，新帳號預設為 citizen」。
 * 每個新建立的 Firebase Auth 帳號在這裡預設拿到 citizen/active 的 custom
 * claim、`users/{uid}` 與 `memberships/{uid}` 文件；official 帳號之後由
 * acceptInvite 的邀請流程覆寫成 official（見 acceptInvite.ts）。
 */
export const bootstrapCitizen = beforeUserCreated({ region: 'asia-east1' }, async (event) => {
  const user = event.data;
  if (user === undefined || user.email === undefined) {
    return;
  }

  const emailNormalized = normalizeEmail(user.email);
  const authProviders = user.providerData
    .map(({ providerId }) => providerId)
    .filter(isAuthProvider);
  const now = Timestamp.now();

  const profileRef = adminDb.collection('users').doc(user.uid).withConverter(toAdminConverter(UserProfileConverter));
  const membershipRef = adminDb.collection('memberships').doc(user.uid).withConverter(toAdminConverter(MembershipConverter));

  await Promise.all([
    profileRef.set({
      role: 'citizen',
      status: 'active',
      displayName: user.displayName ?? '',
      emailNormalized,
      emailVerified: user.emailVerified ?? false,
      authProviders,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    }),
    membershipRef.set({
      role: 'citizen',
      status: 'active',
      emailDomain: emailDomain(emailNormalized),
      jurisdictions: [],
      assignments: [],
      updatedAt: now,
      schemaVersion: 1,
    }),
  ]);

  return {
    customClaims: { role: 'citizen' },
  };
});
