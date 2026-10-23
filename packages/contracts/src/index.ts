import { z } from 'zod';

/** Structural representation shared by Firebase client and Admin SDK timestamps. */
export interface Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

export interface FirestoreSnapshot {
  data(): unknown;
}

/** Has the same call shape as Firebase's FirestoreDataConverter without an SDK dependency. */
export interface FirestoreDataConverter<T> {
  toFirestore(modelObject: unknown, options?: unknown): T;
  fromFirestore(snapshot: FirestoreSnapshot, options?: unknown): T;
}

const isTimestamp = (value: unknown): value is Timestamp => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<Timestamp>;
  return typeof candidate.seconds === 'number'
    && typeof candidate.nanoseconds === 'number'
    && typeof candidate.toDate === 'function'
    && typeof candidate.toMillis === 'function';
};

export const TimestampSchema = z.custom<Timestamp>(isTimestamp, {
  message: 'Expected a Firestore Timestamp',
});

const createFirestoreConverter = <T>(schema: z.ZodType<T>): FirestoreDataConverter<T> => ({
  toFirestore: (modelObject) => schema.parse(modelObject),
  fromFirestore: (snapshot) => schema.parse(snapshot.data()),
});

export const LocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
}).strict();
export type Location = z.infer<typeof LocationSchema>;

