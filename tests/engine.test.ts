import { describe, expect, it } from 'vitest';
import { GOAL_DAYS, hm } from '../src/core/config';
import { advanceRun, buildDay, chatTimeline, chooseScenarios, newRun, perform, startDay, visibleClues } from '../src/core/engine';
import { seeded } from '../src/core/rng';
import { solve } from '../src/core/solver';
import { SCENARIO_MAP } from '../src/data/scenarios';
import { COLD_REPLIES } from '../src/data/chat';
import { FINALES, FINALE_IDS, type FinaleId } from '../src/data/finales';

const day = (ids: string[], start = hm(23, 0)) => buildDay(1, ids.map((id) => SCENARIO_MAP[id]), start);

describe('時計', () => {
  it('午前1:00を過ぎると原因に関係なくゲームオーバー', () => {
    const s = day(['neighbor_curry'], hm(24, 56));
    expect(perform(s, { type: 'travel', to: 'town' }).outcome.kind).toBe('late');
  });

  it('ちょうど 1:00 ならまだセーフ', () => {
    const s = day(['neighbor_curry'], hm(24, 55));
    expect(perform(s, { type: 'travel', to: 'town' }).outcome.kind).toBe('continue');
    expect(perform(s, { type: 'travel', to: 'door' }).outcome.kind).toBe('late');
  });

  it('異変なしの日に引き返すと時間だけ消費する', () => {
    const s = day(['ramen_receipt']);
    perform(s, { type: 'travel', to: 'town' });
    perform(s, { type: 'travel', to: 'door' });
    expect(s.time).toBe(hm(23, 10));
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('home');
  });

  it('同じ場所を2回調べても時間は1回分', () => {
    const s = day(['dinner_unannounced']);
    perform(s, { type: 'inspect', spot: 'door' });
    perform(s, { type: 'inspect', spot: 'door' });
    expect(s.time).toBe(hm(23, 1));
  });
});

describe('通販の締切', () => {
  it('23:59 までの注文は翌朝着で解消になる', () => {
    const s = day(['umbrella_lost'], hm(23, 59));
    perform(s, { type: 'order', item: 'umbrella_same' });
    expect(s.flags.has('ordered:umbrella_same')).toBe(true);
  });

  it('0:00 以降の注文は明後日着で解消にならず、報告チャットも送れない', () => {
    const s = day(['umbrella_lost'], hm(24, 0));
    perform(s, { type: 'order', item: 'umbrella_same' });
    expect(s.flags.has('ordered:umbrella_same')).toBe(false);
    expect(s.flags.has('ordered_late:umbrella_same')).toBe(true);
    expect(perform(s, { type: 'sendChat', template: 'umbrella' }).ok).toBe(false);
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('angry');
  });

  it('既存注文のキャンセルは 0:00 の発送処理まで', () => {
    const s = day(['card_overuse'], hm(24, 0));
    expect(perform(s, { type: 'cancelOrder', item: 'golf_club' }).ok).toBe(false);
  });
});

describe('行動', () => {
  it('コンビニに無い商品（指定ブランドの洗剤）は買えない', () => {
    const s = day(['shopping_forgot']);
    s.location = 'konbini';
    expect(perform(s, { type: 'buy', item: 'detergent_refill' }).ok).toBe(false);
    expect(perform(s, { type: 'buy', item: 'detergent_generic' }).ok).toBe(true);
  });

  it('関係ないチャットを送ると電話で問い詰められてペナルティ', () => {
    const s = day(['dinner_unannounced']);
    const r = perform(s, { type: 'sendChat', template: 'love' });
    expect(r.cost).toBeGreaterThan(2);
    const ok = perform(s, { type: 'sendChat', template: 'apology_dinner' });
    expect(ok.cost).toBe(2);
  });

  it('着替えると口紅の手がかりが消える', () => {
    const s = day(['cabaret_lipstick']);
    expect(visibleClues(s, 'slot:shirt')).toHaveLength(1);
    s.location = 'konbini';
    perform(s, { type: 'buy', item: 'spare_shirt' });
    perform(s, { type: 'use', item: 'spare_shirt' });
    expect(visibleClues(s, 'slot:shirt')).toHaveLength(0);
  });

  it('原因が2つあるとき、片方だけ解消しても怒られる（未解消の原因が返る）', () => {
    const s = day(['ring_off', 'tie_lost']);
    perform(s, { type: 'use', item: 'ring' });
    const r = perform(s, { type: 'openDoor' });
    expect(r.outcome.kind).toBe('angry');
    if (r.outcome.kind === 'angry') expect(r.outcome.causes.map((c) => c.id)).toEqual(['tie_lost']);
  });
});

