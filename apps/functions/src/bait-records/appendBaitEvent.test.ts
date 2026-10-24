import { describe, expect, it } from 'vitest';

import { parseAppendBaitEventInput } from './appendBaitEvent.js';

describe('parseAppendBaitEventInput', () => {
  it('accepts a valid check-only event with no product', () => {
    const input = parseAppendBaitEventInput({
      recordId: 'bait-1',
      actions: ['checked'],
      photoPaths: ['staging/official-1/media-1'],
      notes: '餌站完好',
    });
    expect(input).toMatchObject({ recordId: 'bait-1', actions: ['checked'], notes: '餌站完好' });
    expect(input.product).toBeUndefined();
  });

  it('rejects a missing recordId', () => {
    expect(() => parseAppendBaitEventInput({ actions: ['checked'] })).toThrow();
  });

  it('rejects an empty or invalid actions list', () => {
    expect(() => parseAppendBaitEventInput({ recordId: 'bait-1', actions: [] })).toThrow();
    expect(() => parseAppendBaitEventInput({ recordId: 'bait-1', actions: ['not_a_real_action'] })).toThrow();
  });

  it('requires product details when actions includes bait_placed', () => {
    expect(() => parseAppendBaitEventInput({
      recordId: 'bait-1',
      actions: ['bait_placed'],
    })).toThrow();

    const input = parseAppendBaitEventInput({
      recordId: 'bait-1',
      actions: ['bait_placed'],
      product: { productName: 'X', productType: 'rodenticide' },
    });
    expect(input.product).toMatchObject({ productName: 'X', productType: 'rodenticide' });
  });

  it('rejects an invalid product shape even when bait_placed is not selected', () => {
    expect(() => parseAppendBaitEventInput({
      recordId: 'bait-1',
      actions: ['checked'],
      product: { productName: 'X' },
    })).toThrow();
  });

  // plan.md Phase 5: 「removed 不等於 safe」——這個解析層完全不產生任何
  // safety/resolved 欄位；"removed" 單純是個被接受的 action 值。
  it('treats "removed" as an ordinary action with no implied safety status', () => {
    const input = parseAppendBaitEventInput({ recordId: 'bait-1', actions: ['removed'] });
    expect(input).not.toHaveProperty('status');
    expect(input).not.toHaveProperty('safe');
    expect(input).not.toHaveProperty('resolved');
  });
});
