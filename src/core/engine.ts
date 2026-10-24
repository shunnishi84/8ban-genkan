// ゲームの純粋ロジック。DOM・音・描画には一切触らない。
import { CHAT_MAP, CHAT_TEMPLATES, AFTER_REPLIES, COLD_REPLIES, LATE_REPLIES } from '../data/chat';
import { FINALES, FINALE_IDS, type Finale, type FinaleId } from '../data/finales';
import { ITEM_MAP } from '../data/items';
import { POSTS, POST_MAP } from '../data/posts';
import { DRUNK_WIFE_SCENARIOS } from '../data/drunkWife';
import { PC_APPROVED, PC_DELIVERY, PC_HINT, PC_SURPRISE } from '../data/pc';
import { SCENARIOS, SCENARIO_MAP } from '../data/scenarios';
import {
  CANCEL_DEADLINE,
  COST,
  EXPRESS_DEADLINE,
  GOAL_DAYS,
  NO_ANOMALY_RATE,
  TIME_LIMIT,
  WIFE_DRUNK_RATE,
  LOCKOUT_TIME,
  DAWN_TIME,
  MAX_DRUNK,
  PC_DELIVERY_DAYS,
  PC_HINT_RATE,
  TRAVEL,
  causeCountFor,
  formatTime,
  startTimeFor,
} from './config';
import { evaluate, flagsIn } from './requirement';
import { pick, seeded, shuffle, type Rng } from './rng';
import type {
  ChatTemplate,
  Action,
  ActionResult,
  Cause,
  Clue,
  ClueLocation,
  DayState,
  Location,
  Outcome,
  RunState,
  Scenario,
} from './types';
import type { ArrestId } from '../data/arrests';

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
  // 日をまたぐ異変の前振りなど、ほかの異変に添えるだけのものは帰宅のセリフや異変なし判定に数えない
  const core = scenarios.filter((s) => !s.extra);
  const normal = core.every(isNormal);
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
    inventory: scenarios.flatMap((s) => s.startItems ?? []),
    orders,
    chatLog: [],
    // 妻が先に寝ているシナリオの一言は、寝ている妻からは聞けないのでナレーションに回す
    successLines: normal
      ? core.filter((s) => !s.asleep).map((s) => s.successLine ?? 'おかえり。今日もお疲れさま')
      : core.filter((s) => !s.asleep).flatMap((s) => s.causes.map((c) => c.successLine)),
    asleepLines: core.flatMap((s) => (s.asleep ? [s.asleep] : [])),
    homeAlone: core.length > 0 && core.every((s) => s.homeAlone),
    introLines: scenarios.flatMap((s) => (s.introLine ? [s.introLine] : [])),
    grudging: scenarios.some((s) => s.causes.some((c) => c.grudging)),
    wifeDrunk: scenarios.find((s) => s.wifeDrunk)?.wifeDrunk ?? null,
    insultIds: pickInsults(seed),
    seed,
    posts: {},
  };
};

export const startDay = (run: RunState, rng: Rng, pool: readonly Scenario[] = SCENARIOS): DayState => {
  // ノートパソコンが届く日は、妻が家にいて起きている日にする
  const arriving = run.pc?.arriveDay === run.day;
  const awake = (s: Scenario) => !s.homeAlone && !s.asleep;
  const scenarios = chooseScenarios(run, rng, arriving ? pool.filter(awake) : pool);
  run.used.push(...scenarios.map((s) => s.id));
  const pcDay = arriving || (!run.pcHinted && !run.pc && run.day <= GOAL_DAYS - 2 && scenarios.every(awake) && rng() < PC_HINT_RATE);
  if (arriving) scenarios.push(run.pc!.approved ? PC_DELIVERY : PC_SURPRISE);
  else if (pcDay) {
    run.pcHinted = true;
    scenarios.push(PC_HINT);
  }
  // 1/10 で妻が酔っている（妻が家にいて起きている日だけ。パソコンの日は除く）
  if (!pcDay && rng() < WIFE_DRUNK_RATE && scenarios.every(awake)) scenarios.push(pick(rng, DRUNK_WIFE_SCENARIOS));
  const state = buildDay(run.day, scenarios, startTimeFor(run.day, rng()), rng());
  if (arriving && run.pc!.approved) state.flags.add(PC_APPROVED);
  return state;
};

/**
 * 帰宅成功時に周回を進める。クリアしたら true。
 * その日にノートパソコンを注文していたら、2日後に届くように覚えておく（相談して許してもらってからの注文か）
 */