describe('チャットの時系列', () => {
  const minutes = (text: string) => {
    if (text.includes('（昨日）')) return -1;
    const m = text.match(/（(\d{1,2}):(\d{2})）\s*$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : Infinity;
  };

  it('複数の火種を合成しても、チャットは時刻順に並ぶ', () => {
    // dinner(19:02, 22:15) と morning(7:46, 7:48) と umbrella(23:10) を逆順に合成
    const s = day(['umbrella_lost', 'dinner_unannounced', 'morning_fight']);
    const times = chatTimeline(s).map((c) => minutes(c.text));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[0]).toBe(7 * 60 + 46);
  });

  it('全シナリオのチャット手がかりに時刻（または昨日）が付いている', () => {
    for (const s of Object.values(SCENARIO_MAP)) {
      for (const c of s.clues.filter((x) => x.at === 'app:chat')) {
        expect(Number.isFinite(minutes(c.text)), `${s.id}: ${c.text}`).toBe(true);
      }
    }
  });
});

describe('新しい仕掛け', () => {
  it('誤爆メッセージは 0:00 の既読前なら送信取消できる', () => {
    const s = day(['wrong_send'], hm(23, 50));
    expect(perform(s, { type: 'unsend', clue: 'wrong_send' }).ok).toBe(true);
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('home');
  });

  it('既読がついたら取り消せない', () => {
    const s = day(['wrong_send'], hm(24, 0));
    expect(perform(s, { type: 'unsend', clue: 'wrong_send' }).ok).toBe(false);
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('angry');
  });

  it('誤爆を取り消す前に何か送ると、誤爆にも既読がついて詰む', () => {
    const s = day(['wrong_send', 'ramen_receipt'], hm(23, 0));
    const r = perform(s, { type: 'sendChat', template: 'love' });
    expect(r.messages.join()).toContain('既読がついた');
    expect(perform(s, { type: 'unsend', clue: 'wrong_send' }).ok).toBe(false);
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('angry');
  });

  it('先に取り消してから送れば大丈夫', () => {
    const s = day(['wrong_send'], hm(23, 0));
    perform(s, { type: 'unsend', clue: 'wrong_send' });
    expect(perform(s, { type: 'sendChat', template: 'love' }).messages.join()).not.toContain('既読がついた');
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('home');
  });

  it('後輩の日だけ「余計なひと言」が送れて、送ると火種を消していても怒られる', () => {
    expect(perform(day(['ring_off']), { type: 'sendChat', template: 'kouhai_kawaii' }).ok).toBe(false);
    const s = day(['kouhai_chat'], hm(23, 0));
    for (const a of solve(s)!) if (a.type !== 'openDoor') perform(s, a);
    expect(perform(s, { type: 'sendChat', template: 'kouhai_kawaii' }).ok).toBe(true);
    expect(s.chatLog.at(-1)).toEqual({ from: 'wife', text: '……へえ。' });
    const o = perform(s, { type: 'openDoor' }).outcome;
    expect(o.kind).toBe('angry');
    if (o.kind === 'angry') expect(o.causes.map((c) => c.title)).toEqual(['火に油']);
  });

  it('接着剤は割れたマグカップを持っていないと使えない', () => {
    const s = day(['dinner_unannounced']);
    s.location = 'konbini';
    perform(s, { type: 'buy', item: 'glue' });
    expect(perform(s, { type: 'use', item: 'glue' }).ok).toBe(false);
  });

  it('妻が帰省中の日は「おかえり」が無い帰宅になる', () => {
    const s = day(['wife_away']);
    expect(s.homeAlone).toBe(true);
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('home');
    expect(day(['ring_off']).homeAlone).toBe(false);
  });
});