export const UserRoleSchema = z.enum(['citizen', 'official', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(['pending', 'active', 'suspended', 'revoked']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const AuthProviderSchema = z.enum(['password', 'google.com']);
export type AuthProvider = z.infer<typeof AuthProviderSchema>;

export const UserProfileSchema = z.object({
  role: UserRoleSchema,
  status: UserStatusSchema,
  displayName: z.string(),
  emailNormalized: z.string(),
  emailVerified: z.boolean(),
  authProviders: z.array(AuthProviderSchema),
  organizationId: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  schemaVersion: z.literal(1),
}).strict();
export type UserProfile = z.infer<typeof UserProfileSchema>;
export const UserProfileConverter = createFirestoreConverter(UserProfileSchema);

export const EmploymentTypeSchema = z.enum(['government', 'contractor']);
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

export const MembershipSchema = z.object({
  role: UserRoleSchema,
  status: UserStatusSchema,
  emailDomain: z.string(),
  organizationId: z.string().optional(),
  agencyType: z.string().optional(),
  employmentType: EmploymentTypeSchema.optional(),
  jurisdictions: z.array(z.string()),
  assignments: z.array(z.string()),
  invitedByUid: z.string().optional(),
  approvedByUid: z.string().optional(),
  approvedAt: TimestampSchema.optional(),
  validUntil: TimestampSchema.optional(),
  revokedAt: TimestampSchema.optional(),
  revocationReason: z.string().optional(),
  updatedAt: TimestampSchema,
  schemaVersion: z.literal(1),
}).strict();
export type Membership = z.infer<typeof MembershipSchema>;
export const MembershipConverter = createFirestoreConverter(MembershipSchema);

export const ReportTypeSchema = z.enum(['rat', 'bait']);
export type ReportType = z.infer<typeof ReportTypeSchema>;

export const CitizenReportSchema = z.object({
  reporterId: z.string(),
  observedAt: TimestampSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  reportType: ReportTypeSchema,
  location: LocationSchema,
  addressText: z.string(),
  district: z.string(),
  blockId: z.string().nullable().optional(),
  blockVersion: z.string().nullable().optional(),
  description: z.string().optional(),
  photoPaths: z.array(z.string()),
  schemaVersion: z.literal(1),
}).strict();
export type CitizenReport = z.infer<typeof CitizenReportSchema>;
export const CitizenReportConverter = createFirestoreConverter(CitizenReportSchema);

export const SurveyMethodSchema = z.enum([
  'visual_inspection',
  'trap_survey',
  'routine_inspection',
  'environmental_inspection',
  'other',
]);
export type SurveyMethod = z.infer<typeof SurveyMethodSchema>;

export const SurveyResultSchema = z.enum([
  'evidence_found',
  'no_evidence_found',
  'unable_to_assess',
]);
export type SurveyResult = z.infer<typeof SurveyResultSchema>;

export const ObservationTypeSchema = z.enum([
  'live_rat', 'dead_rat', 'rat_droppings', 'rat_burrow', 'gnaw_marks',
  'waste_accumulation', 'food_waste', 'animal_feed_residue', 'uncovered_bin',
  'standing_water', 'drainage_issue', 'clutter', 'unused_space',
]);
export type ObservationType = z.infer<typeof ObservationTypeSchema>;

export const SuspectedSpeciesSchema = z.enum([
  'norway_rat', 'roof_rat', 'house_mouse', 'shrew', 'unknown',
]);
export type SuspectedSpecies = z.infer<typeof SuspectedSpeciesSchema>;

export const SpeciesConfidenceSchema = z.enum(['low', 'medium', 'high']);
export type SpeciesConfidence = z.infer<typeof SpeciesConfidenceSchema>;

export const OfficialObservationSchema = z.object({
  reporterId: z.string(),
  organizationId: z.string(),
  observedAt: TimestampSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  location: LocationSchema,
  addressText: z.string(),
  district: z.string(),
  blockId: z.string().nullable().optional(),
  blockVersion: z.string().nullable().optional(),
  surveyMethod: SurveyMethodSchema,
  surveyResult: SurveyResultSchema,
  observationTypes: z.array(ObservationTypeSchema),
  suspectedSpecies: SuspectedSpeciesSchema.optional(),
  speciesConfidence: SpeciesConfidenceSchema.optional(),
  linkedCitizenReportId: z.string().optional(),
  description: z.string().optional(),
  recommendedActions: z.string().optional(),
  photoPaths: z.array(z.string()),
  schemaVersion: z.literal(1),
}).strict();
export type OfficialObservation = z.infer<typeof OfficialObservationSchema>;
export const OfficialObservationConverter = createFirestoreConverter(OfficialObservationSchema);

export const ProcessedContentTypeSchema = z.enum(['image/webp', 'image/jpeg']);
export type ProcessedContentType = z.infer<typeof ProcessedContentTypeSchema>;

export const ScanStatusSchema = z.enum(['pending', 'clean', 'rejected']);
export type ScanStatus = z.infer<typeof ScanStatusSchema>;

export const ModerationStatusSchema = z.enum(['private', 'approved_public', 'rejected']);
export type ModerationStatus = z.infer<typeof ModerationStatusSchema>;

export const MediaRecordSchema = z.object({
  ownerUid: z.string(),
  reportId: z.string().optional(),
  storagePath: z.string(),
  originalContentType: z.string(),
  processedContentType: ProcessedContentTypeSchema.optional(),
  originalBytes: z.number(),
  processedBytes: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  scanStatus: ScanStatusSchema,
  moderationStatus: ModerationStatusSchema,
  exifStripped: z.boolean(),
  createdAt: TimestampSchema,
  schemaVersion: z.literal(1),
}).strict();
export type MediaRecord = z.infer<typeof MediaRecordSchema>;
export const MediaRecordConverter = createFirestoreConverter(MediaRecordSchema);

export const PlaceTypeSchema = z.enum([
  'building_interior', 'public_space', 'sewer', 'market', 'other',
]);
export type PlaceType = z.infer<typeof PlaceTypeSchema>;

export const BaitActionTypeSchema = z.enum([
  'bait_station_placed', 'bait_placed', 'checked', 'replenished', 'removed', 'correction',
]);
export type BaitActionType = z.infer<typeof BaitActionTypeSchema>;

export const BaitProductTypeSchema = z.enum(['rodenticide', 'contraceptive', 'other']);
export type BaitProductType = z.infer<typeof BaitProductTypeSchema>;

export const BaitProductSchema = z.object({
  productName: z.string(),
  productType: BaitProductTypeSchema,
  activeIngredient: z.string().optional(),
  registrationNumber: z.string().optional(),
}).strict();
export type BaitProduct = z.infer<typeof BaitProductSchema>;

export const BaitEventSchema = z.object({
  time: TimestampSchema,
  operatorId: z.string(),
  actions: z.array(BaitActionTypeSchema),
  photoPaths: z.array(z.string()),
  product: BaitProductSchema.optional(),
  notes: z.string().optional(),
}).strict().superRefine((event, context) => {
  if (event.actions.includes('bait_placed') && event.product === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'product is required when actions includes bait_placed',
      path: ['product'],
    });
  }
});
export type BaitEvent = z.infer<typeof BaitEventSchema>;

export const BaitRecordSchema = z.object({
  reporterId: z.string(),
  organizationId: z.string(),
  contractorOrganizationId: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  location: LocationSchema,
  addressText: z.string(),
  district: z.string(),
  blockId: z.string().nullable().optional(),
  blockVersion: z.string().nullable().optional(),
  placeType: PlaceTypeSchema,
  linkedOfficialObservationId: z.string().optional(),
  linkedCitizenReportId: z.string().optional(),
  events: z.array(BaitEventSchema),
  schemaVersion: z.literal(1),
}).strict();
export type BaitRecord = z.infer<typeof BaitRecordSchema>;
export const BaitRecordConverter = createFirestoreConverter(BaitRecordSchema);

export const SampleMethodSchema = z.enum([
  'live_trapping', 'snap_trapping', 'carcass_collection', 'environmental_sampling', 'other',
]);
export type SampleMethod = z.infer<typeof SampleMethodSchema>;

export const SampleTypeSchema = z.enum(['live_rat', 'dead_rat', 'rat_droppings', 'other']);
export type SampleType = z.infer<typeof SampleTypeSchema>;

export const SampleActionTypeSchema = z.enum([
  'trap_placed', 'trap_checked', 'trap_removed', 'sample_collected', 'correction',
]);
export type SampleActionType = z.infer<typeof SampleActionTypeSchema>;

export const CaptureStatusSchema = z.enum(['first_capture', 'recapture', 'unknown']);
export type CaptureStatus = z.infer<typeof CaptureStatusSchema>;

export const SexSchema = z.enum(['male', 'female', 'unknown']);
export type Sex = z.infer<typeof SexSchema>;

export const CaptureEncounterSchema = z.object({
  ratId: z.string().optional(),
  markCode: z.string().optional(),
  trapId: z.string().optional(),
  captureStatus: CaptureStatusSchema,
  species: SuspectedSpeciesSchema.optional(),
  sex: SexSchema.optional(),
  weightG: z.number().optional(),
  marked: z.boolean().optional(),
  released: z.boolean().optional(),
  location: LocationSchema.optional(),
  notes: z.string().optional(),
}).strict();
export type CaptureEncounter = z.infer<typeof CaptureEncounterSchema>;

export const SamplingEffortSchema = z.object({
  trapCount: z.number(),
  durationHours: z.number(),
}).strict();
export type SamplingEffort = z.infer<typeof SamplingEffortSchema>;

export const SampleEventSchema = z.object({
  eventId: z.string(),
  time: TimestampSchema,
  operatorId: z.string(),
  actions: z.array(SampleActionTypeSchema),
  photoPaths: z.array(z.string()),
  sampleType: SampleTypeSchema.optional(),
  sampleCount: z.number().optional(),
  captures: z.array(CaptureEncounterSchema).optional(),
  samplingEffort: SamplingEffortSchema.optional(),
  location: LocationSchema.optional(),
  notes: z.string().optional(),
}).strict();
export type SampleEvent = z.infer<typeof SampleEventSchema>;

export const SampleRecordSchema = z.object({
  reporterId: z.string(),
  organizationId: z.string(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  location: LocationSchema,
  addressText: z.string(),
  district: z.string(),
  blockId: z.string().nullable().optional(),
  blockVersion: z.string().nullable().optional(),
  placeType: PlaceTypeSchema,
  sampleMethod: SampleMethodSchema,
  linkedOfficialObservationId: z.string().optional(),
  linkedCitizenReportId: z.string().optional(),
  events: z.array(SampleEventSchema),
  schemaVersion: z.literal(1),
}).strict();
export type SampleRecord = z.infer<typeof SampleRecordSchema>;
export const SampleRecordConverter = createFirestoreConverter(SampleRecordSchema);

export const MarkTypeSchema = z.enum(['ear_tag', 'pit_tag', 'fur_mark', 'other']);
export type MarkType = z.infer<typeof MarkTypeSchema>;

export const FirstCaptureSchema = z.object({
  sampleRecordId: z.string(),
  sampleEventId: z.string(),
}).strict();
export type FirstCapture = z.infer<typeof FirstCaptureSchema>;

export const RatIndividualSchema = z.object({
  markCode: z.string().optional(),
  markType: MarkTypeSchema.optional(),
  species: SuspectedSpeciesSchema.optional(),
  sex: SexSchema.optional(),
  firstCapturedAt: TimestampSchema,
  firstCapture: FirstCaptureSchema,
  geneticSampleId: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  schemaVersion: z.literal(1),
}).strict();
export type RatIndividual = z.infer<typeof RatIndividualSchema>;
export const RatIndividualConverter = createFirestoreConverter(RatIndividualSchema);

export const GeneticSampleTypeSchema = z.enum([
  'tissue', 'blood', 'hair', 'feces', 'swab', 'other',
]);
export type GeneticSampleType = z.infer<typeof GeneticSampleTypeSchema>;

export const AnalysisStatusSchema = z.enum([
  'not_submitted', 'pending', 'completed', 'failed',
]);
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

export const GeneticSampleSchema = z.object({
  sampleId: z.string(),
  sampleRecordId: z.string(),
  sampleEventId: z.string().optional(),
  ratId: z.string().optional(),
  collectedAt: TimestampSchema,
  collectedByUid: z.string(),
  sampleType: GeneticSampleTypeSchema,
  storageLocation: z.string().optional(),
  laboratoryId: z.string().optional(),
  analysisStatus: AnalysisStatusSchema,
  geneticProfileId: z.string().optional(),
  notes: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  schemaVersion: z.literal(1),
}).strict();
export type GeneticSample = z.infer<typeof GeneticSampleSchema>;
export const GeneticSampleConverter = createFirestoreConverter(GeneticSampleSchema);
