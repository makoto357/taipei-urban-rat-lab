import { describe, expect, it } from 'vitest';

import {
  AuditLogSchema,
  BaitEventSchema,
  CitizenReportConverter,
  CitizenReportSchema,
  OfficialInviteSchema,
  SampleRecordSchema,
} from '../src/index.js';

const timestamp = {
  seconds: 0,
  nanoseconds: 0,
  toDate: () => new Date(0),
  toMillis: () => 0,
};

describe('shared Firestore contracts', () => {
  it('parses a citizen report with schemaVersion 1 through its converter', () => {
    const report = {
      reporterId: 'citizen-1',
      observedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      reportType: 'rat',
      location: { latitude: 25.033, longitude: 121.5654 },
      addressText: '臺北市信義區',
      district: '信義區',
      photoPaths: [],
      schemaVersion: 1,
    };

    expect(CitizenReportSchema.parse(report)).toEqual(report);
    expect(CitizenReportConverter.fromFirestore({ data: () => report })).toEqual(report);
    expect(() => CitizenReportSchema.parse({ ...report, schemaVersion: 2 })).toThrow();
  });

  it('requires product details when a bait event places bait', () => {
    const event = {
      time: timestamp,
      operatorId: 'official-1',
      actions: ['bait_placed'],
      photoPaths: [],
    };

    expect(() => BaitEventSchema.parse(event)).toThrow();
    expect(BaitEventSchema.parse({
      ...event,
      product: { productName: '產品', productType: 'rodenticide' },
    })).toMatchObject(event);
  });

  it('keeps per-event capture encounter and sampling effort fields', () => {
    const record = {
      reporterId: 'official-1',
      organizationId: 'agency-1',
      createdAt: timestamp,
      updatedAt: timestamp,
      location: { latitude: 25.033, longitude: 121.5654 },
      addressText: '臺北市信義區',
      district: '信義區',
      placeType: 'public_space',
      sampleMethod: 'live_trapping',
      events: [{
        eventId: 'event-1',
        time: timestamp,
        operatorId: 'official-1',
        actions: ['trap_checked'],
        photoPaths: [],
        captures: [{ captureStatus: 'first_capture', species: 'norway_rat' }],
        samplingEffort: { trapCount: 2, durationHours: 8 },
      }],
      schemaVersion: 1,
    };

    expect(SampleRecordSchema.parse(record)).toEqual(record);
  });

  it('parses a pending official invite keyed by a one-time token id', () => {
    const invite = {
      emailNormalized: 'official@gov.taipei',
      emailDomain: 'gov.taipei',
      jurisdictions: ['信義區'],
      assignments: [],
      invitedByUid: 'admin-1',
      invitedAt: timestamp,
      expiresAt: timestamp,
      status: 'pending',
      schemaVersion: 1,
    };

    expect(OfficialInviteSchema.parse(invite)).toEqual(invite);
    expect(() => OfficialInviteSchema.parse({ ...invite, status: 'unknown' })).toThrow();
  });

  it('requires a known action/actorRole/targetType triple for an audit log entry', () => {
    const log = {
      action: 'official_invite_accepted',
      actorUid: 'system',
      actorRole: 'system',
      targetType: 'officialInvite',
      targetId: 'invite-1',
      createdAt: timestamp,
      schemaVersion: 1,
    };

    expect(AuditLogSchema.parse(log)).toEqual(log);
    expect(() => AuditLogSchema.parse({ ...log, action: 'not_a_real_action' })).toThrow();
  });
});