describe('SNS・AV・写真集', () => {
  it('SNS の炎上投稿は削除でき、通知も消える。削除しないと謝罪チャットは送れない', () => {
    const s = day(['sns_meshi']);
    expect(perform(s, { type: 'sendChat', template: 'sns_meshi_sorry' }).ok).toBe(false);
    expect(visibleClues(s, 'notice')).toHaveLength(1);
    expect(perform(s, { type: 'deletePost', clue: 'post_meshi' }).ok).toBe(true);
    expect(visibleClues(s, 'notice')).toHaveLength(0);
  });

  it('SNS の3パターンは同じ日に重ならない', () => {
    const rng = seeded(7);
    for (let i = 0; i < 200; i++) {
      const ids = chooseScenarios({ day: 8, used: [], streak: 0 }, rng).map((x) => x.id);
      expect(ids.filter((id) => id.startsWith('sns_')).length).toBeLessThanOrEqual(1);
    }
  });

  it('AV のサブスクは 0:00 の自動更新を過ぎると解約できない', () => {
    const s = day(['av_left_on'], hm(24, 0));
    expect(perform(s, { type: 'cancelOrder', item: 'av_subscription' }).ok).toBe(false);
  });

  it('写真集は玄関マットで拾ってゴミ捨て場で捨て、白状すれば許される', () => {
    const s = day(['gravure_found']);
    perform(s, { type: 'pickup', item: 'gravure_book' });
    perform(s, { type: 'travel', to: 'town' });
    perform(s, { type: 'travel', to: 'trash' });
    perform(s, { type: 'discard', item: 'gravure_book' });
    perform(s, { type: 'travel', to: 'town' });
    perform(s, { type: 'travel', to: 'door' });
    perform(s, { type: 'sendChat', template: 'gravure_sorry' });
    expect(perform(s, { type: 'openDoor' }).outcome.kind).toBe('home');
  });
});

describe('暴言（おふざけ枠）', () => {
  it('暴言を送ると、火種を全部消していてもドアの向こうは魔王', () => {
    const s = day(['ring_off']);
    perform(s, { type: 'use', item: 'ring' });
    perform(s, { type: 'sendChat', template: 'insult_oni' });
    const r = perform(s, { type: 'openDoor' });
    expect(r.outcome.kind).toBe('demon');
    if (r.outcome.kind === 'demon') expect(r.outcome.lines[0]).toBe('……鬼嫁？');
  });

  it('異変なしの日でも、妻が帰省中でも、暴言を送れば魔王', () => {
    for (const id of ['neighbor_curry', 'wife_away']) {
      const s = day([id]);
      perform(s, { type: 'sendChat', template: 'insult_komakai' });
      expect(perform(s, { type: 'openDoor' }).outcome.kind, id).toBe('demon');
    }
  });

  it('暴言を送ったまま 1:00 を過ぎても、ただの時間切れではなく魔王', () => {
    // 24:55 に送信（+2分）→ 街へ（+5分）で 1:02
    const s = day(['neighbor_curry'], hm(24, 55));
    perform(s, { type: 'sendChat', template: 'insult_gunsou' });
    expect(perform(s, { type: 'travel', to: 'town' }).outcome.kind).toBe('demon');
  });

  it('暴言のあとは、謝っても何を送っても取りつく島もない返事だけ', () => {
    const s = day(['dinner_unannounced']);
    perform(s, { type: 'sendChat', template: 'insult_oni' });
    const before = s.chatLog.length;
    perform(s, { type: 'sendChat', template: 'apology_dinner' });
    perform(s, { type: 'sendChat', template: 'love' });
    perform(s, { type: 'sendChat', template: 'insult_gunsou' });
    const replies = s.chatLog.slice(before).filter((m) => m.from === 'wife').map((m) => m.text);
    expect(replies).toHaveLength(3);
    for (const r of replies) expect(COLD_REPLIES).toContain(r);
    // 関係ない「愛してるよ」でも電話は来ない（2分だけ）
    expect(s.time).toBe(hm(23, 8));
  });

  it('暴言は電話ペナルティなしの2分（その代わり取り返しがつかない）', () => {
    const s = day(['neighbor_curry']);
    expect(perform(s, { type: 'sendChat', template: 'insult_kaachan' }).cost).toBe(2);
  });
});