export const advanceRun = (run: RunState, state?: DayState): boolean => {
  const order = state?.orders.laptop;
  if (state && order && order !== 'canceled' && !run.pc) {
    run.pc = { arriveDay: state.day + PC_DELIVERY_DAYS, approved: state.flags.has('chat:pc_settoku_2') };
  }
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
const isChatRelevant = (state: DayState, templateId: string): boolean =>
  state.causes.some((c) => flagsIn(c.resolution).includes(`chat:${templateId}`));

/** 定型文を今送れない理由（送れるなら null）。UI のボタンと sendChat の両方がこれを使う */
/** その日の火種か、その日のシナリオ（妻の帰省など火種の無い日も含む）に id があるか */
export const onDay = (state: DayState, id: string): boolean => state.causes.some((c) => c.id === id) || state.scenarioIds.includes(id);

const chatBlockReason = (state: DayState, t: ChatTemplate): string | null => {
  if (state.flags.has(`chat:${t.id}`)) return 'それはもう送った。';
  // 謝りすぎてブチギレたら、怒りのメッセージしか出てこない
  if (state.flags.has('snapped') !== !!t.snap) return t.snap ? 'まだ、そこまで怒ってはいない。' : '……もう、謝る気になれない。';
  if (t.sorryMore && t.id !== nextSorry(state)) return 'まだそれを言える状況じゃない。';
  if (t.requires && !evaluate(t.requires, state.flags)) return 'まだそれを言える状況じゃない。';
  if (t.blockedBy?.some((f) => state.flags.has(f))) return '……今さら、それは言えない。';
  if (t.onlyWith && !onDay(state, t.onlyWith)) return '今それを言う意味がない。';
  if (t.insult && !state.insultIds.includes(t.id)) return '……今日は、その言葉は出てこない。';
  return null;
};

export const canSendChat = (state: DayState, templateId: string): boolean =>
  !!CHAT_MAP[templateId] && !chatBlockReason(state, CHAT_MAP[templateId]);

/** 1日に出る暴言の数 */
const INSULTS_PER_DAY = 4;

/** その日の暴言を全種からランダムに選ぶ（日ごとの seed で決まる。並びは定義順） */
/** 追いごめんの順番（その日の乱数で決まる） */
const SORRY_MORE = CHAT_TEMPLATES.filter((t) => t.sorryMore).map((t) => t.id);
const sorryOrder = (seed: number): string[] => shuffle(seeded(Math.floor(seed * 2 ** 31) ^ 0x2545f491), SORRY_MORE);

/** 次に送れる追いごめん（「ほんとにごめん…」を送ってから、送った数だけ進む） */
const nextSorry = (state: DayState): string | undefined => {
  if (!state.flags.has('chat:sorry_generic')) return undefined;
  return sorryOrder(state.seed)[SORRY_MORE.filter((id) => state.flags.has(`chat:${id}`)).length];
};

/** 追いごめんへの妻の返事。段々冷えていく */
const SORRY_MORE_REPLIES = ['……で？', '謝ればいいと思ってる？', 'その「ごめん」、今日で何回目？ 数えてるんだけど。'];

const pickInsults = (seed: number): string[] => {
  const all = CHAT_TEMPLATES.filter((t) => t.insult).map((t) => t.id);
  const chosen = new Set(shuffle(seeded(Math.floor(seed * 2 ** 31) ^ 0x5bd1e995), all).slice(0, INSULTS_PER_DAY));
  return all.filter((id) => chosen.has(id));
};

/** 指定の接頭辞で始まるフラグ（drunk:1, buy:beer:2 など、回数を数えるフラグ用） */
const flagsWith = (state: DayState, prefix: string): string[] => [...state.flags].filter((f) => f.startsWith(prefix));

/** 酔いの段階（飲んだ缶ビールの本数） */
export const drunkLevel = (state: DayState): number => flagsWith(state, 'drunk:').length;

/** 酔いの段階に応じた文面（暴言は酔うほどひどくなる） */
const textAt = (t: ChatTemplate, level: number): string =>
  level > 0 && t.drunkText?.length ? t.drunkText[Math.min(level, t.drunkText.length) - 1] : t.text;

/** 今送ったらこうなる、という文面 */
export const chatText = (state: DayState, t: ChatTemplate): string => textAt(t, drunkLevel(state));

/** 実際に送った文面 */
export const sentText = (state: DayState, templateId: string): string => {
  const said = flagsWith(state, `said:${templateId}:`)[0];
  return textAt(CHAT_MAP[templateId], said ? Number(said.split(':')[2]) : 0);
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
const PHONE_ACTIONS = new Set<Action['type']>(['openApp', 'sendChat', 'order', 'cancelOrder', 'unsend', 'deletePost', 'post']);

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
      const blocked = chatBlockReason(state, t);
      if (blocked) return result(false, [blocked]);
      state.flags.add(`chat:${t.id}`);
      state.chatLog.push({ from: 'me', text: chatText(state, t), image: t.image });
      // 実際に送った文面（酔いの段階）を覚えておく。家庭裁判の証拠などで使う
      state.flags.add(`said:${t.id}:${drunkLevel(state)}`);
      // 何か送るとトーク画面を開かれ、取り消し前の誤爆メッセージにも既読がつく
      const exposed = markMisfiresRead(state);
      const send = (...rest: string[]) => ['送信した。', ...exposed, ...rest];
      /** 妻の返事をチャットに足して、送信完了のメッセージを返す */
      const replied = (text: string, ...msgs: string[]) => {
        state.chatLog.push({ from: 'wife', text });
        return result(true, send(...msgs), COST.sendChat);
      };
      // 一度でも暴言を送ったら、以後は何を送っても取りつく島もない返事だけ（電話も来ない）
      const coldReply = () => COLD_REPLIES[state.chatLog.filter((m) => m.from === 'wife').length % COLD_REPLIES.length];
      const alreadyInsulted = state.flags.has('insulted');
      if (t.insult || t.finale || t.snap || t.demonTrap) {
        state.flags.add('insulted');
        state.flags.add(`insult:${t.id}`);
        state.chatLog.push({ from: 'wife', text: alreadyInsulted ? coldReply() : t.replyIrrelevant || '既読' });
        // 直行タイプ（「だったら自分で捨てろ」など）はそのフィナーレへ。それ以外は4種そろったら
        const finale = t.finale ? applyFinale(state, t.finale) : triggerFinale(state);
        return result(
          true,
          [...send('……既読がついた。返事はない。電話も来ない。'), '背筋に、冷たいものが走った。', ...(finale?.onTrigger ?? []), ...(finale?.trap?.warp ?? [])],
          COST.sendChat,
        );
      }
      if (alreadyInsulted) return replied(coldReply(), '……取りつく島もない。');
      // 2:00 を過ぎたら妻はもう寝ている。何を送っても既読にならない
      if (state.time > LOCKOUT_TIME) {
        return result(true, send('……既読がつかない。', '妻はもう、寝てしまったようだ。'), COST.sendChat);
      }
      if (t.sorryMore) {
        const n = SORRY_MORE.filter((id) => state.flags.has(`chat:${id}`)).length;
        if (n < SORRY_MORE.length) return replied(SORRY_MORE_REPLIES[n - 1]);
        // 3つ目まで謝っても許してもらえない。夫がブチギレる
        state.flags.add('snapped');
        return replied(SORRY_MORE_REPLIES[n - 1], '……プツン、と何かが切れた音がした。', 'もう、謝る言葉が出てこない。');
      }
      if (t.prank) {
        state.flags.add(`prank:${t.id}`);
        state.clues.push(...(t.triggerClues ?? []));
        return replied(t.replyRelevant, '……一瞬で既読がついた。', '電話が、鳴りやまない。');
      }
      if (t.provokeLines) {
        state.flags.add(`provoked:${t.id}`);
        return replied(t.replyRelevant, '……妙に静かだ。', '言わなくていいことを言った気がする。');
      }
      // 余計なひと言のあとでは、正しい定型文を送っても手遅れ
      if (t.afterProvoked && state.flags.has(`provoked:${t.afterProvoked.by}`)) return replied(t.afterProvoked.reply, '……もう、手遅れらしい。');
      const relevant = isChatRelevant(state, t.id);
      // 関係ない定型文には、その日の状況に合わせた返事（無ければ定型文の既定の返事）
      const situational = relevant || (t.neutral && t.onlyWith) ? undefined : situationalReply(state, t.id);
      // その日専用の、何も起きない定型文（帰省中の「淋しい」、パソコンの相談など）は決まった返事
      const own = !relevant && t.neutral && !!t.onlyWith;
      const reply = relevant || own ? t.replyRelevant : (situational?.text ?? t.replyIrrelevant);
      if (reply) state.chatLog.push({ from: 'wife', text: reply });
      if (relevant || t.neutral || situational?.after) return result(true, send(), COST.sendChat);
      return result(
        true,
        [
          ...exposed,
          '妻から電話がかかってきた……。',
          // 事情を知っている妻からは説教、知らない妻からは問い詰め
          situational && !situational.text.includes('電話')
            ? `${LECTURE_OPENER[t.id] ?? '「で、何が言いたいの？」'}から始まる説教で ${COST.chatPenalty} 分を失った。`
            : `しどろもどろの言い訳で ${COST.chatPenalty} 分を失った。`,
        ],
        COST.sendChat + COST.chatPenalty,
      );
    }

    case 'order': {
      const item = ITEM_MAP[action.item];
      if (!item || item.source !== 'mail') return result(false, ['その商品は通販にない。']);
      if (item.onlyWith && !onDay(state, item.onlyWith)) return result(false, ['その商品は、今日は売っていない。']);
      if (state.orders[item.id] && state.orders[item.id] !== 'canceled') return result(false, ['もう注文してある。']);
      // 日数の決まった配送（ノートパソコンは2日後）は、特急便の締切に関係なく届く
      if (item.deliveryDays) {
        state.orders[item.id] = 'express';
        state.flags.add(`ordered:${item.id}`);
        return result(true, [`「${item.name}」を注文した。${item.deliveryDays === 2 ? '明後日' : `${item.deliveryDays}日後に`}届く。`], COST.order);
      }
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
      // 肌着（やパンツ一丁）では売ってもらえない。3回目で通報される
      if (state.flags.has('undressed')) {
        const n = flagsWith(state, 'refused:').length + 1;
        state.flags.add(`refused:${n}`);
        if (n >= REFUSALS_BEFORE_CALL) return result(true, [], COST.buy, { kind: 'arrest', ending: 'koban_konbini' });
        return result(false, REFUSAL_LINES[n - 1]);
      }
      if (item.maxStock) {
        const n = flagsWith(state, `buy:${item.id}:`).length;
        if (n >= item.maxStock) return result(false, ['店員「お客さん……今日はもう、そのへんにしときましょう」', 'これ以上は売ってもらえなかった。']);
        state.flags.add(`buy:${item.id}:${n + 1}`);
      }
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
      if (item.collapse) return result(true, [], COST.use, { kind: 'collapse', item: item.id });
      if (item.drunkTo) {
        for (let n = 1; n <= item.drunkTo; n++) state.flags.add(`drunk:${n}`);
        return result(true, [item.useMessage ?? `${item.name}を飲んだ。`], COST.use);
      }
      if (item.drink) {
        // 酔いは3段階まで（カップ清酒のあとのビールは、それ以上は回らない）
        const level = Math.min(drunkLevel(state) + 1, MAX_DRUNK);
        state.flags.add(`drunk:${level}`);
        const msgs = item.useMessages ?? [];
        return result(true, [msgs[Math.min(level, msgs.length) - 1] ?? `${item.name}を飲んだ。`], COST.use);
      }
      // 脱いだまま替えのシャツに着替えたら、ちゃんと服を着たことになる
      if (item.dresses) state.flags.delete('undressed');
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

    case 'wait':
      if (state.location !== 'bench') return result(false, ['ここでは時間をつぶせない。']);
      if (state.time <= LOCKOUT_TIME) return result(false, ['……まだ、家に帰れる時間だ。']);
      if (state.time >= DAWN_TIME) return result(false, ['空が白んできた。……そろそろ、家に戻ろう。']);
      return result(
        true,
        [['ベンチに座って、ぼんやり夜空を眺めた。', '自販機のコーヒーで、手を温めた。', 'ハトが一羽、隣に座った。……お前も、締め出されたのか。', '新聞配達のバイクが通り過ぎていった。'][
          Math.floor((state.time - LOCKOUT_TIME) / 60) % 4
        ], '……1時間つぶした。'],
        COST.wait,
      );

    case 'undress': {
      if (state.flags.has('undressed')) return result(false, ['もう脱いでいる。']);
      state.flags.add('undressed');
      const msgs = ['ワイシャツを脱いだ。肌着一枚になった。', '……夜風が、冷たい。'];
      // 公園には巡回のお巡りさんがいる
      if (state.location === 'bench') return result(true, msgs, COST.undress, { kind: 'arrest', ending: 'koban_park' });
      return result(true, msgs, COST.undress);
    }

    case 'undressPants': {
      if (!state.flags.has('undressed')) return result(false, ['まずはワイシャツからだ。']);
      if (state.flags.has('pantsless')) return result(false, ['もう脱いでいる。']);
      if (drunkLevel(state) < MAX_DRUNK) return result(false, ['……さすがに、そこまで酔ってはいない。']);
      state.flags.add('pantsless');
      const msgs = ['ズボンも脱いだ。パンツ一丁になった。', '……なぜか、最高に気分がいい。'];
      const ending = PANTSLESS_ARREST[state.location];
      return result(true, msgs, COST.undress, ending ? { kind: 'arrest', ending } : undefined);
    }

    case 'discardShirt':
      if (state.location !== 'trash') return result(false, ['ゴミ捨て場にいない。']);
      if (!state.flags.has('undressed') || state.flags.has('shirt_discarded')) return result(false, ['捨てられるワイシャツが無い。']);
      state.flags.add('shirt_discarded');
      return result(true, ['脱いだワイシャツを、ゴミ袋の山に押し込んだ。', '……もう、着るものが無い。'], COST.discard);

    case 'dress':
      if (state.flags.has('pantsless')) {
        state.flags.delete('pantsless');
        return result(true, ['ズボンをはき直した。'], COST.dress);
      }
      if (!state.flags.has('undressed')) return result(false, ['ちゃんと着ている。']);
      if (state.flags.has('shirt_discarded')) return result(false, ['ワイシャツは、ゴミ捨て場に捨ててしまった……。']);
      state.flags.delete('undressed');
      return result(true, ['ワイシャツを着直した。'], COST.dress);

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
      const seenAt = state.posts[action.clue];
      if (clue.deleteMessages) return result(true, clue.deleteMessages, COST.deletePost);
      if (seenAt === undefined) return result(true, ['投稿を削除した。……スクショは、たぶん出回っている。'], COST.deletePost);
      // その場の勢いでつぶやいた投稿: 妻に見られる前ならセーフ
      if (state.time < seenAt) {
        state.flags.add(`erased:${action.clue}`);
        return result(true, ['投稿を削除した。……妻には、まだ見られていない。セーフ。'], COST.deletePost);
      }
      return result(true, ['投稿を削除した。……が、妻はもう見ていた。', 'スクショも、きっと撮られている。'], COST.deletePost);
    }

    case 'post': {
      const post = POST_MAP[action.post];
      if (!post) return result(false, ['そんな投稿は無い。']);
      if (state.posts[post.id] !== undefined) return result(false, ['もう投稿した。']);
      if (post.onlyWith ? !onDay(state, post.onlyWith) : post.level !== drunkLevel(state)) return result(false, ['……今は、その言葉は出てこない。']);
      const seenAt = postSeenAt(post.level, state.time);
      state.posts[post.id] = seenAt;
      state.flags.add(`posted:${post.id}`);
      state.clues.push({
        at: 'app:sns',
        id: post.id,
        deletable: true,
        text: `@tanaka_salaryman（あなた）\n「${post.text}」\n${post.reaction}（${formatTime(state.time)}）`,
      });
      // 酔い3: 一瞬でバズって妻が見る。暴言と同じく魔王化。3つ全部つぶやくと魔王城（最終形態）
      if (post.demonLines) {
        state.flags.add('insulted');
        state.flags.add(`buzz:${post.id}`);
        state.clues.push({ at: 'notice', text: `📣 つぶやきー: あなたの投稿が話題になっています（${post.reaction.split('　')[0]}）` });
        const all = POSTS.filter((p) => p.demonLines && p.level === MAX_DRUNK && !p.onlyWith).every((p) => state.flags.has(`buzz:${p.id}`));
        const finale = all ? applyFinale(state, 'castle') : null;
        if (finale) state.flags.add('finale_by_tweet');
        return result(
          true,
          [
            'つぶやいた。……一瞬でバズった。',
            '通知が、鳴りやまない。……妻のアカウントから、いいねがついた。',
            '背筋に、冷たいものが走った。',
            ...(finale?.onTrigger ?? []),
            ...(finale?.trap?.warp ?? []),
          ],
          COST.post,
        );
      }
      if (!post.angerLines) {
        if (state.time <= LOCKOUT_TIME) state.clues.push({ at: 'notice', text: `♥ 妻があなたの投稿にいいねしました:「${post.text}」` });
        return result(true, ['つぶやいた。……ちょっとすっきりした。'], COST.post);
      }
      state.causes.push({
        id: `tweet:${post.id}`,
        title: 'つぶやきーで悪口',
        resolution: `erased:${post.id}`,
        angerLines: post.angerLines,
        successLine: '',
      });
      return result(
        true,
        ['つぶやいた。', post.level === 2 ? '……いいねが、ものすごい勢いで増えていく。妻に見つかるのは時間の問題だ。' : '……そういえば、妻もこのアカウントをフォローしていた気がする。'],
        COST.post,
      );
    }

    case 'travel': {
      if (state.location === action.to) return result(true, []);
      const trap = state.finale ? FINALES[state.finale].trap : undefined;
      if (trap) {
        // 結界の中: 玄関前から出られない。試すたびに違うメッセージ
        const n = flagsWith(state, 'blocked:').length;
        state.flags.add(`blocked:${n}`);
        return result(false, trap.blocked[n % trap.blocked.length]);
      }
      const cost = TRAVEL[state.location][action.to];
      if (cost === undefined) return result(false, ['そこへは直接行けない。']);
      state.location = action.to;
      // パンツ一丁でどこかへ行こうとすると、必ず夜の街を通る。肌着で公園へ行くと巡回中のお巡りさん
      if (state.flags.has('pantsless')) return result(true, [], cost, { kind: 'arrest', ending: 'jail' });
      if (state.flags.has('undressed') && action.to === 'bench') return result(true, [], cost, { kind: 'arrest', ending: 'koban_park' });
      return result(true, [], cost);
    }

    case 'openDoor': {
      if (state.location !== 'door') return result(false, ['ドアの前にいない。']);
      if (state.finale) return result(true, [], 0, { kind: 'finale', finale: state.finale });
      if (state.flags.has('insulted')) return result(true, [], 0, demonOutcome(state));
      // 遅すぎる帰宅: 1:00〜2:00 は怒られて終わり、2:00 を過ぎるとチェーンロック、朝 6:00 にようやく入れる
      if (state.time >= DAWN_TIME) return result(true, [], 0, { kind: 'dawn' });
      if (state.time > LOCKOUT_TIME) {
        return result(false, ['ガチャ……ガツン！', 'チェーンロックがかかっていて、中に入れない！', '……朝まで、どこかで時間をつぶすしかない。']);
      }
      if (state.time > TIME_LIMIT) return result(true, [], 0, { kind: 'late' });
      // 夫婦そろって酔っ払い: 火種はうやむやになって宴会
      if (state.wifeDrunk && drunkLevel(state) >= 2) return result(true, [], 0, { kind: 'home', lines: [], special: 'party' });
      // 悪ふざけを送っていたら、火種に関係なく最初に送ったものの結末
      const prank = flagsWith(state, 'prank:')[0];
      if (prank) return result(true, [], 0, { kind: 'prank', template: prank.slice('prank:'.length) });
      if (state.wifeDrunk === 'reset') {
        // 寝落ちした妻は話を何も覚えていない。ただし物的証拠（捨て忘れ・着替え忘れ・消し忘れ）は翌朝バレる
        const caught = state.causes.filter((c) => !evaluate(c.resolution, withHearsayForgotten(state, c)));
        if (caught.length > 0) return result(true, [], 0, { kind: 'angry', causes: caught, morning: true });
        return result(true, [], 0, { kind: 'home', lines: [], special: 'reset' });
      }
      // 帰宅した瞬間に目に入る・耳に入るもの（格好・余計なひと言・持ち物）から先に怒られる
      const angry = [...(state.flags.has('pantsless') ? [PANTSLESS] : state.flags.has('undressed') ? [UNDRESSED] : []), ...provokeCauses(state), ...carriedCauses(state), ...unresolvedCauses(state)];
      const special = state.wifeDrunk ? ('drunk' as const) : undefined;
      // 甘え上戸の妻は、おねだりを聞いてもらえたら火種を1つだけ見逃してくれる
      const amae = state.causes.find((c) => c.id === 'wife_drunk_amae');
      if (amae && evaluate(amae.resolution, state.flags) && angry.length === 1) {
        const lines = state.causes.filter((c) => evaluate(c.resolution, state.flags)).map((c) => c.successLine).filter(Boolean);
        return result(true, [], 0, { kind: 'home', lines: [...lines, '……ん〜？ なんかあった気がするけど……まぁいっか〜♡ ゆるす〜♡'], special });
      }
      if (angry.length > 0) return result(true, [], 0, { kind: 'angry', causes: angry });
      return result(true, [], 0, { kind: 'home', lines: state.successLines, special });
    }
  }
};

