import type { FeatureCollection, Point } from "geojson";

type JsonObject = Record<string, unknown>;

const surveyMethods = [
  "visual_inspection",
  "routine_inspection",
  "environmental_inspection",
  "trap_survey",
] as const;
const surveyResults = [
  "evidence_found",
  "no_evidence_found",
  "unable_to_assess",
] as const;
const observationTypes = [
  "clutter",
  "food_waste",
  "gnaw_marks",
  "live_rat",
  "rat_burrow",
  "rat_droppings",
  "uncovered_bin",
  "unused_space",
  "waste_accumulation",
] as const;

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

const enumValue = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
) => {
  const result = string(value, field);
  if (!allowed.includes(result as T)) {
    throw new Error(`${field} has unsupported value: ${result}`);
  }
  return result;
};

const isoDate = (value: unknown, field: string) => {
  const result = string(value, field);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(result) || Number.isNaN(Date.parse(result))) {
    throw new Error(`${field} must be an ISO date-time`);
  }
  return result;
};

export const loadOfficialObservations = async (signal: AbortSignal) => {
  const response = await fetch("/data/mock-official-observations.json", {
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to load official observations: ${response.status}`);
  }

  const root = object(
    (await response.json()) as unknown,
    "official observations",
  );
  if (!Array.isArray(root.documents)) {
    throw new Error("Official observation documents must be an array");
  }
  const isSynthetic = root.provenance === "synthetic_mock";

  const features: FeatureCollection<
    Point,
    Record<string, unknown>
  >["features"] = [];
  root.documents.forEach((document, index) => {
    try {
      const rawDocument = object(document, `official observations[${index}]`);
      const id = string(rawDocument.id, `official observations[${index}].id`);
      const data = object(rawDocument.data, `${id}.data`);
      const rawLocation = object(data.location, `${id}.location`);
      if (
        typeof rawLocation.longitude !== "number" ||
        !Number.isFinite(rawLocation.longitude) ||
        typeof rawLocation.latitude !== "number" ||
        !Number.isFinite(rawLocation.latitude) ||
        rawLocation.longitude < -180 ||
        rawLocation.longitude > 180 ||
        rawLocation.latitude < -90 ||
        rawLocation.latitude > 90
      ) {
        throw new Error(`${id}.location is invalid`);
      }
      if (!Array.isArray(data.observationTypes)) {
        throw new Error(`${id}.observationTypes must be an array`);
      }
      const types = data.observationTypes.map((type, typeIndex) =>
        enumValue(
          type,
          observationTypes,
          `${id}.observationTypes[${typeIndex}]`,
        ),
      );

      features.push({
        type: "Feature",
        id,
        geometry: {
          type: "Point",
          coordinates: [rawLocation.longitude, rawLocation.latitude],
        },
        properties: {
          observationId: id,
          observedAt: isoDate(data.observedAt, `${id}.observedAt`),
          addressText: string(data.addressText, `${id}.addressText`),
          district: string(data.district, `${id}.district`),
          surveyMethod: enumValue(
            data.surveyMethod,
            surveyMethods,
            `${id}.surveyMethod`,
          ),
          surveyResult: enumValue(
            data.surveyResult,
            surveyResults,
            `${id}.surveyResult`,
          ),
          observationTypes: types.join("、"),
          description: optionalString(data.description, `${id}.description`),
          recommendedActions: optionalString(
            data.recommendedActions,
            `${id}.recommendedActions`,
          ),
          isSynthetic,
        },
      });
    } catch (error) {
      console.warn(
        `mock-official-observations.json: skipped record ${index}:`,
        error instanceof Error ? error.message : error,
      );
    }
  });

  return { type: "FeatureCollection", features } satisfies FeatureCollection<
    Point,
    Record<string, unknown>
  >;
};
