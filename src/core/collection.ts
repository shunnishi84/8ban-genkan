import { DRUNK_WIFE_SCENARIOS } from '../data/drunkWife';
import { SCENARIOS } from '../data/scenarios';
import { PC_DELIVERY, PC_SURPRISE } from '../data/pc';
import { CHAT_TEMPLATES } from '../data/chat';
import { FINALES, FINALE_IDS } from '../data/finales';
import { ITEMS } from '../data/items';
import { ARRESTS, type ArrestId } from '../data/arrests';
import type { Scenario } from './types';

/**
 * 異変コレクション。火種のある日（異変なしの日は除く）と、妻が酔っている日、日をまたぐ異変。
 * 遭遇したものだけ名前が見え、まだのものは「???????」。
 */
export const COLLECTION: { label: string; scenarios: Scenario[] }[] = [
  { label: '異変', scenarios: SCENARIOS.filter((s) => s.causes.length > 0) },
  { label: '妻が酔っている日', scenarios: DRUNK_WIFE_SCENARIOS },
  { label: '日をまたぐ異変', scenarios: [PC_DELIVERY, PC_SURPRISE] },
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

/**
 * エンディング一覧（ふつうの怒られエンド＋特殊エンディング。異変ではないので、回収率とは別に数える）。
 * id はゲーム側で記録するときのキー（endingId で作る）
 */
export const SPECIAL_ENDINGS: { id: string; title: string }[] = [
  // ふつうの怒られエンド
  { id: endingId('normal', 'angry'), title: '妻の怒り（鬼）' },
  { id: endingId('normal', 'demon'), title: '魔王化' },
  { id: endingId('normal', 'late'), title: '遅すぎる帰宅' },
  { id: endingId('normal', 'dawn'), title: '朝帰り' },
  ...FINALE_IDS.flatMap((id) => [
    { id: endingId('finale', id), title: FINALES[id].title },
    ...(FINALES[id].finalForm ? [{ id: endingId('finale', `${id}_final`), title: `${FINALES[id].title}（最終形態）` }] : []),
    // 魔王城で鬼のお面を使うと鬼神（どうぐに「お面」がある魔王だけ）
    ...(FINALES[id].choice?.options.some((o) => o.kishin)
      ? [
          { id: endingId('finale', `${id}_kishin`), title: `${FINALES[id].title}（鬼神）` },
          { id: endingId('finale', `${id}_final_kishin`), title: `${FINALES[id].title}（鬼神・最終形態）` },
        ]
      : []),
  ]),
  ...CHAT_TEMPLATES.filter((t) => t.prankEnding).map((t) => ({ id: endingId('prank', t.id), title: t.prankEnding!.title })),
  ...ITEMS.filter((i) => i.collapse).map((i) => ({ id: endingId('collapse', i.id), title: i.collapse!.title })),
  ...(Object.keys(ARRESTS) as ArrestId[]).map((id) => ({ id: endingId('arrest', id), title: ARRESTS[id].title })),
  { id: endingId('party'), title: '夫婦で宴会' },
];

/** 特殊エンディングの記録キー */
export function endingId(kind: 'normal' | 'finale' | 'prank' | 'collapse' | 'arrest' | 'party', id = ''): string {
  return id ? `${kind}:${id}` : kind;
}