/**
 * その日の状況に合わせた妻の返事。優先順:
 * 1. 未解消の火種があるシナリオの返事（定型文ID → 無ければ `*` = 話をそらすなという返事）
 * 2. 異変なしの日の返事
 * 3. 火種を全部消したあとの返事（`<定型文ID>:after` → 妻が事情を知っていた日なら共通の AFTER_REPLIES）
 * 4. 日付をまたいでいれば深夜の返事
 * 候補が複数あるときは日ごとの seed で選ぶ。after は仲直りのあとなので電話も来ない。
 */
const situationalReply = (state: DayState, templateId: string): { text: string; after: boolean } | undefined => {
  const scenarios = state.scenarioIds.map((id) => SCENARIO_MAP[id]).filter(Boolean);
  const unresolved = (s: Scenario) => s.causes.some((c) => !evaluate(c.resolution, state.flags));
  const open = scenarios.filter((s) => s.causes.length > 0 && unresolved(s));
  const settled = scenarios.some((s) => s.causes.length > 0) && open.length === 0;
  // 妻が事情を知っていた火種（`*` の返事がある）を消した日だけ、共通の仲直り後の返事を使う
  const knew = settled && scenarios.some((s) => s.chatReplies?.['*']);
  const pools: [(string[] | undefined)[], boolean][] = [
    [open.map((s) => s.chatReplies?.[templateId]), false],
    [open.map((s) => s.chatReplies?.['*']), false],
    [scenarios.filter((s) => s.causes.length === 0).map((s) => s.chatReplies?.[templateId]), false],
    [settled ? scenarios.map((s) => s.chatReplies?.[`${templateId}:after`]) : [], true],
    [knew ? [AFTER_REPLIES[templateId]] : [], true],
    [[state.time > MIDNIGHT ? LATE_REPLIES[templateId] : undefined], false],
  ];
  const n = state.chatLog.length;
  for (const [pool, after] of pools) {
    const options = pool.flatMap((p) => p ?? []);
    if (options.length) {
      const text = options[Math.floor(frac(Math.sin(state.seed * 9973 + n * 7.31 + 1) * 43758.5453) * options.length)];
      return { text, after };
    }
  }
  return undefined;
};

