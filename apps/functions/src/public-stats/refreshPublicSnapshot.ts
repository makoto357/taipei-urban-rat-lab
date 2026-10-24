import { PublicSnapshotSchema } from '@taipei-rat-lab/contracts';
import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import { adminDb } from '../admin.js';
import { summarizeObservations } from './snapshot.js';

const toTimestamp = (ms: number | null) => (ms === null ? null : Timestamp.fromMillis(ms));

/** officialObservations 任何新增／修改／刪除後，重算首頁摘要（資料量小，全量重算最不容易出錯）。 */
export const refreshPublicSnapshot = onDocumentWritten({
  document: 'officialObservations/{observationId}',
  region: 'asia-east1',
  maxInstances: 2,
}, async () => {
  const snapshot = await adminDb
    .collection('officialObservations')
    .select('observedAt', 'surveyResult')
    .get();

  const numbers = summarizeObservations(
    snapshot.docs.map((doc) => ({
      observedAtMs: (doc.get('observedAt') as Timestamp).toMillis(),
      surveyResult: String(doc.get('surveyResult')),
    })),
    Date.now(),
  );

  const data = PublicSnapshotSchema.parse({
    verifiedTraces30d: numbers.verifiedTraces30d,
    coverageStart: toTimestamp(numbers.coverageStartMs),
    coverageEnd: toTimestamp(numbers.coverageEndMs),
    updatedAt: Timestamp.now(),
    schemaVersion: 1,
  });
  await adminDb.collection('publicStats').doc('snapshot').set(data);
});
