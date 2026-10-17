// ゲームの純粋ロジック。DOM・音・描画には一切触らない。
import { CHAT_MAP, CHAT_TEMPLATES, COLD_REPLIES } from '../data/chat';
import { FINALES, FINALE_IDS, type Finale } from '../data/finales';
import { ITEM_MAP } from '../data/items';
import { SCENARIOS } from '../data/scenarios';
import {
  CANCEL_DEADLINE,
  COST,
  EXPRESS_DEADLINE,
  GOAL_DAYS,
  NO_ANOMALY_RATE,
  TIME_LIMIT,
  TRAVEL,
  causeCountFor,
  formatTime,
  startTimeFor,
} from './config';
import { evaluate, flagsIn } from './requirement';
import { shuffle, type Rng } from './rng';
import type {
  Action,
  ActionResult,
  Cause,
  Clue,
  ClueLocation,
  DayState,
  Outcome,
  RunState,
  Scenario,
} from './types';

export const newRun = (): RunState => ({ day: 1, used: [], streak: 0 });

const isNormal = (s: Scenario) => s.causes.length === 0;

/**
 * その日のシナリオを選ぶ。
 * - 1〜5日目は一定確率で「異変なし」
 * - 原因の数は causeCountFor(day)。conflictsWith の組み合わせは避ける
 * - 同じ周回で使ったシナリオは選ばない（足りなくなったら未使用優先で再利用）
 */
export const chooseScenarios = (
  run: RunState,
  rng: Rng,
  pool: readonly Scenario[] = SCENARIOS,
): Scenario[] => {
  const unused = (list: Scenario[]) => list.filter((s) => !run.used.includes(s.id));
  const normals = pool.filter(isNormal);
  const abnormals = pool.filter((s) => !isNormal(s));

  if (run.day <= 5 && rng() < NO_ANOMALY_RATE && unused(normals).length > 0) {
    return [shuffle(rng, unused(normals))[0]];
  }

  const want = Math.min(causeCountFor(run.day), abnormals.length);
  // 未使用を先に、使用済みを後ろに並べて先頭から貪欲に取る
  const ordered = [...shuffle(rng, unused(abnormals)), ...shuffle(rng, abnormals.filter((s) => run.used.includes(s.id)))];
  const chosen: Scenario[] = [];
  for (const s of ordered) {
    if (chosen.length >= want) break;
    const clash = chosen.some((c) => c.conflictsWith?.includes(s.id) || s.conflictsWith?.includes(c.id));
    if (!clash) chosen.push(s);
  }
  return chosen;
};

/** シナリオ（複数可）を合成して1日分の状態を作る */
export const buildDay = (day: number, scenarios: Scenario[], startTime: number, seed = 0): DayState => {
  const orders: DayState['orders'] = {};
  for (const s of scenarios) for (const o of s.startOrders ?? []) orders[o] = 'existing';
  const normal = scenarios.every(isNormal);
  return {
    day,
    scenarioIds: scenarios.map((s) => s.id),
    causes: scenarios.flatMap((s) => s.causes),
    clues: scenarios.flatMap((s) => s.clues),
    pickups: scenarios.flatMap((s) => s.pickups ?? []),
    visuals: scenarios.flatMap((s) => s.visuals ?? []),
    startTime,
    time: startTime,
    location: 'door',
    flags: new Set(),
    inventory: scenarios.flatMap((s) => (s.startItems ?? []).map((i) => i.item)),
    orders,
    chatLog: [],
    successLines: normal
      ? scenarios.map((s) => s.successLine ?? 'おかえり。今日もお疲れさま')
      : scenarios.flatMap((s) => s.causes.map((c) => c.successLine)),
    homeAlone: scenarios.length > 0 && scenarios.every((s) => s.homeAlone),
    seed,
  };
};

export const startDay = (run: RunState, rng: Rng, pool: readonly Scenario[] = SCENARIOS): DayState => {
  const scenarios = chooseScenarios(run, rng, pool);
  run.used.push(...scenarios.map((s) => s.id));
  return buildDay(run.day, scenarios, startTimeFor(run.day, rng()), rng());
};

/** 帰宅成功時に周回を進める。クリアしたら true */
export const advanceRun = (run: RunState): boolean => {
  run.streak += 1;
  run.day += 1;
  return run.streak >= GOAL_DAYS;
};

// ------------------------------------------------------------------ 参照系

export const visibleClues = (state: DayState, at: ClueLocation): Clue[] =>
  state.clues.filter((c) => c.at === at && !(c.hiddenWhen && evaluate(c.hiddenWhen, state.flags)));

