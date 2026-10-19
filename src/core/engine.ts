// ゲームの純粋ロジック。DOM・音・描画には一切触らない。
import { CHAT_MAP, CHAT_TEMPLATES, AFTER_REPLIES, COLD_REPLIES, LATE_REPLIES } from '../data/chat';
import { FINALES, FINALE_IDS, type Finale, type FinaleId } from '../data/finales';
import { ITEM_MAP } from '../data/items';
import { SCENARIOS, SCENARIO_MAP } from '../data/scenarios';
import {
  CANCEL_DEADLINE,
  COST,
  EXPRESS_DEADLINE,
  GOAL_DAYS,
  NO_ANOMALY_RATE,
  TIME_LIMIT,
  LOCKOUT_TIME,
  DAWN_TIME,
  TRAVEL,
  causeCountFor,
  formatTime,
  startTimeFor,
} from './config';
import { evaluate, flagsIn } from './requirement';
import { seeded, shuffle, type Rng } from './rng';
import type {
  ChatTemplate,
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
    // 妻が先に寝ているシナリオの一言は、寝ている妻からは聞けないのでナレーションに回す
    successLines: normal
      ? scenarios.filter((s) => !s.asleep).map((s) => s.successLine ?? 'おかえり。今日もお疲れさま')
      : scenarios.filter((s) => !s.asleep).flatMap((s) => s.causes.map((c) => c.successLine)),
    asleepLines: scenarios.flatMap((s) => (s.asleep ? [s.asleep] : [])),
    homeAlone: scenarios.length > 0 && scenarios.every((s) => s.homeAlone),
    grudging: scenarios.some((s) => s.causes.some((c) => c.grudging)),
    insultIds: pickInsults(seed),
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
  if (t.insult && !state.insultIds.includes(t.id)) return false;
  return !t.requires || evaluate(t.requires, state.flags);
};

/** 1日に出る暴言の数 */
export const INSULTS_PER_DAY = 4;

/** その日の暴言を全種からランダムに選ぶ（日ごとの seed で決まる。並びは定義順） */
const pickInsults = (seed: number): string[] => {
  const all = CHAT_TEMPLATES.filter((t) => t.insult).map((t) => t.id);
  const chosen = new Set(shuffle(seeded(Math.floor(seed * 2 ** 31) ^ 0x5bd1e995), all).slice(0, INSULTS_PER_DAY));
  return all.filter((id) => chosen.has(id));
};

/** 酔いの段階（飲んだ缶ビールの本数） */
export const drunkLevel = (state: DayState): number => [...state.flags].filter((f) => f.startsWith('drunk:')).length;

/** 今送ったらこうなる、という文面（暴言は酔うほどひどくなる） */
export const chatText = (state: DayState, t: ChatTemplate): string => {
  const level = Math.min(drunkLevel(state), t.drunkText?.length ?? 0);
  return level > 0 ? t.drunkText![level - 1] : t.text;
};

