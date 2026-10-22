import { describe, expect, it } from 'vitest';
import { COLLECTION, collectible, collectionCount, collectionRate } from '../src/core/collection';
import { SCENARIOS } from '../src/data/scenarios';
import { DRUNK_WIFE_SCENARIOS } from '../src/data/drunkWife';

describe('異変コレクション', () => {
  const all = COLLECTION.flatMap((g) => g.scenarios.map((s) => s.id));

  it('火種のある日と妻が酔っている日が全部入っていて、異変なしの日は入らない', () => {
    for (const s of SCENARIOS) expect(all.includes(s.id), s.id).toBe(s.causes.length > 0);
    for (const s of DRUNK_WIFE_SCENARIOS) expect(all).toContain(s.id);
    expect(new Set(all).size).toBe(all.length);
  });

  it('異変なしの日は数えない', () => {
    expect(collectible(['ramen_receipt', 'ring_off', 'wife_drunk_amae'])).toEqual(['ring_off', 'wife_drunk_amae']);
  });

  it('回収率は小数点1桁', () => {
    expect(collectionRate(new Set())).toBe('0.0');
    expect(collectionRate(new Set(all))).toBe('100.0');
    const one = new Set([all[0], 'ramen_receipt']);
    expect(collectionCount(one)).toEqual({ got: 1, total: all.length });
    expect(collectionRate(one)).toBe(((1 / all.length) * 100).toFixed(1));
  });
});