/** チャット本文末尾の「（HH:MM）」/「（昨日）」から並び順のキーを作る。時刻の無いものは最後 */
const chatTimeKey = (text: string): number => {
  if (text.includes('（昨日）')) return -1;
  const m = text.match(/（(\d{1,2}):(\d{2})）\s*$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.POSITIVE_INFINITY;
};

/**
 * チャットアプリに出す手がかりを時刻順に並べる。
 * 複数シナリオを合成した日でも、メッセージの時系列が前後しないようにする（同時刻は元の順）。
 */
export const chatTimeline = (state: DayState): Clue[] =>
  visibleClues(state, 'app:chat')
    .map((c, i) => ({ c, i, k: chatTimeKey(c.text) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map((x) => x.c);

export const unresolvedCauses = (state: DayState): Cause[] =>
  state.causes.filter((c) => !evaluate(c.resolution, state.flags));

/** チャット定型文がその日の原因に関係あるか */
export const isChatRelevant = (state: DayState, templateId: string): boolean =>
  state.causes.some((c) => flagsIn(c.resolution).includes(`chat:${templateId}`));

export const canSendChat = (state: DayState, templateId: string): boolean => {
  const t = CHAT_MAP[templateId];
  if (!t || state.flags.has(`chat:${templateId}`)) return false;
  if (t.onlyWith && !state.causes.some((c) => c.id === t.onlyWith)) return false;
  return !t.requires || evaluate(t.requires, state.flags);
};

export const hasUnreadChat = (state: DayState): boolean =>
  !state.flags.has('read:chat') && visibleClues(state, 'app:chat').some((c) => c.unread);

// ------------------------------------------------------------------ 行動

const result = (ok: boolean, messages: string[], cost = 0, outcome: Outcome = { kind: 'continue' }): ActionResult => ({
  ok,
  messages,
  cost,
  outcome,
});

/** 初回だけ時間がかかる「見る」系の行動 */
const look = (state: DayState, key: string, cost: number): ActionResult => {
  const flag = `seen:${key}`;
  if (state.flags.has(flag)) return result(true, []);
  state.flags.add(flag);
  return result(true, [], cost);
};

/** スマホを使う行動（スマホが壊れたらできない） */
const PHONE_ACTIONS = new Set<Action['type']>(['openApp', 'sendChat', 'order', 'cancelOrder', 'unsend', 'deletePost']);

const act = (state: DayState, action: Action): ActionResult => {
  if (state.flags.has('phone_broken') && PHONE_ACTIONS.has(action.type)) {
    return result(false, ['スマホは割れていて、もう何も映らない。']);
  }
  switch (action.type) {
    case 'inspect':
      if (state.location !== 'door') return result(false, ['家の前にいないと調べられない。']);
      return look(state, `spot:${action.spot}`, COST.inspect);

    case 'openSlot':
      return look(state, `slot:${action.slot}`, COST.openSlot);

    case 'openApp': {
      // ベンチは通販アプリを開くための場所なので、ベンチで開く通販はタダ
      const cost = action.app === 'shop' && state.location === 'bench' ? 0 : COST.openApp;
      const r = look(state, `app:${action.app}`, cost);
      if (action.app === 'chat') state.flags.add('read:chat');
      return r;
    }

    case 'sendChat': {
      const t = CHAT_MAP[action.template];
      if (!t) return result(false, ['そんなメッセージは無い。']);
      if (state.flags.has(`chat:${t.id}`)) return result(false, ['それはもう送った。']);
      if (t.requires && !evaluate(t.requires, state.flags)) return result(false, ['まだそれを言える状況じゃない。']);
      if (t.onlyWith && !state.causes.some((c) => c.id === t.onlyWith)) return result(false, ['今それを言う意味がない。']);
      state.flags.add(`chat:${t.id}`);
      state.chatLog.push({ from: 'me', text: t.text });
      // 何か送るとトーク画面を開かれ、取り消し前の誤爆メッセージにも既読がつく
      const exposed = markMisfiresRead(state);
      const send = (...rest: string[]) => ['送信した。', ...exposed, ...rest];
      // 一度でも暴言を送ったら、以後は何を送っても取りつく島もない返事だけ（電話も来ない）
      const coldReply = () => COLD_REPLIES[state.chatLog.filter((m) => m.from === 'wife').length % COLD_REPLIES.length];
      const alreadyInsulted = state.flags.has('insulted');
      if (t.insult) {
        state.flags.add('insulted');
        state.flags.add(`insult:${t.id}`);
        state.chatLog.push({ from: 'wife', text: alreadyInsulted ? coldReply() : t.replyIrrelevant || '既読' });
        const finale = triggerFinale(state);
        return result(
          true,
          [...send('……既読がついた。返事はない。電話も来ない。'), '背筋に、冷たいものが走った。', ...(finale?.onTrigger ?? [])],
          COST.sendChat,
        );
      }
      if (alreadyInsulted) {
        state.chatLog.push({ from: 'wife', text: coldReply() });
        return result(true, send('……取りつく島もない。'), COST.sendChat);
      }
      if (t.provokeLines) {
        state.flags.add(`provoked:${t.id}`);
        state.chatLog.push({ from: 'wife', text: t.replyRelevant });
        return result(true, send('……妙に静かだ。', '言わなくていいことを言った気がする。'), COST.sendChat);
      }
      const relevant = isChatRelevant(state, t.id);
      const reply = relevant ? t.replyRelevant : t.replyIrrelevant;
      if (reply) state.chatLog.push({ from: 'wife', text: reply });
      if (relevant || t.neutral) return result(true, send(), COST.sendChat);
      return result(
        true,
        [...exposed, '妻から電話がかかってきた……。', `しどろもどろの言い訳で ${COST.chatPenalty} 分を失った。`],
        COST.sendChat + COST.chatPenalty,
      );
    }

    case 'order': {
      const item = ITEM_MAP[action.item];
      if (!item || item.source !== 'mail') return result(false, ['その商品は通販にない。']);
      if (state.orders[item.id] && state.orders[item.id] !== 'canceled') return result(false, ['もう注文してある。']);
      if (state.time <= EXPRESS_DEADLINE) {
        state.orders[item.id] = 'express';
        state.flags.add(`ordered:${item.id}`);
        return result(true, [`「${item.name}」を特急便で注文した。明日の朝届く！`], COST.order);
      }
      state.orders[item.id] = 'late';
      state.flags.add(`ordered_late:${item.id}`);
      return result(
        true,
        [`「${item.name}」を注文した。……特急便の締切（${formatTime(EXPRESS_DEADLINE)}）を過ぎていて、明後日着になった。`],
        COST.order,
      );
    }

    case 'cancelOrder': {
      if (state.orders[action.item] !== 'existing') return result(false, ['キャンセルできる注文がない。']);
      if (state.time > CANCEL_DEADLINE) return result(false, ['発送処理済みのため、キャンセルできません。']);
      state.orders[action.item] = 'canceled';
      state.flags.add(`canceled:${action.item}`);
      return result(true, [`「${ITEM_MAP[action.item]?.name ?? action.item}」の注文をキャンセルした。`], COST.cancelOrder);
    }

    case 'buy': {
      const item = ITEM_MAP[action.item];
      if (state.location !== 'konbini') return result(false, ['コンビニにいない。']);
      if (!item || item.source !== 'konbini') return result(false, ['その商品はコンビニに置いていない。']);
      state.inventory.push(item.id);
      state.flags.add(`bought:${item.id}`);
      return result(true, [`「${item.name}」を買った。`], COST.buy);
    }

    case 'discard': {
      const item = ITEM_MAP[action.item];
      const idx = state.inventory.indexOf(action.item);
      if (state.location !== 'trash') return result(false, ['ゴミ捨て場にいない。']);
      if (idx < 0 || !item?.discardable) return result(false, ['それは捨てられない。']);
      state.inventory.splice(idx, 1);
      state.flags.add(`discarded:${item.id}`);
      return result(true, [`「${item.name}」を捨てた。`], COST.discard);
    }

    case 'use': {
      const item = ITEM_MAP[action.item];
      const idx = state.inventory.indexOf(action.item);
      if (idx < 0 || !item?.useLabel) return result(false, ['それは使えない。']);
      if (item.useRequires && !state.inventory.includes(item.useRequires)) {
        return result(false, [`${ITEM_MAP[item.useRequires]?.name ?? item.useRequires}が無いと使えない。`]);
      }
      state.inventory.splice(idx, 1);
      if (item.useRequires && item.useResult) {
        state.inventory[state.inventory.indexOf(item.useRequires)] = item.useResult;
      }
      state.flags.add(`used:${item.id}`);
      return result(true, [item.useMessage ?? `${item.name}を使った。`], COST.use);
    }

    case 'pickup': {
      const p = state.pickups.find((x) => x.item === action.item);
      if (!p || state.location !== 'door') return result(false, ['ここには無い。']);
      if (state.flags.has(`picked:${p.item}`)) return result(false, ['もう持っている。']);
      state.flags.add(`picked:${p.item}`);
      state.inventory.push(p.item);
      return result(true, [`${ITEM_MAP[p.item]?.name ?? p.item}を持った。`], COST.pickup);
    }

    case 'unsend': {
      const clue = state.clues.find((c) => c.id === action.clue && c.unsendable);
      if (!clue) return result(false, ['取り消せるメッセージがない。']);
      if (state.flags.has(`unsent:${action.clue}`)) return result(false, ['もう取り消した。']);
      if (state.time > CANCEL_DEADLINE || state.flags.has(`readmsg:${action.clue}`)) {
        return result(false, ['既読がついている……。もう取り消せない。']);
      }
      state.flags.add(`unsent:${action.clue}`);
      return result(true, ['メッセージの送信を取り消した。……セーフ。'], COST.unsend);
    }

    case 'deletePost': {
      const clue = state.clues.find((c) => c.id === action.clue && c.deletable);
      if (!clue) return result(false, ['削除できる投稿がない。']);
      if (state.flags.has(`deleted:${action.clue}`)) return result(false, ['もう削除した。']);
      state.flags.add(`deleted:${action.clue}`);
      return result(true, ['投稿を削除した。……スクショは、たぶん出回っている。'], COST.deletePost);
    }

    case 'travel': {
      if (state.location === action.to) return result(true, []);
      const cost = TRAVEL[state.location][action.to];
      if (cost === undefined) return result(false, ['そこへは直接行けない。']);
      state.location = action.to;
      return result(true, [], cost);
    }

    case 'openDoor': {
      if (state.location !== 'door') return result(false, ['ドアの前にいない。']);
      if (state.finale) return result(true, [], 0, { kind: 'finale', finale: state.finale });
      if (state.flags.has('insulted')) return result(true, [], 0, demonOutcome(state));
      const angry = [...unresolvedCauses(state), ...provokeCauses(state)];
      if (angry.length > 0) return result(true, [], 0, { kind: 'angry', causes: angry });
      return result(true, [], 0, { kind: 'home', lines: state.successLines });
    }
  }
};

/** 取り消し前の誤爆メッセージに既読をつける（以後は取り消せない） */
const markMisfiresRead = (state: DayState): string[] => {
  const hit = state.clues.filter(
    (c) => c.unsendable && c.id && !state.flags.has(`unsent:${c.id}`) && !state.flags.has(`readmsg:${c.id}`),
  );
  hit.forEach((c) => state.flags.add(`readmsg:${c.id}`));
  return hit.length ? ['……あ。最初に誤爆したメッセージに既読がついた。', 'もう、取り消せない。'] : [];
};

/** 余計なひと言を送っていたら、それ自体が新しい火種になる */
const provokeCauses = (state: DayState): Cause[] =>
  CHAT_TEMPLATES.filter((t) => t.provokeLines && state.flags.has(`provoked:${t.id}`)).map((t) => ({
    id: `provoke:${t.id}`,
    title: '火に油',
    resolution: { all: [] },
    angerLines: t.provokeLines!,
    successLine: '',
  }));

/** 暴言を4種すべて送ったら、その日のフィナーレを決めて仕掛けを発動する */
const triggerFinale = (state: DayState): Finale | null => {
  if (state.finale) return null;
  const all = CHAT_TEMPLATES.filter((t) => t.insult).every((t) => state.flags.has(`insult:${t.id}`));
  if (!all) return null;
  const id = FINALE_IDS[Math.min(FINALE_IDS.length - 1, Math.floor(state.seed * FINALE_IDS.length))];
  const finale = FINALES[id];
  state.finale = id;
  state.flags.add(`finale:${id}`);
  if (finale.breaksPhone) state.flags.add('phone_broken');
  state.clues.push(...(finale.triggerClues ?? []));
  return finale;
};

/** 暴言を送った日の結末。最初に送った暴言のセリフを使う */
const demonOutcome = (state: DayState): Outcome => {
  const first = [...state.flags].find((f) => f.startsWith('insult:'))?.slice('insult:'.length);
  const lines = (first && CHAT_MAP[first]?.demonLines) || ['…………。'];
  return { kind: 'demon', lines };
};

/**
 * 行動を実行して状態を更新する。時間経過と「遅すぎる」判定もここで行う。
 * 判定は「openDoor 時点で全 cause が解消済みか」だけ。
 */
export const perform = (state: DayState, action: Action): ActionResult => {
  const r = act(state, action);
  state.time += r.cost;
  if (state.time > TIME_LIMIT) {
    const outcome: Outcome = state.finale
      ? { kind: 'finale', finale: state.finale }
      : state.flags.has('insulted')
        ? demonOutcome(state)
        : { kind: 'late' };
    return { ...r, outcome };
  }
  return r;
};