describe('暴言4種コンプリートのフィナーレ', () => {
  const ALL = ['insult_oni', 'insult_komakai', 'insult_kaachan', 'insult_gunsou'];
  const withSeed = (finale: FinaleId, ids = ['neighbor_curry']) => {
    const s = day(ids);
    s.seed = (FINALE_IDS.indexOf(finale) + 0.5) / FINALE_IDS.length;
    return s;
  };

  it('暴言が3つまでなら魔王、4つ全部ならフィナーレ', () => {
    const s = withSeed('court');
    for (const t of ALL.slice(0, 3)) perform(s, { type: 'sendChat', template: t });
    expect(s.finale).toBeUndefined();
    perform(s, { type: 'sendChat', template: ALL[3] });
    expect(s.finale).toBe('court');
    const r = perform(s, { type: 'openDoor' });
    expect(r.outcome).toEqual({ kind: 'finale', finale: 'court' });
  });

  it('6本すべてが seed で選ばれうる', () => {
    for (const id of FINALE_IDS) {
      const s = withSeed(id);
      for (const t of ALL) perform(s, { type: 'sendChat', template: t });
      expect(s.finale).toBe(id);
    }
  });

  it('魔王城: 4つ目を送った瞬間にスマホが割れて、以後スマホは使えない', () => {
    const s = withSeed('castle');
    for (const t of ALL) perform(s, { type: 'sendChat', template: t });
    expect(s.flags.has('phone_broken')).toBe(true);
    expect(perform(s, { type: 'openApp', app: 'chat' }).ok).toBe(false);
    expect(perform(s, { type: 'order', item: 'bouquet' }).ok).toBe(false);
  });

  it('魔王城: 街にいても玄関前へワープさせられ、結界で引き返せない', () => {
    const s = withSeed('castle');
    s.location = 'konbini';
    const msgs = ALL.flatMap((t) => perform(s, { type: 'sendChat', template: t }).messages);
    expect(s.location).toBe('door');
    expect(msgs.join()).toContain('玄関の前に立っていた');
    const t0 = s.time;
    const r1 = perform(s, { type: 'travel', to: 'town' });
    const r2 = perform(s, { type: 'travel', to: 'town' });
    expect(r1.ok).toBe(false);
    expect(r1.messages.join()).toContain('結界');
    expect(r2.messages).not.toEqual(r1.messages);
    expect(s.location).toBe('door');
    expect(s.time).toBe(t0);
    expect(perform(s, { type: 'openDoor' }).outcome).toEqual({ kind: 'finale', finale: 'castle' });
  });

  it('魔王城以外のフィナーレでは引き返せる', () => {
    const s = withSeed('court');
    for (const t of ALL) perform(s, { type: 'sendChat', template: t });
    expect(perform(s, { type: 'travel', to: 'town' }).ok).toBe(true);
  });

  it('家庭裁判: どのコマンドを選んでも、信頼度が尽きて必ず有罪になる', () => {
    const c = FINALES.court.choice!;
    expect(c.options.every((o) => !o.end)).toBe(true);
    expect(Math.min(...c.counters!.map((x) => x.damage))).toBeGreaterThan(0);
    expect(c.knockout!.some((l) => l.fx === 'guilty')).toBe(true);
  });

  it('包囲網: 4つ目を送った瞬間に義母・義父・友達・上司の通知が届く', () => {
    const s = withSeed('siege');
    const before = visibleClues(s, 'notice').length;
    for (const t of ALL) perform(s, { type: 'sendChat', template: t });
    expect(visibleClues(s, 'notice').length).toBe(before + 4);
  });

  it('フィナーレが決まった日は、時間切れでもフィナーレ', () => {
    const s = withSeed('lockout');
    s.time = hm(24, 50);
    for (const t of ALL) perform(s, { type: 'sendChat', template: t });
    expect(perform(s, { type: 'travel', to: 'town' }).outcome).toEqual({ kind: 'finale', finale: 'lockout' });
  });
});

describe('周回', () => {
  it('日が進むほど原因が重なる（6日目以降は2つ、8日目は3つ）', () => {
    const rng = seeded(1);
    const counts = [6, 7, 8].map((d) => chooseScenarios({ day: d, used: [], streak: 0 }, rng).flatMap((s) => s.causes).length);
    expect(counts).toEqual([2, 2, 3]);
  });

  it.each([1, 2, 3, 4, 5, 42, 99, 2024])('seed %i: 8日間、重複なしで全日クリアできる', (seed) => {
    const rng = seeded(seed);
    const run = newRun();
    let cleared = false;
    while (!cleared) {
      const state = startDay(run, rng);
      const plan = solve(state)!;
      let kind = 'continue';
      for (const a of plan) {
        kind = perform(state, a).outcome.kind;
        if (kind !== 'continue') break;
      }
      expect(kind, `${run.day}日目 ${state.scenarioIds.join('+')}`).toBe('home');
      cleared = advanceRun(run);
    }
    expect(run.streak).toBe(GOAL_DAYS);
    expect(new Set(run.used).size).toBe(run.used.length);
  });
});