const frac = (x: number) => x - Math.floor(x);

/** 事情を知っている妻に、関係ない謝罪や愛の言葉を送ったときの説教の始まり */
const LECTURE_OPENER: Record<string, string> = {
  sorry_generic: '「謝るだけなら誰でもできるよね？」',
  love: '「その『愛してる』、今言う必要ある？」',
};
const MIDNIGHT = 24 * 60;

/** 取り消し前の誤爆メッセージに既読をつける（以後は取り消せない） */
const markMisfiresRead = (state: DayState): string[] => {
  const hit = state.clues.filter(
    (c) => c.unsendable && c.id && !state.flags.has(`unsent:${c.id}`) && !state.flags.has(`readmsg:${c.id}`),
  );
  hit.forEach((c) => state.flags.add(`readmsg:${c.id}`));
  return hit.length ? ['……あ。最初に誤爆したメッセージに既読がついた。', 'もう、取り消せない。'] : [];
};

/**
 * 記憶をなくした妻にとっての火種の判定に使うフラグ。
 * 物的証拠（捨てる・使う・投稿を消す）以外の手当て（チャット・注文・購入など）は、覚えていないので済んだことになる
 */
/**
 * つぶやいた悪口を妻が見る時刻。ひどいものほど早くバレる:
 * 酔い1は 0:00 に妻がタイムラインを見るまで（0:00 以降の投稿は10分後）、酔い2は10分後、酔い3は一瞬でバズって即バレ
 */
