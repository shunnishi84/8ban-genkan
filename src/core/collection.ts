import { DRUNK_WIFE_SCENARIOS } from '../data/drunkWife';
import { SCENARIOS } from '../data/scenarios';
import type { Scenario } from './types';

/**
 * 異変コレクション。火種のある日（異変なしの日は除く）と、妻が酔っている日。
 * 遭遇したものだけ名前が見え、まだのものは「???????」。
 */
export const COLLECTION: { label: string; scenarios: Scenario[] }[] = [
  { label: '異変', scenarios: SCENARIOS.filter((s) => s.causes.length > 0) },
  { label: '妻が酔っている日', scenarios: DRUNK_WIFE_SCENARIOS },
];

const ALL_IDS = new Set(COLLECTION.flatMap((g) => g.scenarios.map((s) => s.id)));

/** コレクションの対象になる ID だけに絞る（異変なしの日などは数えない） */
export const collectible = (ids: string[]): string[] => ids.filter((id) => ALL_IDS.has(id));

/** 回収率（%、小数点1桁の文字列） */
export const collectionRate = (seen: Set<string>): string => {
  const got = [...ALL_IDS].filter((id) => seen.has(id)).length;
  return ((got / ALL_IDS.size) * 100).toFixed(1);
};

export const collectionCount = (seen: Set<string>): { got: number; total: number } => ({
  got: [...ALL_IDS].filter((id) => seen.has(id)).length,
  total: ALL_IDS.size,
});
