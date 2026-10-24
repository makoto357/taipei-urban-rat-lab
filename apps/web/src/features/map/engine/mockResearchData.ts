import type { Feature, FeatureCollection, LineString, Point } from "geojson";

type JsonObject = Record<string, unknown>;
type Coordinates = [number, number];

const controlActionTypes = [
  "bait_station_placed",
  "bait_placed",
  "checked",
  "replenished",
  "removed",
  "correction",
] as const;
const sampleActionTypes = [
  "trap_placed",
  "trap_checked",
  "trap_removed",
  "sample_collected",
  "correction",
] as const;
const captureStatuses = ["first_capture", "recapture", "unknown"] as const;
const sampleMethods = [
  "live_trapping",
  "snap_trapping",
  "carcass_collection",
  "environmental_sampling",
  "other",
] as const;
const sampleTypes = ["live_rat", "dead_rat", "rat_droppings", "other"] as const;
const relationshipTypes = [
  "parent_offspring",
  "full_sibling",
  "half_sibling",
  "other_related",
  "uncertain",
] as const;
const confidenceLevels = ["low", "medium", "high"] as const;
const analysisTypes = [
  "individual_identification",
  "relatedness",
  "population_structure",
  "gene_flow",
] as const;
const geneticSampleTypes = [
  "tissue",
  "blood",
  "hair",
  "feces",
  "swab",
  "other",
] as const;
const analysisStatuses = [
  "not_submitted",
  "pending",
  "completed",
  "failed",
] as const;

interface Location {
  latitude: number;
  longitude: number;
}

interface ControlProduct {
  productName: string;
  productType: "rodenticide" | "contraceptive" | "other";
  activeIngredient?: string;
  registrationNumber?: string;
}

interface ControlEvent {
  time: string;
  actions: string[];
  product?: ControlProduct;
  notes?: string;
}

interface ControlRecord {
  id: string;
  location: Location;
  addressText: string;
  district: string;
  contractorOrganizationId?: string;
  events: ControlEvent[];
}

interface CaptureEncounter {
  ratId?: string;
  markCode?: string;
  captureStatus: (typeof captureStatuses)[number];
  weightG?: number;
  released?: boolean;
  location?: Location;
}

interface SampleEvent {
  eventId: string;
  time: string;
  actions: string[];
  sampleType?: (typeof sampleTypes)[number];
  sampleCount?: number;
  captures: CaptureEncounter[];
  samplingEffort?: { trapCount: number; durationHours: number };
  location?: Location;
  notes?: string;
}

interface SampleRecord {
  id: string;
  location: Location;
  addressText: string;
  district: string;
  sampleMethod: (typeof sampleMethods)[number];
  linkedOfficialObservationId?: string;
  events: SampleEvent[];
}

interface RatIndividual {
  id: string;
  markCode?: string;
  firstCapturedAt: string;
  firstCapture: { sampleRecordId: string; sampleEventId: string };
}

interface GeneticSample {
  id: string;
  sampleId: string;
  sampleRecordId: string;
  sampleEventId?: string;
  ratId?: string;
  collectedAt: string;
  sampleType: (typeof geneticSampleTypes)[number];
  storageLocation?: string;
  analysisStatus: (typeof analysisStatuses)[number];
}

interface GeneticAnalysis {
  id: string;
  analysisVersion: string;
  analysisType: (typeof analysisTypes)[number];
}

interface GeneticRelationship {
  id: string;
  ratIdA: string;
  ratIdB: string;
  relationshipType: (typeof relationshipTypes)[number];
  relatednessCoefficient?: number;
  analysisId: string;
  confidence?: (typeof confidenceLevels)[number];
}

export interface MockResearchMapData {
  controlRecords: FeatureCollection<Point, Record<string, unknown>>;
  sampleRecords: FeatureCollection<Point, Record<string, unknown>>;
  captureEncounters: FeatureCollection<Point, Record<string, unknown>>;
  captureConnections: FeatureCollection<LineString, Record<string, unknown>>;
  geneticSamples: FeatureCollection<Point, Record<string, unknown>>;
  geneticRelationshipNodes: FeatureCollection<
    Point,
    Record<string, unknown>
  >;
  geneticRelationships: FeatureCollection<LineString, Record<string, unknown>>;
}