const postSeenAt = (level: number, time: number): number =>
  level >= 3 ? time : level === 2 || time > CANCEL_DEADLINE ? time + 10 : CANCEL_DEADLINE + 1;

const withHearsayForgotten = (state: DayState, c: Cause): Set<string> => {
  const evidence = /^(discarded|used|deleted|erased|picked):/;
  return new Set([...state.flags, ...flagsIn(c.resolution).filter((f) => !evidence.test(f))]);
};

/** 行動そのものが新しい火種になったときの、解消しようのない火種 */
const angerCause = (id: string, title: string, angerLines: string[]): Cause => ({
  id,
  title,
  resolution: { all: [] },
  angerLines,
  successLine: '',
});

/** ワイシャツを脱いだまま帰ると、火種を全部消していても怒られる */
const UNDRESSED = angerCause('undressed', '肌着で帰宅', [
  '……ちょっと。',
  'なんて格好で帰ってきてるの！',
  'ご近所に見られたらどうするのよ！ シャツはどこ！？',
]);

/** パンツ一丁で帰ると、もっと怒られる */
const PANTSLESS = angerCause('pantsless', 'パンツ一丁で帰宅', [
  '……ちょっと。',
  'ズボンは！？',
  'パンツ一丁で玄関に立ってる夫を、私が今どんな気持ちで見てると思う？',
]);

