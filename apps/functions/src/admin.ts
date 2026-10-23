import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  getFirestore,
  type FirestoreDataConverter as AdminFirestoreDataConverter,
} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { FirestoreDataConverter as ContractFirestoreDataConverter } from '@taipei-rat-lab/contracts';

if (getApps().length === 0) {
  initializeApp();
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminStorage = getStorage();

// Contracts intentionally avoid an Admin SDK dependency; their converters have the
// same runtime behaviour and need only this SDK-specific generic type bridge.
export const toAdminConverter = <T>(
  converter: ContractFirestoreDataConverter<T>,
): AdminFirestoreDataConverter<T> => converter as unknown as AdminFirestoreDataConverter<T>;
