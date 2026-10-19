// 自動解答器。シナリオ整合性テストと、デバッグ表示（?debug）で使う。
import { CHAT_MAP } from '../data/chat';
import { ITEM_MAP } from '../data/items';
import { pickSatisfyingFlags } from './requirement';
import type { Action, DayState } from './types';

/** そのフラグを立てる手段が存在するか（時間は考えない静的チェック） */
export const isObtainable = (state: DayState, flag: string, depth = 0): boolean => {
  if (depth > 8) return false;
  const [kind, id] = flag.split(':');
  const item = ITEM_MAP[id];
  const inHand = state.inventory.includes(id) || state.pickups.some((p) => p.item === id);
  switch (kind) {
    case 'bought':
      return item?.source === 'konbini';
    case 'ordered':
      return item?.source === 'mail';
    case 'canceled':
      return state.orders[id] === 'existing';
    case 'unsent':
      return state.clues.some((c) => c.id === id && c.unsendable);
    case 'deleted':
      return state.clues.some((c) => c.id === id && c.deletable);
    case 'picked':
      return state.pickups.some((p) => p.item === id);
    case 'discarded':
      return !!item?.discardable && (inHand || item.source === 'konbini');
    case 'used':
      if (item?.useRequires && !state.inventory.includes(item.useRequires)) return false;
      return !!item?.useLabel && (inHand || item.source === 'konbini');
    case 'chat': {
      const t = CHAT_MAP[id];
      if (!t) return false;
      if (!t.requires) return true;
      return pickSatisfyingFlags(t.requires, (f) => isObtainable(state, f, depth + 1)) !== null;
    }
    default:
      return false;
  }
};

/** 全原因を解消するのに必要なフラグ集合（解けなければ null） */
const requiredFlags = (state: DayState): string[] | null => {
  const out = new Set<string>();
  for (const c of state.causes) {
    const flags = pickSatisfyingFlags(c.resolution, (f) => isObtainable(state, f));
    if (!flags) return null;
    flags.forEach((f) => out.add(f));
  }
  // チャットの前提条件も必要フラグに含める
  for (const f of [...out]) {
    const [kind, id] = f.split(':');
    const req = kind === 'chat' ? CHAT_MAP[id]?.requires : undefined;
    if (req) pickSatisfyingFlags(req, (g) => isObtainable(state, g))?.forEach((g) => out.add(g));
  }
  // 既に立っているフラグはやり直さない（プレイ途中のデバッグ表示用）
  return [...out].filter((f) => !state.flags.has(f));
};

/**
 * 最短っぽい手順を組み立てる。
 * 締切のある送信取消・通販注文・キャンセルを最初に、次に街へ出て買い物→使用→ゴミ捨て、最後にチャット。
 */
export const solve = (state: DayState): Action[] | null => {
  const flags = requiredFlags(state);
  if (!flags) return null;
  const of = (kind: string) => flags.filter((f) => f.startsWith(`${kind}:`)).map((f) => f.split(':')[1]);

  const plan: Action[] = [];
  const toUse = of('used');
  const toDiscard = of('discarded');
  const toBuy = new Set([...of('bought'), ...[...toUse, ...toDiscard].filter((id) => ITEM_MAP[id]?.source === 'konbini' && !state.inventory.includes(id) && !state.pickups.some((p) => p.item === id))]);
  const toPick = new Set([...of('picked'), ...toDiscard.filter((id) => state.pickups.some((p) => p.item === id))]);

  toPick.forEach((item) => plan.push({ type: 'pickup', item }));
  of('unsent').forEach((clue) => plan.push({ type: 'unsend', clue }));
  of('deleted').forEach((clue) => plan.push({ type: 'deletePost', clue }));
  if (of('ordered').length || of('canceled').length) plan.push({ type: 'openApp', app: 'shop' });
  of('canceled').forEach((item) => plan.push({ type: 'cancelOrder', item }));
  of('ordered').forEach((item) => plan.push({ type: 'order', item }));

  if (toBuy.size || toDiscard.length) {
    plan.push({ type: 'travel', to: 'town' });
    if (toBuy.size) {
      plan.push({ type: 'travel', to: 'konbini' });
      toBuy.forEach((item) => plan.push({ type: 'buy', item }));
      plan.push({ type: 'travel', to: 'town' });
    }
    if (toDiscard.length) {
      plan.push({ type: 'travel', to: 'trash' });
      toDiscard.forEach((item) => plan.push({ type: 'discard', item }));
      plan.push({ type: 'travel', to: 'town' });
    }
    plan.push({ type: 'travel', to: 'door' });
  }
  toUse.forEach((item) => plan.push({ type: 'use', item }));
  of('chat').forEach((template) => plan.push({ type: 'sendChat', template }));
  plan.push({ type: 'openDoor' });
  return plan;
};