/** 脱いだ格好でコンビニに行ったときの、店員の断り文句（REFUSALS_BEFORE_CALL 回目で通報） */
const REFUSALS_BEFORE_CALL = 3;
const REFUSAL_LINES = [
  ['店員「あの……お客様、さすがにその格好では……」', '売ってもらえなかった。'],
  ['店員「……服を着てから、もう一度お越しください」', '店員の目が、だんだん冷たくなっていく。'],
];

/** ズボンを脱いだ場所ごとの結末（玄関前とゴミ捨て場は誰にも見られない） */
const PANTSLESS_ARREST: Partial<Record<Location, ArrestId>> = { town: 'jail', bench: 'jail', konbini: 'koban_konbini' };

/** 余計なひと言を送っていたら、それ自体が新しい火種になる */
const provokeCauses = (state: DayState): Cause[] =>
  CHAT_TEMPLATES.filter((t) => t.provokeLines && state.flags.has(`provoked:${t.id}`)).map((t) =>
    angerCause(`provoke:${t.id}`, '火に油', t.provokeLinesIf && evaluate(t.provokeLinesIf.when, state.flags) ? t.provokeLinesIf.lines : t.provokeLines!),
  );

/** 持って帰ると怒られる物（メシマズの日の料理本など）を持ったまま帰った */
const carriedCauses = (state: DayState): Cause[] =>
  state.scenarioIds
    .flatMap((id) => SCENARIO_MAP[id]?.carryAnger ?? [])
    .filter((c) => state.inventory.includes(c.item))
    .map((c) => angerCause(`carry:${c.item}`, c.title, c.angerLines));

