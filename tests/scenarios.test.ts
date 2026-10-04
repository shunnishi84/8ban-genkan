// シナリオ整合性テスト: 解消不可能な原因が無いか、データの参照切れが無いか。
import { describe, expect, it } from 'vitest';
import { IMAGES, ITEM_ICONS } from '../src/assets/manifest';
import { CHAT_MAP, CHAT_TEMPLATES } from '../src/data/chat';
import { ITEMS, ITEM_MAP } from '../src/data/items';
import { SCENARIOS } from '../src/data/scenarios';
import { GOAL_DAYS, startTimeFor } from '../src/core/config';
import { buildDay, perform } from '../src/core/engine';
import { flagsIn } from '../src/core/requirement';
import { isObtainable, solve } from '../src/core/solver';
import type { DayState, Scenario } from '../src/core/types';

const causeScenarios = SCENARIOS.filter((s) => s.causes.length > 0);
const normalScenarios = SCENARIOS.filter((s) => s.causes.length === 0);
/** いちばん厳しい開始時刻（最終日・ゆらぎ最大） */
const WORST_START = startTimeFor(GOAL_DAYS, 0.9999);

const runPlan = (state: DayState) => {
  const plan = solve(state);
  expect(plan, `解答手順が組めない: ${state.scenarioIds.join('+')}`).not.toBeNull();
  let last = null as ReturnType<typeof perform> | null;
  for (const action of plan!) {
    last = perform(state, action);
    expect(last.ok, `${JSON.stringify(action)} が失敗: ${last.messages.join(' ')}`).toBe(true);
    if (last.outcome.kind !== 'continue') break;
  }
  return last!;
};

const combos = <T>(list: T[], k: number): T[][] =>
  k === 0 ? [[]] : list.flatMap((x, i) => combos(list.slice(i + 1), k - 1).map((rest) => [x, ...rest]));

const compatible = (group: Scenario[]) =>
  group.every((a) => group.every((b) => a === b || !a.conflictsWith?.includes(b.id)));

describe('データの参照整合性', () => {
  it('ID が重複していない', () => {
    const uniq = (ids: string[]) => expect(new Set(ids).size).toBe(ids.length);
    uniq(SCENARIOS.map((s) => s.id));
    uniq(SCENARIOS.flatMap((s) => s.causes.map((c) => c.id)));
    uniq(ITEMS.map((i) => i.id));
    uniq(CHAT_TEMPLATES.map((t) => t.id));
  });

  it.each(SCENARIOS.map((s) => [s.id, s] as const))('%s: 参照しているアイテム・画像・シナリオが存在する', (_, s) => {
    for (const i of s.startItems ?? []) expect(ITEM_MAP[i.item], i.item).toBeDefined();
    for (const p of s.pickups ?? []) expect(ITEM_MAP[p.item], p.item).toBeDefined();
    for (const o of s.startOrders ?? []) expect(ITEM_MAP[o], o).toBeDefined();
    for (const v of [...(s.visuals ?? []), ...(s.pickups ?? []).flatMap((p) => p.visual ?? [])]) {
      expect(IMAGES, `manifest に ${v} が無い`).toHaveProperty(v);
    }
    for (const id of s.conflictsWith ?? []) expect(SCENARIOS.map((x) => x.id)).toContain(id);
    for (const c of s.clues) if (c.image) expect(IMAGES, `manifest に ${c.image} が無い`).toHaveProperty(c.image);
  });

  it('アイテムのイラスト指定が実在するアイテム・画像を指している', () => {
    for (const [item, image] of Object.entries(ITEM_ICONS)) {
      expect(ITEM_MAP[item], item).toBeDefined();
      expect(IMAGES).toHaveProperty(image!);
    }
  });

  it('チャット定型文の前提フラグが実在するアイテムを指している', () => {
    for (const t of CHAT_TEMPLATES) {
      for (const f of t.requires ? flagsIn(t.requires) : []) {
        expect(ITEM_MAP[f.split(':')[1]], `${t.id}: ${f}`).toBeDefined();
      }
    }
  });
});

describe('シナリオの構成', () => {
  it('異変なしの日が2種類以上ある', () => {
    expect(normalScenarios.length).toBeGreaterThanOrEqual(2);
  });

  it('異変なしの日には紛らわしいニセ異変が入っている', () => {
    for (const s of normalScenarios) expect(s.clues.filter((c) => !c.cause).length, s.id).toBeGreaterThan(0);
  });

  it.each(causeScenarios.map((s) => [s.id, s] as const))('%s: 各原因に手がかり・怒りセリフ・帰宅セリフがある', (_, s) => {
    for (const c of s.causes) {
      expect(s.clues.some((cl) => cl.cause === c.id), `${c.id} の手がかりが無い`).toBe(true);
      expect(c.angerLines.length).toBeGreaterThan(0);
      expect(c.successLine).not.toBe('');
    }
    for (const cl of s.clues) {
      if (cl.cause) expect(s.causes.map((c) => c.id)).toContain(cl.cause);
    }
  });

  it('最終日（3つ同時）まで同じ周回でシナリオを重複させずに足りる', () => {
    // 1〜5日目: 1, 6〜7日目: 2, 8日目: 3 → 最大 12 本
    expect(causeScenarios.length).toBeGreaterThanOrEqual(12);
  });
});

describe('解消可能性', () => {
  it.each(causeScenarios.map((s) => [s.id, s] as const))('%s: 解消に必要なフラグはすべて入手手段がある', (_, s) => {
    const state = buildDay(1, [s], WORST_START);
    for (const c of s.causes) {
      for (const f of flagsIn(c.resolution)) expect(isObtainable(state, f), `${c.id}: ${f} が入手不能`).toBe(true);
    }
    for (const f of flagsIn(s.causes[0].resolution).filter((x) => x.startsWith('chat:'))) {
      expect(CHAT_MAP[f.slice(5)], f).toBeDefined();
    }
  });

  it.each(causeScenarios.map((s) => [s.id, s] as const))('%s: 何もせずドアを開けると怒られる', (_, s) => {
    const state = buildDay(1, [s], WORST_START);
    expect(perform(state, { type: 'openDoor' }).outcome.kind).toBe('angry');
  });

  it.each(normalScenarios.map((s) => [s.id, s] as const))('%s: 異変なしはそのまま開けて帰宅できる', (_, s) => {
    const state = buildDay(1, [s], WORST_START);
    expect(perform(state, { type: 'openDoor' }).outcome.kind).toBe('home');
  });

  it.each(causeScenarios.map((s) => [s.id, s] as const))('%s: 最も遅い開始時刻でも単独で解ける', (_, s) => {
    expect(runPlan(buildDay(GOAL_DAYS, [s], WORST_START)).outcome.kind).toBe('home');
  });

  it('両立できる3重の組み合わせはすべて最終日の開始時刻から解ける', () => {
    const groups = combos(causeScenarios, 3).filter(compatible);
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      const r = runPlan(buildDay(GOAL_DAYS, g, WORST_START));
      expect(r.outcome.kind, g.map((s) => s.id).join('+')).toBe('home');
    }
  });
});
