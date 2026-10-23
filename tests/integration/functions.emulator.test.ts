import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, expect, it } from 'vitest';

const PROJECT_ID = 'taipei-urban-rat-lab-test';
const app = getApps().find((candidate) => candidate.name === 'functions-integration')
  ?? initializeApp({ projectId: PROJECT_ID }, 'functions-integration');

beforeAll(() => {
  if (process.env.FIRESTORE_EMULATOR_HOST === undefined) {
    throw new Error('Run integration tests through firebase emulators:exec.');
  }
});

afterAll(async () => {
  await deleteApp(app);
});

it('connects Functions Admin SDK code to the Firestore Emulator', async () => {
  const reference = getFirestore(app).collection('_integrationSmoke').doc('admin-sdk');
  await reference.set({ ready: true });

  await expect(reference.get()).resolves.toMatchObject({ exists: true });
});

it('rejects an unauthenticated inviteOfficial callable request through the Functions Emulator', async () => {
  const response = await fetch(
    `http://127.0.0.1:5001/${PROJECT_ID}/asia-east1/inviteOfficial`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: {} }),
    },
  );

  // requireAdmin() (apps/functions/src/auth/authorization.ts) intentionally collapses
  // "not signed in" and "signed in but not admin" into a single permission-denied
  // response, rather than distinguishing unauthenticated vs. unauthorized.
  await expect(response.json()).resolves.toMatchObject({
    error: { status: 'PERMISSION_DENIED' },
  });
  expect(response.status).toBe(403);
});