/** 実際に送った文面 */
export const sentText = (state: DayState, templateId: string): string => {
  const t = CHAT_MAP[templateId];
  const said = [...state.flags].find((f) => f.startsWith(`said:${templateId}:`));
  const level = said ? Number(said.split(':')[2]) : 0;
  return level > 0 && t.drunkText ? t.drunkText[Math.min(level, t.drunkText.length) - 1] : t.text;
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
      if (t.insult && !state.insultIds.includes(t.id)) return result(false, ['……今日は、その言葉は出てこない。']);
      state.flags.add(`chat:${t.id}`);
      state.chatLog.push({ from: 'me', text: chatText(state, t), image: t.image });
      // 実際に送った文面（酔いの段階）を覚えておく。家庭裁判の証拠などで使う
      state.flags.add(`said:${t.id}:${drunkLevel(state)}`);
      // 何か送るとトーク画面を開かれ、取り消し前の誤爆メッセージにも既読がつく
      const exposed = markMisfiresRead(state);
      const send = (...rest: string[]) => ['送信した。', ...exposed, ...rest];
      // 一度でも暴言を送ったら、以後は何を送っても取りつく島もない返事だけ（電話も来ない）
      const coldReply = () => COLD_REPLIES[state.chatLog.filter((m) => m.from === 'wife').length % COLD_REPLIES.length];
      const alreadyInsulted = state.flags.has('insulted');
      if (t.insult || t.finale) {
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
      if (alreadyInsulted) {
        state.chatLog.push({ from: 'wife', text: coldReply() });
        return result(true, send('……取りつく島もない。'), COST.sendChat);
      }
      // 2:00 を過ぎたら妻はもう寝ている。何を送っても既読にならない
      if (state.time > LOCKOUT_TIME) {
        return result(true, send('……既読がつかない。', '妻はもう、寝てしまったようだ。'), COST.sendChat);
      }
      if (t.prank) {
        state.flags.add(`prank:${t.id}`);
        state.chatLog.push({ from: 'wife', text: t.replyRelevant });
        state.clues.push(...(t.triggerClues ?? []));
        return result(true, send('……一瞬で既読がついた。', '電話が、鳴りやまない。'), COST.sendChat);
      }
      if (t.provokeLines) {
        state.flags.add(`provoked:${t.id}`);
        state.chatLog.push({ from: 'wife', text: t.replyRelevant });
        return result(true, send('……妙に静かだ。', '言わなくていいことを言った気がする。'), COST.sendChat);
      }
      const relevant = isChatRelevant(state, t.id);
      // 関係ない定型文には、その日の状況に合わせた返事（無ければ定型文の既定の返事）
      const situational = relevant ? undefined : situationalReply(state, t.id);
      const reply = relevant ? t.replyRelevant : (situational?.text ?? t.replyIrrelevant);
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
      if (item.maxStock) {
        const n = [...state.flags].filter((f) => f.startsWith(`buy:${item.id}:`)).length;
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
      if (item.drink) {
        const level = drunkLevel(state) + 1;
        state.flags.add(`drunk:${level}`);
        const msgs = item.useMessages ?? [];
        return result(true, [msgs[Math.min(level, msgs.length) - 1] ?? `${item.name}を飲んだ。`], COST.use);
      }
      // 脱いだまま替えのシャツに着替えたら、ちゃんと服を着たことになる
      if (item.slot === 'shirt' && item.id === 'spare_shirt') state.flags.delete('undressed');
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

    case 'undress':
      if (state.flags.has('undressed')) return result(false, ['もう脱いでいる。']);
      state.flags.add('undressed');
      return result(true, ['ワイシャツを脱いだ。肌着一枚になった。', '……夜風が、冷たい。'], COST.undress);

    case 'dress':
      if (!state.flags.has('undressed')) return result(false, ['ちゃんと着ている。']);
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
      return result(true, ['投稿を削除した。……スクショは、たぶん出回っている。'], COST.deletePost);
    }

    case 'travel': {
      if (state.location === action.to) return result(true, []);
      const trap = state.finale ? FINALES[state.finale].trap : undefined;
      if (trap) {
        // 結界の中: 玄関前から出られない。試すたびに違うメッセージ
        const n = [...state.flags].filter((f) => f.startsWith('blocked:')).length;
        state.flags.add(`blocked:${n}`);
        return result(false, trap.blocked[n % trap.blocked.length]);
      }
      const cost = TRAVEL[state.location][action.to];
      if (cost === undefined) return result(false, ['そこへは直接行けない。']);
      state.location = action.to;
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
      // 悪ふざけを送っていたら、火種に関係なく最初に送ったものの結末
      const prank = [...state.flags].find((f) => f.startsWith('prank:'));
      if (prank) return result(true, [], 0, { kind: 'prank', template: prank.slice('prank:'.length) });
      const angry = [...(state.flags.has('undressed') ? [UNDRESSED] : []), ...unresolvedCauses(state), ...provokeCauses(state)];
      if (angry.length > 0) return result(true, [], 0, { kind: 'angry', causes: angry });
      return result(true, [], 0, { kind: 'home', lines: state.successLines });
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

/** ワイシャツを脱いだまま帰ると、火種を全部消していても怒られる */
const UNDRESSED: Cause = {
  id: 'undressed',
  title: '肌着で帰宅',
  resolution: { all: [] },
  angerLines: ['……ちょっと。', 'なんて格好で帰ってきてるの！', 'ご近所に見られたらどうするのよ！ シャツはどこ！？'],
  successLine: '',
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
  const all = state.insultIds.every((id) => state.flags.has(`insult:${id}`));
  if (!all) return null;
  return applyFinale(state, FINALE_IDS[Math.min(FINALE_IDS.length - 1, Math.floor(state.seed * FINALE_IDS.length))]);
};

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
  // 1:00 を過ぎても歩き回れる（ドアを開けたときに判定）。ただし暴言を送っていたら魔王が迎えに来る
  if (state.time > TIME_LIMIT && (state.finale || state.flags.has('insulted'))) {
    const outcome: Outcome = state.finale ? { kind: 'finale', finale: state.finale } : demonOutcome(state);
    return { ...r, outcome };
  }
  return r;
};