const object = (value: unknown, field: string): JsonObject => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as JsonObject;
};

const string = (value: unknown, field: string) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
};

const optionalString = (value: unknown, field: string) =>
  value === undefined ? undefined : string(value, field);

const number = (value: unknown, field: string) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number`);
  }
  return value;
};

const optionalNumber = (value: unknown, field: string) =>
  value === undefined ? undefined : number(value, field);

const optionalBoolean = (value: unknown, field: string) => {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new Error(`${field} must be boolean`);
  return value;
};

const isoDate = (value: unknown, field: string) => {
  const result = string(value, field);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(result) || Number.isNaN(Date.parse(result))) {
    throw new Error(`${field} must be an ISO date-time`);
  }
  return result;
};

const enumValue = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
) => {
  const result = string(value, field);
  if (!allowed.includes(result as T)) {
    throw new Error(`${field} has unsupported value: ${result}`);
  }
  return result as T;
};

const stringArray = (value: unknown, field: string) => {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  return value.map((item, index) => string(item, `${field}[${index}]`));
};

const location = (value: unknown, field: string): Location => {
  const raw = object(value, field);
  const latitude = number(raw.latitude, `${field}.latitude`);
  const longitude = number(raw.longitude, `${field}.longitude`);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error(`${field} is outside valid longitude/latitude bounds`);
  }
  return { latitude, longitude };
};

const optionalLocation = (value: unknown, field: string) =>
  value === undefined ? undefined : location(value, field);

const documents = (value: unknown, fixtureName: string) => {
  const root = object(value, fixtureName);
  if (!Array.isArray(root.documents)) {
    throw new Error(`${fixtureName}.documents must be an array`);
  }
  return root.documents;
};

const parseDocumentList = <T>(
  value: unknown,
  fixtureName: string,
  parse: (id: string, data: JsonObject) => T,
) => {
  const parsed: T[] = [];
  documents(value, fixtureName).forEach((document, index) => {
    try {
      const rawDocument = object(document, `${fixtureName}[${index}]`);
      const id = string(rawDocument.id, `${fixtureName}[${index}].id`);
      parsed.push(parse(id, object(rawDocument.data, `${id}.data`)));
    } catch (error) {
      console.warn(
        `${fixtureName}: skipped record ${index}:`,
        error instanceof Error ? error.message : error,
      );
    }
  });
  return parsed;
};

const parseControlRecords = (value: unknown) =>
  parseDocumentList(value, "mock-control-records.json", (id, data) => {
    if (!Array.isArray(data.events))
      throw new Error(`${id}.events must be an array`);
    const events = data.events.map((event, index): ControlEvent => {
      const raw = object(event, `${id}.events[${index}]`);
      const actions = stringArray(
        raw.actions,
        `${id}.events[${index}].actions`,
      ).map((action) =>
        enumValue(action, controlActionTypes, `${id}.events[${index}].actions`),
      );
      let product: ControlProduct | undefined;
      if (raw.product !== undefined) {
        const productRaw = object(
          raw.product,
          `${id}.events[${index}].product`,
        );
        product = {
          productName: string(
            productRaw.productName,
            `${id}.product.productName`,
          ),
          productType: enumValue(
            productRaw.productType,
            ["rodenticide", "contraceptive", "other"] as const,
            `${id}.product.productType`,
          ),
          activeIngredient: optionalString(
            productRaw.activeIngredient,
            `${id}.product.activeIngredient`,
          ),
          registrationNumber: optionalString(
            productRaw.registrationNumber,
            `${id}.product.registrationNumber`,
          ),
        };
      }
      return {
        time: isoDate(raw.time, `${id}.events[${index}].time`),
        actions,
        product,
        notes: optionalString(raw.notes, `${id}.events[${index}].notes`),
      };
    });
    return {
      id,
      location: location(data.location, `${id}.location`),
      addressText: string(data.addressText, `${id}.addressText`),
      district: string(data.district, `${id}.district`),
      contractorOrganizationId: optionalString(
        data.contractorOrganizationId,
        `${id}.contractorOrganizationId`,
      ),
      events,
    } satisfies ControlRecord;
  });

const parseSampleRecords = (value: unknown) =>
  parseDocumentList(value, "mock-sample-records.json", (id, data) => {
    if (!Array.isArray(data.events))
      throw new Error(`${id}.events must be an array`);
    const events = data.events.map((event, eventIndex): SampleEvent => {
      const raw = object(event, `${id}.events[${eventIndex}]`);
      const actions = stringArray(
        raw.actions,
        `${id}.events[${eventIndex}].actions`,
      ).map((action) =>
        enumValue(
          action,
          sampleActionTypes,
          `${id}.events[${eventIndex}].actions`,
        ),
      );
      const captures =
        raw.captures === undefined
          ? []
          : (() => {
              if (!Array.isArray(raw.captures))
                throw new Error(`${id}.captures must be an array`);
              return raw.captures.map(
                (capture, captureIndex): CaptureEncounter => {
                  const encounter = object(
                    capture,
                    `${id}.captures[${captureIndex}]`,
                  );
                  return {
                    ratId: optionalString(
                      encounter.ratId,
                      `${id}.captures[${captureIndex}].ratId`,
                    ),
                    markCode: optionalString(
                      encounter.markCode,
                      `${id}.captures[${captureIndex}].markCode`,
                    ),
                    captureStatus: enumValue(
                      encounter.captureStatus,
                      captureStatuses,
                      `${id}.captures[${captureIndex}].captureStatus`,
                    ),
                    weightG: optionalNumber(
                      encounter.weightG,
                      `${id}.captures[${captureIndex}].weightG`,
                    ),
                    released: optionalBoolean(
                      encounter.released,
                      `${id}.captures[${captureIndex}].released`,
                    ),
                    location: optionalLocation(
                      encounter.location,
                      `${id}.captures[${captureIndex}].location`,
                    ),
                  };
                },
              );
            })();
      let samplingEffort: SampleEvent["samplingEffort"];
      if (raw.samplingEffort !== undefined) {
        const effort = object(raw.samplingEffort, `${id}.samplingEffort`);
        samplingEffort = {
          trapCount: number(effort.trapCount, `${id}.samplingEffort.trapCount`),
          durationHours: number(
            effort.durationHours,
            `${id}.samplingEffort.durationHours`,
          ),
        };
      }
      return {
        eventId: string(raw.eventId, `${id}.events[${eventIndex}].eventId`),
        time: isoDate(raw.time, `${id}.events[${eventIndex}].time`),
        actions,
        sampleType:
          raw.sampleType === undefined
            ? undefined
            : enumValue(
                raw.sampleType,
                sampleTypes,
                `${id}.events[${eventIndex}].sampleType`,
              ),
        sampleCount: optionalNumber(
          raw.sampleCount,
          `${id}.events[${eventIndex}].sampleCount`,
        ),
        captures,
        samplingEffort,
        location: optionalLocation(
          raw.location,
          `${id}.events[${eventIndex}].location`,
        ),
        notes: optionalString(raw.notes, `${id}.events[${eventIndex}].notes`),
      };
    });
    return {
      id,
      location: location(data.location, `${id}.location`),
      addressText: string(data.addressText, `${id}.addressText`),
      district: string(data.district, `${id}.district`),
      sampleMethod: enumValue(
        data.sampleMethod,
        sampleMethods,
        `${id}.sampleMethod`,
      ),
      linkedOfficialObservationId: optionalString(
        data.linkedOfficialObservationId,
        `${id}.linkedOfficialObservationId`,
      ),
      events,
    } satisfies SampleRecord;
  });

const parseRatIndividuals = (value: unknown) =>
  parseDocumentList(value, "mock-rat-individuals.json", (id, data) => {
    const firstCapture = object(data.firstCapture, `${id}.firstCapture`);
    const firstCapturedAt = isoDate(
      data.firstCapturedAt,
      `${id}.firstCapturedAt`,
    );
    return {
      id,
      markCode: optionalString(data.markCode, `${id}.markCode`),
      firstCapturedAt,
      firstCapture: {
        sampleRecordId: string(
          firstCapture.sampleRecordId,
          `${id}.firstCapture.sampleRecordId`,
        ),
        sampleEventId: string(
          firstCapture.sampleEventId,
          `${id}.firstCapture.sampleEventId`,
        ),
      },
    } satisfies RatIndividual;
  });

const parseGeneticSamples = (value: unknown) =>
  parseDocumentList(value, "mock-genetic-samples.json", (id, data) => ({
    id,
    sampleId: string(data.sampleId, `${id}.sampleId`),
    sampleRecordId: string(data.sampleRecordId, `${id}.sampleRecordId`),
    sampleEventId: optionalString(data.sampleEventId, `${id}.sampleEventId`),
    ratId: optionalString(data.ratId, `${id}.ratId`),
    collectedAt: isoDate(data.collectedAt, `${id}.collectedAt`),
    sampleType: enumValue(
      data.sampleType,
      geneticSampleTypes,
      `${id}.sampleType`,
    ),
    storageLocation: optionalString(
      data.storageLocation,
      `${id}.storageLocation`,
    ),
    analysisStatus: enumValue(
      data.analysisStatus,
      analysisStatuses,
      `${id}.analysisStatus`,
    ),
  }));

const parseGeneticAnalyses = (value: unknown) =>
  parseDocumentList(value, "mock-genetic-analyses.json", (id, data) => ({
    id,
    analysisVersion: string(data.analysisVersion, `${id}.analysisVersion`),
    analysisType: enumValue(
      data.analysisType,
      analysisTypes,
      `${id}.analysisType`,
    ),
  }));

const parseGeneticRelationships = (value: unknown) =>
  parseDocumentList(value, "mock-genetic-relationships.json", (id, data) => ({
    id,
    ratIdA: string(data.ratIdA, `${id}.ratIdA`),
    ratIdB: string(data.ratIdB, `${id}.ratIdB`),
    relationshipType: enumValue(
      data.relationshipType,
      relationshipTypes,
      `${id}.relationshipType`,
    ),
    relatednessCoefficient: optionalNumber(
      data.relatednessCoefficient,
      `${id}.relatednessCoefficient`,
    ),
    analysisId: string(data.analysisId, `${id}.analysisId`),
    confidence:
      data.confidence === undefined
        ? undefined
        : enumValue(data.confidence, confidenceLevels, `${id}.confidence`),
  }));

const coordinates = (value: Location): Coordinates => [
  value.longitude,
  value.latitude,
];

const pointFeature = (
  id: string,
  point: Location,
  properties: Record<string, unknown>,
): Feature<Point, Record<string, unknown>> => ({
  type: "Feature",
  id,
  geometry: { type: "Point", coordinates: coordinates(point) },
  properties,
});

const featureCollection = <G extends Point | LineString>(
  features: Array<Feature<G, Record<string, unknown>>>,
): FeatureCollection<G, Record<string, unknown>> => ({
  type: "FeatureCollection",
  features,
});

const formatTimeline = (
  events: Array<{ time: string; actions: string[]; notes?: string }>,
) =>
  events
    .map((event) =>
      [event.time, event.actions.join("、"), event.notes]
        .filter(Boolean)
        .join("｜"),
    )
    .join("\n");

const fetchJson = async (fixtureName: string, signal: AbortSignal) => {
  const response = await fetch(`/data/${fixtureName}`, { signal });
  if (!response.ok) throw new Error(`${fixtureName}: HTTP ${response.status}`);
  return (await response.json()) as unknown;
};

const settled = <T>(
  result: PromiseSettledResult<T>,
  fixtureName: string,
): T[] => {
  if (result.status === "fulfilled") return [result.value];
  if (
    result.reason instanceof DOMException &&
    result.reason.name === "AbortError"
  )
    return [];
  console.error(`Failed to load ${fixtureName}:`, result.reason);
  return [];
};

const parseSettled = <T>(
  result: PromiseSettledResult<unknown>,
  fixtureName: string,
  parse: (value: unknown) => T[],
) => {
  const [value] = settled(result, fixtureName);
  if (value === undefined) return [];
  try {
    return parse(value);
  } catch (error) {
    console.error(`Failed to parse ${fixtureName}:`, error);
    return [];
  }
};

export const loadMockResearchMapData = async (
  signal: AbortSignal,
): Promise<MockResearchMapData> => {
  const fixtureNames = [
    "mock-control-records.json",
    "mock-sample-records.json",
    "mock-rat-individuals.json",
    "mock-genetic-samples.json",
    "mock-genetic-analyses.json",
    "mock-genetic-relationships.json",
  ] as const;
  const results = await Promise.allSettled([
    fetchJson(fixtureNames[0], signal),
    fetchJson(fixtureNames[1], signal),
    fetchJson(fixtureNames[2], signal),
    fetchJson(fixtureNames[3], signal),
    fetchJson(fixtureNames[4], signal),
    fetchJson(fixtureNames[5], signal),
  ]);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");

  const controls = parseSettled(
    results[0],
    fixtureNames[0],
    parseControlRecords,
  );
  const samples = parseSettled(results[1], fixtureNames[1], parseSampleRecords);
  const rats = parseSettled(results[2], fixtureNames[2], parseRatIndividuals);
  const geneticSamples = parseSettled(
    results[3],
    fixtureNames[3],
    parseGeneticSamples,
  );
  const analyses = parseSettled(
    results[4],
    fixtureNames[4],
    parseGeneticAnalyses,
  );
  const relationships = parseSettled(
    results[5],
    fixtureNames[5],
    parseGeneticRelationships,
  );

  const sampleById = new Map(samples.map((sample) => [sample.id, sample]));
  const ratById = new Map(rats.map((rat) => [rat.id, rat]));
  const analysisById = new Map(
    analyses.map((analysis) => [analysis.id, analysis]),
  );

  const controlFeatures = controls.map((record) => {
    const latestEvent = [...record.events].sort(
      (a, b) => Date.parse(b.time) - Date.parse(a.time),
    )[0];
    const productDetails = record.events
      .flatMap((event) => (event.product ? [event.product] : []))
      .map((product) =>
        [
          product.productName,
          product.productType,
          product.activeIngredient,
          product.registrationNumber,
        ]
          .filter(Boolean)
          .join("｜"),
      )
      .join("\n");
    const productTypes = new Set(
      record.events.flatMap((event) =>
        event.product ? [event.product.productType] : [],
      ),
    );
    const onlyProductType =
      productTypes.size === 1 ? [...productTypes][0] : undefined;
    const productCategory =
      onlyProductType === "rodenticide" || onlyProductType === "contraceptive"
        ? onlyProductType
        : "unknown";
    return pointFeature(record.id, record.location, {
      recordId: record.id,
      addressText: record.addressText,
      district: record.district,
      latestEventTime: latestEvent?.time ?? "",
      latestActions: latestEvent?.actions.join("、") ?? "",
      eventCount: record.events.length,
      contractorOrganizationId: record.contractorOrganizationId ?? "",
      timeline: formatTimeline(record.events),
      productDetails,
      productCategory,
      hasRemovedAction: record.events.some((event) =>
        event.actions.includes("removed"),
      ),
    });
  });

  const sampleFeatures = samples
    .filter((record) => record.sampleMethod !== "environmental_sampling")
    .map((record) => {
      const sampleCount = record.events.reduce(
        (sum, event) => sum + (event.sampleCount ?? 0),
        0,
      );
      const captureCount = record.events.reduce(
        (sum, event) => sum + event.captures.length,
        0,
      );
      const effort = record.events
        .filter((event) => event.samplingEffort)
        .map(
          (event) =>
            `${event.samplingEffort?.trapCount} traps × ${event.samplingEffort?.durationHours} h`,
        )
        .join("\n");
      return pointFeature(record.id, record.location, {
        recordId: record.id,
        addressText: record.addressText,
        district: record.district,
        sampleMethod: record.sampleMethod,
        eventCount: record.events.length,
        sampleCount,
        captureCount,
        samplingEffort: effort,
        timeline: formatTimeline(record.events),
        linkedOfficialObservationId: record.linkedOfficialObservationId ?? "",
        latestEventTime:
          record.events.reduce(
            (latest, event) =>
              Date.parse(event.time) > Date.parse(latest) ? event.time : latest,
            record.events[0]?.time ?? "",
          ) || "",
      });
    });

  const resolvedCaptures = samples.flatMap((record) =>
    record.events.flatMap((event) =>
      event.captures.flatMap((capture, captureIndex) => {
        const captureLocation =
          capture.location ?? event.location ?? record.location;
        if (!captureLocation) return [];
        return [
          {
            id: `${record.id}-${event.eventId}-${captureIndex}`,
            recordId: record.id,
            eventId: event.eventId,
            capture,
            capturedAt: event.time,
            location: captureLocation,
            locationSource: capture.location
              ? "capture"
              : event.location
                ? "event"
                : "record",
          },
        ];
      }),
    ),
  );
  const capturesByRat = new Map<string, typeof resolvedCaptures>();
  for (const encounter of resolvedCaptures) {
    const ratId = encounter.capture.ratId;
    if (!ratId) continue;
    const ratCaptures = capturesByRat.get(ratId) ?? [];
    ratCaptures.push(encounter);
    capturesByRat.set(ratId, ratCaptures);
  }
  const captureFeatures = resolvedCaptures.map((encounter) => {
    const ratId = encounter.capture.ratId;
    return pointFeature(encounter.id, encounter.location, {
      recordId: encounter.recordId,
      eventId: encounter.eventId,
      ratId: ratId ?? "",
      markCode: encounter.capture.markCode ?? "",
      captureStatus: encounter.capture.captureStatus,
      capturedAt: encounter.capturedAt,
      weightG: encounter.capture.weightG ?? "",
      released:
        encounter.capture.released === undefined
          ? ""
          : encounter.capture.released,
      locationSource: encounter.locationSource,
      hasRecapture: Boolean(ratId && (capturesByRat.get(ratId)?.length ?? 0) > 1),
    });
  });
  const captureConnectionFeatures = [...capturesByRat.entries()].flatMap(
    ([ratId, encounters]) => {
      const orderedEncounters = [...encounters].sort(
        (a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt),
      );
      return orderedEncounters.slice(1).map((encounter, index) => {
        const previousEncounter = orderedEncounters[index]!;
        return {
          type: "Feature",
          id: `cmr-connection-${ratId}-${index + 1}`,
          geometry: {
            type: "LineString",
            coordinates: [
              coordinates(previousEncounter.location),
              coordinates(encounter.location),
            ],
          },
          properties: {
            ratId,
            markCode:
              encounter.capture.markCode ??
              previousEncounter.capture.markCode ??
              "",
            fromCapturedAt: previousEncounter.capturedAt,
            toCapturedAt: encounter.capturedAt,
            fromRecordId: previousEncounter.recordId,
            toRecordId: encounter.recordId,
          },
        } satisfies Feature<LineString, Record<string, unknown>>;
      });
    },
  );

  const locateFirstCapture = (rat: RatIndividual): Location | undefined => {
    const record = sampleById.get(rat.firstCapture.sampleRecordId);
    const event = record?.events.find(
      (candidate) => candidate.eventId === rat.firstCapture.sampleEventId,
    );
    const capture = event?.captures.find(
      (candidate) => candidate.ratId === rat.id,
    );
    return capture?.location ?? event?.location ?? record?.location;
  };

  const geneticSampleFeatures = geneticSamples.flatMap((sample) => {
    const record = sampleById.get(sample.sampleRecordId);
    const event = record?.events.find(
      (candidate) => candidate.eventId === sample.sampleEventId,
    );
    const capture = sample.ratId
      ? event?.captures.find((candidate) => candidate.ratId === sample.ratId)
      : undefined;
    const sampleLocation =
      capture?.location ?? event?.location ?? record?.location;
    if (!sampleLocation) {
      console.warn(
        `${sample.id}: skipped because its sampling location could not be resolved`,
      );
      return [];
    }
    return [
      pointFeature(sample.id, sampleLocation, {
        sampleId: sample.sampleId,
        ratId: sample.ratId ?? "",
        individualKnown: Boolean(sample.ratId && ratById.has(sample.ratId)),
        collectedAt: sample.collectedAt,
        sampleType: sample.sampleType,
        analysisStatus: sample.analysisStatus,
        storageLocation: sample.storageLocation ?? "",
        sampleRecordId: sample.sampleRecordId,
        sampleEventId: sample.sampleEventId ?? "",
      }),
    ];
  });

  const relationshipKeys = new Set<string>();
  const confirmedRelationshipTypes = new Set([
    "parent_offspring",
    "full_sibling",
    "half_sibling",
    "other_related",
  ]);
  const relationshipFeatures = relationships.flatMap((relationship) => {
    const analysis = analysisById.get(relationship.analysisId);
    const ratA = ratById.get(relationship.ratIdA);
    const ratB = ratById.get(relationship.ratIdB);
    const pairKey = `${[relationship.ratIdA, relationship.ratIdB].sort().join("|")}|${relationship.analysisId}`;
    if (
      relationship.confidence === undefined ||
      !confirmedRelationshipTypes.has(relationship.relationshipType) ||
      !analysis ||
      !ratA ||
      !ratB ||
      relationship.ratIdA === relationship.ratIdB ||
      relationshipKeys.has(pairKey)
    ) {
      console.warn(
        `${relationship.id}: skipped because a join is invalid or duplicated`,
      );
      return [];
    }
    const start = locateFirstCapture(ratA);
    const end = locateFirstCapture(ratB);
    if (!start || !end) {
      console.warn(
        `${relationship.id}: skipped because an endpoint could not be resolved`,
      );
      return [];
    }
    relationshipKeys.add(pairKey);
    return [
      {
        type: "Feature",
        id: relationship.id,
        geometry: {
          type: "LineString",
          coordinates: [coordinates(start), coordinates(end)],
        },
        properties: {
          relationshipId: relationship.id,
          ratIdA: relationship.ratIdA,
          ratIdB: relationship.ratIdB,
          markCodeA: ratA.markCode ?? "",
          markCodeB: ratB.markCode ?? "",
          relationshipType: relationship.relationshipType,
          relatednessCoefficient: relationship.relatednessCoefficient ?? "",
          confidence: relationship.confidence ?? "",
          analysisId: relationship.analysisId,
          analysisVersion: analysis.analysisVersion,
          analysisType: analysis.analysisType,
          fromCapturedAt: ratA.firstCapturedAt,
          toCapturedAt: ratB.firstCapturedAt,
        },
      } satisfies Feature<LineString, Record<string, unknown>>,
    ];
  });

  const relationshipCounts = new Map<string, number>();
  for (const feature of relationshipFeatures) {
    for (const ratId of [
      String(feature.properties.ratIdA),
      String(feature.properties.ratIdB),
    ]) {
      relationshipCounts.set(ratId, (relationshipCounts.get(ratId) ?? 0) + 1);
    }
  }
  const geneticRelationshipNodeFeatures = [...relationshipCounts].flatMap(
    ([ratId, relationshipCount]) => {
      const rat = ratById.get(ratId);
      const location = rat ? locateFirstCapture(rat) : undefined;
      if (!rat || !location) return [];
      return [
        pointFeature(`genetic-relationship-node-${ratId}`, location, {
          ratId,
          markCode: rat.markCode ?? "",
          relationshipCount,
          firstCapturedAt: rat.firstCapturedAt,
        }),
      ];
    },
  );

  return {
    controlRecords: featureCollection(controlFeatures),
    sampleRecords: featureCollection(sampleFeatures),
    captureEncounters: featureCollection(captureFeatures),
    captureConnections: featureCollection(captureConnectionFeatures),
    geneticSamples: featureCollection(geneticSampleFeatures),
    geneticRelationshipNodes: featureCollection(
      geneticRelationshipNodeFeatures,
    ),
    geneticRelationships: featureCollection(relationshipFeatures),
  };
};