/** 暴言を4種すべて送ったら、その日のフィナーレを決めて仕掛けを発動する */
const triggerFinale = (state: DayState): Finale | null => {
  const all = state.insultIds.every((id) => state.flags.has(`insult:${id}`));
  if (!all) return null;
  return applyFinale(state, FINALE_IDS[Math.min(FINALE_IDS.length - 1, Math.floor(state.seed * FINALE_IDS.length))]);
};

/** そのフィナーレが選ばれる seed（デバッグやテストでフィナーレを固定するとき用） */
export const finaleSeed = (id: FinaleId): number => (FINALE_IDS.indexOf(id) + 0.5) / FINALE_IDS.length;

/** フィナーレを確定させて仕掛けを発動する（すでに決まっていれば何もしない） */
const applyFinale = (state: DayState, id: FinaleId): Finale | null => {
  if (state.finale) return null;
  const finale = FINALES[id];
  state.finale = id;
  state.flags.add(`finale:${id}`);
  if (finale.breaksPhone) state.flags.add('phone_broken');
  if (finale.trap) state.location = 'door';
  state.clues.push(...(finale.triggerClues ?? []));
  return finale;
};

/** 暴言を送った（またはつぶやきーでバズった）日の結末 */
const demonOutcome = (state: DayState): Outcome => {
  // 最初にやらかしたもの（暴言のチャットか、バズった投稿）のセリフ
  const first = [...state.flags].find((f) => f.startsWith('insult:') || f.startsWith('buzz:'));
  if (first?.startsWith('buzz:')) {
    const post = POST_MAP[first.slice('buzz:'.length)];
    return { kind: 'demon', lines: post?.demonLines ?? ['…………。'], reason: 'つぶやきーの炎上による魔王化' };
  }
  const lines = (first && CHAT_MAP[first.slice('insult:'.length)]?.demonLines) || ['…………。'];
  return { kind: 'demon', lines };
};

/**
 * 行動を実行して状態を更新する。時間経過もここで進める。
 * 帰宅の判定は openDoor で行う（フィナーレ → 魔王 → 朝帰り/締め出し/遅すぎる → 悪ふざけ → 火種）。
 * 例外として、暴言を送っていた日は 1:00 を過ぎた時点で魔王（フィナーレ）が迎えに来る。
 */
export const perform = (state: DayState, action: Action): ActionResult => {
  const r = act(state, action);
  state.time += r.cost;
  // 1:00 を過ぎても歩き回れる（ドアを開けたときに判定）。ただし暴言を送っていたら魔王が迎えに来る
  if (r.outcome.kind === 'continue' && state.time > TIME_LIMIT && (state.finale || state.flags.has('insulted'))) {
    const outcome: Outcome = state.finale ? { kind: 'finale', finale: state.finale } : demonOutcome(state);
    return { ...r, outcome };
  }
  return r;
};
