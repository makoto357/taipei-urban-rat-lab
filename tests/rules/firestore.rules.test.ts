import { readFile } from 'node:fs/promises';

import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

const PROJECT_ID = 'taipei-urban-rat-lab-test';
let testEnvironment: RulesTestEnvironment;

const now = () => serverTimestamp();

const citizenReport = (uid: string) => ({
  reporterId: uid,
  observedAt: now(),
  createdAt: now(),
  updatedAt: now(),
  reportType: 'rat',
  location: { latitude: 25.033, longitude: 121.565 },
  addressText: 'Smoke test address',
  district: 'Da-an',
  photoPaths: [],
  schemaVersion: 1,
});

const officialMembership = {
  role: 'official',
  status: 'active',
  emailDomain: 'gov.taipei',
  organizationId: 'environmental-protection',
  jurisdictions: [],
  assignments: [],
  updatedAt: now(),
  schemaVersion: 1,
};

beforeAll(async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST === undefined) {
    throw new Error('Run Rules tests through firebase emulators:exec.');
  }
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: await readFile(new URL('../../firebase/firestore.rules', import.meta.url), 'utf8'),
    },
  });
});

afterEach(async () => {
  await testEnvironment.clearFirestore();
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe('Firestore Rules smoke tests', () => {
  it('allows an authenticated user to read their users/{uid} document', async () => {
    const client = testEnvironment.authenticatedContext('citizen-1', { role: 'citizen' }).firestore();

    await expect(assertSucceeds(getDoc(doc(client, 'users', 'citizen-1')))).resolves.toBeDefined();
    await expect(assertFails(getDoc(doc(client, 'users', 'citizen-2')))).resolves.toBeDefined();
  });

  it('allows an authenticated user to read their memberships/{uid} document', async () => {
    const client = testEnvironment.authenticatedContext('citizen-1', { role: 'citizen' }).firestore();

    await expect(assertSucceeds(getDoc(doc(client, 'memberships', 'citizen-1')))).resolves.toBeDefined();
  });

  it('keeps officialInvites inaccessible to ordinary clients', async () => {
    const client = testEnvironment.authenticatedContext('citizen-1', { role: 'citizen' }).firestore();

    await expect(assertFails(getDoc(doc(client, 'officialInvites', 'invite-1')))).resolves.toBeDefined();
  });

  it('keeps auditLogs inaccessible to ordinary clients', async () => {
    const client = testEnvironment.authenticatedContext('citizen-1', { role: 'citizen' }).firestore();

    await expect(assertFails(getDoc(doc(client, 'auditLogs', 'log-1')))).resolves.toBeDefined();
  });

  it('allows anonymous reads but denies client writes for publicCitizenObservations', async () => {
    const client = testEnvironment.unauthenticatedContext().firestore();

    await expect(assertSucceeds(getDoc(doc(client, 'publicCitizenObservations', 'projection-1')))).resolves.toBeDefined();
    await expect(assertFails(setDoc(doc(client, 'publicCitizenObservations', 'projection-1'), {}))).resolves.toBeDefined();
  });

  it('allows anonymous reads but denies client writes for publicControlNotices', async () => {
    const client = testEnvironment.unauthenticatedContext().firestore();

    await expect(assertSucceeds(getDoc(doc(client, 'publicControlNotices', 'projection-1')))).resolves.toBeDefined();
    await expect(assertFails(setDoc(doc(client, 'publicControlNotices', 'projection-1'), {}))).resolves.toBeDefined();
  });

  it('allows anonymous reads but denies client writes for activePublications', async () => {
    const client = testEnvironment.unauthenticatedContext().firestore();

    await expect(assertSucceeds(getDoc(doc(client, 'activePublications', 'projection-1')))).resolves.toBeDefined();
    await expect(assertFails(setDoc(doc(client, 'activePublications', 'projection-1'), {}))).resolves.toBeDefined();
  });

  it('allows a citizen to create their own citizenReports document', async () => {
    const client = testEnvironment.authenticatedContext('citizen-1', { role: 'citizen' }).firestore();

    await expect(assertSucceeds(setDoc(doc(client, 'citizenReports', 'report-1'), citizenReport('citizen-1')))).resolves.toBeUndefined();
  });

  it('allows an active official to create an officialObservations document for their organization', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'memberships', 'official-1'), officialMembership);
    });
    const client = testEnvironment.authenticatedContext('official-1', { role: 'official' }).firestore();

    await expect(assertSucceeds(setDoc(doc(client, 'officialObservations', 'observation-1'), {
      reporterId: 'official-1',
      organizationId: 'environmental-protection',
      observedAt: now(),
      createdAt: now(),
      updatedAt: now(),
      location: { latitude: 25.033, longitude: 121.565 },
      addressText: 'Smoke test address',
      district: 'Da-an',
      surveyMethod: 'visual_inspection',
      surveyResult: 'evidence_found',
      observationTypes: ['rat_droppings'],
      photoPaths: [],
      schemaVersion: 1,
    }))).resolves.toBeUndefined();
  });

  it('allows an active official to create an empty baitRecords work cycle', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'memberships', 'official-1'), officialMembership);
    });
    const client = testEnvironment.authenticatedContext('official-1', { role: 'official' }).firestore();

    await expect(assertSucceeds(setDoc(doc(client, 'baitRecords', 'bait-1'), {
      reporterId: 'official-1',
      organizationId: 'environmental-protection',
      createdAt: now(),
      updatedAt: now(),
      location: { latitude: 25.033, longitude: 121.565 },
      addressText: 'Smoke test address',
      district: 'Da-an',
      placeType: 'public_space',
      events: [],
      schemaVersion: 1,
    }))).resolves.toBeUndefined();
  });

  it('allows an active official to create an empty sampleRecords work cycle', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'memberships', 'official-1'), officialMembership);
    });
    const client = testEnvironment.authenticatedContext('official-1', { role: 'official' }).firestore();

    await expect(assertSucceeds(setDoc(doc(client, 'sampleRecords', 'sample-1'), {
      reporterId: 'official-1',
      organizationId: 'environmental-protection',
      createdAt: now(),
      updatedAt: now(),
      location: { latitude: 25.033, longitude: 121.565 },
      addressText: 'Smoke test address',
      district: 'Da-an',
      placeType: 'public_space',
      sampleMethod: 'live_trapping',
      events: [],
      schemaVersion: 1,
    }))).resolves.toBeUndefined();
  });

  it('keeps ratIndividuals backend-only', async () => {
    const client = testEnvironment.authenticatedContext('official-1', { role: 'official' }).firestore();

    await expect(assertFails(setDoc(doc(client, 'ratIndividuals', 'rat-1'), {}))).resolves.toBeDefined();
  });

  it('keeps geneticSamples backend-only', async () => {
    const client = testEnvironment.authenticatedContext('official-1', { role: 'official' }).firestore();

    await expect(assertFails(setDoc(doc(client, 'geneticSamples', 'sample-1'), {}))).resolves.toBeDefined();
  });

  it('allows a citizen to create pending private media for their staging path', async () => {
    const client = testEnvironment.authenticatedContext('citizen-1', { role: 'citizen' }).firestore();

    await expect(assertSucceeds(setDoc(doc(client, 'media', 'media-1'), {
      ownerUid: 'citizen-1',
      storagePath: 'staging/citizen-1/media-1',
      originalContentType: 'image/jpeg',
      originalBytes: 1,
      scanStatus: 'pending',
      moderationStatus: 'private',
      exifStripped: false,
      createdAt: now(),
      schemaVersion: 1,
    }))).resolves.toBeUndefined();
  });

  // plan.md Phase 3: 「先寫角色矩陣的 Rules tests，包含偽造 client role、
  // 停權 official、跨使用者讀取…」— 以下四個測試涵蓋 Firestore Rules 可以
  // 直接驗證的部分；domain/邀請偽造屬於 apps/functions 的職責，不是 Rules。
  it('denies a citizen forging an elevated role by writing their own users/{uid} document', async () => {
    const client = testEnvironment.authenticatedContext('citizen-1', { role: 'citizen' }).firestore();

    await expect(assertFails(setDoc(doc(client, 'users', 'citizen-1'), {
      role: 'admin',
      status: 'active',
      displayName: 'Citizen One',
      emailNormalized: 'citizen-1@example.com',
      emailVerified: true,
      authProviders: ['password'],
      createdAt: now(),
      updatedAt: now(),
      schemaVersion: 1,
    }))).resolves.toBeDefined();
  });

  it('denies a citizen forging an elevated role by writing their own memberships/{uid} document', async () => {
    const client = testEnvironment.authenticatedContext('citizen-1', { role: 'citizen' }).firestore();

    await expect(assertFails(setDoc(doc(client, 'memberships', 'citizen-1'), {
      ...officialMembership,
      role: 'admin',
    }))).resolves.toBeDefined();
  });

  it('denies a suspended official from creating an officialObservations document', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'memberships', 'official-1'), {
        ...officialMembership,
        status: 'suspended',
      });
    });
    const client = testEnvironment.authenticatedContext('official-1', { role: 'official' }).firestore();

    await expect(assertFails(setDoc(doc(client, 'officialObservations', 'observation-1'), {
      reporterId: 'official-1',
      organizationId: 'environmental-protection',
      observedAt: now(),
      createdAt: now(),
      updatedAt: now(),
      location: { latitude: 25.033, longitude: 121.565 },
      addressText: 'Smoke test address',
      district: 'Da-an',
      surveyMethod: 'visual_inspection',
      surveyResult: 'evidence_found',
      observationTypes: ['rat_droppings'],
      photoPaths: [],
      schemaVersion: 1,
    }))).resolves.toBeDefined();
  });

  it('denies a citizen from reading another citizen\'s citizenReports document', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'citizenReports', 'report-1'), citizenReport('citizen-1'));
    });
    const client = testEnvironment.authenticatedContext('citizen-2', { role: 'citizen' }).firestore();

    await expect(assertFails(getDoc(doc(client, 'citizenReports', 'report-1')))).resolves.toBeDefined();
  });

  it('denies a citizen from reading another citizen\'s private media document', async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'media', 'media-1'), {
        ownerUid: 'citizen-1',
        storagePath: 'staging/citizen-1/media-1',
        originalContentType: 'image/jpeg',
        originalBytes: 1,
        scanStatus: 'pending',
        moderationStatus: 'private',
        exifStripped: false,
        createdAt: now(),
        schemaVersion: 1,
      });
    });
    const client = testEnvironment.authenticatedContext('citizen-2', { role: 'citizen' }).firestore();

    await expect(assertFails(getDoc(doc(client, 'media', 'media-1')))).resolves.toBeDefined();
  });
});
