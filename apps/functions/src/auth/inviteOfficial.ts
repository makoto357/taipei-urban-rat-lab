import { randomBytes } from 'node:crypto';

import {
  AuditLogConverter,
  type EmploymentType,
  OfficialInviteConverter,
  type OfficialInvite,
} from '@taipei-rat-lab/contracts';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { adminDb, toAdminConverter } from '../admin.js';
import { requireAdmin } from './authorization.js';
import { emailDomain, normalizeEmail } from './identity.js';

type InviteOfficialInput = {
  email: string;
  organizationId?: string;
  agencyType?: string;
  employmentType?: EmploymentType;
  jurisdictions: string[];
  assignments: string[];
  expiresAtMillis: number;
};

const parseInviteOfficialInput = (data: unknown): InviteOfficialInput => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'Invite details are required.');
  }

  const candidate = data as Partial<InviteOfficialInput>;
  if (
    typeof candidate.email !== 'string'
    || !Array.isArray(candidate.jurisdictions)
    || !candidate.jurisdictions.every((value) => typeof value === 'string')
    || !Array.isArray(candidate.assignments)
    || !candidate.assignments.every((value) => typeof value === 'string')
    || typeof candidate.expiresAtMillis !== 'number'
    || !Number.isSafeInteger(candidate.expiresAtMillis)
    || candidate.expiresAtMillis <= Date.now()
    || (candidate.organizationId !== undefined && typeof candidate.organizationId !== 'string')
    || (candidate.agencyType !== undefined && typeof candidate.agencyType !== 'string')
    || (candidate.employmentType !== undefined
      && candidate.employmentType !== 'government'
      && candidate.employmentType !== 'contractor')
  ) {
    throw new HttpsError('invalid-argument', 'Invite details are invalid.');
  }

  return candidate as InviteOfficialInput;
};

export const inviteOfficial = onCall({ region: 'asia-east1', maxInstances: 2 }, async (request) => {
  const actorUid = requireAdmin(request);
  const input = parseInviteOfficialInput(request.data);
  const emailNormalized = normalizeEmail(input.email);
  const now = Timestamp.now();
  const inviteId = randomBytes(32).toString('base64url');

  const invite: OfficialInvite = {
    emailNormalized,
    emailDomain: emailDomain(emailNormalized),
    ...(input.organizationId === undefined ? {} : { organizationId: input.organizationId }),
    ...(input.agencyType === undefined ? {} : { agencyType: input.agencyType }),
    ...(input.employmentType === undefined ? {} : { employmentType: input.employmentType }),
    jurisdictions: input.jurisdictions,
    assignments: input.assignments,
    invitedByUid: actorUid,
    invitedAt: now,
    expiresAt: Timestamp.fromMillis(input.expiresAtMillis),
    status: 'pending',
    schemaVersion: 1,
  };

  const inviteRef = adminDb.collection('officialInvites').doc(inviteId).withConverter(toAdminConverter(OfficialInviteConverter));
  const auditRef = adminDb.collection('auditLogs').doc().withConverter(toAdminConverter(AuditLogConverter));

  await adminDb.runTransaction(async (transaction) => {
    transaction.create(inviteRef, invite);
    transaction.create(auditRef, {
      action: 'official_invited',
      actorUid,
      actorRole: 'admin',
      targetType: 'officialInvite',
      targetId: inviteId,
      metadata: { emailDomain: invite.emailDomain },
      createdAt: now,
      schemaVersion: 1,
    });
  });

  // A membership cannot be created until acceptance, because it is keyed by Firebase UID.
  return { inviteId };
});
