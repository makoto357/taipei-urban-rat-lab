import {
  BaitActionTypeSchema,
  BaitEventSchema,
  BaitProductTypeSchema,
  BaitRecordConverter,
  type BaitActionType,
  type BaitEvent,
  type BaitProduct,
} from '@taipei-rat-lab/contracts';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { adminDb, toAdminConverter } from '../admin.js';
import { requireOfficialOrAdmin } from '../auth/authorization.js';

interface AppendBaitEventInput {
  recordId: string;
  actions: BaitActionType[];
  product?: BaitProduct;
  photoPaths: string[];
  notes?: string;
}

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

const parseProduct = (value: unknown): BaitProduct | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'product must be an object.');
  }
  const candidate = value as Partial<BaitProduct>;
  if (
    !isNonEmptyString(candidate.productName)
    || !BaitProductTypeSchema.safeParse(candidate.productType).success
  ) {
    throw new HttpsError('invalid-argument', 'product requires productName and a valid productType.');
  }
  return {
    productName: candidate.productName,
    productType: candidate.productType as BaitProduct['productType'],
    ...(candidate.activeIngredient === undefined ? {} : { activeIngredient: candidate.activeIngredient }),
    ...(candidate.registrationNumber === undefined ? {} : { registrationNumber: candidate.registrationNumber }),
  };
};

export const parseAppendBaitEventInput = (data: unknown): AppendBaitEventInput => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'Event details are required.');
  }
  const candidate = data as Record<string, unknown>;
  if (!isNonEmptyString(candidate.recordId)) {
    throw new HttpsError('invalid-argument', 'A recordId is required.');
  }
  if (
    !Array.isArray(candidate.actions)
    || candidate.actions.length === 0
    || !candidate.actions.every((action) => BaitActionTypeSchema.safeParse(action).success)
  ) {
    throw new HttpsError('invalid-argument', 'At least one valid action is required.');
  }
  const actions = candidate.actions as BaitActionType[];
  const product = parseProduct(candidate.product);
  if (actions.includes('bait_placed') && product === undefined) {
    throw new HttpsError('invalid-argument', 'product is required when actions includes bait_placed.');
  }
  const photoPaths = Array.isArray(candidate.photoPaths)
    ? candidate.photoPaths.filter(isNonEmptyString)
    : [];
  const notes = typeof candidate.notes === 'string' && candidate.notes.length > 0 ? candidate.notes : undefined;

  return { recordId: candidate.recordId, actions, product, photoPaths, notes };
};

/**
 * plan.md §3.2 baitRecords：client 只能建立空 events 的紀錄（見
 * firestore.rules），之後每一次到場行動都要透過這個受保護的 transaction
 * 追加事件，絕不就地改寫或刪除舊 event——「移除」只記錄這次處置完成，
 * 不代表安全；修正一律用新的 `correction` action 追加，不覆寫歷史。
 */
export const appendBaitEvent = onCall({ region: 'asia-east1', maxInstances: 2 }, async (request) => {
  const uid = requireOfficialOrAdmin(request);
  const input = parseAppendBaitEventInput(request.data);

  const membershipSnapshot = await adminDb.collection('memberships').doc(uid).get();
  const membership = membershipSnapshot.data();
  const isAdmin = request.auth?.token.role === 'admin';
  if (!isAdmin && (membership === undefined || membership.role !== 'official' || membership.status !== 'active')) {
    throw new HttpsError('permission-denied', 'An active official membership is required.');
  }

  const recordRef = adminDb.collection('baitRecords').doc(input.recordId).withConverter(toAdminConverter(BaitRecordConverter));

  const event: BaitEvent = BaitEventSchema.parse({
    time: Timestamp.now(),
    operatorId: uid,
    actions: input.actions,
    photoPaths: input.photoPaths,
    ...(input.product === undefined ? {} : { product: input.product }),
    ...(input.notes === undefined ? {} : { notes: input.notes }),
  });

  const eventIndex = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(recordRef);
    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'This bait record does not exist.');
    }
    const record = snapshot.data();
    if (record === undefined) {
      throw new HttpsError('not-found', 'This bait record does not exist.');
    }
    if (!isAdmin && record.organizationId !== membership?.organizationId) {
      throw new HttpsError('permission-denied', 'This bait record belongs to a different organization.');
    }
    // Append-only: never reassign or truncate existing events, only grow the array.
    const events = [...record.events, event];
    transaction.update(recordRef, {
      events,
      updatedAt: Timestamp.now(),
    });
    return events.length - 1;
  });

  return { recordId: input.recordId, eventIndex };
});
