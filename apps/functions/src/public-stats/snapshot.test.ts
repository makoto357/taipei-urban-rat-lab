import { describe, expect, it } from 'vitest';

import { summarizeObservations } from './snapshot.js';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 24);

describe('summarizeObservations', () => {
  it('counts only evidence_found within 30 days', () => {
    const result = summarizeObservations([
      { observedAtMs: NOW - 2 * DAY, surveyResult: 'evidence_found' },
      { observedAtMs: NOW - 29 * DAY, surveyResult: 'evidence_found' },
      { observedAtMs: NOW - 31 * DAY, surveyResult: 'evidence_found' },
      { observedAtMs: NOW - 3 * DAY, surveyResult: 'no_evidence_found' },
      { observedAtMs: NOW - 4 * DAY, surveyResult: 'unable_to_assess' },
    ], NOW);
    expect(result.verifiedTraces30d).toBe(2);
  });

  it('takes coverage from every survey, ignoring future-dated rows', () => {
    const result = summarizeObservations([
      { observedAtMs: NOW - 90 * DAY, surveyResult: 'no_evidence_found' },
      { observedAtMs: NOW - 1 * DAY, surveyResult: 'evidence_found' },
      { observedAtMs: NOW + 10 * DAY, surveyResult: 'evidence_found' },
    ], NOW);
    expect(result.coverageStartMs).toBe(NOW - 90 * DAY);
    expect(result.coverageEndMs).toBe(NOW - 1 * DAY);
    expect(result.verifiedTraces30d).toBe(1);
  });

  it('returns empty numbers when there are no observations', () => {
    expect(summarizeObservations([], NOW)).toEqual({
      verifiedTraces30d: 0,
      coverageStartMs: null,
      coverageEndMs: null,
    });
  });
});
